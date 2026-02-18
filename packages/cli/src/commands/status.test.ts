import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ProjectStatus, RequirementDetailStatus, SpecificationDetailStatus } from "../services/status-service.js";
import { statusCommand } from "./status.js";

vi.mock("../services/status-service.js", () => ({
  getProjectStatus: vi.fn(),
  getRequirementStatus: vi.fn(),
  getSpecificationStatus: vi.fn(),
  renderProgressBar: vi.fn(() => "████████████░░░░░░░░"),
}));

import {
  getProjectStatus,
  getRequirementStatus,
  getSpecificationStatus,
} from "../services/status-service.js";

const mockGetProjectStatus = vi.mocked(getProjectStatus);
const mockGetRequirementStatus = vi.mocked(getRequirementStatus);
const mockGetSpecificationStatus = vi.mocked(getSpecificationStatus);

function makeProjectStatus(overrides: Partial<ProjectStatus> = {}): ProjectStatus {
  return {
    requirements: { total: 10, byStatus: { draft: 3, approved: 5, implemented: 2 }, implementedPercentage: 20, approvedPercentage: 70 },
    specifications: { total: 8, byStatus: { draft: 2, approved: 4, implemented: 2 }, implementedPercentage: 25, approvedPercentage: 75 },
    issues: { total: 20, closed: 16, open: 4, closedPercentage: 80 },
    warnings: [],
    generatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("status command", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = 0;
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    statusCommand.setOptionValue("json", undefined);
    statusCommand.setOptionValue("quiet", undefined);
  });

  describe("routeStatus", () => {
    it("ID省略でプロジェクト全体ステータス表示", async () => {
      mockGetProjectStatus.mockResolvedValue(makeProjectStatus());

      await statusCommand.parseAsync(["node", "test"]);

      expect(mockGetProjectStatus).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("プロジェクトステータス"),
      );
    });

    it("req-NNNNNNで要件詳細表示", async () => {
      mockGetRequirementStatus.mockResolvedValue({
        requirement: {
          id: "req-000001",
          version: "1.0",
          title: "テスト",
          status: "approved",
          priority: "high",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
          versionHistory: [],
          files: { description: "desc.md", supplementary: [] },
          successCriteria: [],
          format: { type: "free-form" },
          dependencies: { blockedBy: [], blocks: [], relatedTo: [] },
          flags: [],
        },
        specifications: [],
        gapAnalysis: { hasAnalysis: false },
        dependencyStatus: [],
        issueProgress: { total: 0, completed: 0 },
      });

      await statusCommand.parseAsync(["node", "test", "req-000001"]);

      expect(mockGetRequirementStatus).toHaveBeenCalledWith(
        expect.any(String),
        "req-000001",
      );
    });

    it("spec-NNNNNNで仕様詳細表示", async () => {
      mockGetSpecificationStatus.mockResolvedValue({
        specification: {
          id: "spec-000001",
          requirementId: "req-000001",
          version: "1.0",
          status: "approved",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
          versionHistory: [],
          files: { design: "design.md", supplementary: [] },
          flags: [],
        },
        requirement: { id: "req-000001", title: "テスト", status: "approved" },
        issueProgress: { total: 0, completed: 0 },
        coverageStatus: "not-covered",
      });

      await statusCommand.parseAsync(["node", "test", "spec-000001"]);

      expect(mockGetSpecificationStatus).toHaveBeenCalledWith(
        expect.any(String),
        "spec-000001",
      );
    });

    it("不正なID形式でエラー", async () => {
      await statusCommand.parseAsync(["node", "test", "invalid-id"]);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("不正なID形式"),
      );
    });
  });

  describe("--json", () => {
    it("プロジェクトステータスをJSON出力", async () => {
      const status = makeProjectStatus();
      mockGetProjectStatus.mockResolvedValue(status);

      await statusCommand.parseAsync(["node", "test", "--json"]);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        JSON.stringify(status, null, 2),
      );
    });
  });

  describe("--quiet", () => {
    it("実装済み率のみ出力", async () => {
      mockGetProjectStatus.mockResolvedValue(
        makeProjectStatus({
          requirements: { total: 10, byStatus: {}, implementedPercentage: 60, approvedPercentage: 80 },
        }),
      );

      await statusCommand.parseAsync(["node", "test", "--quiet"]);

      expect(consoleLogSpy).toHaveBeenCalledWith("60");
    });
  });

  describe("要件詳細ステータス", () => {
    it("関連Specification表示", async () => {
      mockGetRequirementStatus.mockResolvedValue({
        requirement: {
          id: "req-000001",
          version: "1.0",
          title: "テスト",
          status: "approved",
          priority: "high",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
          versionHistory: [],
          files: { description: "desc.md", supplementary: [] },
          successCriteria: [],
          format: { type: "free-form" },
          dependencies: { blockedBy: [], blocks: [], relatedTo: [] },
          flags: [],
        },
        specifications: [
          { id: "spec-000001", title: "Spec A", status: "approved" },
        ],
        gapAnalysis: { hasAnalysis: true, coverage: "partial", missingCount: 2, conflictCount: 1 },
        dependencyStatus: [
          { id: "req-000002", title: "Dep", status: "approved", relation: "blockedBy" },
        ],
        issueProgress: { total: 5, completed: 4 },
      });

      await statusCommand.parseAsync(["node", "test", "req-000001"]);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("要件ステータス"),
      );
    });

    it("Gap Analysis表示", async () => {
      mockGetRequirementStatus.mockResolvedValue({
        requirement: {
          id: "req-000001",
          version: "1.0",
          title: "テスト",
          status: "approved",
          priority: "medium",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
          versionHistory: [],
          files: { description: "desc.md", supplementary: [] },
          successCriteria: [],
          format: { type: "free-form" },
          dependencies: { blockedBy: [], blocks: [], relatedTo: [] },
          flags: [],
        },
        specifications: [],
        gapAnalysis: { hasAnalysis: true, coverage: "partial", missingCount: 3, conflictCount: 1 },
        dependencyStatus: [],
        issueProgress: { total: 0, completed: 0 },
      });

      await statusCommand.parseAsync(["node", "test", "req-000001"]);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Gap Analysis"),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("partial"),
      );
    });

    it("存在しないIDへのエラーハンドリング", async () => {
      mockGetRequirementStatus.mockRejectedValue(
        new Error("Requirement not found: req-999999"),
      );

      await statusCommand.parseAsync(["node", "test", "req-999999"]);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Requirement not found"),
      );
    });
  });

  describe("仕様詳細ステータス", () => {
    it("親Requirement整合性とIssue進捗表示", async () => {
      mockGetSpecificationStatus.mockResolvedValue({
        specification: {
          id: "spec-000001",
          requirementId: "req-000001",
          version: "1.0",
          status: "approved",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
          versionHistory: [],
          files: { design: "design.md", supplementary: [] },
          flags: [],
          designValidation: {
            passed: 5,
            warnings: 1,
            errors: 0,
            rules: [],
            validatedAt: "2026-01-01T00:00:00Z",
          },
        },
        requirement: { id: "req-000001", title: "テスト", status: "approved" },
        designValidation: { passed: 5, warnings: 1, errors: 0 },
        issueProgress: { total: 3, completed: 2 },
        coverageStatus: "partial",
      });

      await statusCommand.parseAsync(["node", "test", "spec-000001"]);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("仕様ステータス"),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("設計検証"),
      );
    });

    it("存在しないIDへのエラーハンドリング", async () => {
      mockGetSpecificationStatus.mockRejectedValue(
        new Error("Specification not found: spec-999999"),
      );

      await statusCommand.parseAsync(["node", "test", "spec-999999"]);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Specification not found"),
      );
    });
  });
});
