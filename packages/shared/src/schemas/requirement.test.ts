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
    flags: [],
  };

  describe("currentApproval", () => {
    it("currentApprovalを持つ有効なRequirementを受け入れる", () => {
      const requirement = {
        ...baseRequirement,
        currentApproval: {
          version: "1.0.0",
          phase: "requirement" as const,
          prNumber: 123,
          prUrl: "https://github.com/owner/repo/pull/123",
          approvedBy: ["user1", "user2"],
          approvedAt: "2026-02-09T12:00:00Z",
        },
      };

      const result = RequirementSchema.parse(requirement);
      expect(result.currentApproval).toEqual({
        version: "1.0.0",
        phase: "requirement",
        prNumber: 123,
        prUrl: "https://github.com/owner/repo/pull/123",
        approvedBy: ["user1", "user2"],
        approvedAt: "2026-02-09T12:00:00Z",
      });
    });

    it("currentApprovalなしの既存フォーマットを受け入れる（後方互換性）", () => {
      const result = RequirementSchema.parse(baseRequirement);
      expect(result.currentApproval).toBeUndefined();
    });

    it("approvedAtが省略されたcurrentApprovalを受け入れる", () => {
      const requirement = {
        ...baseRequirement,
        currentApproval: {
          version: "1.0.0",
          phase: "specification" as const,
          prNumber: 456,
          prUrl: "https://github.com/owner/repo/pull/456",
          approvedBy: ["user1"],
        },
      };

      const result = RequirementSchema.parse(requirement);
      expect(result.currentApproval?.approvedAt).toBeUndefined();
    });

    it("phaseが'requirement'を受け入れる", () => {
      const requirement = {
        ...baseRequirement,
        currentApproval: {
          version: "1.0.0",
          phase: "requirement" as const,
          prNumber: 123,
          prUrl: "https://github.com/owner/repo/pull/123",
          approvedBy: ["user1"],
        },
      };

      const result = RequirementSchema.parse(requirement);
      expect(result.currentApproval?.phase).toBe("requirement");
    });

    it("phaseが'specification'を受け入れる", () => {
      const requirement = {
        ...baseRequirement,
        currentApproval: {
          version: "1.0.0",
          phase: "specification" as const,
          prNumber: 123,
          prUrl: "https://github.com/owner/repo/pull/123",
          approvedBy: ["user1"],
        },
      };

      const result = RequirementSchema.parse(requirement);
      expect(result.currentApproval?.phase).toBe("specification");
    });

    it("無効なphaseを拒否する", () => {
      const requirement = {
        ...baseRequirement,
        currentApproval: {
          version: "1.0.0",
          phase: "invalid",
          prNumber: 123,
          prUrl: "https://github.com/owner/repo/pull/123",
          approvedBy: ["user1"],
        },
      };

      expect(() => RequirementSchema.parse(requirement)).toThrow();
    });

    it("versionが欠けている場合は拒否する", () => {
      const requirement = {
        ...baseRequirement,
        currentApproval: {
          phase: "requirement",
          prNumber: 123,
          prUrl: "https://github.com/owner/repo/pull/123",
          approvedBy: ["user1"],
        },
      };

      expect(() => RequirementSchema.parse(requirement)).toThrow();
    });

    it("prNumberが欠けている場合は拒否する", () => {
      const requirement = {
        ...baseRequirement,
        currentApproval: {
          version: "1.0.0",
          phase: "requirement",
          prUrl: "https://github.com/owner/repo/pull/123",
          approvedBy: ["user1"],
        },
      };

      expect(() => RequirementSchema.parse(requirement)).toThrow();
    });

    it("prNumberが数値以外の場合は拒否する", () => {
      const requirement = {
        ...baseRequirement,
        currentApproval: {
          version: "1.0.0",
          phase: "requirement",
          prNumber: "123",
          prUrl: "https://github.com/owner/repo/pull/123",
          approvedBy: ["user1"],
        },
      };

      expect(() => RequirementSchema.parse(requirement)).toThrow();
    });

    it("approvedByが配列でない場合は拒否する", () => {
      const requirement = {
        ...baseRequirement,
        currentApproval: {
          version: "1.0.0",
          phase: "requirement",
          prNumber: 123,
          prUrl: "https://github.com/owner/repo/pull/123",
          approvedBy: "user1",
        },
      };

      expect(() => RequirementSchema.parse(requirement)).toThrow();
    });
  });
});
