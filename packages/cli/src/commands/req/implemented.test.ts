import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Requirement, Specification } from "@reqord/shared";
import { implementedCommand } from "./implemented.js";

// Mock services
vi.mock("../../services/requirement-service.js", () => ({
  updateRequirement: vi.fn(),
  showRequirement: vi.fn(),
}));

vi.mock("../../services/specification-service.js", () => ({
  listSpecifications: vi.fn(),
}));

import { updateRequirement, showRequirement } from "../../services/requirement-service.js";
import { listSpecifications } from "../../services/specification-service.js";

const mockUpdateRequirement = vi.mocked(updateRequirement);
const mockShowRequirement = vi.mocked(showRequirement);
const mockListSpecifications = vi.mocked(listSpecifications);

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

describe("req implemented command", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = 0;
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    // Reset Commander option state
    implementedCommand.setOptionValue("json", undefined);
  });

  it("approved → implementedへの遷移", async () => {
    const before = makeRequirement({ status: "approved", version: "2.0" });
    const after = makeRequirement({ status: "implemented", version: "2.0" });

    mockShowRequirement.mockResolvedValue({ requirement: before, description: null });
    mockListSpecifications.mockResolvedValue([]);
    mockUpdateRequirement.mockResolvedValue({ before, after, descriptionUpdated: false });

    await implementedCommand.parseAsync(["node", "test", "req-000001"]);

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

    await implementedCommand.parseAsync(["node", "test", "req-000001"]);

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

    await implementedCommand.parseAsync(["node", "test", "req-000001"]);

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

    await implementedCommand.parseAsync(["node", "test", "req-000001"]);

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
          gitCommit: "abc123",
          changedAt: "2026-01-01T00:00:00Z",
          summary: "Status changed from approved to implemented",
        },
      ],
    });

    mockShowRequirement.mockResolvedValue({ requirement: before, description: null });
    mockListSpecifications.mockResolvedValue([]);
    mockUpdateRequirement.mockResolvedValue({ before, after, descriptionUpdated: false });

    await implementedCommand.parseAsync(["node", "test", "req-000001"]);

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

    await implementedCommand.parseAsync(["node", "test", "req-000001", "--json"]);

    expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify(after, null, 2));
    // JSON mode should not print other messages
    expect(consoleLogSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Marked requirement as implemented"),
    );
  });

  it("JSON modeでは関連Specificationを表示しない", async () => {
    const before = makeRequirement({ status: "approved" });
    const after = makeRequirement({ status: "implemented" });
    const specs = [makeSpecification()];

    mockShowRequirement.mockResolvedValue({ requirement: before, description: null });
    mockListSpecifications.mockResolvedValue(specs);
    mockUpdateRequirement.mockResolvedValue({ before, after, descriptionUpdated: false });

    await implementedCommand.parseAsync(["node", "test", "req-000001", "--json"]);

    expect(consoleLogSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Related specifications"),
    );
  });
});
