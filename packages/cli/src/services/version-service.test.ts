import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock declarations BEFORE imports
const { mockExecSync } = vi.hoisted(() => ({
  mockExecSync: vi.fn(),
}));
vi.mock("node:child_process", () => ({
  execSync: mockExecSync,
}));
import {
  parseVersion,
  formatVersion,
  determineNextVersion,
  createHistoryEntry,
  getCurrentGitCommit,
  getStateTransitions,
  isValidTransition,
  shouldRevertToPendingApproval,
  generateChangeSummary,
} from "./version-service.js";
import type { Requirement } from "@reqord/shared";

// Factory function
function makeRequirement(overrides: Partial<Requirement> = {}): Requirement {
  return {
    id: "req-000001",
    version: "1.0.0",
    title: "テスト要件タイトル",
    status: "draft",
    priority: "medium",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    versionHistory: [],
    files: { description: "requirements/req-000001/description.md", supplementary: [] },
    successCriteria: ["基準1"],
    format: { type: "free-form" },
    dependencies: { blockedBy: [], blocks: [], relatedTo: [] },
    flags: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("parseVersion", () => {
  it('"1.2.3"を正しくパースできる', () => {
    const result = parseVersion("1.2.3");
    expect(result).toEqual({ major: 1, minor: 2, patch: 3 });
  });

  it('"0.0.0"を正しくパースできる', () => {
    const result = parseVersion("0.0.0");
    expect(result).toEqual({ major: 0, minor: 0, patch: 0 });
  });

  it("無効な形式でエラーを投げる", () => {
    expect(() => parseVersion("1.2")).toThrow();
    expect(() => parseVersion("abc")).toThrow();
    expect(() => parseVersion("1.2.3.4")).toThrow();
  });
});

describe("formatVersion", () => {
  it("正しい文字列形式を返す", () => {
    expect(formatVersion(1, 2, 3)).toBe("1.2.3");
    expect(formatVersion(0, 0, 0)).toBe("0.0.0");
    expect(formatVersion(10, 20, 30)).toBe("10.20.30");
  });
});

describe("determineNextVersion", () => {
  it("draft→draftの場合、バージョン据え置き（title変更あり）", () => {
    const before = makeRequirement({ version: "1.2.3", status: "draft", title: "旧タイトル" });
    const after = makeRequirement({ version: "1.2.3", status: "draft", title: "新タイトル" });
    expect(determineNextVersion(before, after)).toBe("1.2.3");
  });

  it("draft→draftの場合、バージョン据え置き（priority変更あり）", () => {
    const before = makeRequirement({ version: "1.2.3", status: "draft", priority: "low" });
    const after = makeRequirement({ version: "1.2.3", status: "draft", priority: "high" });
    expect(determineNextVersion(before, after)).toBe("1.2.3");
  });

  it("status変更でmajorバージョンを上げる", () => {
    const before = makeRequirement({ version: "1.2.3", status: "draft" });
    const after = makeRequirement({ version: "1.2.3", status: "pending_approval" });
    expect(determineNextVersion(before, after)).toBe("2.0.0");
  });

  it("title変更でminorバージョンを上げる", () => {
    const before = makeRequirement({ version: "1.2.3", status: "approved", title: "旧タイトル" });
    const after = makeRequirement({ version: "1.2.3", status: "approved", title: "新タイトル" });
    expect(determineNextVersion(before, after)).toBe("1.3.0");
  });

  it("format変更でminorバージョンを上げる", () => {
    const before = makeRequirement({
      version: "1.2.3",
      status: "approved",
      format: { type: "free-form" },
    });
    const after = makeRequirement({
      version: "1.2.3",
      status: "approved",
      format: { type: "user-story", userStory: { as: "u", iWant: "w", soThat: "s" } },
    });
    expect(determineNextVersion(before, after)).toBe("1.3.0");
  });

  it("dependencies変更でminorバージョンを上げる", () => {
    const before = makeRequirement({
      version: "1.2.3",
      status: "approved",
      dependencies: { blockedBy: [], blocks: [], relatedTo: [] },
    });
    const after = makeRequirement({
      version: "1.2.3",
      status: "approved",
      dependencies: { blockedBy: ["req-000002"], blocks: [], relatedTo: [] },
    });
    expect(determineNextVersion(before, after)).toBe("1.3.0");
  });

  it("successCriteria変更でminorバージョンを上げる", () => {
    const before = makeRequirement({
      version: "1.2.3",
      status: "approved",
      successCriteria: ["基準1"],
    });
    const after = makeRequirement({
      version: "1.2.3",
      status: "approved",
      successCriteria: ["基準1", "基準2"],
    });
    expect(determineNextVersion(before, after)).toBe("1.3.0");
  });

  it("priority変更のみでpatchバージョンを上げる", () => {
    const before = makeRequirement({
      version: "1.2.3",
      status: "approved",
      priority: "low",
    });
    const after = makeRequirement({
      version: "1.2.3",
      status: "approved",
      priority: "high",
    });
    expect(determineNextVersion(before, after)).toBe("1.2.4");
  });

  it("status+title変更でmajorを優先", () => {
    const before = makeRequirement({
      version: "1.2.3",
      status: "draft",
      title: "旧タイトル",
    });
    const after = makeRequirement({
      version: "1.2.3",
      status: "pending_approval",
      title: "新タイトル",
    });
    expect(determineNextVersion(before, after)).toBe("2.0.0");
  });

  it("title+priority変更でminorを優先", () => {
    const before = makeRequirement({
      version: "1.2.3",
      status: "approved",
      title: "旧タイトル",
      priority: "low",
    });
    const after = makeRequirement({
      version: "1.2.3",
      status: "approved",
      title: "新タイトル",
      priority: "high",
    });
    expect(determineNextVersion(before, after)).toBe("1.3.0");
  });
});

describe("createHistoryEntry", () => {
  it("正しいフィールドが設定される", () => {
    const req = makeRequirement({ version: "1.2.3", status: "draft" });
    const entry = createHistoryEntry(req);

    expect(entry.version).toBe("1.2.3");
    expect(entry.status).toBe("draft");
    expect(entry.changedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(entry.summary).toBeTruthy();
  });

  it("gitCommitが渡された場合に使われる", () => {
    const req = makeRequirement();
    const entry = createHistoryEntry(req, { gitCommit: "abc1234" });

    expect(entry.gitCommit).toBe("abc1234");
  });

  it("gitCommitが渡されなかった場合にexecSyncで自動取得", () => {
    mockExecSync.mockReturnValue("def5678\n");

    const req = makeRequirement();
    const entry = createHistoryEntry(req);

    expect(entry.gitCommit).toBe("def5678");
  });

  it("execSyncが失敗した場合に空文字列", () => {
    mockExecSync.mockImplementation(() => {
      throw new Error("not a git repo");
    });

    const req = makeRequirement();
    const entry = createHistoryEntry(req);

    expect(entry.gitCommit).toBe("");
  });

  it("approved状態でapprovedAt/approvedByが設定される", () => {
    const req = makeRequirement({ status: "approved" });
    const entry = createHistoryEntry(req);

    expect(entry.approvedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(entry.approvedBy).toEqual([]);
  });

  it("summaryが渡された場合に使われる", () => {
    const req = makeRequirement();
    const entry = createHistoryEntry(req, { summary: "カスタムサマリー" });

    expect(entry.summary).toBe("カスタムサマリー");
  });
});

describe("getCurrentGitCommit", () => {
  it("execSyncの結果を返す", () => {
    mockExecSync.mockReturnValue("abc1234\n");
    expect(getCurrentGitCommit()).toBe("abc1234");
  });

  it("失敗時に空文字列を返す", () => {
    mockExecSync.mockImplementation(() => {
      throw new Error("not a git repo");
    });
    expect(getCurrentGitCommit()).toBe("");
  });
});

describe("getStateTransitions", () => {
  it("正しい遷移マップを返す", () => {
    const transitions = getStateTransitions();

    expect(transitions.get("draft")).toEqual(["pending_approval"]);
    expect(transitions.get("pending_approval")).toEqual(["approved", "draft"]);
    expect(transitions.get("approved")).toEqual(["implemented", "deprecated"]);
    expect(transitions.get("implemented")).toEqual([]);
    expect(transitions.get("deprecated")).toEqual([]);
  });
});

describe("isValidTransition", () => {
  it("draft→pending_approvalが有効", () => {
    expect(isValidTransition("draft", "pending_approval")).toBe(true);
  });

  it("pending_approval→approvedが有効", () => {
    expect(isValidTransition("pending_approval", "approved")).toBe(true);
  });

  it("pending_approval→draftが有効", () => {
    expect(isValidTransition("pending_approval", "draft")).toBe(true);
  });

  it("approved→deprecatedが有効", () => {
    expect(isValidTransition("approved", "deprecated")).toBe(true);
  });

  it("approved→implementedが有効", () => {
    expect(isValidTransition("approved", "implemented")).toBe(true);
  });

  it("approved→draftが無効", () => {
    expect(isValidTransition("approved", "draft")).toBe(false);
  });

  it("deprecated→任意が無効", () => {
    expect(isValidTransition("deprecated", "draft")).toBe(false);
    expect(isValidTransition("deprecated", "approved")).toBe(false);
  });

  it("implemented→任意が無効（明示的遷移なし）", () => {
    expect(isValidTransition("implemented", "deprecated")).toBe(false);
    expect(isValidTransition("implemented", "draft")).toBe(false);
  });
});

describe("shouldRevertToPendingApproval", () => {
  it("approved+内容変更でtrueを返す", () => {
    expect(shouldRevertToPendingApproval("approved", true)).toBe(true);
  });

  it("implemented+内容変更でtrueを返す", () => {
    expect(shouldRevertToPendingApproval("implemented", true)).toBe(true);
  });

  it("draft+内容変更でfalseを返す", () => {
    expect(shouldRevertToPendingApproval("draft", true)).toBe(false);
  });

  it("approved+内容変更なしでfalseを返す", () => {
    expect(shouldRevertToPendingApproval("approved", false)).toBe(false);
  });
});

describe("generateChangeSummary", () => {
  it("status変更時のサマリー", () => {
    const before = makeRequirement({ status: "draft" });
    const after = makeRequirement({ status: "pending_approval" });
    const summary = generateChangeSummary(before, after);

    expect(summary).toContain("Status changed from draft to pending_approval");
  });

  it("title変更時のサマリー", () => {
    const before = makeRequirement({ title: "旧タイトル" });
    const after = makeRequirement({ title: "新タイトル" });
    const summary = generateChangeSummary(before, after);

    expect(summary).toContain("Title updated");
  });

  it("複数変更時のサマリー結合", () => {
    const before = makeRequirement({ status: "draft", title: "旧タイトル" });
    const after = makeRequirement({ status: "pending_approval", title: "新タイトル" });
    const summary = generateChangeSummary(before, after);

    expect(summary).toContain("Status changed");
    expect(summary).toContain("Title updated");
    expect(summary).toContain(", ");
  });

  it("変更なしの場合", () => {
    const before = makeRequirement();
    const after = makeRequirement();
    const summary = generateChangeSummary(before, after);

    expect(summary).toBe("Requirement updated");
  });
});
