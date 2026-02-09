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

vi.mock("./requirement-service.js", () => ({
  updateRequirement: vi.fn(),
}));

import * as gitRepo from "../repositories/git.js";
import * as githubRepo from "../repositories/github.js";
import * as reqRepo from "../repositories/requirement.js";
import { updateRequirement } from "./requirement-service.js";
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
  const updatedReq = makeRequirement({ status: "pending_approval", version: "2.0.0" });

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mocks
    vi.mocked(reqRepo.findById)
      .mockResolvedValueOnce(makeRequirement())   // re-validation
      .mockResolvedValueOnce(makeRequirement({ status: "pending_approval", version: "2.0.0", currentApproval: { version: "2.0.0", phase: "requirement", prNumber: 0, prUrl: "", approvedBy: [] } })); // after PR creation
    vi.mocked(reqRepo.save).mockResolvedValue(undefined);
    vi.mocked(updateRequirement).mockResolvedValue({
      before: makeRequirement(),
      after: updatedReq,
    });
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

    // Verify branch created and checked out BEFORE file modifications
    expect(gitRepo.createBranch).toHaveBeenCalledWith("/test/cwd", "reqord/req-000011-approve-v1.0.0");
    expect(gitRepo.checkout).toHaveBeenCalledWith("/test/cwd", "reqord/req-000011-approve-v1.0.0");

    // Verify updateRequirement called (not direct reqRepo.save for status change)
    expect(updateRequirement).toHaveBeenCalledWith("/test/cwd", "req-000011", { status: "pending_approval" });

    // Verify currentApproval saved
    expect(reqRepo.save).toHaveBeenCalled();
    const firstSave = vi.mocked(reqRepo.save).mock.calls[0][1];
    expect(firstSave.currentApproval).toBeDefined();
    expect(firstSave.currentApproval!.phase).toBe("requirement");

    // Verify git operations
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

  it("エラー: ディスク上のステータスが変更されていた場合エラー", async () => {
    vi.mocked(reqRepo.findById).mockReset();
    vi.mocked(reqRepo.findById).mockResolvedValueOnce(
      makeRequirement({ status: "approved" })
    );

    const target = makeApprovalTarget(); // target.status is "draft" but disk has "approved"

    await expect(startApproval("/test/cwd", target)).rejects.toThrow(
      'Cannot start approval: req-000011 current status is "approved", expected "draft".'
    );

    // Git operations should not have been called
    expect(gitRepo.createBranch).not.toHaveBeenCalled();
  });

  it("エラー: ディスク上のバージョンが変更されていた場合エラー", async () => {
    vi.mocked(reqRepo.findById).mockReset();
    vi.mocked(reqRepo.findById).mockResolvedValueOnce(
      makeRequirement({ version: "2.0.0" })
    );

    const target = makeApprovalTarget({ version: "1.0.0" }); // version mismatch

    await expect(startApproval("/test/cwd", target)).rejects.toThrow(
      'Cannot start approval: req-000011 current version is "2.0.0", expected "1.0.0".'
    );
  });

  it("ブランチ名の命名規則", async () => {
    const target = makeApprovalTarget({ id: "req-000011", version: "1.0.0" });

    await startApproval("/test/cwd", target);

    expect(gitRepo.createBranch).toHaveBeenCalledWith("/test/cwd", "reqord/req-000011-approve-v1.0.0");
  });

  it("PR本文にRequirement情報と手動更新の案内が含まれる", async () => {
    const target = makeApprovalTarget({
      id: "req-000022",
      version: "2.1.0",
      title: "Feature X",
    });
    vi.mocked(reqRepo.findById).mockReset();
    vi.mocked(reqRepo.findById)
      .mockResolvedValueOnce(makeRequirement({ id: "req-000022", version: "2.1.0" }))
      .mockResolvedValueOnce(makeRequirement({ id: "req-000022", status: "pending_approval", version: "3.0.0", currentApproval: { version: "3.0.0", phase: "requirement", prNumber: 0, prUrl: "", approvedBy: [] } }));

    await startApproval("/test/cwd", target);

    const prBody = vi.mocked(githubRepo.createPullRequest).mock.calls[0][0].body;
    expect(prBody).toContain("req-000022");
    expect(prBody).toContain("Feature X");
    expect(prBody).toContain("2.1.0");
    expect(prBody).toContain("reqord req update req-000022 --status approved");
  });

  it("dry-runモード", async () => {
    const target = makeApprovalTarget();

    const result = await startApproval("/test/cwd", target, { dryRun: true });

    // Git/GitHub operations NOT called
    expect(gitRepo.getCurrentBranch).not.toHaveBeenCalled();
    expect(reqRepo.findById).not.toHaveBeenCalled();
    expect(reqRepo.save).not.toHaveBeenCalled();
    expect(updateRequirement).not.toHaveBeenCalled();
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

    // Verify checkout called: approval branch + restore
    const checkoutCalls = vi.mocked(gitRepo.checkout).mock.calls;
    expect(checkoutCalls[0]).toEqual(["/test/cwd", "reqord/req-000011-approve-v1.0.0"]);
    // Last checkout should restore original branch
    expect(checkoutCalls[checkoutCalls.length - 1]).toEqual(["/test/cwd", "feature-123"]);
  });

  it("currentApprovalフィールドがPR情報で更新される", async () => {
    const target = makeApprovalTarget();

    await startApproval("/test/cwd", target);

    // Verify second save updates currentApproval with PR info
    const saveCalls = vi.mocked(reqRepo.save).mock.calls;
    const lastSavedReq = saveCalls[saveCalls.length - 1][1];
    expect(lastSavedReq.currentApproval).toEqual(
      expect.objectContaining({
        prNumber: 42,
        prUrl: "https://github.com/owner/repo/pull/42",
        phase: "requirement",
        approvedBy: [],
      })
    );
  });

  it("ブランチ作成後にJSON更新される（書き込み順序の安全性）", async () => {
    const target = makeApprovalTarget();
    const callOrder: string[] = [];

    vi.mocked(gitRepo.createBranch).mockImplementation(async () => { callOrder.push("createBranch"); });
    vi.mocked(gitRepo.checkout).mockImplementation(async () => { callOrder.push("checkout"); });
    vi.mocked(updateRequirement).mockImplementation(async () => {
      callOrder.push("updateRequirement");
      return { before: makeRequirement(), after: updatedReq };
    });

    await startApproval("/test/cwd", target);

    const createIdx = callOrder.indexOf("createBranch");
    const checkoutIdx = callOrder.indexOf("checkout");
    const updateIdx = callOrder.indexOf("updateRequirement");

    // Branch operations must happen before file modifications
    expect(createIdx).toBeLessThan(updateIdx);
    expect(checkoutIdx).toBeLessThan(updateIdx);
  });
});
