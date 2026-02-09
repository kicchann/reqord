import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Requirement } from "@reqord/shared";

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

vi.mock("../repositories/requirement.js", () => ({
  save: vi.fn(),
  findById: vi.fn(),
}));

import * as gitRepo from "../repositories/git.js";
import * as githubRepo from "../repositories/github.js";
import * as reqRepo from "../repositories/requirement.js";
import { startApproval, type ApprovalTarget } from "./approval-service.js";

function makeRequirement(overrides: Partial<Requirement> = {}): Requirement {
  return {
    id: "req-000011",
    version: "1.0.0",
    title: "Test Requirement",
    status: "draft",
    priority: "medium",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    versionHistory: [],
    files: { description: "requirements/req-000011/description.md", supplementary: [] },
    successCriteria: ["Criterion 1"],
    format: { type: "free-form" },
    dependencies: { blockedBy: [], blocks: [], relatedTo: [] },
    flags: [],
    ...overrides,
  };
}

function makeApprovalTarget(overrides: Partial<ApprovalTarget> = {}): ApprovalTarget {
  return {
    type: "requirement",
    id: "req-000011",
    version: "1.0.0",
    status: "draft",
    title: "Test Requirement",
    jsonPath: ".reqord/requirements/req-000011.json",
    ...overrides,
  };
}

describe("startApproval", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mocks
    vi.mocked(reqRepo.findById).mockResolvedValue(makeRequirement());
    vi.mocked(reqRepo.save).mockResolvedValue(undefined);
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

    const result = await startApproval("/test/cwd", target);

    // Verify requirement status update
    expect(reqRepo.save).toHaveBeenCalledTimes(1);
    const savedReq = vi.mocked(reqRepo.save).mock.calls[0][1];
    expect(savedReq.status).toBe("pending_approval");
    expect(savedReq.id).toBe("req-000011");

    // Verify git operations
    expect(gitRepo.createBranch).toHaveBeenCalledWith("/test/cwd", "reqord/req-000011-approve-v1.0.0");
    expect(gitRepo.checkout).toHaveBeenCalledWith("/test/cwd", "reqord/req-000011-approve-v1.0.0");
    expect(gitRepo.add).toHaveBeenCalledWith("/test/cwd", [".reqord/requirements/req-000011.json"]);
    expect(gitRepo.commit).toHaveBeenCalledWith("/test/cwd", "chore(reqord): request approval for req-000011");
    expect(gitRepo.push).toHaveBeenCalledWith("/test/cwd", "reqord/req-000011-approve-v1.0.0");

    // Verify PR creation
    expect(githubRepo.createPullRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "[Reqord] Approve req-000011: Test Requirement v1.0.0",
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

    await expect(startApproval("/test/cwd", target)).rejects.toThrow(
      'Cannot start approval: req-000011 status is "approved", expected "draft".'
    );

    // Verify no side effects
    expect(reqRepo.save).not.toHaveBeenCalled();
    expect(gitRepo.createBranch).not.toHaveBeenCalled();
  });

  it("エラー: pending_approval以外の非draftステータスでもエラー", async () => {
    const target = makeApprovalTarget({ status: "implemented" });

    await expect(startApproval("/test/cwd", target)).rejects.toThrow(
      'Cannot start approval: req-000011 status is "implemented", expected "draft".'
    );
  });

  it("ブランチ名の命名規則", async () => {
    const target = makeApprovalTarget({ id: "req-000011", version: "1.0.0" });

    await startApproval("/test/cwd", target);

    expect(gitRepo.createBranch).toHaveBeenCalledWith("/test/cwd", "reqord/req-000011-approve-v1.0.0");
  });

  it("PR本文にRequirement情報が含まれる", async () => {
    const target = makeApprovalTarget({
      id: "req-000022",
      version: "2.1.0",
      title: "Feature X",
    });

    await startApproval("/test/cwd", target);

    expect(githubRepo.createPullRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining("req-000022"),
      })
    );

    const prBody = vi.mocked(githubRepo.createPullRequest).mock.calls[0][0].body;
    expect(prBody).toContain("Feature X");
    expect(prBody).toContain("2.1.0");
  });

  it("dry-runモード", async () => {
    const target = makeApprovalTarget();

    const result = await startApproval("/test/cwd", target, { dryRun: true });

    // Git/GitHub operations NOT called
    expect(gitRepo.getCurrentBranch).not.toHaveBeenCalled();
    expect(reqRepo.save).not.toHaveBeenCalled();
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

    await startApproval("/test/cwd", target);

    // Verify getCurrentBranch called before operations
    expect(gitRepo.getCurrentBranch).toHaveBeenCalledWith("/test/cwd");

    // Verify checkout called twice: once to new branch, once to restore
    expect(gitRepo.checkout).toHaveBeenCalledTimes(2);
    expect(gitRepo.checkout).toHaveBeenNthCalledWith(1, "/test/cwd", "reqord/req-000011-approve-v1.0.0");
    expect(gitRepo.checkout).toHaveBeenNthCalledWith(2, "/test/cwd", "feature-123");
  });
});
