import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Requirement, Specification } from "@reqord/shared";
import { implementCommand } from "./implement.js";

// Mock services
vi.mock("../../services/requirement-service.js", () => ({
  updateRequirement: vi.fn(),
  showRequirement: vi.fn(),
}));

vi.mock("../../services/specification-service.js", () => ({
  listSpecifications: vi.fn(),
}));

vi.mock("../../services/impl-validation-service.js", () => ({
  checkImplementConsistency: vi.fn(),
}));

import { updateRequirement, showRequirement } from "../../services/requirement-service.js";
import { listSpecifications } from "../../services/specification-service.js";
import { checkImplementConsistency } from "../../services/impl-validation-service.js";

const mockUpdateRequirement = vi.mocked(updateRequirement);
const mockShowRequirement = vi.mocked(showRequirement);
const mockListSpecifications = vi.mocked(listSpecifications);
const mockCheckConsistency = vi.mocked(checkImplementConsistency);

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

describe("req implement command", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = 0;
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    // Reset Commander option state
    implementCommand.setOptionValue("json", undefined);
    // Default: no consistency warnings
    mockCheckConsistency.mockResolvedValue({ warnings: [] });
  });

  it("approved → implementedへの遷移", async () => {
    const before = makeRequirement({ status: "approved", version: "2.0" });
    const after = makeRequirement({ status: "implemented", version: "2.0" });

    mockShowRequirement.mockResolvedValue({ requirement: before, description: null });
    mockListSpecifications.mockResolvedValue([]);
    mockUpdateRequirement.mockResolvedValue({ before, after, descriptionUpdated: false });

    await implementCommand.parseAsync(["node", "test", "req-000001"]);

    expect(mockUpdateRequirement).toHaveBeenCalledWith(
      process.cwd(),
      "req-000001",
      expect.objectContaining({
        status: "implemented",
      }),
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Marked requirement as implemented: req-000001"),
    );
    expect(consoleLogSpy).toHaveBeenCalledWith("  status: approved → implemented");
  });

  it("バージョンが据え置かれる（ステータスのみ変更）", async () => {
    const before = makeRequirement({ status: "approved", version: "2.0" });
    const after = makeRequirement({ status: "implemented", version: "2.0" });

    mockShowRequirement.mockResolvedValue({ requirement: before, description: null });
    mockListSpecifications.mockResolvedValue([]);
    mockUpdateRequirement.mockResolvedValue({ before, after, descriptionUpdated: false });

    await implementCommand.parseAsync(["node", "test", "req-000001"]);

    // Version should not be displayed if unchanged
    expect(consoleLogSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("version:"),
    );
  });

  it("関連Specificationの実装状況を表示", async () => {
    const before = makeRequirement({ status: "approved" });
    const after = makeRequirement({ status: "implemented" });
    const specs = [
      makeSpecification({ id: "spec-000001", status: "approved", version: "1.0" }),
      makeSpecification({ id: "spec-000002", status: "implemented", version: "1.1" }),
    ];

    mockShowRequirement.mockResolvedValue({ requirement: before, description: null });
    mockListSpecifications.mockResolvedValue(specs);
    mockUpdateRequirement.mockResolvedValue({ before, after, descriptionUpdated: false });

    await implementCommand.parseAsync(["node", "test", "req-000001"]);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Related specifications (2)"),
    );
    expect(consoleLogSpy).toHaveBeenCalledWith("  - spec-000001: approved (v1.0)");
    expect(consoleLogSpy).toHaveBeenCalledWith("  - spec-000002: implemented (v1.1)");
  });

  it("関連Specificationがない場合", async () => {
    const before = makeRequirement({ status: "approved" });
    const after = makeRequirement({ status: "implemented" });

    mockShowRequirement.mockResolvedValue({ requirement: before, description: null });
    mockListSpecifications.mockResolvedValue([]);
    mockUpdateRequirement.mockResolvedValue({ before, after, descriptionUpdated: false });

    await implementCommand.parseAsync(["node", "test", "req-000001"]);

    expect(consoleLogSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Related specifications"),
    );
  });

  it("versionHistoryエントリが記録される", async () => {
    const before = makeRequirement({
      status: "approved",
      version: "2.0",
      versionHistory: [],
    });
    const after = makeRequirement({
      status: "implemented",
      version: "2.0",
      versionHistory: [
        {
          version: "2.0",
          status: "implemented",
          changedAt: "2026-01-01T00:00:00Z",
          summary: "Status changed from approved to implemented",
        },
      ],
    });

    mockShowRequirement.mockResolvedValue({ requirement: before, description: null });
    mockListSpecifications.mockResolvedValue([]);
    mockUpdateRequirement.mockResolvedValue({ before, after, descriptionUpdated: false });

    await implementCommand.parseAsync(["node", "test", "req-000001"]);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("history: Status changed from approved to implemented"),
    );
  });

  it("--jsonオプションでJSON出力", async () => {
    const before = makeRequirement({ status: "approved", version: "2.0" });
    const after = makeRequirement({ status: "implemented", version: "2.0" });

    mockShowRequirement.mockResolvedValue({ requirement: before, description: null });
    mockListSpecifications.mockResolvedValue([]);
    mockUpdateRequirement.mockResolvedValue({ before, after, descriptionUpdated: false });

    await implementCommand.parseAsync(["node", "test", "req-000001", "--json"]);

    expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify(after, null, 2));
    // JSON mode should not print other messages
    expect(consoleLogSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Marked requirement as implemented"),
    );
  });

  it("draftステータスでエラー", async () => {
    const req = makeRequirement({ status: "draft" });

    mockShowRequirement.mockResolvedValue({ requirement: req, description: null });

    await implementCommand.parseAsync(["node", "test", "req-000001"]);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining(`Requirement status is not "approved" (current: draft)`),
    );
    expect(process.exitCode).toBe(1);
    expect(mockUpdateRequirement).not.toHaveBeenCalled();
  });

  it("implementedステータスでエラー", async () => {
    const req = makeRequirement({ status: "implemented" });

    mockShowRequirement.mockResolvedValue({ requirement: req, description: null });

    await implementCommand.parseAsync(["node", "test", "req-000001"]);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining(`Requirement status is not "approved" (current: implemented)`),
    );
    expect(process.exitCode).toBe(1);
    expect(mockUpdateRequirement).not.toHaveBeenCalled();
  });

  it("draftステータス + --jsonでJSON形式のエラー出力", async () => {
    const req = makeRequirement({ status: "draft" });

    mockShowRequirement.mockResolvedValue({ requirement: req, description: null });

    await implementCommand.parseAsync(["node", "test", "req-000001", "--json"]);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('"error":true'),
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("VALIDATION_ERROR"),
    );
    expect(process.exitCode).toBe(1);
    expect(mockUpdateRequirement).not.toHaveBeenCalled();
  });

  it("JSON modeでは関連Specificationを表示しない", async () => {
    const before = makeRequirement({ status: "approved" });
    const after = makeRequirement({ status: "implemented" });
    const specs = [makeSpecification()];

    mockShowRequirement.mockResolvedValue({ requirement: before, description: null });
    mockListSpecifications.mockResolvedValue(specs);
    mockUpdateRequirement.mockResolvedValue({ before, after, descriptionUpdated: false });

    await implementCommand.parseAsync(["node", "test", "req-000001", "--json"]);

    expect(consoleLogSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Related specifications"),
    );
  });

  it("整合性チェック警告がある場合に表示する", async () => {
    const before = makeRequirement({ status: "approved" });
    const after = makeRequirement({ status: "implemented" });

    mockShowRequirement.mockResolvedValue({ requirement: before, description: null });
    mockListSpecifications.mockResolvedValue([]);
    mockUpdateRequirement.mockResolvedValue({ before, after, descriptionUpdated: false });
    mockCheckConsistency.mockResolvedValue({
      warnings: [
        {
          type: "spec-not-implemented",
          message: "spec-000001 status is approved (not implemented)",
          details: { id: "spec-000001", currentStatus: "approved" },
        },
        {
          type: "issue-not-closed",
          message: "#44 (Service implementation) is open",
          details: { id: "44", currentStatus: "open" },
        },
      ],
    });

    await implementCommand.parseAsync(["node", "test", "req-000001"]);

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Consistency check warnings"),
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("spec-000001 status is approved"),
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("#44 (Service implementation) is open"),
    );
    // Still proceeds to implement
    expect(mockUpdateRequirement).toHaveBeenCalled();
  });

  it("整合性チェック警告があってもimplemented遷移完了", async () => {
    const before = makeRequirement({ status: "approved" });
    const after = makeRequirement({ status: "implemented" });

    mockShowRequirement.mockResolvedValue({ requirement: before, description: null });
    mockListSpecifications.mockResolvedValue([]);
    mockUpdateRequirement.mockResolvedValue({ before, after, descriptionUpdated: false });
    mockCheckConsistency.mockResolvedValue({
      warnings: [
        {
          type: "spec-not-implemented",
          message: "spec-000001 status is draft (not implemented)",
          details: { id: "spec-000001", currentStatus: "draft" },
        },
      ],
    });

    await implementCommand.parseAsync(["node", "test", "req-000001"]);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Marked requirement as implemented"),
    );
  });
});
