import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Requirement, Specification } from "@reqord/shared";

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
    flags: [],
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
    flags: [],
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

      const result = await revertToDraft(process.cwd(), "req-000001");

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

      const result = await revertToDraft(process.cwd(), "req-000001");

      expect(result.previousStatus).toBe("implemented");
      expect(result.prNumber).toBe(42);
    });

    it("draft状態のreqに対するエラー", async () => {
      const req = makeRequirement({ status: "draft" });
      vi.mocked(reqRepo.findByIdOrThrow).mockResolvedValue(req);

      await expect(revertToDraft(process.cwd(), "req-000001")).rejects.toThrow(
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

      const result = await revertToDraft(process.cwd(), "req-000001");

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

      await revertToDraft(process.cwd(), "req-000001");

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

      await revertToDraft(process.cwd(), "req-000001");

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

      const result = await revertToDraft(process.cwd(), "req-000001");

      expect(result.impactedRequirements).toEqual([]);
      expect(result.prNumber).toBe(42);
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

      await revertToDraft(process.cwd(), "req-000001");

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

      const result = await revertToDraft(process.cwd(), "spec-000001");

      expect(result.previousStatus).toBe("approved");
      expect(result.prNumber).toBe(42);
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

      await revertToDraft(process.cwd(), "spec-000001");

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

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const result = await revertToDraft(process.cwd(), "req-000001", { dryRun: true });

      expect(gitRepo.createBranch).not.toHaveBeenCalled();
      expect(gitRepo.checkout).not.toHaveBeenCalled();
      expect(gitRepo.push).not.toHaveBeenCalled();
      expect(githubRepo.createPullRequest).not.toHaveBeenCalled();
      expect(updateRequirement).not.toHaveBeenCalled();
      expect(result.prNumber).toBeUndefined();
      expect(result.impactedRequirements).toEqual([]);

      consoleSpy.mockRestore();
    });

    it("dryRunモードで影響範囲を表示すること", async () => {
      const req = makeRequirement({ status: "approved" });
      vi.mocked(reqRepo.findByIdOrThrow).mockResolvedValue(req);
      vi.mocked(analyzeImpact).mockResolvedValue(
        makeImpactAnalysis({
          directImpacts: [
            { id: "req-000002", relation: "blocks", depth: 1, path: ["req-000001"], title: "依存" },
          ],
        }),
      );

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await revertToDraft(process.cwd(), "req-000001", { dryRun: true });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("req-000002"),
      );

      consoleSpy.mockRestore();
    });
  });
});
