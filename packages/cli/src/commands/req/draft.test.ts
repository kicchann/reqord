import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Requirement } from "@reqord/shared";
import { draftCommand } from "./draft.js";

// Mock services
vi.mock("../../services/requirement-service.js", () => ({
  updateRequirement: vi.fn(),
  showRequirement: vi.fn(),
}));

vi.mock("../../services/draft-reversion-service.js", () => ({
  revertToDraft: vi.fn(),
}));

import { updateRequirement, showRequirement } from "../../services/requirement-service.js";
import { revertToDraft } from "../../services/draft-reversion-service.js";

const mockUpdateRequirement = vi.mocked(updateRequirement);
const mockShowRequirement = vi.mocked(showRequirement);
const mockRevertToDraft = vi.mocked(revertToDraft);

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

  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = 0;
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    // Reset Commander option state
    draftCommand.setOptionValue("dryRun", undefined);
    draftCommand.setOptionValue("json", undefined);
  });

  describe("approved/implemented → draft (PR flow)", () => {
    it("approved状態でDraftReversionServiceが呼び出される", async () => {
      const requirement = makeRequirement({ status: "approved" });
      mockShowRequirement.mockResolvedValue({ requirement, description: null });
      mockRevertToDraft.mockResolvedValue({
        previousStatus: "approved",
        impactedRequirements: [],
        prNumber: 42,
        prUrl: "https://github.com/kicchann/reqord/pull/42",
      });

      await draftCommand.parseAsync(["node", "test", "req-000001"]);

      expect(mockRevertToDraft).toHaveBeenCalledWith(
        process.cwd(),
        "req-000001",
        { dryRun: undefined },
      );
      expect(mockUpdateRequirement).not.toHaveBeenCalled();
    });

    it("implemented状態でDraftReversionServiceが呼び出される", async () => {
      const requirement = makeRequirement({ status: "implemented" });
      mockShowRequirement.mockResolvedValue({ requirement, description: null });
      mockRevertToDraft.mockResolvedValue({
        previousStatus: "implemented",
        impactedRequirements: [],
        prNumber: 42,
        prUrl: "https://github.com/kicchann/reqord/pull/42",
      });

      await draftCommand.parseAsync(["node", "test", "req-000001"]);

      expect(mockRevertToDraft).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("PRを作成しました"),
      );
    });

    it("影響範囲が表示される", async () => {
      const requirement = makeRequirement({ status: "approved" });
      mockShowRequirement.mockResolvedValue({ requirement, description: null });
      mockRevertToDraft.mockResolvedValue({
        previousStatus: "approved",
        impactedRequirements: ["req-000002", "req-000003"],
        prNumber: 42,
        prUrl: "https://github.com/kicchann/reqord/pull/42",
      });

      await draftCommand.parseAsync(["node", "test", "req-000001"]);

      expect(consoleLogSpy).toHaveBeenCalledWith("影響範囲:");
      expect(consoleLogSpy).toHaveBeenCalledWith("  - req-000002");
      expect(consoleLogSpy).toHaveBeenCalledWith("  - req-000003");
    });

    it("--dry-runオプションが正しく渡される", async () => {
      const requirement = makeRequirement({ status: "approved" });
      mockShowRequirement.mockResolvedValue({ requirement, description: null });
      mockRevertToDraft.mockResolvedValue({
        previousStatus: "approved",
        impactedRequirements: [],
      });

      await draftCommand.parseAsync(["node", "test", "req-000001", "--dry-run"]);

      expect(mockRevertToDraft).toHaveBeenCalledWith(
        process.cwd(),
        "req-000001",
        { dryRun: true },
      );
    });
  });

  describe("other status → draft (direct update)", () => {
    it("approved/implemented以外の状態ではPRが作成されない", async () => {
      const before = makeRequirement({ status: "deprecated" });
      const after = makeRequirement({ status: "draft" });
      mockShowRequirement.mockResolvedValue({ requirement: before, description: null });
      mockUpdateRequirement.mockResolvedValue({ before, after, descriptionUpdated: false });

      await draftCommand.parseAsync(["node", "test", "req-000001"]);

      expect(mockRevertToDraft).not.toHaveBeenCalled();
      expect(mockUpdateRequirement).toHaveBeenCalledWith(
        process.cwd(),
        "req-000001",
        { status: "draft" },
      );
    });
  });

  it("フラグがある場合に警告表示", async () => {
    const requirement = makeRequirement({
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
    mockShowRequirement.mockResolvedValue({ requirement, description: null });
    mockRevertToDraft.mockResolvedValue({
      previousStatus: "approved",
      impactedRequirements: [],
      prNumber: 42,
      prUrl: "https://github.com/kicchann/reqord/pull/42",
    });

    await draftCommand.parseAsync(["node", "test", "req-000001"]);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Warning: req-000001 has 1 unresolved feedback flag(s)"),
    );
  });

  it("--jsonオプションでJSON出力（PRフロー）", async () => {
    const requirement = makeRequirement({ status: "approved" });
    mockShowRequirement.mockResolvedValue({ requirement, description: null });
    const result = {
      previousStatus: "approved",
      impactedRequirements: [],
      prNumber: 42,
      prUrl: "https://github.com/kicchann/reqord/pull/42",
    };
    mockRevertToDraft.mockResolvedValue(result);

    await draftCommand.parseAsync(["node", "test", "req-000001", "--json"]);

    expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify(result, null, 2));
  });

  it("--jsonオプションでJSON出力（直接更新フロー）", async () => {
    const before = makeRequirement({ status: "deprecated" });
    const after = makeRequirement({ status: "draft" });
    mockShowRequirement.mockResolvedValue({ requirement: before, description: null });
    mockUpdateRequirement.mockResolvedValue({ before, after, descriptionUpdated: false });

    await draftCommand.parseAsync(["node", "test", "req-000001", "--json"]);

    expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify(after, null, 2));
  });

  it("versionHistoryエントリが記録される（直接更新フロー）", async () => {
    const before = makeRequirement({
      status: "deprecated",
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
          summary: "Status changed from deprecated to draft",
        },
      ],
    });

    mockShowRequirement.mockResolvedValue({ requirement: before, description: null });
    mockUpdateRequirement.mockResolvedValue({ before, after, descriptionUpdated: false });

    await draftCommand.parseAsync(["node", "test", "req-000001"]);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("history: Status changed from deprecated to draft"),
    );
  });
});
