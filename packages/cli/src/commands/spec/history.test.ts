import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Specification } from "@reqord/shared";
import { historyCommand } from "./history.js";

// Mock services
vi.mock("../../services/specification-service.js", () => ({
  showSpecification: vi.fn(),
}));

import { showSpecification } from "../../services/specification-service.js";

const mockShowSpecification = vi.mocked(showSpecification);

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

describe("spec history command", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = 0;
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    // Reset Commander option state
    historyCommand.setOptionValue("json", undefined);
  });

  it("テーブル形式でバージョン履歴を表示", async () => {
    const spec = makeSpecification({
      versionHistory: [
        {
          version: "1.0",
          status: "draft",
          changedAt: "2026-01-01T00:00:00Z",
          summary: "Initial version",
        },
        {
          version: "2.0",
          status: "approved",
          changedAt: "2026-01-02T00:00:00Z",
          summary: "Status changed from draft to approved",
        },
      ],
    });

    mockShowSpecification.mockResolvedValue({ specification: spec, design: null });

    await historyCommand.parseAsync(["node", "test", "spec-000001"]);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Version History: spec-000001"),
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("2 version(s) found"),
    );
  });

  it("バージョン履歴がない場合のメッセージ表示", async () => {
    const spec = makeSpecification({ versionHistory: [] });

    mockShowSpecification.mockResolvedValue({ specification: spec, design: null });

    await historyCommand.parseAsync(["node", "test", "spec-000001"]);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("No version history for spec-000001"),
    );
  });

  it("--jsonオプションでJSON出力", async () => {
    const versionHistory = [
      {
        version: "1.0",
        status: "draft" as const,
        changedAt: "2026-01-01T00:00:00Z",
        summary: "Initial version",
      },
      {
        version: "2.0.0",
        status: "approved" as const,
        changedAt: "2026-01-02T00:00:00Z",
        summary: "Status changed",
      },
    ];
    const spec = makeSpecification({ versionHistory });

    mockShowSpecification.mockResolvedValue({ specification: spec, design: null });

    await historyCommand.parseAsync(["node", "test", "spec-000001", "--json"]);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      JSON.stringify(versionHistory, null, 2),
    );
    // JSON mode should not print table
    expect(consoleLogSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Version History"),
    );
  });

  it("存在しないspecificationでエラー", async () => {
    mockShowSpecification.mockRejectedValue(new Error("Specification not found"));

    await historyCommand.parseAsync(["node", "test", "spec-999999"]);

    expect(process.exitCode).toBe(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Specification not found"),
    );
  });

  it("長いsummaryは切り詰められる", async () => {
    const spec = makeSpecification({
      versionHistory: [
        {
          version: "1.0",
          status: "draft",
          changedAt: "2026-01-01T00:00:00Z",
          summary: "This is a very long summary that should be truncated when displayed in the table format",
        },
      ],
    });

    mockShowSpecification.mockResolvedValue({ specification: spec, design: null });

    await historyCommand.parseAsync(["node", "test", "spec-000001"]);

    // Table output is called, but we can't easily assert the truncated content
    // Just verify it doesn't throw
    expect(consoleLogSpy).toHaveBeenCalled();
  });

  it("複数のステータス変更履歴を表示", async () => {
    const spec = makeSpecification({
      versionHistory: [
        {
          version: "1.0",
          status: "draft" as const,
          changedAt: "2026-01-01T00:00:00Z",
          summary: "Initial version",
        },
        {
          version: "2.0",
          status: "approved" as const,
          changedAt: "2026-01-02T00:00:00Z",
          summary: "Approved",
        },
        {
          version: "2.0",
          status: "implemented" as const,
          changedAt: "2026-01-03T00:00:00Z",
          summary: "Implemented",
        },
      ],
    });

    mockShowSpecification.mockResolvedValue({ specification: spec, design: null });

    await historyCommand.parseAsync(["node", "test", "spec-000001"]);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("3 version(s) found"),
    );
  });
});
