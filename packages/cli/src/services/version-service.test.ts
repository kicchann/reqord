import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  parseVersion,
  formatVersion,
  determineNextVersion,
  createHistoryEntry,
  getStateTransitions,
  isValidTransition,
  shouldRevertToDraft,
  generateChangeSummary,
  determineNextVersionForSpec,
  generateSpecChangeSummary,
  applyVersionBump,
} from "./version-service.js";
import type { Requirement, Specification } from "@reqord/shared";
import { VersionHistoryEntrySchema } from "@reqord/shared";

// Factory function
function makeRequirement(overrides: Partial<Requirement> = {}): Requirement {
  return {
    id: "req-000001",
    version: "1.0",
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

// Factory function for Specification
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
    flags: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("parseVersion", () => {
  it('"1.0"を正しくパースできる', () => {
    const result = parseVersion("1.0");
    expect(result).toEqual({ major: 1, minor: 0 });
  });

  it('"2.5"を正しくパースできる', () => {
    const result = parseVersion("2.5");
    expect(result).toEqual({ major: 2, minor: 5 });
  });

  it('"0.0"を正しくパースできる', () => {
    const result = parseVersion("0.0");
    expect(result).toEqual({ major: 0, minor: 0 });
  });

  it("旧形式x.y.zでエラーを投げる", () => {
    expect(() => parseVersion("1.0.0")).toThrow("Must be X.Y format");
  });

  it("不正な形式でエラーを投げる", () => {
    expect(() => parseVersion("abc")).toThrow("Must be X.Y format");
    expect(() => parseVersion("1")).toThrow("Must be X.Y format");
    expect(() => parseVersion("1.2.3.4")).toThrow("Must be X.Y format");
  });
});

describe("formatVersion", () => {
  it("正しい文字列形式を返す", () => {
    expect(formatVersion(1, 0)).toBe("1.0");
    expect(formatVersion(0, 0)).toBe("0.0");
    expect(formatVersion(10, 20)).toBe("10.20");
    expect(formatVersion(2, 5)).toBe("2.5");
  });
});

describe("applyVersionBump", () => {
  it("majorバンプでX.0にインクリメント", () => {
    expect(applyVersionBump("1.5", "major")).toBe("2.0");
  });

  it("patchバンプで.Yをインクリメント", () => {
    expect(applyVersionBump("1.5", "patch")).toBe("1.6");
  });

  it("majorバンプで0.0からのインクリメント", () => {
    expect(applyVersionBump("0.0", "major")).toBe("1.0");
  });

  it("patchバンプで0.0からのインクリメント", () => {
    expect(applyVersionBump("0.0", "patch")).toBe("0.1");
  });
});

describe("determineNextVersion", () => {
  it("draft→draftの場合、バージョン据え置き", () => {
    const before = makeRequirement({ version: "1.0", status: "draft", title: "旧タイトル" });
    const after = makeRequirement({ version: "1.0", status: "draft", title: "新タイトル" });
    expect(determineNextVersion(before, after)).toBe("1.0");
  });

  it("ステータス変更のみではバージョン据え置き", () => {
    const before = makeRequirement({ version: "1.0", status: "draft" });
    const after = makeRequirement({ version: "1.0", status: "approved" });
    expect(determineNextVersion(before, after)).toBe("1.0");
  });

  it("内容変更があってもバージョン据え置き", () => {
    const before = makeRequirement({ version: "1.0", status: "approved", title: "旧タイトル" });
    const after = makeRequirement({ version: "1.0", status: "approved", title: "新タイトル" });
    expect(determineNextVersion(before, after)).toBe("1.0");
  });

  it("priority変更のみでもバージョン据え置き", () => {
    const before = makeRequirement({ version: "1.0", status: "approved", priority: "low" });
    const after = makeRequirement({ version: "1.0", status: "approved", priority: "high" });
    expect(determineNextVersion(before, after)).toBe("1.0");
  });

  it("flagsのみ変更でもバージョン据え置き", () => {
    const before = makeRequirement({ version: "2.3", status: "approved", flags: [] });
    const after = makeRequirement({
      version: "2.3",
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
    expect(determineNextVersion(before, after)).toBe("2.3");
  });
});

describe("determineNextVersionForSpec", () => {
  it("ステータスのみ変更 → 据え置き", () => {
    const before = makeSpecification({ version: "1.0", status: "draft" });
    const after = makeSpecification({ version: "1.0", status: "approved" });
    expect(determineNextVersionForSpec(before, after)).toBe("1.0");
  });

  it("supplementaryファイル追加 → 据え置き", () => {
    const before = makeSpecification({ version: "1.0" });
    const after = makeSpecification({
      version: "1.0",
      files: {
        design: "specifications/spec-000001/design.md",
        supplementary: ["a.md", "b.md", "c.md"],
      },
    });
    expect(determineNextVersionForSpec(before, after)).toBe("1.0");
  });

  it("designパス変更 → 据え置き", () => {
    const before = makeSpecification({ version: "1.0" });
    const after = makeSpecification({
      version: "1.0",
      files: {
        design: "specifications/spec-000001/design-v2.md",
        supplementary: [],
      },
    });
    expect(determineNextVersionForSpec(before, after)).toBe("1.0");
  });

  it("flagsのみ変更 → 据え置き", () => {
    const before = makeSpecification({ version: "1.0", flags: [] });
    const after = makeSpecification({
      version: "1.0",
      flags: [{ type: "feedback-review", reason: "test", createdAt: "2026-01-01T00:00:00Z", relatedIssues: [], severity: "medium" }],
    });
    expect(determineNextVersionForSpec(before, after)).toBe("1.0");
  });

  it("変更なし → 据え置き", () => {
    const before = makeSpecification({ version: "2.5" });
    const after = makeSpecification({ version: "2.5" });
    expect(determineNextVersionForSpec(before, after)).toBe("2.5");
  });
});

describe("createHistoryEntry", () => {
  it("正しいフィールドが設定される", () => {
    const req = makeRequirement({ version: "1.0", status: "draft" });
    const entry = createHistoryEntry(req);

    expect(entry.version).toBe("1.0");
    expect(entry.status).toBe("draft");
    expect(entry.changedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(entry.summary).toBeTruthy();
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

  it("gitCommitフィールドが含まれない", () => {
    const req = makeRequirement();
    const entry = createHistoryEntry(req);

    expect(entry).not.toHaveProperty("gitCommit");
  });
});

describe("VersionHistoryEntrySchema - 後方互換性", () => {
  it("gitCommitなしでバリデーション通過", () => {
    const result = VersionHistoryEntrySchema.safeParse({
      version: "1.0",
      status: "draft",
      changedAt: "2026-01-01T00:00:00Z",
      summary: "test",
    });
    expect(result.success).toBe(true);
  });

  it("旧フォーマット（gitCommitあり）の読み込み成功（stripで自動除去）", () => {
    const result = VersionHistoryEntrySchema.safeParse({
      version: "1.0",
      status: "draft",
      gitCommit: "abc123",
      changedAt: "2026-01-01T00:00:00Z",
      summary: "test",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("gitCommit");
    }
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

describe("generateSpecChangeSummary", () => {
  it("ステータスのみ変更時は変更なし扱い", () => {
    const before = makeSpecification({ status: "draft" });
    const after = makeSpecification({ status: "approved" });
    const summary = generateSpecChangeSummary(before, after);
    expect(summary).toBe("Specification updated");
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
    expect(summary).toContain("1 supplementary file(s) added");
    expect(summary).toContain("Design file path updated");
    expect(summary).toContain(", ");
    expect(summary).not.toContain("Status changed");
  });

  it("変更なしの場合", () => {
    const before = makeSpecification();
    const after = makeSpecification();
    const summary = generateSpecChangeSummary(before, after);
    expect(summary).toBe("Specification updated");
  });
});
