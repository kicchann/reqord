import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Specification } from "@reqord/shared";
import { draftCommand } from "./draft.js";

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

describe("spec draft command", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = 0;
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    // Reset Commander option state
    draftCommand.setOptionValue("json", undefined);
  });

  it("approved → draftへの差し戻し", async () => {
    const before = makeSpecification({ status: "approved", version: "2.0" });
    const after = makeSpecification({ status: "draft", version: "2.0" });

    mockShowSpecification.mockResolvedValue({ specification: before, design: null });
    mockUpdateSpecification.mockResolvedValue({ before, after });

    await draftCommand.parseAsync(["node", "test", "spec-000001"]);

    expect(mockUpdateSpecification).toHaveBeenCalledWith(
      process.cwd(),
      "spec-000001",
      expect.objectContaining({
        status: "draft",
      }),
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Reverted specification to draft: spec-000001"),
    );
    expect(consoleLogSpy).toHaveBeenCalledWith("  status: approved → draft");
  });

  it("implemented → draftへの差し戻し", async () => {
    const before = makeSpecification({ status: "implemented", version: "3.0" });
    const after = makeSpecification({ status: "draft", version: "3.0" });

    mockShowSpecification.mockResolvedValue({ specification: before, design: null });
    mockUpdateSpecification.mockResolvedValue({ before, after });

    await draftCommand.parseAsync(["node", "test", "spec-000001"]);

    expect(consoleLogSpy).toHaveBeenCalledWith("  status: implemented → draft");
  });

  it("フラグがある場合に警告表示", async () => {
    const before = makeSpecification({
      status: "approved",
      flags: [
        {
          type: "feedback-review",
          reason: "要確認",
          createdAt: "2026-01-01T00:00:00Z",
          relatedIssues: [123],
          severity: "medium",
        },
      ],
    });
    const after = makeSpecification({ status: "draft" });

    mockShowSpecification.mockResolvedValue({ specification: before, design: null });
    mockUpdateSpecification.mockResolvedValue({ before, after });

    await draftCommand.parseAsync(["node", "test", "spec-000001"]);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Warning: spec-000001 has 1 unresolved feedback flag(s)"),
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("feedback-review: 要確認 (medium)"),
    );
  });

  it("versionBumpを渡さずにステータスのみ変更", async () => {
    const before = makeSpecification({ status: "approved", version: "2.0" });
    const after = makeSpecification({ status: "draft", version: "2.0" });

    mockShowSpecification.mockResolvedValue({ specification: before, design: null });
    mockUpdateSpecification.mockResolvedValue({ before, after });

    await draftCommand.parseAsync(["node", "test", "spec-000001"]);

    expect(mockUpdateSpecification).toHaveBeenCalledWith(
      process.cwd(),
      "spec-000001",
      { status: "draft" },
    );
  });

  it("--jsonオプションでJSON出力", async () => {
    const before = makeSpecification({ status: "approved", version: "2.0" });
    const after = makeSpecification({ status: "draft", version: "2.0" });

    mockShowSpecification.mockResolvedValue({ specification: before, design: null });
    mockUpdateSpecification.mockResolvedValue({ before, after });

    await draftCommand.parseAsync(["node", "test", "spec-000001", "--json"]);

    expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify(after, null, 2));
    expect(consoleLogSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Reverted specification to draft"),
    );
  });

  it("versionHistoryエントリが記録される", async () => {
    const before = makeSpecification({
      status: "approved",
      version: "2.0",
      versionHistory: [],
    });
    const after = makeSpecification({
      status: "draft",
      version: "2.0",
      versionHistory: [
        {
          version: "2.0",
          status: "draft",
          gitCommit: "abc123",
          changedAt: "2026-01-01T00:00:00Z",
          summary: "Status changed from approved to draft",
        },
      ],
    });

    mockShowSpecification.mockResolvedValue({ specification: before, design: null });
    mockUpdateSpecification.mockResolvedValue({ before, after });

    await draftCommand.parseAsync(["node", "test", "spec-000001"]);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("history: Status changed from approved to draft"),
    );
  });
});
