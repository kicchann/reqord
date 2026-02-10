import { describe, it, expect } from "vitest";
import { formatPath, formatZodIssue, formatZodError } from "./zod-error-formatter.js";
import { z, ZodError } from "zod";
import { RequirementSchema } from "../schemas/requirement.js";

describe("formatPath", () => {
  it("空の配列は (root) を返す", () => {
    expect(formatPath([])).toBe("(root)");
  });

  it("単一要素は要素名を返す", () => {
    expect(formatPath(["status"])).toBe("status");
  });

  it("ネストしたパスはドット区切りで返す", () => {
    expect(formatPath(["dependencies", "blockedBy"])).toBe("dependencies.blockedBy");
  });

  it("配列インデックスは角括弧で返す", () => {
    expect(formatPath(["dependencies", "blockedBy", 0])).toBe("dependencies.blockedBy[0]");
  });

  it("複雑なパスを正しくフォーマットする", () => {
    expect(formatPath(["arr", 1, "nested", 2])).toBe("arr[1].nested[2]");
  });

  it("複数のネストした配列インデックスを処理する", () => {
    expect(formatPath(["a", 0, "b", 1, "c", 2])).toBe("a[0].b[1].c[2]");
  });
});

describe("formatZodIssue", () => {
  describe("invalid_type", () => {
    it("型が不正な場合のメッセージをフォーマットする", () => {
      const schema = z.object({ status: z.string() });
      const result = schema.safeParse({ status: 123 });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues[0];
        const message = formatZodIssue(issue);
        expect(message).toBe("status: 文字列が必要です（実際の型: 数値）");
      }
    });

    it("オブジェクトが必要な場合", () => {
      const schema = z.object({ data: z.object({ name: z.string() }) });
      const result = schema.safeParse({ data: "not-object" });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues[0];
        const message = formatZodIssue(issue);
        expect(message).toBe("data: オブジェクトが必要です（実際の型: 文字列）");
      }
    });

    it("配列が必要な場合", () => {
      const schema = z.object({ items: z.array(z.string()) });
      const result = schema.safeParse({ items: "not-array" });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues[0];
        const message = formatZodIssue(issue);
        expect(message).toBe("items: 配列が必要です（実際の型: 文字列）");
      }
    });
  });

  describe("invalid_enum_value", () => {
    it("enumの値が不正な場合", () => {
      const schema = z.object({ status: z.enum(["draft", "active", "completed"]) });
      const result = schema.safeParse({ status: "invalid" });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues[0];
        const message = formatZodIssue(issue);
        expect(message).toBe("status: 不正な値 'invalid'（期待値: 'draft', 'active', 'completed'）");
      }
    });
  });

  describe("too_small", () => {
    it("文字列が短すぎる場合", () => {
      const schema = z.object({ name: z.string().min(5) });
      const result = schema.safeParse({ name: "ab" });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues[0];
        const message = formatZodIssue(issue);
        expect(message).toBe("name: 5文字以上の文字列が必要です");
      }
    });

    it("数値が小さすぎる場合", () => {
      const schema = z.object({ age: z.number().min(18) });
      const result = schema.safeParse({ age: 10 });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues[0];
        const message = formatZodIssue(issue);
        expect(message).toBe("age: 18以上の数値が必要です");
      }
    });

    it("正の数値が必要な場合", () => {
      const schema = z.object({ count: z.number().positive() });
      const result = schema.safeParse({ count: -5 });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues[0];
        const message = formatZodIssue(issue);
        expect(message).toBe("count: 正の数値が必要です");
      }
    });

    it("配列の要素数が少ない場合", () => {
      const schema = z.object({ items: z.array(z.string()).min(3) });
      const result = schema.safeParse({ items: ["a"] });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues[0];
        const message = formatZodIssue(issue);
        expect(message).toBe("items: 3個以上の要素が必要です");
      }
    });

    it("未サポートの型の場合はissue.messageを使用（fallback）", () => {
      const schema = z.object({ value: z.date().min(new Date("2025-01-01")) });
      const result = schema.safeParse({ value: new Date("2024-01-01") });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues[0];
        const message = formatZodIssue(issue);
        expect(message).toBe(`value: ${issue.message}`);
      }
    });
  });

  describe("too_big", () => {
    it("文字列が長すぎる場合", () => {
      const schema = z.object({ name: z.string().max(5) });
      const result = schema.safeParse({ name: "abcdefghij" });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues[0];
        const message = formatZodIssue(issue);
        expect(message).toBe("name: 5文字以下の文字列が必要です");
      }
    });

    it("数値が大きすぎる場合", () => {
      const schema = z.object({ age: z.number().max(100) });
      const result = schema.safeParse({ age: 150 });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues[0];
        const message = formatZodIssue(issue);
        expect(message).toBe("age: 100以下の数値が必要です");
      }
    });

    it("配列の要素数が多い場合", () => {
      const schema = z.object({ items: z.array(z.string()).max(2) });
      const result = schema.safeParse({ items: ["a", "b", "c", "d"] });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues[0];
        const message = formatZodIssue(issue);
        expect(message).toBe("items: 2個以下の要素が必要です");
      }
    });

    it("未サポートの型の場合はissue.messageを使用（fallback）", () => {
      const schema = z.object({ value: z.set(z.string()).max(2) });
      const result = schema.safeParse({ value: new Set(["a", "b", "c"]) });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues[0];
        const message = formatZodIssue(issue);
        expect(message).toBe(`value: ${issue.message}`);
      }
    });
  });

  describe("invalid_string", () => {
    it("メールアドレスの形式が不正な場合", () => {
      const schema = z.object({ email: z.string().email() });
      const result = schema.safeParse({ email: "not-an-email" });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues[0];
        const message = formatZodIssue(issue);
        expect(message).toBe("email: 形式が不正です");
      }
    });

    it("URLの形式が不正な場合", () => {
      const schema = z.object({ url: z.string().url() });
      const result = schema.safeParse({ url: "not-a-url" });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues[0];
        const message = formatZodIssue(issue);
        expect(message).toBe("url: 形式が不正です");
      }
    });
  });

  describe("unrecognized_keys", () => {
    it("不明なフィールドがある場合", () => {
      const schema = z.object({ name: z.string() }).strict();
      const result = schema.safeParse({ name: "test", unknown1: "value1", unknown2: "value2" });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues[0];
        const message = formatZodIssue(issue);
        expect(message).toBe("(root): 不明なフィールド 'unknown1, unknown2'");
      }
    });
  });

  describe("fallback", () => {
    it("その他のエラーコードの場合はissue.messageを使用", () => {
      const schema = z.object({ value: z.string().refine((val) => val.includes("test"), {
        message: "Must contain 'test'"
      }) });
      const result = schema.safeParse({ value: "no-match" });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues[0];
        const message = formatZodIssue(issue);
        expect(message).toBe(`value: ${issue.message}`);
      }
    });
  });
});

describe("formatZodError", () => {
  it("空のissues配列の場合は空文字列を返す", () => {
    const error = new ZodError([]);
    const message = formatZodError(error);
    expect(message).toBe("");
  });

  it("単一のエラーをデフォルトオプションでフォーマットする", () => {
    const schema = z.object({ name: z.string() });
    const result = schema.safeParse({ name: 123 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const message = formatZodError(result.error);
      expect(message).toBe("- name: 文字列が必要です（実際の型: 数値）");
    }
  });

  it("複数のエラーを改行区切りでフォーマットする", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
      email: z.string().email(),
    });
    const result = schema.safeParse({ name: 123, age: "not-a-number", email: "invalid" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const message = formatZodError(result.error);
      const lines = message.split("\n");
      expect(lines).toHaveLength(3);
      expect(lines[0]).toBe("- name: 文字列が必要です（実際の型: 数値）");
      expect(lines[1]).toBe("- age: 数値が必要です（実際の型: 文字列）");
      expect(lines[2]).toBe("- email: 形式が不正です");
    }
  });

  it("カスタムprefixを使用できる", () => {
    const schema = z.object({ name: z.string() });
    const result = schema.safeParse({ name: 123 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const message = formatZodError(result.error, { prefix: "  * " });
      expect(message).toBe("  * name: 文字列が必要です（実際の型: 数値）");
    }
  });

  it("カスタムseparatorを使用できる", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });
    const result = schema.safeParse({ name: 123, age: "not-a-number" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const message = formatZodError(result.error, { separator: " | " });
      expect(message).toBe("- name: 文字列が必要です（実際の型: 数値） | - age: 数値が必要です（実際の型: 文字列）");
    }
  });

  it("prefix空文字列とseparatorカスタム指定の組み合わせ", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });
    const result = schema.safeParse({ name: 123, age: "not-a-number" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const message = formatZodError(result.error, { prefix: "", separator: ", " });
      expect(message).toBe("name: 文字列が必要です（実際の型: 数値）, age: 数値が必要です（実際の型: 文字列）");
    }
  });
});

describe("formatZodError - RequirementSchemaとの統合", () => {
  it("IDの形式エラーをフォーマットする", () => {
    const result = RequirementSchema.safeParse({
      id: "invalid-id",
      title: "Test",
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:00Z",
      files: { description: "test.md" },
      format: { type: "free-form" },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const message = formatZodError(result.error);
      expect(message).toContain("id:");
      expect(message).toContain("形式が不正です");
    }
  });

  it("複数の深くネストしたエラーをフォーマットする", () => {
    const result = RequirementSchema.safeParse({
      id: "req-000001",
      title: "Test",
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:00Z",
      files: { description: "test.md" },
      format: { type: "user-story", userStory: { as: "", iWant: 123, soThat: "value" } },
      estimatedHours: -5,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const message = formatZodError(result.error);
      const lines = message.split("\n");
      expect(lines.length).toBeGreaterThanOrEqual(2);
    }
  });
});
