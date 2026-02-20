import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Specification } from "@reqord/shared";
import { draftCommand } from "./draft.js";

// Mock services
vi.mock("../../services/specification-service.js", () => ({
  updateSpecification: vi.fn(),
  showSpecification: vi.fn(),
}));

vi.mock("../../services/draft-reversion-service.js", () => ({
  revertToDraft: vi.fn(),
}));

import { updateSpecification, showSpecification } from "../../services/specification-service.js";
import { revertToDraft } from "../../services/draft-reversion-service.js";

const mockUpdateSpecification = vi.mocked(updateSpecification);
const mockShowSpecification = vi.mocked(showSpecification);
const mockRevertToDraft = vi.mocked(revertToDraft);

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
      const specification = makeSpecification({ status: "approved" });
      mockShowSpecification.mockResolvedValue({ specification, design: null });
      mockRevertToDraft.mockResolvedValue({
        previousStatus: "approved",
        impactedRequirements: [],
        prNumber: 42,
        prUrl: "https://github.com/kicchann/reqord/pull/42",
      });

      await draftCommand.parseAsync(["node", "test", "spec-000001"]);

      expect(mockRevertToDraft).toHaveBeenCalledWith(
        process.cwd(),
        "spec-000001",
        { dryRun: undefined },
      );
      expect(mockUpdateSpecification).not.toHaveBeenCalled();
    });

    it("implemented状態でDraftReversionServiceが呼び出される", async () => {
      const specification = makeSpecification({ status: "implemented" });
      mockShowSpecification.mockResolvedValue({ specification, design: null });
      mockRevertToDraft.mockResolvedValue({
        previousStatus: "implemented",
        impactedRequirements: [],
        prNumber: 42,
        prUrl: "https://github.com/kicchann/reqord/pull/42",
      });

      await draftCommand.parseAsync(["node", "test", "spec-000001"]);

      expect(mockRevertToDraft).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Reversion PR created"),
      );
    });

    it("--dry-runオプションが正しく渡される", async () => {
      const specification = makeSpecification({ status: "approved" });
      mockShowSpecification.mockResolvedValue({ specification, design: null });
      mockRevertToDraft.mockResolvedValue({
        previousStatus: "approved",
        impactedRequirements: [],
      });

      await draftCommand.parseAsync(["node", "test", "spec-000001", "--dry-run"]);

      expect(mockRevertToDraft).toHaveBeenCalledWith(
        process.cwd(),
        "spec-000001",
        { dryRun: true },
      );
    });
  });

  describe("other status → draft (direct update)", () => {
    it("approved/implemented以外の状態ではPRが作成されない", async () => {
      const before = makeSpecification({ status: "deprecated" });
      const after = makeSpecification({ status: "draft" });
      mockShowSpecification.mockResolvedValue({ specification: before, design: null });
      mockUpdateSpecification.mockResolvedValue({ before, after });

      await draftCommand.parseAsync(["node", "test", "spec-000001"]);

      expect(mockRevertToDraft).not.toHaveBeenCalled();
      expect(mockUpdateSpecification).toHaveBeenCalledWith(
        process.cwd(),
        "spec-000001",
        { status: "draft" },
      );
    });
  });

  it("フラグがある場合に警告表示", async () => {
    const specification = makeSpecification({
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
    mockShowSpecification.mockResolvedValue({ specification, design: null });
    mockRevertToDraft.mockResolvedValue({
      previousStatus: "approved",
      impactedRequirements: [],
      prNumber: 42,
      prUrl: "https://github.com/kicchann/reqord/pull/42",
    });

    await draftCommand.parseAsync(["node", "test", "spec-000001"]);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Warning: spec-000001 has 1 unresolved feedback flag(s)"),
    );
  });

  it("--jsonオプションでJSON出力（PRフロー）", async () => {
    const specification = makeSpecification({ status: "approved" });
    mockShowSpecification.mockResolvedValue({ specification, design: null });
    const result = {
      previousStatus: "approved",
      impactedRequirements: [],
      prNumber: 42,
      prUrl: "https://github.com/kicchann/reqord/pull/42",
    };
    mockRevertToDraft.mockResolvedValue(result);

    await draftCommand.parseAsync(["node", "test", "spec-000001", "--json"]);

    expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify(result, null, 2));
  });

  it("--jsonオプションでJSON出力（直接更新フロー）", async () => {
    const before = makeSpecification({ status: "deprecated" });
    const after = makeSpecification({ status: "draft" });
    mockShowSpecification.mockResolvedValue({ specification: before, design: null });
    mockUpdateSpecification.mockResolvedValue({ before, after });

    await draftCommand.parseAsync(["node", "test", "spec-000001", "--json"]);

    expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify(after, null, 2));
  });

  it("versionHistoryエントリが記録される（直接更新フロー）", async () => {
    const before = makeSpecification({
      status: "deprecated",
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
          changedAt: "2026-01-01T00:00:00Z",
          summary: "Status changed from deprecated to draft",
        },
      ],
    });

    mockShowSpecification.mockResolvedValue({ specification: before, design: null });
    mockUpdateSpecification.mockResolvedValue({ before, after });

    await draftCommand.parseAsync(["node", "test", "spec-000001"]);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("history: Status changed from deprecated to draft"),
    );
  });

  describe("--major/--patch deprecation warnings", () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      draftCommand.setOptionValue("major", undefined);
      draftCommand.setOptionValue("patch", undefined);
    });

    it("--major使用時にdeprecation警告を表示", async () => {
      const specification = makeSpecification({ status: "flagged" as any });
      mockShowSpecification.mockResolvedValue({ specification, design: null });
      mockUpdateSpecification.mockResolvedValue({
        before: specification,
        after: makeSpecification({ status: "draft" }),
      });

      await draftCommand.parseAsync(["node", "test", "spec-000001", "--major"]);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("--major/--patch options are deprecated"),
      );
    });

    it("--patch使用時にdeprecation警告を表示", async () => {
      const specification = makeSpecification({ status: "flagged" as any });
      mockShowSpecification.mockResolvedValue({ specification, design: null });
      mockUpdateSpecification.mockResolvedValue({
        before: specification,
        after: makeSpecification({ status: "draft" }),
      });

      await draftCommand.parseAsync(["node", "test", "spec-000001", "--patch"]);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("--major/--patch options are deprecated"),
      );
    });

    it("--major使用時にversionBumpがサービスに渡される", async () => {
      const specification = makeSpecification({ status: "flagged" as any });
      mockShowSpecification.mockResolvedValue({ specification, design: null });
      mockUpdateSpecification.mockResolvedValue({
        before: specification,
        after: makeSpecification({ status: "draft" }),
      });

      await draftCommand.parseAsync(["node", "test", "spec-000001", "--major"]);

      expect(mockUpdateSpecification).toHaveBeenCalledWith(
        process.cwd(),
        "spec-000001",
        expect.objectContaining({ status: "draft", versionBump: "major" }),
      );
    });

    it("--json指定時は警告を表示しない", async () => {
      const specification = makeSpecification({ status: "flagged" as any });
      mockShowSpecification.mockResolvedValue({ specification, design: null });
      mockUpdateSpecification.mockResolvedValue({
        before: specification,
        after: makeSpecification({ status: "draft" }),
      });

      await draftCommand.parseAsync(["node", "test", "spec-000001", "--major", "--json"]);

      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("deprecated"),
      );
    });
  });
});
