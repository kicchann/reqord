import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Requirement } from "@reqord/shared";
import { draftCommand } from "./draft.js";

// Mock services
vi.mock("../../services/requirement-service.js", () => ({
  updateRequirement: vi.fn(),
  showRequirement: vi.fn(),
}));

import { updateRequirement, showRequirement } from "../../services/requirement-service.js";

const mockUpdateRequirement = vi.mocked(updateRequirement);
const mockShowRequirement = vi.mocked(showRequirement);

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
    successCriteria: [],
    format: { type: "free-form" },
    dependencies: { blockedBy: [], blocks: [], relatedTo: [] },
    flags: [],
    ...overrides,
  };
}

describe("req draft command", () => {
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
    const before = makeRequirement({ status: "approved", version: "2.0" });
    const after = makeRequirement({ status: "draft", version: "2.0" });

    mockShowRequirement.mockResolvedValue({ requirement: before, description: null });
    mockUpdateRequirement.mockResolvedValue({ before, after, descriptionUpdated: false });

    await draftCommand.parseAsync(["node", "test", "req-000001"]);

    expect(mockUpdateRequirement).toHaveBeenCalledWith(
      process.cwd(),
      "req-000001",
      expect.objectContaining({
        status: "draft",
      }),
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Reverted requirement to draft: req-000001"),
    );
    expect(consoleLogSpy).toHaveBeenCalledWith("  status: approved → draft");
  });

  it("implemented → draftへの差し戻し", async () => {
    const before = makeRequirement({ status: "implemented", version: "3.0" });
    const after = makeRequirement({ status: "draft", version: "3.0" });

    mockShowRequirement.mockResolvedValue({ requirement: before, description: null });
    mockUpdateRequirement.mockResolvedValue({ before, after, descriptionUpdated: false });

    await draftCommand.parseAsync(["node", "test", "req-000001"]);

    expect(consoleLogSpy).toHaveBeenCalledWith("  status: implemented → draft");
  });

  it("フラグがある場合に警告表示", async () => {
    const before = makeRequirement({
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
    const after = makeRequirement({ status: "draft" });

    mockShowRequirement.mockResolvedValue({ requirement: before, description: null });
    mockUpdateRequirement.mockResolvedValue({ before, after, descriptionUpdated: false });

    await draftCommand.parseAsync(["node", "test", "req-000001"]);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Warning: req-000001 has 1 unresolved feedback flag(s)"),
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("feedback-review: 要確認 (medium)"),
    );
  });

  it("versionBumpを渡さずにステータスのみ変更", async () => {
    const before = makeRequirement({ status: "approved", version: "2.0" });
    const after = makeRequirement({ status: "draft", version: "2.0" });

    mockShowRequirement.mockResolvedValue({ requirement: before, description: null });
    mockUpdateRequirement.mockResolvedValue({ before, after, descriptionUpdated: false });

    await draftCommand.parseAsync(["node", "test", "req-000001"]);

    expect(mockUpdateRequirement).toHaveBeenCalledWith(
      process.cwd(),
      "req-000001",
      { status: "draft" },
    );
  });

  it("--jsonオプションでJSON出力", async () => {
    const before = makeRequirement({ status: "approved", version: "2.0" });
    const after = makeRequirement({ status: "draft", version: "2.0" });

    mockShowRequirement.mockResolvedValue({ requirement: before, description: null });
    mockUpdateRequirement.mockResolvedValue({ before, after, descriptionUpdated: false });

    await draftCommand.parseAsync(["node", "test", "req-000001", "--json"]);

    expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify(after, null, 2));
    expect(consoleLogSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Reverted requirement to draft"),
    );
  });

  it("versionHistoryエントリが記録される", async () => {
    const before = makeRequirement({
      status: "approved",
      version: "2.0",
      versionHistory: [],
    });
    const after = makeRequirement({
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

    mockShowRequirement.mockResolvedValue({ requirement: before, description: null });
    mockUpdateRequirement.mockResolvedValue({ before, after, descriptionUpdated: false });

    await draftCommand.parseAsync(["node", "test", "req-000001"]);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("history: Status changed from approved to draft"),
    );
  });
});
