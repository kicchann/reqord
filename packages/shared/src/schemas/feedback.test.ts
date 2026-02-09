import { describe, it, expect } from "vitest";
import {
  FeedbackTypeSchema,
  FeedbackSeveritySchema,
  FeedbackStatusSchema,
  FeedbackEntrySchema,
  FeedbackIndexSchema,
} from "./feedback.js";

describe("FeedbackTypeSchema", () => {
  it("有効な値を受け入れる", () => {
    expect(FeedbackTypeSchema.parse("bug")).toBe("bug");
    expect(FeedbackTypeSchema.parse("improvement")).toBe("improvement");
    expect(FeedbackTypeSchema.parse("requirement-gap")).toBe("requirement-gap");
    expect(FeedbackTypeSchema.parse("spec-mismatch")).toBe("spec-mismatch");
    expect(FeedbackTypeSchema.parse("security")).toBe("security");
  });

  it("無効な値を拒否する", () => {
    expect(() => FeedbackTypeSchema.parse("invalid")).toThrow();
    expect(() => FeedbackTypeSchema.parse("")).toThrow();
  });
});

describe("FeedbackSeveritySchema", () => {
  it("有効な値を受け入れる", () => {
    expect(FeedbackSeveritySchema.parse("critical")).toBe("critical");
    expect(FeedbackSeveritySchema.parse("high")).toBe("high");
    expect(FeedbackSeveritySchema.parse("medium")).toBe("medium");
    expect(FeedbackSeveritySchema.parse("low")).toBe("low");
  });

  it("無効な値を拒否する", () => {
    expect(() => FeedbackSeveritySchema.parse("invalid")).toThrow();
    expect(() => FeedbackSeveritySchema.parse("")).toThrow();
  });
});

describe("FeedbackStatusSchema", () => {
  it("有効な値を受け入れる", () => {
    expect(FeedbackStatusSchema.parse("open")).toBe("open");
    expect(FeedbackStatusSchema.parse("closed")).toBe("closed");
  });

  it("無効な値を拒否する", () => {
    expect(() => FeedbackStatusSchema.parse("invalid")).toThrow();
    expect(() => FeedbackStatusSchema.parse("pending")).toThrow();
  });
});

describe("FeedbackEntrySchema", () => {
  it("すべてのフィールドを持つ有効なエントリを受け入れる", () => {
    const entry = {
      githubIssue: 123,
      type: "bug" as const,
      severity: "high" as const,
      linkedTo: {
        requirements: ["req-000001"],
        createdRequirements: ["req-000002"],
        specifications: ["spec-000001"],
      },
      syncedAt: "2026-02-09T12:00:00Z",
      status: "open" as const,
    };
    const result = FeedbackEntrySchema.parse(entry);
    expect(result).toEqual(entry);
  });

  it("オプショナルフィールド(type, severity)を省略した有効なエントリを受け入れる", () => {
    const entry = {
      githubIssue: 456,
      linkedTo: {
        requirements: [],
        createdRequirements: [],
        specifications: [],
      },
      syncedAt: "2026-02-09T12:00:00Z",
      status: "closed" as const,
    };
    const result = FeedbackEntrySchema.parse(entry);
    expect(result).toEqual(entry);
  });

  it("必須フィールドが欠けている場合は拒否する", () => {
    expect(() =>
      FeedbackEntrySchema.parse({
        type: "bug",
        severity: "high",
        linkedTo: { requirements: [], createdRequirements: [], specifications: [] },
        syncedAt: "2026-02-09T12:00:00Z",
        status: "open",
      })
    ).toThrow();

    expect(() =>
      FeedbackEntrySchema.parse({
        githubIssue: 123,
        linkedTo: { requirements: [], createdRequirements: [], specifications: [] },
        status: "open",
      })
    ).toThrow();
  });
});

describe("FeedbackIndexSchema", () => {
  it("feedbacks配列を持つ有効なインデックスを受け入れる", () => {
    const index = {
      feedbacks: [
        {
          githubIssue: 123,
          type: "bug" as const,
          severity: "high" as const,
          linkedTo: {
            requirements: ["req-000001"],
            createdRequirements: [],
            specifications: [],
          },
          syncedAt: "2026-02-09T12:00:00Z",
          status: "open" as const,
        },
      ],
    };
    const result = FeedbackIndexSchema.parse(index);
    expect(result).toEqual(index);
  });

  it("空のfeedbacks配列を受け入れる", () => {
    const index = { feedbacks: [] };
    const result = FeedbackIndexSchema.parse(index);
    expect(result).toEqual(index);
  });
});
