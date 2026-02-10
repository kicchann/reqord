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
      try {
        schema.parse({ status: 123 });
      } catch (error) {
        const zodError = error as ZodError;
        const issue = zodError.issues[0];
        const message = formatZodIssue(issue);
        expect(message).toBe("status: 文字列が必要です（実際の型: number）");
      }
    });

    it("オブジェクトが必要な場合", () => {
      const schema = z.object({ data: z.object({ name: z.string() }) });
      try {
        schema.parse({ data: "not-object" });
      } catch (error) {
        const zodError = error as ZodError;
        const issue = zodError.issues[0];
        const message = formatZodIssue(issue);
        expect(message).toBe("data: オブジェクトが必要です（実際の型: string）");
      }
    });

    it("配列が必要な場合", () => {
      const schema = z.object({ items: z.array(z.string()) });
      try {
        schema.parse({ items: "not-array" });
      } catch (error) {
        const zodError = error as ZodError;
        const issue = zodError.issues[0];
        const message = formatZodIssue(issue);
        expect(message).toBe("items: 配列が必要です（実際の型: string）");
      }
    });
  });

  describe("invalid_enum_value", () => {
    it("enumの値が不正な場合", () => {
      const schema = z.object({ status: z.enum(["draft", "active", "completed"]) });
      try {
        schema.parse({ status: "invalid" });
      } catch (error) {
        const zodError = error as ZodError;
        const issue = zodError.issues[0];
        const message = formatZodIssue(issue);
        expect(message).toBe("status: 不正な値 'invalid'（期待値: 'draft', 'active', 'completed'）");
      }
    });
  });

  describe("too_small", () => {
    it("文字列が短すぎる場合", () => {
      const schema = z.object({ name: z.string().min(5) });
      try {
        schema.parse({ name: "ab" });
      } catch (error) {
        const zodError = error as ZodError;
        const issue = zodError.issues[0];
        const message = formatZodIssue(issue);
        expect(message).toBe("name: 5文字以上の文字列が必要です");
      }
    });

    it("数値が小さすぎる場合", () => {
      const schema = z.object({ age: z.number().min(18) });
      try {
        schema.parse({ age: 10 });
      } catch (error) {
        const zodError = error as ZodError;
        const issue = zodError.issues[0];
        const message = formatZodIssue(issue);
        expect(message).toBe("age: 18以上の数値が必要です");
      }
    });

    it("正の数値が必要な場合", () => {
      const schema = z.object({ count: z.number().positive() });
      try {
        schema.parse({ count: -5 });
      } catch (error) {
        const zodError = error as ZodError;
        const issue = zodError.issues[0];
        const message = formatZodIssue(issue);
        expect(message).toBe("count: 正の数値が必要です");
      }
    });

    it("配列の要素数が少ない場合", () => {
      const schema = z.object({ items: z.array(z.string()).min(3) });
      try {
        schema.parse({ items: ["a"] });
      } catch (error) {
        const zodError = error as ZodError;
        const issue = zodError.issues[0];
        const message = formatZodIssue(issue);
        expect(message).toBe("items: 3個以上の要素が必要です");
      }
    });

    it("未サポートの型の場合はissue.messageを使用（fallback）", () => {
      const schema = z.object({ value: z.date().min(new Date("2025-01-01")) });
      try {
        schema.parse({ value: new Date("2024-01-01") });
      } catch (error) {
        const zodError = error as ZodError;
        const issue = zodError.issues[0];
        const message = formatZodIssue(issue);
        expect(message).toBe(`value: ${issue.message}`);
      }
    });
  });

  describe("too_big", () => {
    it("文字列が長すぎる場合", () => {
      const schema = z.object({ name: z.string().max(5) });
      try {
        schema.parse({ name: "abcdefghij" });
      } catch (error) {
        const zodError = error as ZodError;
        const issue = zodError.issues[0];
        const message = formatZodIssue(issue);
        expect(message).toBe("name: 5文字以下の文字列が必要です");
      }
    });

    it("数値が大きすぎる場合", () => {
      const schema = z.object({ age: z.number().max(100) });
      try {
        schema.parse({ age: 150 });
      } catch (error) {
        const zodError = error as ZodError;
        const issue = zodError.issues[0];
        const message = formatZodIssue(issue);
        expect(message).toBe("age: 100以下の数値が必要です");
      }
    });

    it("配列の要素数が多い場合", () => {
      const schema = z.object({ items: z.array(z.string()).max(2) });
      try {
        schema.parse({ items: ["a", "b", "c", "d"] });
      } catch (error) {
        const zodError = error as ZodError;
        const issue = zodError.issues[0];
        const message = formatZodIssue(issue);
        expect(message).toBe("items: 2個以下の要素が必要です");
      }
    });

    it("未サポートの型の場合はissue.messageを使用（fallback）", () => {
      const schema = z.object({ value: z.set(z.string()).max(2) });
      try {
        schema.parse({ value: new Set(["a", "b", "c"]) });
      } catch (error) {
        const zodError = error as ZodError;
        const issue = zodError.issues[0];
        const message = formatZodIssue(issue);
        expect(message).toBe(`value: ${issue.message}`);
      }
    });
  });

  describe("invalid_string", () => {
    it("メールアドレスの形式が不正な場合", () => {
      const schema = z.object({ email: z.string().email() });
      try {
        schema.parse({ email: "not-an-email" });
      } catch (error) {
        const zodError = error as ZodError;
        const issue = zodError.issues[0];
        const message = formatZodIssue(issue);
        expect(message).toBe("email: 形式が不正です");
      }
    });

    it("URLの形式が不正な場合", () => {
      const schema = z.object({ url: z.string().url() });
      try {
        schema.parse({ url: "not-a-url" });
      } catch (error) {
        const zodError = error as ZodError;
        const issue = zodError.issues[0];
        const message = formatZodIssue(issue);
        expect(message).toBe("url: 形式が不正です");
      }
    });
  });

  describe("unrecognized_keys", () => {
    it("不明なフィールドがある場合", () => {
      const schema = z.object({ name: z.string() }).strict();
      try {
        schema.parse({ name: "test", unknown1: "value1", unknown2: "value2" });
      } catch (error) {
        const zodError = error as ZodError;
        const issue = zodError.issues[0];
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
      try {
        schema.parse({ value: "no-match" });
      } catch (error) {
        const zodError = error as ZodError;
        const issue = zodError.issues[0];
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
    try {
      schema.parse({ name: 123 });
    } catch (error) {
      const zodError = error as ZodError;
      const message = formatZodError(zodError);
      expect(message).toBe("- name: 文字列が必要です（実際の型: number）");
    }
  });

  it("複数のエラーを改行区切りでフォーマットする", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
      email: z.string().email(),
    });
    try {
      schema.parse({ name: 123, age: "not-a-number", email: "invalid" });
    } catch (error) {
      const zodError = error as ZodError;
      const message = formatZodError(zodError);
      const lines = message.split("\n");
      expect(lines).toHaveLength(3);
      expect(lines[0]).toBe("- name: 文字列が必要です（実際の型: number）");
      expect(lines[1]).toBe("- age: 数値が必要です（実際の型: string）");
      expect(lines[2]).toBe("- email: 形式が不正です");
    }
  });

  it("カスタムprefixを使用できる", () => {
    const schema = z.object({ name: z.string() });
    try {
      schema.parse({ name: 123 });
    } catch (error) {
      const zodError = error as ZodError;
      const message = formatZodError(zodError, { prefix: "  * " });
      expect(message).toBe("  * name: 文字列が必要です（実際の型: number）");
    }
  });

  it("カスタムseparatorを使用できる", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });
    try {
      schema.parse({ name: 123, age: "not-a-number" });
    } catch (error) {
      const zodError = error as ZodError;
      const message = formatZodError(zodError, { separator: " | " });
      expect(message).toBe("- name: 文字列が必要です（実際の型: number） | - age: 数値が必要です（実際の型: string）");
    }
  });

  it("prefix空文字列とseparatorカスタム指定の組み合わせ", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });
    try {
      schema.parse({ name: 123, age: "not-a-number" });
    } catch (error) {
      const zodError = error as ZodError;
      const message = formatZodError(zodError, { prefix: "", separator: ", " });
      expect(message).toBe("name: 文字列が必要です（実際の型: number）, age: 数値が必要です（実際の型: string）");
    }
  });
});

describe("formatZodError - RequirementSchemaとの統合", () => {
  it("IDの形式エラーをフォーマットする", () => {
    try {
      RequirementSchema.parse({
        id: "invalid-id",
        title: "Test",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
        files: { description: "test.md" },
        format: { type: "free-form" },
      });
    } catch (error) {
      const zodError = error as ZodError;
      const message = formatZodError(zodError);
      expect(message).toContain("id:");
      expect(message).toContain("形式が不正です");
    }
  });

  it("複数の深くネストしたエラーをフォーマットする", () => {
    try {
      RequirementSchema.parse({
        id: "req-000001",
        title: "Test",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
        files: { description: "test.md" },
        format: { type: "user-story", userStory: { as: "", iWant: 123, soThat: "value" } },
        estimatedHours: -5,
      });
    } catch (error) {
      const zodError = error as ZodError;
      const message = formatZodError(zodError);
      const lines = message.split("\n");
      expect(lines.length).toBeGreaterThanOrEqual(2);
    }
  });
});
