import { describe, it, expect } from "vitest";
import { SpecificationSchema } from "./specification.js";

describe("SpecificationSchema", () => {
  const baseSpecification = {
    id: "spec-000001",
    requirementId: "req-000001",
    version: "1.0.0",
    status: "draft" as const,
    createdAt: "2026-02-09T12:00:00Z",
    updatedAt: "2026-02-09T12:00:00Z",
    versionHistory: [],
    files: {
      design: "specifications/spec-000001/design.md",
      supplementary: [],
    },
    flags: [],
  };

  describe("currentApproval", () => {
    it("currentApprovalを持つ有効なSpecificationを受け入れる", () => {
      const specification = {
        ...baseSpecification,
        currentApproval: {
          version: "1.0.0",
          phase: "specification" as const,
          prNumber: 123,
          prUrl: "https://github.com/owner/repo/pull/123",
          approvedBy: ["user1", "user2"],
          approvedAt: "2026-02-09T12:00:00Z",
        },
      };

      const result = SpecificationSchema.parse(specification);
      expect(result.currentApproval).toEqual({
        version: "1.0.0",
        phase: "specification",
        prNumber: 123,
        prUrl: "https://github.com/owner/repo/pull/123",
        approvedBy: ["user1", "user2"],
        approvedAt: "2026-02-09T12:00:00Z",
      });
    });

    it("currentApprovalなしの既存フォーマットを受け入れる（後方互換性）", () => {
      const result = SpecificationSchema.parse(baseSpecification);
      expect(result.currentApproval).toBeUndefined();
    });

    it("approvedAtが省略されたcurrentApprovalを受け入れる", () => {
      const specification = {
        ...baseSpecification,
        currentApproval: {
          version: "1.0.0",
          phase: "specification" as const,
          prNumber: 456,
          prUrl: "https://github.com/owner/repo/pull/456",
          approvedBy: ["user1"],
        },
      };

      const result = SpecificationSchema.parse(specification);
      expect(result.currentApproval?.approvedAt).toBeUndefined();
    });

    it("phaseが'requirement'を受け入れる", () => {
      const specification = {
        ...baseSpecification,
        currentApproval: {
          version: "1.0.0",
          phase: "requirement" as const,
          prNumber: 123,
          prUrl: "https://github.com/owner/repo/pull/123",
          approvedBy: ["user1"],
        },
      };

      const result = SpecificationSchema.parse(specification);
      expect(result.currentApproval?.phase).toBe("requirement");
    });

    it("phaseが'specification'を受け入れる", () => {
      const specification = {
        ...baseSpecification,
        currentApproval: {
          version: "1.0.0",
          phase: "specification" as const,
          prNumber: 123,
          prUrl: "https://github.com/owner/repo/pull/123",
          approvedBy: ["user1"],
        },
      };

      const result = SpecificationSchema.parse(specification);
      expect(result.currentApproval?.phase).toBe("specification");
    });

    it("無効なphaseを拒否する", () => {
      const specification = {
        ...baseSpecification,
        currentApproval: {
          version: "1.0.0",
          phase: "invalid",
          prNumber: 123,
          prUrl: "https://github.com/owner/repo/pull/123",
          approvedBy: ["user1"],
        },
      };

      expect(() => SpecificationSchema.parse(specification)).toThrow();
    });

    it("versionが欠けている場合は拒否する", () => {
      const specification = {
        ...baseSpecification,
        currentApproval: {
          phase: "specification",
          prNumber: 123,
          prUrl: "https://github.com/owner/repo/pull/123",
          approvedBy: ["user1"],
        },
      };

      expect(() => SpecificationSchema.parse(specification)).toThrow();
    });

    it("prNumberが欠けている場合は拒否する", () => {
      const specification = {
        ...baseSpecification,
        currentApproval: {
          version: "1.0.0",
          phase: "specification",
          prUrl: "https://github.com/owner/repo/pull/123",
          approvedBy: ["user1"],
        },
      };

      expect(() => SpecificationSchema.parse(specification)).toThrow();
    });

    it("prNumberが数値以外の場合は拒否する", () => {
      const specification = {
        ...baseSpecification,
        currentApproval: {
          version: "1.0.0",
          phase: "specification",
          prNumber: "123",
          prUrl: "https://github.com/owner/repo/pull/123",
          approvedBy: ["user1"],
        },
      };

      expect(() => SpecificationSchema.parse(specification)).toThrow();
    });

    it("approvedByが配列でない場合は拒否する", () => {
      const specification = {
        ...baseSpecification,
        currentApproval: {
          version: "1.0.0",
          phase: "specification",
          prNumber: 123,
          prUrl: "https://github.com/owner/repo/pull/123",
          approvedBy: "user1",
        },
      };

      expect(() => SpecificationSchema.parse(specification)).toThrow();
    });
  });
});
