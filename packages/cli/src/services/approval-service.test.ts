import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ProjectSettings } from "@reqord/shared";

// Mock dependencies BEFORE imports
vi.mock("../repositories/git.js", () => ({
  createBranch: vi.fn(),
  checkout: vi.fn(),
  add: vi.fn(),
  commit: vi.fn(),
  push: vi.fn(),
  getCurrentBranch: vi.fn(),
}));

vi.mock("../repositories/github.js", () => ({
  createPullRequest: vi.fn(),
}));

import * as gitRepo from "../repositories/git.js";
import * as githubRepo from "../repositories/github.js";
import { startApproval, type ApprovalTarget, type ApprovalHandler } from "./approval-service.js";

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

function makeApprovalTarget(overrides: Partial<ApprovalTarget> = {}): ApprovalTarget {
  return {
    type: "requirement",
    id: "req-000011",
    version: "1.0.0",
    status: "draft",
    title: "Test Requirement",
    files: [".reqord/requirements/req-000011.yaml"],
    ...overrides,
  };
}

function makeMockHandler(): ApprovalHandler {
  return {
    revalidate: vi.fn(),
    updateStatus: vi.fn().mockResolvedValue("2.0.0"),
    buildPrTitle: vi.fn((target) => `[Reqord] Approve ${target.id}: ${target.title} v${target.version}`),
    buildPrBody: vi.fn((target) => `## Requirement Approval Request

| Field | Value |
|-----------|------|
| ID | ${target.id} |
| Title | ${target.title} |
| Version | ${target.version} |

### Changes
status: draft → approved`),
  };
}

describe("startApproval", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mocks
    vi.mocked(gitRepo.getCurrentBranch).mockResolvedValue("main");
    vi.mocked(gitRepo.createBranch).mockResolvedValue(undefined);
    vi.mocked(gitRepo.checkout).mockResolvedValue(undefined);
    vi.mocked(gitRepo.add).mockResolvedValue(undefined);
    vi.mocked(gitRepo.commit).mockResolvedValue(undefined);
    vi.mocked(gitRepo.push).mockResolvedValue(undefined);
    vi.mocked(githubRepo.createPullRequest).mockResolvedValue({
      number: 42,
      url: "https://github.com/owner/repo/pull/42",
    });
  });

  it("正常系: draft状態のRequirementで承認フロー開始", async () => {
    const target = makeApprovalTarget();
    const mockHandler = makeMockHandler();
    const settings = makeSettings();

    const result = await startApproval("/test/cwd", target, mockHandler, settings);

    // Verify revalidate called
    expect(mockHandler.revalidate).toHaveBeenCalledWith("/test/cwd", target);

    // Verify branch created and checked out BEFORE file modifications
    expect(gitRepo.createBranch).toHaveBeenCalledWith("/test/cwd", "reqord/req-000011-approve-v1.0.0");
    expect(gitRepo.checkout).toHaveBeenCalledWith("/test/cwd", "reqord/req-000011-approve-v1.0.0");

    // Verify handler.updateStatus called
    expect(mockHandler.updateStatus).toHaveBeenCalledWith("/test/cwd", target);

    // Verify git operations
    expect(gitRepo.add).toHaveBeenCalledWith("/test/cwd", [".reqord/requirements/req-000011.yaml"]);
    expect(gitRepo.commit).toHaveBeenCalledWith("/test/cwd", "chore(reqord): request approval for req-000011");
    expect(gitRepo.push).toHaveBeenCalledWith("/test/cwd", "reqord/req-000011-approve-v1.0.0");

    // Verify PR creation (uses newVersion from updateStatus = "2.0.0")
    expect(githubRepo.createPullRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "[Reqord] Approve req-000011: Test Requirement v2.0.0",
        body: expect.stringContaining("req-000011"),
        head: "reqord/req-000011-approve-v1.0.0",
      })
    );

    // Verify result
    expect(result).toEqual({
      branchName: "reqord/req-000011-approve-v1.0.0",
      prNumber: 42,
      prUrl: "https://github.com/owner/repo/pull/42",
    });
  });

  it("エラー: draft以外のステータスでエラー", async () => {
    const target = makeApprovalTarget({ status: "approved" });
    const mockHandler = makeMockHandler();
    const settings = makeSettings();

    await expect(startApproval("/test/cwd", target, mockHandler, settings)).rejects.toThrow(
      'Cannot start approval: req-000011 status is "approved", expected "draft".'
    );

    // Verify no side effects
    expect(mockHandler.revalidate).not.toHaveBeenCalled();
    expect(gitRepo.createBranch).not.toHaveBeenCalled();
  });

  it("エラー: implemented等の非draftステータスでもエラー", async () => {
    const target = makeApprovalTarget({ status: "implemented" });
    const mockHandler = makeMockHandler();
    const settings = makeSettings();

    await expect(startApproval("/test/cwd", target, mockHandler, settings)).rejects.toThrow(
      'Cannot start approval: req-000011 status is "implemented", expected "draft".'
    );
  });

  it("エラー: handler.revalidateがエラーをthrowした場合", async () => {
    const target = makeApprovalTarget();
    const mockHandler = makeMockHandler();
    const settings = makeSettings();
    vi.mocked(mockHandler.revalidate).mockRejectedValue(
      new Error('Cannot start approval: req-000011 current status is "approved", expected "draft".')
    );

    await expect(startApproval("/test/cwd", target, mockHandler, settings)).rejects.toThrow(
      'Cannot start approval: req-000011 current status is "approved", expected "draft".'
    );

    // Git operations should not have been called
    expect(gitRepo.createBranch).not.toHaveBeenCalled();
  });

  it("エラー: handler.revalidateでバージョン不一致", async () => {
    const target = makeApprovalTarget({ version: "1.0.0" });
    const mockHandler = makeMockHandler();
    const settings = makeSettings();
    vi.mocked(mockHandler.revalidate).mockRejectedValue(
      new Error('Cannot start approval: req-000011 current version is "2.0.0", expected "1.0.0".')
    );

    await expect(startApproval("/test/cwd", target, mockHandler, settings)).rejects.toThrow(
      'Cannot start approval: req-000011 current version is "2.0.0", expected "1.0.0".'
    );
  });

  it("ブランチ名の命名規則", async () => {
    const target = makeApprovalTarget({ id: "req-000011", version: "1.0.0" });
    const mockHandler = makeMockHandler();
    const settings = makeSettings();

    await startApproval("/test/cwd", target, mockHandler, settings);

    expect(gitRepo.createBranch).toHaveBeenCalledWith("/test/cwd", "reqord/req-000011-approve-v1.0.0");
  });

  it("PR本文にRequirement情報と手動更新の案内が含まれる", async () => {
    const target = makeApprovalTarget({
      id: "req-000022",
      version: "2.1.0",
      title: "Feature X",
    });
    const mockHandler = makeMockHandler();
    const settings = makeSettings();

    await startApproval("/test/cwd", target, mockHandler, settings);

    const prBody = vi.mocked(githubRepo.createPullRequest).mock.calls[0][0].body;
    expect(prBody).toContain("req-000022");
    expect(prBody).toContain("Feature X");
    expect(prBody).toContain("2.0.0");
  });

  it("dry-runモード", async () => {
    const target = makeApprovalTarget();
    const mockHandler = makeMockHandler();
    const settings = makeSettings();

    const result = await startApproval("/test/cwd", target, mockHandler, settings, { dryRun: true });

    // Git/GitHub operations NOT called
    expect(gitRepo.getCurrentBranch).not.toHaveBeenCalled();
    expect(mockHandler.revalidate).not.toHaveBeenCalled();
    expect(mockHandler.updateStatus).not.toHaveBeenCalled();
    expect(gitRepo.createBranch).not.toHaveBeenCalled();
    expect(gitRepo.checkout).not.toHaveBeenCalled();
    expect(gitRepo.add).not.toHaveBeenCalled();
    expect(gitRepo.commit).not.toHaveBeenCalled();
    expect(gitRepo.push).not.toHaveBeenCalled();
    expect(githubRepo.createPullRequest).not.toHaveBeenCalled();

    // Result still returned with dummy values
    expect(result).toEqual({
      branchName: "reqord/req-000011-approve-v1.0.0",
      prNumber: 0,
      prUrl: "",
    });
  });

  it("元のブランチに戻る", async () => {
    vi.mocked(gitRepo.getCurrentBranch).mockResolvedValue("feature-123");
    const target = makeApprovalTarget();
    const mockHandler = makeMockHandler();
    const settings = makeSettings();

    await startApproval("/test/cwd", target, mockHandler, settings);

    // Verify getCurrentBranch called before operations
    expect(gitRepo.getCurrentBranch).toHaveBeenCalledWith("/test/cwd");

    // Verify checkout called: approval branch + restore
    const checkoutCalls = vi.mocked(gitRepo.checkout).mock.calls;
    expect(checkoutCalls[0]).toEqual(["/test/cwd", "reqord/req-000011-approve-v1.0.0"]);
    // Last checkout should restore original branch
    expect(checkoutCalls[checkoutCalls.length - 1]).toEqual(["/test/cwd", "feature-123"]);
  });

  describe("ブランチ命名規則カスタマイズ (spec-000038)", () => {
    it("デフォルト設定ではブランチ名が reqord/{id}-approve-v{version} になること", async () => {
      const target = makeApprovalTarget({ id: "req-000011", version: "1.0.0" });
      const mockHandler = makeMockHandler();
      const settings = makeSettings();

      await startApproval("/test/cwd", target, mockHandler, settings);

      expect(gitRepo.createBranch).toHaveBeenCalledWith("/test/cwd", "reqord/req-000011-approve-v1.0.0");
    });

    it("カスタムプレフィックスでブランチ名が {toApprovedPrefix}/{id}-approve-v{version} になること", async () => {
      const target = makeApprovalTarget({ id: "req-000011", version: "1.0.0" });
      const mockHandler = makeMockHandler();
      const settings = { ...makeSettings(), branchNaming: { ...makeSettings().branchNaming, toApprovedPrefix: "approve" } };

      await startApproval("/test/cwd", target, mockHandler, settings);

      expect(gitRepo.createBranch).toHaveBeenCalledWith("/test/cwd", "approve/req-000011-approve-v1.0.0");
    });

    it("カスタムプレフィックスがdryRunのブランチ名にも適用されること", async () => {
      const target = makeApprovalTarget({ id: "req-000022", version: "2.0.0" });
      const mockHandler = makeMockHandler();
      const settings = { ...makeSettings(), branchNaming: { ...makeSettings().branchNaming, toApprovedPrefix: "feature" } };

      const result = await startApproval("/test/cwd", target, mockHandler, settings, { dryRun: true });

      expect(result.branchName).toBe("feature/req-000022-approve-v2.0.0");
    });
  });

  it("ブランチ作成後にJSON更新される（書き込み順序の安全性）", async () => {
    const target = makeApprovalTarget();
    const mockHandler = makeMockHandler();
    const settings = makeSettings();
    const callOrder: string[] = [];

    vi.mocked(gitRepo.createBranch).mockImplementation(async () => { callOrder.push("createBranch"); });
    vi.mocked(gitRepo.checkout).mockImplementation(async () => { callOrder.push("checkout"); });
    vi.mocked(mockHandler.updateStatus).mockImplementation(async () => {
      callOrder.push("updateStatus");
      return "2.0.0";
    });

    await startApproval("/test/cwd", target, mockHandler, settings);

    const createIdx = callOrder.indexOf("createBranch");
    const checkoutIdx = callOrder.indexOf("checkout");
    const updateIdx = callOrder.indexOf("updateStatus");

    // Branch operations must happen before file modifications
    expect(createIdx).toBeLessThan(updateIdx);
    expect(checkoutIdx).toBeLessThan(updateIdx);
  });

  describe("draftToApproved: false（PRスキップ）", () => {
    it("draftToApproved=false の場合、ブランチ作成・プッシュ・PR作成をスキップする", async () => {
      const target = makeApprovalTarget();
      const mockHandler = makeMockHandler();
      const settings = makeSettings({ draftToApproved: false });

      const result = await startApproval("/test/cwd", target, mockHandler, settings);

      // revalidate is called
      expect(mockHandler.revalidate).toHaveBeenCalledWith("/test/cwd", target);

      // Status update is called
      expect(mockHandler.updateStatus).toHaveBeenCalledWith("/test/cwd", target);

      // git add and commit are called on current branch
      expect(gitRepo.add).toHaveBeenCalledWith("/test/cwd", [".reqord/requirements/req-000011.yaml"]);
      expect(gitRepo.commit).toHaveBeenCalledWith(
        "/test/cwd",
        "chore(reqord): approve req-000011 (direct commit)"
      );

      // branch creation, push, PR creation are skipped
      expect(gitRepo.createBranch).not.toHaveBeenCalled();
      expect(gitRepo.push).not.toHaveBeenCalled();
      expect(githubRepo.createPullRequest).not.toHaveBeenCalled();

      // Result has no PR info
      expect(result.prNumber).toBeUndefined();
      expect(result.prUrl).toBeUndefined();
    });

    it("draftToApproved=false の場合、元のブランチへの復帰もしない", async () => {
      const target = makeApprovalTarget();
      const mockHandler = makeMockHandler();
      const settings = makeSettings({ draftToApproved: false });

      await startApproval("/test/cwd", target, mockHandler, settings);

      // getCurrentBranch is not called (no need to save/restore branch)
      expect(gitRepo.getCurrentBranch).not.toHaveBeenCalled();
      expect(gitRepo.checkout).not.toHaveBeenCalled();
    });

    it("draftToApproved=false の場合、branchNameはundefinedを返す", async () => {
      const target = makeApprovalTarget();
      const mockHandler = makeMockHandler();
      const settings = makeSettings({ draftToApproved: false });

      const result = await startApproval("/test/cwd", target, mockHandler, settings);

      expect(result.branchName).toBeUndefined();
    });

    it("draftToApproved=false かつ dry-run の場合、何もしない", async () => {
      const target = makeApprovalTarget();
      const mockHandler = makeMockHandler();
      const settings = makeSettings({ draftToApproved: false });

      await startApproval("/test/cwd", target, mockHandler, settings, { dryRun: true });

      expect(mockHandler.revalidate).not.toHaveBeenCalled();
      expect(mockHandler.updateStatus).not.toHaveBeenCalled();
      expect(gitRepo.add).not.toHaveBeenCalled();
      expect(gitRepo.commit).not.toHaveBeenCalled();
    });
  });
});
