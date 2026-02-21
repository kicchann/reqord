import { describe, it, expect } from "vitest";
import {
  RequirementSchema,
  SecurityReviewFlagSchema,
  BreakingChangeFlagSchema,
  FlagSchema,
} from "./requirement.js";

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
    flags: [],
  };

  describe("SecurityReviewFlagSchema", () => {
    it("有効なsecurity-reviewフラグをパースする", () => {
      const flag = {
        type: "security-review",
        reason: "Authentication logic changed",
        createdAt: "2026-02-17T10:00:00Z",
      };

      const result = SecurityReviewFlagSchema.parse(flag);
      expect(result).toEqual(flag);
    });
  });

  describe("BreakingChangeFlagSchema", () => {
    it("有効なbreaking-changeフラグをパースする", () => {
      const flag = {
        type: "breaking-change",
        reason: "API endpoint removed",
        createdAt: "2026-02-17T10:00:00Z",
      };

      const result = BreakingChangeFlagSchema.parse(flag);
      expect(result).toEqual(flag);
    });

    it("affectedVersions付きのbreaking-changeフラグをパースする", () => {
      const flag = {
        type: "breaking-change",
        reason: "API endpoint removed",
        createdAt: "2026-02-17T10:00:00Z",
        affectedVersions: ["1.0.0", "1.1.0"],
      };

      const result = BreakingChangeFlagSchema.parse(flag);
      expect(result.affectedVersions).toEqual(["1.0.0", "1.1.0"]);
    });
  });

  describe("FlagSchema (discriminatedUnion)", () => {
    it("feedback-reviewタイプを正しくパースする", () => {
      const flag = {
        type: "feedback-review",
        reason: "User reported issue",
        createdAt: "2026-02-17T10:00:00Z",
        relatedIssues: [42],
        severity: "medium",
      };

      const result = FlagSchema.parse(flag);
      expect(result.type).toBe("feedback-review");
    });

    it("security-reviewタイプを正しくパースする", () => {
      const flag = {
        type: "security-review",
        reason: "Auth change",
        createdAt: "2026-02-17T10:00:00Z",
      };

      const result = FlagSchema.parse(flag);
      expect(result.type).toBe("security-review");
    });

    it("breaking-changeタイプを正しくパースする", () => {
      const flag = {
        type: "breaking-change",
        reason: "Removed endpoint",
        createdAt: "2026-02-17T10:00:00Z",
      };

      const result = FlagSchema.parse(flag);
      expect(result.type).toBe("breaking-change");
    });

    it("無効なtypeを拒否する", () => {
      const flag = {
        type: "invalid-type",
        reason: "Something",
        createdAt: "2026-02-17T10:00:00Z",
      };

      expect(() => FlagSchema.parse(flag)).toThrow();
    });
  });

  describe("RequirementSchema with mixed flags", () => {
    it("複数タイプのフラグを持つRequirementをパースする", () => {
      const requirement = {
        ...baseRequirement,
        flags: [
          {
            type: "feedback-review",
            reason: "User reported",
            createdAt: "2026-02-17T10:00:00Z",
            relatedIssues: [1],
            severity: "low",
          },
          {
            type: "security-review",
            reason: "Auth logic",
            createdAt: "2026-02-17T10:00:00Z",
          },
          {
            type: "breaking-change",
            reason: "API change",
            createdAt: "2026-02-17T10:00:00Z",
            affectedVersions: ["2.0.0"],
          },
        ],
      };

      const result = RequirementSchema.parse(requirement);
      expect(result.flags).toHaveLength(3);
      expect(result.flags[0].type).toBe("feedback-review");
      expect(result.flags[1].type).toBe("security-review");
      expect(result.flags[2].type).toBe("breaking-change");
    });
  });
});
