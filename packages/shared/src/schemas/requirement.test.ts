import { describe, it, expect } from "vitest";
import { RequirementSchema } from "./requirement.js";

describe("RequirementSchema", () => {
  const baseRequirement = {
    id: "req-000001",
    version: "1.0.0",
    title: "Test Requirement",
    status: "draft" as const,
    priority: "medium" as const,
    createdAt: "2026-02-09T12:00:00Z",
    updatedAt: "2026-02-09T12:00:00Z",
    versionHistory: [],
    files: {
      description: "test-requirement.md",
      supplementary: [],
    },
    successCriteria: [],
    format: { type: "free-form" as const },
    dependencies: {
      blockedBy: [],
      blocks: [],
      relatedTo: [],
    },
  };

  it("有効なRequirementをパースする", () => {
    const result = RequirementSchema.parse(baseRequirement);
    expect(result.id).toBe("req-000001");
    expect(result.title).toBe("Test Requirement");
  });

  it("originフィールド付きのRequirementをパースする", () => {
    const result = RequirementSchema.parse({
      ...baseRequirement,
      origin: { feedbackIssue: 42 },
    });
    expect(result.origin?.feedbackIssue).toBe(42);
  });
});
