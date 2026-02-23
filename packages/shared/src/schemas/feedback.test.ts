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
  it("titleフィールドを持つ有効なエントリを受け入れる", () => {
    const entry = {
      githubIssue: 200,
      title: "Bug: login fails",
      linkedTo: {
        requirements: [],
        createdRequirements: [],
        specifications: [],
      },
      syncedAt: "2026-02-09T12:00:00Z",
      status: "open" as const,
    };
    const result = FeedbackEntrySchema.parse(entry);
    expect(result.title).toBe("Bug: login fails");
  });

  it("titleフィールドが省略された場合も受け入れる（後方互換性）", () => {
    const entry = {
      githubIssue: 201,
      linkedTo: {
        requirements: [],
        createdRequirements: [],
        specifications: [],
      },
      syncedAt: "2026-02-09T12:00:00Z",
      status: "open" as const,
    };
    const result = FeedbackEntrySchema.parse(entry);
    expect(result.title).toBeUndefined();
  });

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
    expect(result).toEqual({
      ...entry,
      linkedTo: { ...entry.linkedTo, createdSpecifications: [] },
    });
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
    expect(result).toEqual({
      ...entry,
      linkedTo: { ...entry.linkedTo, createdSpecifications: [] },
    });
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
    expect(result).toEqual({
      feedbacks: [
        {
          ...index.feedbacks[0],
          linkedTo: { ...index.feedbacks[0].linkedTo, createdSpecifications: [] },
        },
      ],
    });
  });

  it("空のfeedbacks配列を受け入れる", () => {
    const index = { feedbacks: [] };
    const result = FeedbackIndexSchema.parse(index);
    expect(result).toEqual(index);
  });
});

describe("FeedbackLinkedToSchema v2.0.0 backward compatibility", () => {
  it("createdSpecificationsが未指定の場合、デフォルト値[]が設定される", () => {
    const entry = {
      githubIssue: 100,
      linkedTo: {
        requirements: ["req-000001"],
        createdRequirements: [],
        specifications: [],
      },
      syncedAt: "2026-02-10T00:00:00Z",
      status: "open" as const,
    };
    const result = FeedbackEntrySchema.parse(entry);
    expect(result.linkedTo.createdSpecifications).toEqual([]);
  });

  it("createdSpecificationsに明示的な値が設定される", () => {
    const entry = {
      githubIssue: 101,
      linkedTo: {
        requirements: ["req-000001"],
        createdRequirements: [],
        specifications: [],
        createdSpecifications: ["spec-000010", "spec-000011"],
      },
      syncedAt: "2026-02-10T00:00:00Z",
      status: "open" as const,
    };
    const result = FeedbackEntrySchema.parse(entry);
    expect(result.linkedTo.createdSpecifications).toEqual(["spec-000010", "spec-000011"]);
  });

  it("resolvedが省略可能（後方互換性）", () => {
    const entry = {
      githubIssue: 102,
      linkedTo: {
        requirements: ["req-000001"],
        createdRequirements: [],
        specifications: [],
      },
      syncedAt: "2026-02-10T00:00:00Z",
      status: "open" as const,
    };
    const result = FeedbackEntrySchema.parse(entry);
    expect(result.linkedTo.resolved).toBeUndefined();
  });

  it("resolvedに有効なデータが設定される", () => {
    const entry = {
      githubIssue: 103,
      linkedTo: {
        requirements: ["req-000001"],
        createdRequirements: [],
        specifications: ["spec-000001"],
        createdSpecifications: [],
        resolved: {
          requirements: ["req-000001"],
          specifications: ["spec-000001"],
        },
      },
      syncedAt: "2026-02-10T00:00:00Z",
      status: "closed" as const,
    };
    const result = FeedbackEntrySchema.parse(entry);
    expect(result.linkedTo.resolved).toEqual({
      requirements: ["req-000001"],
      specifications: ["spec-000001"],
    });
  });
});
