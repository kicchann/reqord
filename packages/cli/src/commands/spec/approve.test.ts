import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Requirement, Specification } from "@reqord/shared";
import { specApproveCommand } from "./approve.js";

// Mock services BEFORE imports
vi.mock("../../services/specification-service.js", () => ({
  showSpecification: vi.fn(),
  checkSpecApprovalPrerequisites: vi.fn(),
}));

vi.mock("../../services/requirement-service.js", () => ({
  showRequirement: vi.fn(),
}));

vi.mock("../../services/approval-service.js", () => ({
  startApproval: vi.fn(),
}));

vi.mock("../../services/specification-approval-handler.js", () => ({
  specificationHandler: {
    revalidate: vi.fn(),
    updateStatus: vi.fn(),
    saveCurrentApproval: vi.fn(),
    updatePrInfo: vi.fn(),
    buildPrTitle: vi.fn(),
    buildPrBody: vi.fn(),
  },
}));

vi.mock("../../services/spec-approval-helpers.js", () => ({
  extractDesignSummary: vi.fn(),
  buildSpecApprovalPrBody: vi.fn(),
}));

import {
  showSpecification,
  checkSpecApprovalPrerequisites,
} from "../../services/specification-service.js";
import { showRequirement } from "../../services/requirement-service.js";
import {
  startApproval,
  type ApprovalResult,
} from "../../services/approval-service.js";
import {
  extractDesignSummary,
  buildSpecApprovalPrBody,
} from "../../services/spec-approval-helpers.js";

function makeRequirement(overrides: Partial<Requirement> = {}): Requirement {
  return {
    id: "req-000001",
    version: "1.0",
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
    successCriteria: ["Criterion 1"],
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
    status: "draft",
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

describe("specApproveCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = 0;
    // Reset Commander option state to avoid leak between tests
    specApproveCommand.setOptionValue("dryRun", undefined);
  });

  it("正常系: 前提条件OKでPR作成", async () => {
    const specification = makeSpecification();
    const requirement = makeRequirement();
    const designContent = "# 設計\n\n## 設計概要\n詳細な設計内容";

    vi.mocked(checkSpecApprovalPrerequisites).mockResolvedValue({
      ok: true,
      errors: [],
    });
    vi.mocked(showSpecification).mockResolvedValue({
      specification,
      design: designContent,
    });
    vi.mocked(showRequirement).mockResolvedValue({
      requirement,
      description: null,
    });
    vi.mocked(extractDesignSummary).mockReturnValue("詳細な設計内容");
    vi.mocked(buildSpecApprovalPrBody).mockReturnValue("PR Body");

    const approvalResult: ApprovalResult = {
      branchName: "reqord/spec-000001-approve-v1.0",
      prNumber: 123,
      prUrl: "https://github.com/owner/repo/pull/123",
    };
    vi.mocked(startApproval).mockResolvedValue(approvalResult);

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await specApproveCommand.parseAsync(["node", "test", "spec-000001"]);

    // Prerequisites checked
    expect(checkSpecApprovalPrerequisites).toHaveBeenCalledWith(process.cwd(), "spec-000001");

    // Spec and requirement loaded
    expect(showSpecification).toHaveBeenCalledWith(process.cwd(), "spec-000001");
    expect(showRequirement).toHaveBeenCalledWith(process.cwd(), "req-000001");

    // Design summary extracted
    expect(extractDesignSummary).toHaveBeenCalledWith(designContent);

    // startApproval called with correct target
    expect(startApproval).toHaveBeenCalledWith(
      process.cwd(),
      {
        type: "specification",
        id: "spec-000001",
        version: "1.0",
        status: "draft",
        title: "Specification spec-000001 (Test Requirement)",
        files: [
          ".reqord/specifications/spec-000001.yaml",
          ".reqord/specifications/spec-000001/design.md",
        ],
      },
      expect.any(Object), // custom handler
      { dryRun: undefined }
    );

    // Success message
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Approval PR created for spec-000001")
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Branch: reqord/spec-000001-approve-v1.0")
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("PR: https://github.com/owner/repo/pull/123")
    );

    consoleLogSpy.mockRestore();
  });

  it("前提条件NGでエラー表示して終了", async () => {
    vi.mocked(checkSpecApprovalPrerequisites).mockResolvedValue({
      ok: false,
      errors: [
        "Specificationのステータスが draft ではありません（現在: approved）",
        "design.mdがテンプレートのままです。設計内容を記述してください。",
      ],
    });

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await specApproveCommand.parseAsync(["node", "test", "spec-000001"]);

    // Error messages shown
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Specificationのステータスが draft ではありません")
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("design.mdがテンプレートのままです")
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("先に問題を解決してください")
    );

    // Exit code set
    expect(process.exitCode).toBe(1);

    // startApproval NOT called
    expect(startApproval).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("Specificationが存在しない場合のエラー", async () => {
    vi.mocked(checkSpecApprovalPrerequisites).mockRejectedValue(
      new Error("Specification spec-999999 not found.")
    );

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await specApproveCommand.parseAsync(["node", "test", "spec-999999"]);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Specification spec-999999 not found.")
    );
    expect(process.exitCode).toBe(1);

    consoleErrorSpy.mockRestore();
  });

  it("dry-runモード", async () => {
    const specification = makeSpecification();
    const requirement = makeRequirement();

    vi.mocked(checkSpecApprovalPrerequisites).mockResolvedValue({
      ok: true,
      errors: [],
    });
    vi.mocked(showSpecification).mockResolvedValue({
      specification,
      design: "# 設計",
    });
    vi.mocked(showRequirement).mockResolvedValue({
      requirement,
      description: null,
    });
    vi.mocked(extractDesignSummary).mockReturnValue("設計概要");
    vi.mocked(buildSpecApprovalPrBody).mockReturnValue("PR Body");

    const approvalResult: ApprovalResult = {
      branchName: "reqord/spec-000001-approve-v1.0",
      prNumber: 0,
      prUrl: "",
    };
    vi.mocked(startApproval).mockResolvedValue(approvalResult);

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await specApproveCommand.parseAsync(["node", "test", "spec-000001", "--dry-run"]);

    expect(startApproval).toHaveBeenCalledWith(
      process.cwd(),
      expect.any(Object),
      expect.any(Object),
      { dryRun: true }
    );

    // Success message NOT shown in dry-run
    expect(consoleLogSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Approval PR created")
    );

    consoleLogSpy.mockRestore();
  });

  it("ApprovalTargetが正しいtype/filesを持つ", async () => {
    const specification = makeSpecification({ id: "spec-000042", version: "2.1" });
    const requirement = makeRequirement({ id: "req-000010", title: "Feature X" });

    vi.mocked(checkSpecApprovalPrerequisites).mockResolvedValue({
      ok: true,
      errors: [],
    });
    vi.mocked(showSpecification).mockResolvedValue({
      specification,
      design: "# Design",
    });
    vi.mocked(showRequirement).mockResolvedValue({
      requirement,
      description: null,
    });
    vi.mocked(extractDesignSummary).mockReturnValue("summary");
    vi.mocked(buildSpecApprovalPrBody).mockReturnValue("body");

    const approvalResult: ApprovalResult = {
      branchName: "reqord/spec-000042-approve-v2.1",
      prNumber: 99,
      prUrl: "https://github.com/owner/repo/pull/99",
    };
    vi.mocked(startApproval).mockResolvedValue(approvalResult);

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await specApproveCommand.parseAsync(["node", "test", "spec-000042"]);

    const callArgs = vi.mocked(startApproval).mock.calls[0];
    expect(callArgs[1]).toEqual({
      type: "specification",
      id: "spec-000042",
      version: "2.1",
      status: "draft",
      title: "Specification spec-000042 (Feature X)",
      files: [
        ".reqord/specifications/spec-000042.yaml",
        ".reqord/specifications/spec-000042/design.md",
      ],
    });

    consoleLogSpy.mockRestore();
  });

  it("flags付きSpecificationで警告を表示してから承認を続行する", async () => {
    const specification = makeSpecification({
      flags: [
        {
          type: "feedback-review",
          reason: "Feedback from issue #21",
          createdAt: "2026-01-01T00:00:00.000Z",
          relatedIssues: [21],
          severity: "high",
        },
      ],
    });
    const requirement = makeRequirement();

    vi.mocked(checkSpecApprovalPrerequisites).mockResolvedValue({
      ok: true,
      errors: [],
    });
    vi.mocked(showSpecification).mockResolvedValue({
      specification,
      design: "# Design",
    });
    vi.mocked(showRequirement).mockResolvedValue({
      requirement,
      description: null,
    });
    vi.mocked(extractDesignSummary).mockReturnValue("summary");
    vi.mocked(buildSpecApprovalPrBody).mockReturnValue("body");

    const approvalResult: ApprovalResult = {
      branchName: "reqord/spec-000001-approve-v1.0",
      prNumber: 99,
      prUrl: "https://github.com/owner/repo/pull/99",
    };
    vi.mocked(startApproval).mockResolvedValue(approvalResult);

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await specApproveCommand.parseAsync(["node", "test", "spec-000001"]);

    // Warning displayed
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Warning: spec-000001 has 1 unresolved feedback flag(s)")
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("feedback-review: Feedback from issue #21 (high)")
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Proceeding with approval...")
    );

    // Approval still proceeds
    expect(startApproval).toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Approval PR created for spec-000001")
    );

    consoleLogSpy.mockRestore();
  });

  it("flagsが空の場合は警告を表示しない", async () => {
    const specification = makeSpecification({ flags: [] });
    const requirement = makeRequirement();

    vi.mocked(checkSpecApprovalPrerequisites).mockResolvedValue({
      ok: true,
      errors: [],
    });
    vi.mocked(showSpecification).mockResolvedValue({
      specification,
      design: "# Design",
    });
    vi.mocked(showRequirement).mockResolvedValue({
      requirement,
      description: null,
    });
    vi.mocked(extractDesignSummary).mockReturnValue("summary");
    vi.mocked(buildSpecApprovalPrBody).mockReturnValue("body");

    const approvalResult: ApprovalResult = {
      branchName: "reqord/spec-000001-approve-v1.0",
      prNumber: 99,
      prUrl: "https://github.com/owner/repo/pull/99",
    };
    vi.mocked(startApproval).mockResolvedValue(approvalResult);

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await specApproveCommand.parseAsync(["node", "test", "spec-000001"]);

    expect(consoleLogSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Warning")
    );

    consoleLogSpy.mockRestore();
  });
});
