import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Requirement, Specification, ProjectSettings } from "@reqord/shared";

// Mock repositories
vi.mock("../repositories/git.js", () => ({
  createBranch: vi.fn(),
  checkout: vi.fn(),
  add: vi.fn(),
  commit: vi.fn(),
  push: vi.fn(),
  getCurrentBranch: vi.fn().mockResolvedValue("main"),
}));

vi.mock("../repositories/github.js", () => ({
  createPullRequest: vi.fn().mockResolvedValue({ number: 42, url: "https://github.com/kicchann/reqord/pull/42" }),
}));

vi.mock("../repositories/requirement.js", () => ({
  findByIdOrThrow: vi.fn(),
  findAll: vi.fn().mockResolvedValue([]),
}));

vi.mock("../repositories/specification.js", () => ({
  findByIdOrThrow: vi.fn(),
  findAll: vi.fn().mockResolvedValue([]),
}));

vi.mock("./requirement-service.js", () => ({
  updateRequirement: vi.fn(),
}));

vi.mock("./specification-service.js", () => ({
  updateSpecification: vi.fn(),
}));

vi.mock("./impact-service.js", () => ({
  analyzeImpact: vi.fn(),
}));

import * as gitRepo from "../repositories/git.js";
import * as githubRepo from "../repositories/github.js";
import * as reqRepo from "../repositories/requirement.js";
import * as specRepo from "../repositories/specification.js";
import { updateRequirement } from "./requirement-service.js";
import { updateSpecification } from "./specification-service.js";
import { analyzeImpact } from "./impact-service.js";
import { revertToDraft } from "./draft-reversion-service.js";

function makeSettings(overrides: Partial<ProjectSettings["statusTransitionPr"]> = {}): ProjectSettings {
  return {
    invariants: {
      versioning: true,
      cyclicDependencyCheck: true,
      statusTransitionRules: true,
      schemaValidation: true,
    },
    approvalPrerequisites: {
      designMdCheck: true,
      descriptionMdCheck: false,
      customFiles: [],
    },
    statusTransitionPr: {
      draftToApproved: true,
      approvedToImplemented: false,
      toDraft: true,
      ...overrides,
    },
    branchNaming: {
      toApprovedPrefix: "reqord",
      toImplementedPrefix: "reqord",
      toDraftPrefix: "reqord",
    },
    feedbackValidation: {
      blockOnUnresolved: false,
      severityThreshold: "critical",
    },
    autoRevert: {
      onContentChange: "always",
    },
    consistencyCheck: {
      specNotImplementedLevel: "warning",
    },
  };
}

function makeRequirement(overrides: Partial<Requirement> = {}): Requirement {
  return {
    id: "req-000001",
    version: "2.0",
    title: "Test Requirement",
    status: "approved",
    priority: "medium",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    versionHistory: [],
    files: {
      description: "requirements/req-000001/description.md",
      supplementary: [],
    },
    successCriteria: [],
    format: { type: "free-form" },
    dependencies: { blockedBy: [], blocks: [], relatedTo: [] },
    ...overrides,
  };
}

function makeSpecification(overrides: Partial<Specification> = {}): Specification {
  return {
    id: "spec-000001",
    requirementId: "req-000001",
    version: "1.0",
    status: "approved",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    versionHistory: [],
    files: {
      design: "specifications/spec-000001/design.md",
      supplementary: [],
    },
    ...overrides,
  };
}

function makeImpactAnalysis(overrides: Partial<ReturnType<typeof analyzeImpact> extends Promise<infer T> ? T : never> = {}) {
  return {
    sourceId: "req-000001",
    sourceType: "requirement" as const,
    directImpacts: [],
    indirectImpacts: [],
    relatedSpecifications: [],
    relatedIssues: [],
    circularDependencies: [],
    analyzedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("DraftReversionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(gitRepo.getCurrentBranch).mockResolvedValue("main");
    vi.mocked(githubRepo.createPullRequest).mockResolvedValue({
      number: 42,
      url: "https://github.com/kicchann/reqord/pull/42",
    });
  });

  describe("requirement reversion", () => {
    it("approved → draft への正常な差し戻し", async () => {
      const req = makeRequirement({ status: "approved" });
      const afterReq = makeRequirement({ status: "draft" });
      vi.mocked(reqRepo.findByIdOrThrow).mockResolvedValue(req);
      vi.mocked(analyzeImpact).mockResolvedValue(makeImpactAnalysis());
      vi.mocked(updateRequirement).mockResolvedValue({
        before: req,
        after: afterReq,
        descriptionUpdated: false,
      });
      const settings = makeSettings();

      const result = await revertToDraft(process.cwd(), "req-000001", settings);

      expect(result.previousStatus).toBe("approved");
      expect(result.prNumber).toBe(42);
      expect(result.prUrl).toBe("https://github.com/kicchann/reqord/pull/42");
    });

    it("implemented → draft への正常な差し戻し", async () => {
      const req = makeRequirement({ status: "implemented" });
      const afterReq = makeRequirement({ status: "draft" });
      vi.mocked(reqRepo.findByIdOrThrow).mockResolvedValue(req);
      vi.mocked(analyzeImpact).mockResolvedValue(makeImpactAnalysis());
      vi.mocked(updateRequirement).mockResolvedValue({
        before: req,
        after: afterReq,
        descriptionUpdated: false,
      });
      const settings = makeSettings();

      const result = await revertToDraft(process.cwd(), "req-000001", settings);

      expect(result.previousStatus).toBe("implemented");
      expect(result.prNumber).toBe(42);
    });

    it("draft状態のreqに対するエラー", async () => {
      const req = makeRequirement({ status: "draft" });
      vi.mocked(reqRepo.findByIdOrThrow).mockResolvedValue(req);
      const settings = makeSettings();

      await expect(revertToDraft(process.cwd(), "req-000001", settings)).rejects.toThrow(
        "Cannot revert to draft: req-000001 is already in draft status.",
      );
    });

    it("影響範囲（blocksで依存する要件）の正しい取得", async () => {
      const req = makeRequirement({ status: "approved" });
      const afterReq = makeRequirement({ status: "draft" });
      vi.mocked(reqRepo.findByIdOrThrow).mockResolvedValue(req);
      vi.mocked(analyzeImpact).mockResolvedValue(
        makeImpactAnalysis({
          directImpacts: [
            { id: "req-000002", relation: "blocks", depth: 1, path: ["req-000001"], title: "依存要件" },
          ],
        }),
      );
      vi.mocked(updateRequirement).mockResolvedValue({
        before: req,
        after: afterReq,
        descriptionUpdated: false,
      });
      const settings = makeSettings();

      const result = await revertToDraft(process.cwd(), "req-000001", settings);

      expect(result.impactedRequirements).toEqual(["req-000002"]);
    });

    it("ブランチ名が reqord/req-<id>-revert-to-draft であること", async () => {
      const req = makeRequirement({ status: "approved" });
      const afterReq = makeRequirement({ status: "draft" });
      vi.mocked(reqRepo.findByIdOrThrow).mockResolvedValue(req);
      vi.mocked(analyzeImpact).mockResolvedValue(makeImpactAnalysis());
      vi.mocked(updateRequirement).mockResolvedValue({
        before: req,
        after: afterReq,
        descriptionUpdated: false,
      });
      const settings = makeSettings();

      await revertToDraft(process.cwd(), "req-000001", settings);

      expect(gitRepo.createBranch).toHaveBeenCalledWith(
        process.cwd(),
        "reqord/req-000001-revert-to-draft",
      );
    });

    it("PRが正しいタイトル・本文で作成されること", async () => {
      const req = makeRequirement({ status: "approved", title: "Test Requirement" });
      const afterReq = makeRequirement({ status: "draft" });
      vi.mocked(reqRepo.findByIdOrThrow).mockResolvedValue(req);
      vi.mocked(analyzeImpact).mockResolvedValue(
        makeImpactAnalysis({
          directImpacts: [
            { id: "req-000002", relation: "blocks", depth: 1, path: ["req-000001"], title: "影響要件" },
          ],
        }),
      );
      vi.mocked(updateRequirement).mockResolvedValue({
        before: req,
        after: afterReq,
        descriptionUpdated: false,
      });
      const settings = makeSettings();

      await revertToDraft(process.cwd(), "req-000001", settings);

      expect(githubRepo.createPullRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "[Reqord] Revert req-000001 to draft: Test Requirement",
          head: "reqord/req-000001-revert-to-draft",
        }),
      );
      // PR body should contain impact info
      const callArgs = vi.mocked(githubRepo.createPullRequest).mock.calls[0][0];
      expect(callArgs.body).toContain("req-000002");
      expect(callArgs.body).toContain("approved");
    });

    it("影響先が0件でも正常に動作すること", async () => {
      const req = makeRequirement({ status: "approved" });
      const afterReq = makeRequirement({ status: "draft" });
      vi.mocked(reqRepo.findByIdOrThrow).mockResolvedValue(req);
      vi.mocked(analyzeImpact).mockResolvedValue(makeImpactAnalysis());
      vi.mocked(updateRequirement).mockResolvedValue({
        before: req,
        after: afterReq,
        descriptionUpdated: false,
      });
      const settings = makeSettings();

      const result = await revertToDraft(process.cwd(), "req-000001", settings);

      expect(result.impactedRequirements).toEqual([]);
      expect(result.prNumber).toBe(42);
    });

    it("バージョンが変更されないこと（versionBumpなし）", async () => {
      const req = makeRequirement({ status: "approved", version: "2.0" });
      const afterReq = makeRequirement({ status: "draft", version: "2.0" });
      vi.mocked(reqRepo.findByIdOrThrow).mockResolvedValue(req);
      vi.mocked(analyzeImpact).mockResolvedValue(makeImpactAnalysis());
      vi.mocked(updateRequirement).mockResolvedValue({
        before: req,
        after: afterReq,
        descriptionUpdated: false,
      });
      const settings = makeSettings();

      await revertToDraft(process.cwd(), "req-000001", settings);

      // updateRequirement should be called with only status, no versionBump
      expect(updateRequirement).toHaveBeenCalledWith(
        process.cwd(),
        "req-000001",
        { status: "draft" },
      );
    });

    it("元のブランチに復帰すること", async () => {
      const req = makeRequirement({ status: "approved" });
      const afterReq = makeRequirement({ status: "draft" });
      vi.mocked(reqRepo.findByIdOrThrow).mockResolvedValue(req);
      vi.mocked(gitRepo.getCurrentBranch).mockResolvedValue("feature/my-branch");
      vi.mocked(analyzeImpact).mockResolvedValue(makeImpactAnalysis());
      vi.mocked(updateRequirement).mockResolvedValue({
        before: req,
        after: afterReq,
        descriptionUpdated: false,
      });
      const settings = makeSettings();

      await revertToDraft(process.cwd(), "req-000001", settings);

      // Last checkout should be back to original branch
      const checkoutCalls = vi.mocked(gitRepo.checkout).mock.calls;
      expect(checkoutCalls[checkoutCalls.length - 1][1]).toBe("feature/my-branch");
    });
  });

  describe("specification reversion", () => {
    it("approved → draft への正常な差し戻し", async () => {
      const spec = makeSpecification({ status: "approved" });
      const afterSpec = makeSpecification({ status: "draft" });
      vi.mocked(specRepo.findByIdOrThrow).mockResolvedValue(spec);
      vi.mocked(analyzeImpact).mockResolvedValue(
        makeImpactAnalysis({ sourceId: "spec-000001", sourceType: "specification" }),
      );
      vi.mocked(updateSpecification).mockResolvedValue({
        before: spec,
        after: afterSpec,
      });
      const settings = makeSettings();

      const result = await revertToDraft(process.cwd(), "spec-000001", settings);

      expect(result.previousStatus).toBe("approved");
      expect(result.prNumber).toBe(42);
    });

    it("バージョンが変更されないこと（versionBumpなし）", async () => {
      const spec = makeSpecification({ status: "approved", version: "1.0" });
      const afterSpec = makeSpecification({ status: "draft", version: "1.0" });
      vi.mocked(specRepo.findByIdOrThrow).mockResolvedValue(spec);
      vi.mocked(analyzeImpact).mockResolvedValue(
        makeImpactAnalysis({ sourceId: "spec-000001", sourceType: "specification" }),
      );
      vi.mocked(updateSpecification).mockResolvedValue({
        before: spec,
        after: afterSpec,
      });
      const settings = makeSettings();

      await revertToDraft(process.cwd(), "spec-000001", settings);

      expect(updateSpecification).toHaveBeenCalledWith(
        process.cwd(),
        "spec-000001",
        { status: "draft" },
      );
    });

    it("親要件経由で影響範囲を取得すること", async () => {
      const spec = makeSpecification({ status: "approved" });
      const afterSpec = makeSpecification({ status: "draft" });
      vi.mocked(specRepo.findByIdOrThrow).mockResolvedValue(spec);

      // First call: spec impact analysis (returns parentRequirement)
      // Second call: parent requirement impact analysis (returns blocks)
      vi.mocked(analyzeImpact)
        .mockResolvedValueOnce(
          makeImpactAnalysis({
            sourceId: "spec-000001",
            sourceType: "specification",
            parentRequirement: { id: "req-000001", title: "Parent Req" },
          }),
        )
        .mockResolvedValueOnce(
          makeImpactAnalysis({
            sourceId: "req-000001",
            directImpacts: [
              { id: "req-000002", relation: "blocks", depth: 1, path: ["req-000001"], title: "Blocked" },
            ],
          }),
        );
      vi.mocked(updateSpecification).mockResolvedValue({
        before: spec,
        after: afterSpec,
      });
      const settings = makeSettings();

      const result = await revertToDraft(process.cwd(), "spec-000001", settings);

      expect(result.impactedRequirements).toEqual(["req-000002"]);
      // analyzeImpact should be called twice: once for spec, once for parent req
      expect(analyzeImpact).toHaveBeenCalledTimes(2);
      expect(analyzeImpact).toHaveBeenCalledWith(process.cwd(), "req-000001");
    });

    it("PR本文が仕様向けテンプレートであること", async () => {
      const spec = makeSpecification({ status: "approved" });
      const afterSpec = makeSpecification({ status: "draft" });
      vi.mocked(specRepo.findByIdOrThrow).mockResolvedValue(spec);
      vi.mocked(analyzeImpact).mockResolvedValue(
        makeImpactAnalysis({ sourceId: "spec-000001", sourceType: "specification" }),
      );
      vi.mocked(updateSpecification).mockResolvedValue({
        before: spec,
        after: afterSpec,
      });
      const settings = makeSettings();

      await revertToDraft(process.cwd(), "spec-000001", settings);

      const callArgs = vi.mocked(githubRepo.createPullRequest).mock.calls[0][0];
      expect(callArgs.body).toContain("Specification Reversion to Draft");
      expect(callArgs.body).toContain("Specification");
    });

    it("ブランチ名が reqord/spec-<id>-revert-to-draft であること", async () => {
      const spec = makeSpecification({ status: "approved" });
      const afterSpec = makeSpecification({ status: "draft" });
      vi.mocked(specRepo.findByIdOrThrow).mockResolvedValue(spec);
      vi.mocked(analyzeImpact).mockResolvedValue(
        makeImpactAnalysis({ sourceId: "spec-000001", sourceType: "specification" }),
      );
      vi.mocked(updateSpecification).mockResolvedValue({
        before: spec,
        after: afterSpec,
      });
      const settings = makeSettings();

      await revertToDraft(process.cwd(), "spec-000001", settings);

      expect(gitRepo.createBranch).toHaveBeenCalledWith(
        process.cwd(),
        "reqord/spec-000001-revert-to-draft",
      );
    });
  });

  describe("dryRunモード", () => {
    it("dryRunモードでGit/GitHub操作が呼ばれないこと", async () => {
      const req = makeRequirement({ status: "approved" });
      vi.mocked(reqRepo.findByIdOrThrow).mockResolvedValue(req);
      vi.mocked(analyzeImpact).mockResolvedValue(makeImpactAnalysis());
      const settings = makeSettings();

      const result = await revertToDraft(process.cwd(), "req-000001", settings, { dryRun: true });

      expect(gitRepo.createBranch).not.toHaveBeenCalled();
      expect(gitRepo.checkout).not.toHaveBeenCalled();
      expect(gitRepo.push).not.toHaveBeenCalled();
      expect(githubRepo.createPullRequest).not.toHaveBeenCalled();
      expect(updateRequirement).not.toHaveBeenCalled();
      expect(result.prNumber).toBeUndefined();
      expect(result.impactedRequirements).toEqual([]);
    });

    it("dryRunモードで影響範囲がresultに含まれること", async () => {
      const req = makeRequirement({ status: "approved" });
      vi.mocked(reqRepo.findByIdOrThrow).mockResolvedValue(req);
      vi.mocked(analyzeImpact).mockResolvedValue(
        makeImpactAnalysis({
          directImpacts: [
            { id: "req-000002", relation: "blocks", depth: 1, path: ["req-000001"], title: "依存" },
          ],
        }),
      );
      const settings = makeSettings();

      const result = await revertToDraft(process.cwd(), "req-000001", settings, { dryRun: true });

      expect(result.impactedRequirements).toEqual(["req-000002"]);
      expect(result.previousStatus).toBe("approved");
    });

    it("dryRunモードでconsole.logが呼ばれないこと", async () => {
      const req = makeRequirement({ status: "approved" });
      vi.mocked(reqRepo.findByIdOrThrow).mockResolvedValue(req);
      vi.mocked(analyzeImpact).mockResolvedValue(makeImpactAnalysis());
      const settings = makeSettings();

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await revertToDraft(process.cwd(), "req-000001", settings, { dryRun: true });

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("toDraft: false（PRスキップ）", () => {
    it("toDraft=false の場合、ブランチ作成・プッシュ・PR作成をスキップする", async () => {
      const req = makeRequirement({ status: "approved" });
      const afterReq = makeRequirement({ status: "draft" });
      vi.mocked(reqRepo.findByIdOrThrow).mockResolvedValue(req);
      vi.mocked(analyzeImpact).mockResolvedValue(makeImpactAnalysis());
      vi.mocked(updateRequirement).mockResolvedValue({
        before: req,
        after: afterReq,
        descriptionUpdated: false,
      });
      const settings = makeSettings({ toDraft: false });

      const result = await revertToDraft(process.cwd(), "req-000001", settings);

      // Status update is called
      expect(updateRequirement).toHaveBeenCalledWith(
        process.cwd(),
        "req-000001",
        { status: "draft" },
      );

      // git add and commit are called on current branch
      expect(gitRepo.add).toHaveBeenCalled();
      expect(gitRepo.commit).toHaveBeenCalledWith(
        process.cwd(),
        "chore(reqord): revert req-000001 to draft (direct commit)"
      );

      // branch creation, push, PR creation are skipped
      expect(gitRepo.createBranch).not.toHaveBeenCalled();
      expect(gitRepo.push).not.toHaveBeenCalled();
      expect(githubRepo.createPullRequest).not.toHaveBeenCalled();

      // Result has no PR info
      expect(result.prNumber).toBeUndefined();
      expect(result.prUrl).toBeUndefined();
      expect(result.previousStatus).toBe("approved");
    });

    it("toDraft=false の場合、元のブランチへの復帰もしない", async () => {
      const req = makeRequirement({ status: "approved" });
      const afterReq = makeRequirement({ status: "draft" });
      vi.mocked(reqRepo.findByIdOrThrow).mockResolvedValue(req);
      vi.mocked(analyzeImpact).mockResolvedValue(makeImpactAnalysis());
      vi.mocked(updateRequirement).mockResolvedValue({
        before: req,
        after: afterReq,
        descriptionUpdated: false,
      });
      const settings = makeSettings({ toDraft: false });

      await revertToDraft(process.cwd(), "req-000001", settings);

      // getCurrentBranch is not called (no branch management needed)
      expect(gitRepo.getCurrentBranch).not.toHaveBeenCalled();
      expect(gitRepo.checkout).not.toHaveBeenCalled();
    });

    it("toDraft=false の場合も impactedRequirements が返される", async () => {
      const req = makeRequirement({ status: "approved" });
      const afterReq = makeRequirement({ status: "draft" });
      vi.mocked(reqRepo.findByIdOrThrow).mockResolvedValue(req);
      vi.mocked(analyzeImpact).mockResolvedValue(
        makeImpactAnalysis({
          directImpacts: [
            { id: "req-000002", relation: "blocks", depth: 1, path: ["req-000001"], title: "依存" },
          ],
        }),
      );
      vi.mocked(updateRequirement).mockResolvedValue({
        before: req,
        after: afterReq,
        descriptionUpdated: false,
      });
      const settings = makeSettings({ toDraft: false });

      const result = await revertToDraft(process.cwd(), "req-000001", settings);

      expect(result.impactedRequirements).toEqual(["req-000002"]);
    });

    it("toDraft=false かつ dry-run の場合、何もしない", async () => {
      const req = makeRequirement({ status: "approved" });
      vi.mocked(reqRepo.findByIdOrThrow).mockResolvedValue(req);
      vi.mocked(analyzeImpact).mockResolvedValue(makeImpactAnalysis());
      const settings = makeSettings({ toDraft: false });

      const result = await revertToDraft(process.cwd(), "req-000001", settings, { dryRun: true });

      expect(updateRequirement).not.toHaveBeenCalled();
      expect(gitRepo.add).not.toHaveBeenCalled();
      expect(gitRepo.commit).not.toHaveBeenCalled();
      expect(result.prNumber).toBeUndefined();
    });
  });

  describe("ブランチ命名規則カスタマイズ (spec-000038)", () => {
    it("デフォルト設定ではブランチ名が reqord/{id}-revert-to-draft になること", async () => {
      const req = makeRequirement({ status: "approved" });
      vi.mocked(reqRepo.findByIdOrThrow).mockResolvedValue(req);
      const settings = makeSettings();

      await revertToDraft(process.cwd(), "req-000001", settings);

      expect(gitRepo.createBranch).toHaveBeenCalledWith(
        process.cwd(),
        "reqord/req-000001-revert-to-draft",
      );
    });

    it("カスタムプレフィックスでブランチ名が {toDraftPrefix}/{id}-revert-to-draft になること", async () => {
      const req = makeRequirement({ status: "approved" });
      vi.mocked(reqRepo.findByIdOrThrow).mockResolvedValue(req);
      const settings = {
        ...makeSettings(),
        branchNaming: { ...makeSettings().branchNaming, toDraftPrefix: "revert" },
      };

      await revertToDraft(process.cwd(), "req-000001", settings);

      expect(gitRepo.createBranch).toHaveBeenCalledWith(
        process.cwd(),
        "revert/req-000001-revert-to-draft",
      );
    });

    it("specificationにもカスタムプレフィックスが適用されること", async () => {
      const spec = makeSpecification({ status: "approved" });
      vi.mocked(specRepo.findByIdOrThrow).mockResolvedValue(spec);
      const settings = {
        ...makeSettings(),
        branchNaming: { ...makeSettings().branchNaming, toDraftPrefix: "my-revert" },
      };

      await revertToDraft(process.cwd(), "spec-000001", settings);

      expect(gitRepo.createBranch).toHaveBeenCalledWith(
        process.cwd(),
        "my-revert/spec-000001-revert-to-draft",
      );
    });
  });
});
