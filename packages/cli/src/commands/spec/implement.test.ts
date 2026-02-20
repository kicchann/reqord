import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Specification } from "@reqord/shared";
import { implementCommand } from "./implement.js";

// Mock services
vi.mock("../../services/specification-service.js", () => ({
  updateSpecification: vi.fn(),
  showSpecification: vi.fn(),
}));

import { updateSpecification, showSpecification } from "../../services/specification-service.js";

const mockUpdateSpecification = vi.mocked(updateSpecification);
const mockShowSpecification = vi.mocked(showSpecification);

function makeSpecification(overrides: Partial<Specification> = {}): Specification {
  return {
    id: "spec-000001",
    requirementId: "req-000001",
    version: "2.0",
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

describe("spec implement command", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = 0;
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    // Reset Commander option state
    implementCommand.setOptionValue("json", undefined);
  });

  it("approved → implementedへの遷移", async () => {
    const before = makeSpecification({ status: "approved", version: "2.0" });
    const after = makeSpecification({ status: "implemented", version: "2.0" });

    mockShowSpecification.mockResolvedValue({ specification: before, design: null });
    mockUpdateSpecification.mockResolvedValue({ before, after });

    await implementCommand.parseAsync(["node", "test", "spec-000001"]);

    expect(mockUpdateSpecification).toHaveBeenCalledWith(
      process.cwd(),
      "spec-000001",
      expect.objectContaining({
        status: "implemented",
      }),
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Marked specification as implemented: spec-000001"),
    );
    expect(consoleLogSpy).toHaveBeenCalledWith("  status: approved → implemented");
  });

  it("バージョンが据え置かれる（ステータスのみ変更）", async () => {
    const before = makeSpecification({ status: "approved", version: "2.0" });
    const after = makeSpecification({ status: "implemented", version: "2.0" });

    mockShowSpecification.mockResolvedValue({ specification: before, design: null });
    mockUpdateSpecification.mockResolvedValue({ before, after });

    await implementCommand.parseAsync(["node", "test", "spec-000001"]);

    // Version should not be displayed if unchanged
    expect(consoleLogSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("version:"),
    );
  });

  it("実装Issue全完了の場合、警告なし", async () => {
    const before = makeSpecification({
      status: "approved",
      implementation: {
        issues: [
          { number: 123, title: "Issue 1", url: "https://github.com/user/repo/issues/123", priority: "P1", status: "closed" },
          { number: 124, title: "Issue 2", url: "https://github.com/user/repo/issues/124", priority: "P2", status: "closed" },
        ],
        totalEstimatedHours: 10,
        createdAt: "2026-01-01T00:00:00Z",
      },
    });
    const after = makeSpecification({ status: "implemented" });

    mockShowSpecification.mockResolvedValue({ specification: before, design: null });
    mockUpdateSpecification.mockResolvedValue({ before, after });

    await implementCommand.parseAsync(["node", "test", "spec-000001"]);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Related implementation issues (2)"),
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("✓ #123: Issue 1"));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("✓ #124: Issue 2"));
    expect(consoleLogSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Warning"),
    );
  });

  it("実装Issue一部未完了の場合、警告表示", async () => {
    const before = makeSpecification({
      status: "approved",
      implementation: {
        issues: [
          { number: 123, title: "Issue 1", url: "https://github.com/user/repo/issues/123", priority: "P1", status: "closed" },
          { number: 124, title: "Issue 2", url: "https://github.com/user/repo/issues/124", priority: "P2", status: "open" },
        ],
        totalEstimatedHours: 10,
        createdAt: "2026-01-01T00:00:00Z",
      },
    });
    const after = makeSpecification({ status: "implemented" });

    mockShowSpecification.mockResolvedValue({ specification: before, design: null });
    mockUpdateSpecification.mockResolvedValue({ before, after });

    await implementCommand.parseAsync(["node", "test", "spec-000001"]);

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("✓ #123: Issue 1"));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("○ #124: Issue 2"));
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Warning: 1 issue(s) still open"),
    );
  });

  it("実装Issue全未完了の場合、警告表示", async () => {
    const before = makeSpecification({
      status: "approved",
      implementation: {
        issues: [
          { number: 123, title: "Issue 1", url: "https://github.com/user/repo/issues/123", priority: "P1", status: "open" },
          { number: 124, title: "Issue 2", url: "https://github.com/user/repo/issues/124", priority: "P2", status: "open" },
        ],
        totalEstimatedHours: 10,
        createdAt: "2026-01-01T00:00:00Z",
      },
    });
    const after = makeSpecification({ status: "implemented" });

    mockShowSpecification.mockResolvedValue({ specification: before, design: null });
    mockUpdateSpecification.mockResolvedValue({ before, after });

    await implementCommand.parseAsync(["node", "test", "spec-000001"]);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Warning: All implementation issues are still open"),
    );
  });

  it("実装Issueがない場合", async () => {
    const before = makeSpecification({ status: "approved" });
    const after = makeSpecification({ status: "implemented" });

    mockShowSpecification.mockResolvedValue({ specification: before, design: null });
    mockUpdateSpecification.mockResolvedValue({ before, after });

    await implementCommand.parseAsync(["node", "test", "spec-000001"]);

    expect(consoleLogSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Related implementation issues"),
    );
  });

  it("versionHistoryエントリが記録される", async () => {
    const before = makeSpecification({
      status: "approved",
      version: "2.0",
      versionHistory: [],
    });
    const after = makeSpecification({
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

    mockShowSpecification.mockResolvedValue({ specification: before, design: null });
    mockUpdateSpecification.mockResolvedValue({ before, after });

    await implementCommand.parseAsync(["node", "test", "spec-000001"]);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("history: Status changed from approved to implemented"),
    );
  });

  it("--jsonオプションでJSON出力", async () => {
    const before = makeSpecification({ status: "approved", version: "2.0" });
    const after = makeSpecification({ status: "implemented", version: "2.0" });

    mockShowSpecification.mockResolvedValue({ specification: before, design: null });
    mockUpdateSpecification.mockResolvedValue({ before, after });

    await implementCommand.parseAsync(["node", "test", "spec-000001", "--json"]);

    expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify(after, null, 2));
    // JSON mode should not print other messages
    expect(consoleLogSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Marked specification as implemented"),
    );
  });

  it("draftステータスでエラー", async () => {
    const spec = makeSpecification({ status: "draft" });

    mockShowSpecification.mockResolvedValue({ specification: spec, design: null });

    await implementCommand.parseAsync(["node", "test", "spec-000001"]);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining(`Specification status is not "approved" (current: draft)`),
    );
    expect(process.exitCode).toBe(1);
    expect(mockUpdateSpecification).not.toHaveBeenCalled();
  });

  it("implementedステータスでエラー", async () => {
    const spec = makeSpecification({ status: "implemented" });

    mockShowSpecification.mockResolvedValue({ specification: spec, design: null });

    await implementCommand.parseAsync(["node", "test", "spec-000001"]);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining(`Specification status is not "approved" (current: implemented)`),
    );
    expect(process.exitCode).toBe(1);
    expect(mockUpdateSpecification).not.toHaveBeenCalled();
  });

  it("draftステータス + --jsonでJSON形式のエラー出力", async () => {
    const spec = makeSpecification({ status: "draft" });

    mockShowSpecification.mockResolvedValue({ specification: spec, design: null });

    await implementCommand.parseAsync(["node", "test", "spec-000001", "--json"]);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('"error":true'),
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("VALIDATION_ERROR"),
    );
    expect(process.exitCode).toBe(1);
    expect(mockUpdateSpecification).not.toHaveBeenCalled();
  });

  it("JSON modeでは実装Issueを表示しない", async () => {
    const before = makeSpecification({
      status: "approved",
      implementation: {
        issues: [{ number: 123, title: "Issue 1", url: "https://github.com/user/repo/issues/123", priority: "P1", status: "open" }],
        totalEstimatedHours: 10,
        createdAt: "2026-01-01T00:00:00Z",
      },
    });
    const after = makeSpecification({ status: "implemented" });

    mockShowSpecification.mockResolvedValue({ specification: before, design: null });
    mockUpdateSpecification.mockResolvedValue({ before, after });

    await implementCommand.parseAsync(["node", "test", "spec-000001", "--json"]);

    expect(consoleLogSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Related implementation issues"),
    );
  });
});
