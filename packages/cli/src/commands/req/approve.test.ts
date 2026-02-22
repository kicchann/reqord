import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Requirement } from "@reqord/shared";
import { approveCommand } from "./approve.js";

// Mock services BEFORE imports
vi.mock("../../services/requirement-service.js", () => ({
  showRequirement: vi.fn(),
}));

vi.mock("../../services/approval-service.js", () => ({
  startApproval: vi.fn(),
}));

vi.mock("../../services/requirement-approval-handler.js", () => ({
  requirementHandler: {
    revalidate: vi.fn(),
    updateStatus: vi.fn(),
    buildPrTitle: vi.fn(),
    buildPrBody: vi.fn(),
  },
  buildReqApprovalPrBody: vi.fn().mockReturnValue("PR body"),
}));

vi.mock("../../repositories/feedback.js", () => ({
  findUnresolvedByArtifactId: vi.fn(),
}));

import { showRequirement } from "../../services/requirement-service.js";
import {
  startApproval,
  type ApprovalResult,
} from "../../services/approval-service.js";
import { findUnresolvedByArtifactId } from "../../repositories/feedback.js";


function makeRequirement(overrides: Partial<Requirement> = {}): Requirement {
  return {
    id: "req-000001",
    version: "1.0",
    title: "Test Requirement",
    status: "draft",
    priority: "medium",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    versionHistory: [],
    files: {
      description: "requirements/req-000001/description.md",
      supplementary: [],
    },
    successCriteria: ["Criterion 1"],
    format: { type: "free-form" },
    dependencies: { blockedBy: [], blocks: [], relatedTo: [] },
    ...overrides,
  };
}

describe("approveCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset process.exitCode
    process.exitCode = 0;
    // Reset Commander option state to avoid leak between tests
    approveCommand.setOptionValue("dryRun", undefined);
    // Default: no unresolved feedbacks
    vi.mocked(findUnresolvedByArtifactId).mockResolvedValue([]);
  });

  it("正常系: approveコマンド実行", async () => {
    const requirement = makeRequirement();
    vi.mocked(showRequirement).mockResolvedValue({
      requirement,
      description: null,
    });

    const approvalResult: ApprovalResult = {
      branchName: "reqord/req-000001-approve-v1.0",
      prNumber: 42,
      prUrl: "https://github.com/owner/repo/pull/42",
    };
    vi.mocked(startApproval).mockResolvedValue(approvalResult);

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await approveCommand.parseAsync(["node", "test", "req-000001"]);

    // Verify showRequirement called
    expect(showRequirement).toHaveBeenCalledWith(process.cwd(), "req-000001");

    // Verify startApproval called with correct ApprovalTarget
    expect(startApproval).toHaveBeenCalledWith(
      process.cwd(),
      {
        type: "requirement",
        id: "req-000001",
        version: "1.0",
        status: "draft",
        title: "Test Requirement",
        files: [".reqord/requirements/req-000001.yaml"],
      },
      expect.objectContaining({ revalidate: expect.any(Function), buildPrBody: expect.any(Function) }),
      { dryRun: undefined }
    );

    // Verify success message
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Approval PR created: req-000001")
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Approval will be confirmed when the PR is merged")
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Branch: reqord/req-000001-approve-v1.0")
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("PR: https://github.com/owner/repo/pull/42")
    );

    consoleLogSpy.mockRestore();
  });

  it("エラー: 存在しないRequirementでエラー表示", async () => {
    vi.mocked(showRequirement).mockRejectedValue(
      new Error("Requirement req-999999 not found.")
    );

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await approveCommand.parseAsync(["node", "test", "req-999999"]);

    // Verify error message (handleError format)
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Requirement req-999999 not found.")
    );

    // Verify exit code set
    expect(process.exitCode).toBe(1);

    // Verify startApproval NOT called
    expect(startApproval).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("ApprovalTarget構築", async () => {
    const requirement = makeRequirement({
      id: "req-000042",
      version: "2.1",
      title: "Another Requirement",
      status: "draft",
    });
    vi.mocked(showRequirement).mockResolvedValue({
      requirement,
      description: null,
    });

    const approvalResult: ApprovalResult = {
      branchName: "reqord/req-000042-approve-v2.1",
      prNumber: 100,
      prUrl: "https://github.com/owner/repo/pull/100",
    };
    vi.mocked(startApproval).mockResolvedValue(approvalResult);

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await approveCommand.parseAsync(["node", "test", "req-000042"]);

    // Verify ApprovalTarget has correct fields
    const callArgs = vi.mocked(startApproval).mock.calls[0];
    expect(callArgs[0]).toBe(process.cwd());
    expect(callArgs[1]).toEqual({
      type: "requirement",
      id: "req-000042",
      version: "2.1",
      status: "draft",
      title: "Another Requirement",
      files: [".reqord/requirements/req-000042.yaml"],
    });
    expect(callArgs[2]).toEqual(expect.objectContaining({ revalidate: expect.any(Function) }));
    // Check dryRun is falsy (undefined or false)
    expect(callArgs[3]?.dryRun).toBeFalsy();

    consoleLogSpy.mockRestore();
  });

  it("dry-runオプションが渡される", async () => {
    const requirement = makeRequirement();
    vi.mocked(showRequirement).mockResolvedValue({
      requirement,
      description: null,
    });

    const approvalResult: ApprovalResult = {
      branchName: "reqord/req-000001-approve-v1.0",
      prNumber: 0,
      prUrl: "",
    };
    vi.mocked(startApproval).mockResolvedValue(approvalResult);

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await approveCommand.parseAsync(["node", "test", "req-000001", "--dry-run"]);

    // Verify startApproval called with dryRun: true
    expect(startApproval).toHaveBeenCalledWith(
      process.cwd(),
      expect.any(Object),
      expect.objectContaining({ revalidate: expect.any(Function), buildPrBody: expect.any(Function) }),
      { dryRun: true }
    );

    // Verify success message NOT shown in dry-run mode
    expect(consoleLogSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Approval PR created")
    );

    consoleLogSpy.mockRestore();
  });

  it("未解決feedbackがある場合に警告を表示してから承認を続行する", async () => {
    vi.mocked(findUnresolvedByArtifactId).mockResolvedValue([
      {
        githubIssue: 17,
        type: "bug",
        severity: "medium",
        linkedTo: { requirements: ["req-000001"], createdRequirements: [], specifications: [], createdSpecifications: [] },
        syncedAt: "2026-01-01T00:00:00Z",
        status: "open",
      },
    ]);
    const requirement = makeRequirement();
    vi.mocked(showRequirement).mockResolvedValue({
      requirement,
      description: null,
    });

    const approvalResult: ApprovalResult = {
      branchName: "reqord/req-000001-approve-v1.0",
      prNumber: 42,
      prUrl: "https://github.com/owner/repo/pull/42",
    };
    vi.mocked(startApproval).mockResolvedValue(approvalResult);

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await approveCommand.parseAsync(["node", "test", "req-000001"]);

    // Warning displayed
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Warning: req-000001 has 1 unresolved feedback(s)")
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("#17 (bug, severity: medium)")
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Proceeding with approval...")
    );

    // Approval still proceeds
    expect(startApproval).toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Approval PR created: req-000001")
    );

    consoleLogSpy.mockRestore();
  });

  it("未解決feedbackがない場合は警告を表示しない", async () => {
    const requirement = makeRequirement();
    vi.mocked(showRequirement).mockResolvedValue({
      requirement,
      description: null,
    });

    const approvalResult: ApprovalResult = {
      branchName: "reqord/req-000001-approve-v1.0",
      prNumber: 42,
      prUrl: "https://github.com/owner/repo/pull/42",
    };
    vi.mocked(startApproval).mockResolvedValue(approvalResult);

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await approveCommand.parseAsync(["node", "test", "req-000001"]);

    expect(consoleLogSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Warning")
    );

    consoleLogSpy.mockRestore();
  });

});
