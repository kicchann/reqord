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
  shouldRevertToDraft,
  generateChangeSummary,
  determineNextVersionForSpec,
  generateSpecChangeSummary,
} from "./version-service.js";
import type { Requirement, Specification } from "@reqord/shared";

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

  it("status変更のみではバージョン据え置き", () => {
    const before = makeRequirement({ version: "1.2.3", status: "draft" });
    const after = makeRequirement({ version: "1.2.3", status: "approved" });
    expect(determineNextVersion(before, after)).toBe("1.2.3");
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

  it("status+title変更でtitle変更のminorを適用", () => {
    const before = makeRequirement({
      version: "1.2.3",
      status: "draft",
      title: "旧タイトル",
    });
    const after = makeRequirement({
      version: "1.2.3",
      status: "approved",
      title: "新タイトル",
    });
    expect(determineNextVersion(before, after)).toBe("1.3.0");
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

  it("flagsのみ変更ではバージョン据え置き", () => {
    const before = makeRequirement({
      version: "1.2.3",
      status: "approved",
      flags: [],
    });
    const after = makeRequirement({
      version: "1.2.3",
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
    expect(determineNextVersion(before, after)).toBe("1.2.3");
  });

  it("status+flags変更のみでもバージョン据え置き", () => {
    const before = makeRequirement({
      version: "1.2.3",
      status: "draft",
      flags: [],
    });
    const after = makeRequirement({
      version: "1.2.3",
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
    expect(determineNextVersion(before, after)).toBe("1.2.3");
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

    expect(transitions.get("draft")).toEqual(["approved"]);
    expect(transitions.get("approved")).toEqual(["implemented", "draft"]);
    expect(transitions.get("implemented")).toEqual(["draft"]);
    expect(transitions.get("deprecated")).toEqual([]);
  });
});

describe("isValidTransition", () => {
  it("draft→approvedが有効", () => {
    expect(isValidTransition("draft", "approved")).toBe(true);
  });

  it("approved→implementedが有効", () => {
    expect(isValidTransition("approved", "implemented")).toBe(true);
  });

  it("approved→draftが有効（差し戻し）", () => {
    expect(isValidTransition("approved", "draft")).toBe(true);
  });

  it("implemented→draftが有効（差し戻し）", () => {
    expect(isValidTransition("implemented", "draft")).toBe(true);
  });

  it("draft→implementedが無効", () => {
    expect(isValidTransition("draft", "implemented")).toBe(false);
  });

  it("deprecated→任意が無効", () => {
    expect(isValidTransition("deprecated", "draft")).toBe(false);
    expect(isValidTransition("deprecated", "approved")).toBe(false);
  });

  it("implemented→approvedが無効", () => {
    expect(isValidTransition("implemented", "approved")).toBe(false);
  });

  it("implemented→deprecatedが無効", () => {
    expect(isValidTransition("implemented", "deprecated")).toBe(false);
  });
});

describe("shouldRevertToDraft", () => {
  it("approved+内容変更でtrueを返す", () => {
    expect(shouldRevertToDraft("approved", true)).toBe(true);
  });

  it("implemented+内容変更でtrueを返す", () => {
    expect(shouldRevertToDraft("implemented", true)).toBe(true);
  });

  it("draft+内容変更でfalseを返す", () => {
    expect(shouldRevertToDraft("draft", true)).toBe(false);
  });

  it("approved+内容変更なしでfalseを返す", () => {
    expect(shouldRevertToDraft("approved", false)).toBe(false);
  });
});

describe("generateChangeSummary", () => {
  it("status変更時のサマリー", () => {
    const before = makeRequirement({ status: "draft" });
    const after = makeRequirement({ status: "approved" });
    const summary = generateChangeSummary(before, after);

    expect(summary).toContain("Status changed from draft to approved");
  });

  it("title変更時のサマリー", () => {
    const before = makeRequirement({ title: "旧タイトル" });
    const after = makeRequirement({ title: "新タイトル" });
    const summary = generateChangeSummary(before, after);

    expect(summary).toContain("Title updated");
  });

  it("複数変更時のサマリー結合", () => {
    const before = makeRequirement({ status: "draft", title: "旧タイトル" });
    const after = makeRequirement({ status: "approved", title: "新タイトル" });
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

// Factory function for Specification
function makeSpecification(overrides: Partial<Specification> = {}): Specification {
  return {
    id: "spec-000001",
    requirementId: "req-000001",
    version: "1.0.0",
    status: "draft",
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

describe("determineNextVersionForSpec", () => {
  it("supplementary大幅変更（3+ファイル追加）→ major", () => {
    const before = makeSpecification({ version: "1.2.3" });
    const after = makeSpecification({
      version: "1.2.3",
      files: {
        design: "specifications/spec-000001/design.md",
        supplementary: ["a.md", "b.md", "c.md"],
      },
    });
    expect(determineNextVersionForSpec(before, after)).toBe("2.0.0");
  });

  it("supplementary小規模変更（1-2ファイル追加）→ minor", () => {
    const before = makeSpecification({ version: "1.2.3" });
    const after = makeSpecification({
      version: "1.2.3",
      files: {
        design: "specifications/spec-000001/design.md",
        supplementary: ["a.md"],
      },
    });
    expect(determineNextVersionForSpec(before, after)).toBe("1.3.0");
  });

  it("supplementary 2ファイル追加 → minor", () => {
    const before = makeSpecification({ version: "1.2.3" });
    const after = makeSpecification({
      version: "1.2.3",
      files: {
        design: "specifications/spec-000001/design.md",
        supplementary: ["a.md", "b.md"],
      },
    });
    expect(determineNextVersionForSpec(before, after)).toBe("1.3.0");
  });

  it("supplementary削除(1-2ファイル) → minor", () => {
    const before = makeSpecification({
      version: "1.2.3",
      files: {
        design: "specifications/spec-000001/design.md",
        supplementary: ["a.md", "b.md"],
      },
    });
    const after = makeSpecification({ version: "1.2.3" });
    expect(determineNextVersionForSpec(before, after)).toBe("1.3.0");
  });

  it("supplementary大幅削除(3+ファイル) → major", () => {
    const before = makeSpecification({
      version: "1.2.3",
      files: {
        design: "specifications/spec-000001/design.md",
        supplementary: ["a.md", "b.md", "c.md"],
      },
    });
    const after = makeSpecification({ version: "1.2.3" });
    expect(determineNextVersionForSpec(before, after)).toBe("2.0.0");
  });

  it("designパス変更 → patch", () => {
    const before = makeSpecification({ version: "1.2.3" });
    const after = makeSpecification({
      version: "1.2.3",
      files: {
        design: "specifications/spec-000001/design-v2.md",
        supplementary: [],
      },
    });
    expect(determineNextVersionForSpec(before, after)).toBe("1.2.4");
  });

  it("ステータスのみ変更 → 据え置き", () => {
    const before = makeSpecification({ version: "1.2.3", status: "draft" });
    const after = makeSpecification({ version: "1.2.3", status: "approved" });
    expect(determineNextVersionForSpec(before, after)).toBe("1.2.3");
  });

  it("flagsのみ変更 → 据え置き", () => {
    const before = makeSpecification({ version: "1.2.3", flags: [] });
    const after = makeSpecification({
      version: "1.2.3",
      flags: [{ type: "feedback-review", reason: "test", createdAt: "2026-01-01T00:00:00Z", relatedIssues: [], severity: "medium" }],
    });
    expect(determineNextVersionForSpec(before, after)).toBe("1.2.3");
  });

  it("変更なし → 据え置き", () => {
    const before = makeSpecification({ version: "1.2.3" });
    const after = makeSpecification({ version: "1.2.3" });
    expect(determineNextVersionForSpec(before, after)).toBe("1.2.3");
  });
});

describe("generateSpecChangeSummary", () => {
  it("ステータス変更時のサマリー", () => {
    const before = makeSpecification({ status: "draft" });
    const after = makeSpecification({ status: "approved" });
    const summary = generateSpecChangeSummary(before, after);
    expect(summary).toBe("Status changed from draft to approved");
  });

  it("supplementary追加時のサマリー", () => {
    const before = makeSpecification();
    const after = makeSpecification({
      files: {
        design: "specifications/spec-000001/design.md",
        supplementary: ["a.md", "b.md"],
      },
    });
    const summary = generateSpecChangeSummary(before, after);
    expect(summary).toBe("2 supplementary file(s) added");
  });

  it("supplementary削除時のサマリー", () => {
    const before = makeSpecification({
      files: {
        design: "specifications/spec-000001/design.md",
        supplementary: ["a.md", "b.md", "c.md"],
      },
    });
    const after = makeSpecification();
    const summary = generateSpecChangeSummary(before, after);
    expect(summary).toBe("3 supplementary file(s) removed");
  });

  it("designファイルパス変更時のサマリー", () => {
    const before = makeSpecification();
    const after = makeSpecification({
      files: {
        design: "specifications/spec-000001/design-v2.md",
        supplementary: [],
      },
    });
    const summary = generateSpecChangeSummary(before, after);
    expect(summary).toBe("Design file path updated");
  });

  it("flags変更時のサマリー", () => {
    const before = makeSpecification({ flags: [] });
    const after = makeSpecification({
      flags: [{ type: "feedback-review", reason: "test", createdAt: "2026-01-01T00:00:00Z", relatedIssues: [], severity: "medium" }],
    });
    const summary = generateSpecChangeSummary(before, after);
    expect(summary).toBe("Flags updated");
  });

  it("複数変更の結合", () => {
    const before = makeSpecification({ status: "draft" });
    const after = makeSpecification({
      status: "approved",
      files: {
        design: "specifications/spec-000001/design-v2.md",
        supplementary: ["a.md"],
      },
    });
    const summary = generateSpecChangeSummary(before, after);
    expect(summary).toContain("Status changed from draft to approved");
    expect(summary).toContain("1 supplementary file(s) added");
    expect(summary).toContain("Design file path updated");
    expect(summary).toContain(", ");
  });

  it("変更なしの場合", () => {
    const before = makeSpecification();
    const after = makeSpecification();
    const summary = generateSpecChangeSummary(before, after);
    expect(summary).toBe("Specification updated");
  });
});
