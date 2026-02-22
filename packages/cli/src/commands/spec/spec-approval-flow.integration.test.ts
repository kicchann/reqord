import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Requirement, Specification } from "@reqord/shared";
import { specApproveCommand } from "./approve.js";
import { implementCommand } from "./implement.js";
import { draftCommand } from "./draft.js";

// Mock all services
vi.mock("../../services/specification-service.js", () => ({
  showSpecification: vi.fn(),
  checkSpecApprovalPrerequisites: vi.fn(),
  updateSpecification: vi.fn(),
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
    buildPrTitle: vi.fn(),
    buildPrBody: vi.fn(),
  },
}));

vi.mock("../../services/spec-approval-helpers.js", () => ({
  extractDesignSummary: vi.fn(),
  extractDesignSection: vi.fn().mockReturnValue(null),
  extractComponentList: vi.fn().mockReturnValue([]),
  buildSpecApprovalPrBody: vi.fn(),
}));

vi.mock("../../services/draft-reversion-service.js", () => ({
  revertToDraft: vi.fn(),
}));

import {
  showSpecification,
  checkSpecApprovalPrerequisites,
  updateSpecification,
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
import { revertToDraft } from "../../services/draft-reversion-service.js";

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
    ...overrides,
  };
}

describe("Specification承認フロー統合テスト", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = 0;
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    // Reset Commander option state
    specApproveCommand.setOptionValue("dryRun", undefined);
    implementCommand.setOptionValue("json", undefined);
    draftCommand.setOptionValue("dryRun", undefined);
    draftCommand.setOptionValue("json", undefined);
  });

  describe("承認フロー正常系", () => {
    it("Requirement approved → spec approve → PR作成", async () => {
      // Arrange: Requirement is approved, Specification is draft
      const requirement = makeRequirement({ status: "approved" });
      const specification = makeSpecification({ status: "draft" });

      vi.mocked(checkSpecApprovalPrerequisites).mockResolvedValue({
        ok: true,
        errors: [],
      });
      vi.mocked(showSpecification).mockResolvedValue({
        specification,
        design: "# 設計\n\n## 設計概要\n詳細内容",
      });
      vi.mocked(showRequirement).mockResolvedValue({
        requirement,
        description: null,
      });
      vi.mocked(extractDesignSummary).mockReturnValue("詳細内容");
      vi.mocked(buildSpecApprovalPrBody).mockReturnValue("PR Body");

      const approvalResult: ApprovalResult = {
        branchName: "reqord/spec-000001-approve-v1.0",
        prNumber: 42,
        prUrl: "https://github.com/owner/repo/pull/42",
      };
      vi.mocked(startApproval).mockResolvedValue(approvalResult);

      // Act
      await specApproveCommand.parseAsync(["node", "test", "spec-000001"]);

      // Assert: Prerequisites checked
      expect(checkSpecApprovalPrerequisites).toHaveBeenCalledWith(process.cwd(), "spec-000001");

      // Assert: startApproval called with specification target
      expect(startApproval).toHaveBeenCalledWith(
        process.cwd(),
        expect.objectContaining({
          type: "specification",
          id: "spec-000001",
          version: "1.0",
        }),
        expect.any(Object),
        { dryRun: undefined },
      );

      // Assert: Success message with new format
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Approval PR created: spec-000001"),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "Approval will be confirmed when the PR is merged",
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("PR: https://github.com/owner/repo/pull/42"),
      );
    });
  });

  describe("dry-runモード", () => {
    it("spec approveのdry-runでGit/GitHub操作が実行されないこと", async () => {
      const requirement = makeRequirement({ status: "approved" });
      const specification = makeSpecification({ status: "draft" });

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
      vi.mocked(extractDesignSummary).mockReturnValue("概要");
      vi.mocked(buildSpecApprovalPrBody).mockReturnValue("Body");

      const approvalResult: ApprovalResult = {
        branchName: "reqord/spec-000001-approve-v1.0",
        prNumber: 0,
        prUrl: "",
      };
      vi.mocked(startApproval).mockResolvedValue(approvalResult);

      await specApproveCommand.parseAsync(["node", "test", "spec-000001", "--dry-run"]);

      // startApproval called with dryRun: true
      expect(startApproval).toHaveBeenCalledWith(
        process.cwd(),
        expect.any(Object),
        expect.any(Object),
        { dryRun: true },
      );

      // No success message shown
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("Approval PR created"),
      );
    });
  });

  describe("前提条件エラー", () => {
    it("Requirement未承認でspec approveがエラーを返すこと", async () => {
      vi.mocked(checkSpecApprovalPrerequisites).mockResolvedValue({
        ok: false,
        errors: [
          "Related requirement req-000001 is not approved (current: draft)",
          "design.md still contains template placeholders. Please edit and write the design content.",
        ],
      });

      await specApproveCommand.parseAsync(["node", "test", "spec-000001"]);

      // Error messages displayed
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Related requirement req-000001 is not approved"),
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("design.md still contains template placeholders"),
      );

      // Exit code set
      expect(process.exitCode).toBe(1);

      // startApproval NOT called
      expect(startApproval).not.toHaveBeenCalled();
    });
  });

  describe("draft差し戻し", () => {
    it("approved → draft への差し戻しフロー", async () => {
      const specification = makeSpecification({ status: "approved" });

      vi.mocked(showSpecification).mockResolvedValue({
        specification,
        design: null,
      });
      vi.mocked(revertToDraft).mockResolvedValue({
        previousStatus: "approved",
        impactedRequirements: ["req-000001"],
        prUrl: "https://github.com/owner/repo/pull/50",
        prNumber: 50,
      });

      await draftCommand.parseAsync(["node", "test", "spec-000001"]);

      // revertToDraft called
      expect(revertToDraft).toHaveBeenCalledWith(
        process.cwd(),
        "spec-000001",
        { dryRun: undefined },
      );

      // Success message
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Reversion PR created: spec-000001"),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("status: approved → draft"),
      );
    });
  });

  describe("implement遷移", () => {
    it("approved → implemented の正常遷移", async () => {
      const before = makeSpecification({ status: "approved" });
      const after = makeSpecification({ status: "implemented" });

      vi.mocked(showSpecification).mockResolvedValue({
        specification: before,
        design: null,
      });
      vi.mocked(updateSpecification).mockResolvedValue({ before, after });

      await implementCommand.parseAsync(["node", "test", "spec-000001"]);

      // updateSpecification called with implemented status
      expect(updateSpecification).toHaveBeenCalledWith(
        process.cwd(),
        "spec-000001",
        expect.objectContaining({ status: "implemented" }),
      );

      // Success message
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Marked specification as implemented: spec-000001"),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "  status: approved → implemented",
      );
    });
  });

  describe("implement前提条件チェック", () => {
    it("draftからimplementがエラーを返すこと", async () => {
      const specification = makeSpecification({ status: "draft" });

      vi.mocked(showSpecification).mockResolvedValue({
        specification,
        design: null,
      });

      await implementCommand.parseAsync(["node", "test", "spec-000001"]);

      // Error message
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Specification status is not "approved" (current: draft)`),
      );

      // Exit code set
      expect(process.exitCode).toBe(1);

      // updateSpecification NOT called
      expect(updateSpecification).not.toHaveBeenCalled();
    });

    it("implementedからimplementがエラーを返すこと", async () => {
      const specification = makeSpecification({ status: "implemented" });

      vi.mocked(showSpecification).mockResolvedValue({
        specification,
        design: null,
      });

      await implementCommand.parseAsync(["node", "test", "spec-000001"]);

      // Error message
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Specification status is not "approved" (current: implemented)`),
      );

      // Exit code set
      expect(process.exitCode).toBe(1);

      // updateSpecification NOT called
      expect(updateSpecification).not.toHaveBeenCalled();
    });
  });
});
