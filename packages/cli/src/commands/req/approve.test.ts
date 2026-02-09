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

import { showRequirement } from "../../services/requirement-service.js";
import {
  startApproval,
  type ApprovalResult,
} from "../../services/approval-service.js";

function makeRequirement(overrides: Partial<Requirement> = {}): Requirement {
  return {
    id: "req-000001",
    version: "1.0.0",
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
    flags: [],
    ...overrides,
  };
}

describe("approveCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset process.exitCode
    process.exitCode = 0;
  });

  it("正常系: approveコマンド実行", async () => {
    const requirement = makeRequirement();
    vi.mocked(showRequirement).mockResolvedValue({
      requirement,
      description: null,
    });

    const approvalResult: ApprovalResult = {
      branchName: "reqord/req-000001-approve-v1.0.0",
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
        version: "1.0.0",
        status: "draft",
        title: "Test Requirement",
        jsonPath: ".reqord/requirements/req-000001.json",
      },
      { dryRun: undefined }
    );

    // Verify success message
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Approval PR created for req-000001")
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Branch: reqord/req-000001-approve-v1.0.0")
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
      version: "2.1.0",
      title: "Another Requirement",
      status: "draft",
    });
    vi.mocked(showRequirement).mockResolvedValue({
      requirement,
      description: null,
    });

    const approvalResult: ApprovalResult = {
      branchName: "reqord/req-000042-approve-v2.1.0",
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
      version: "2.1.0",
      status: "draft",
      title: "Another Requirement",
      jsonPath: ".reqord/requirements/req-000042.json",
    });
    // Check dryRun is falsy (undefined or false)
    expect(callArgs[2]?.dryRun).toBeFalsy();

    consoleLogSpy.mockRestore();
  });

  it("dry-runオプションが渡される", async () => {
    const requirement = makeRequirement();
    vi.mocked(showRequirement).mockResolvedValue({
      requirement,
      description: null,
    });

    const approvalResult: ApprovalResult = {
      branchName: "reqord/req-000001-approve-v1.0.0",
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
      { dryRun: true }
    );

    // Verify success message NOT shown in dry-run mode
    expect(consoleLogSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Approval PR created")
    );

    consoleLogSpy.mockRestore();
  });
});
