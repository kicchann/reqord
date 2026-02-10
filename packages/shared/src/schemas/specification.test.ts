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

    it("phaseが'requirement'を拒否する（Specificationではspecification固定）", () => {
      const specification = {
        ...baseSpecification,
        currentApproval: {
          version: "1.0.0",
          phase: "requirement",
          prNumber: 123,
          prUrl: "https://github.com/owner/repo/pull/123",
          approvedBy: ["user1"],
        },
      };

      expect(() => SpecificationSchema.parse(specification)).toThrow();
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

  describe("implementation", () => {
    it("implementationなしの既存データが引き続きパースできる（後方互換性）", () => {
      const result = SpecificationSchema.parse(baseSpecification);
      expect(result.implementation).toBeUndefined();
    });

    it("implementationありのデータがパースできる", () => {
      const specification = {
        ...baseSpecification,
        implementation: {
          issues: [
            {
              number: 101,
              title: "Implement feature X",
              url: "https://github.com/owner/repo/issues/101",
              priority: "P1",
              status: "in_progress" as const,
            },
            {
              number: 102,
              title: "Add tests for X",
              url: "https://github.com/owner/repo/issues/102",
              priority: "P2",
              status: "open" as const,
            },
          ],
          totalEstimatedHours: 15,
          createdAt: "2026-02-10T10:00:00Z",
        },
      };

      const result = SpecificationSchema.parse(specification);
      expect(result.implementation).toBeDefined();
      expect(result.implementation?.issues).toHaveLength(2);
      expect(result.implementation?.totalEstimatedHours).toBe(15);
      expect(result.implementation?.createdAt).toBe("2026-02-10T10:00:00Z");
    });

    it("implementation.issues[].statusのデフォルト値はopen", () => {
      const specification = {
        ...baseSpecification,
        implementation: {
          issues: [
            {
              number: 103,
              title: "New issue",
              url: "https://github.com/owner/repo/issues/103",
              priority: "P3",
            },
          ],
          totalEstimatedHours: 5,
          createdAt: "2026-02-10T11:00:00Z",
        },
      };

      const result = SpecificationSchema.parse(specification);
      expect(result.implementation?.issues[0].status).toBe("open");
    });

    it("implementation.issuesが空配列でも許容する", () => {
      const specification = {
        ...baseSpecification,
        implementation: {
          issues: [],
          totalEstimatedHours: 0,
          createdAt: "2026-02-10T12:00:00Z",
        },
      };

      const result = SpecificationSchema.parse(specification);
      expect(result.implementation?.issues).toEqual([]);
    });
  });

  describe("progress", () => {
    it("progressフィールドを含むimplementationが正しくパースできる", () => {
      const specification = {
        ...baseSpecification,
        implementation: {
          issues: [
            {
              number: 101,
              title: "Task 1",
              url: "https://github.com/owner/repo/issues/101",
              priority: "P1",
              status: "closed" as const,
            },
          ],
          totalEstimatedHours: 10,
          createdAt: "2026-02-10T10:00:00Z",
          progress: {
            total: 3,
            completed: 1,
            percentage: 33,
            lastSyncedAt: "2026-02-10T15:00:00Z",
          },
        },
      };

      const result = SpecificationSchema.parse(specification);
      expect(result.implementation?.progress).toEqual({
        total: 3,
        completed: 1,
        percentage: 33,
        lastSyncedAt: "2026-02-10T15:00:00Z",
      });
    });

    it("progressなしの既存データがパースできる（後方互換性）", () => {
      const specification = {
        ...baseSpecification,
        implementation: {
          issues: [
            {
              number: 101,
              title: "Task 1",
              url: "https://github.com/owner/repo/issues/101",
              priority: "P1",
              status: "open" as const,
            },
          ],
          totalEstimatedHours: 10,
          createdAt: "2026-02-10T10:00:00Z",
        },
      };

      const result = SpecificationSchema.parse(specification);
      expect(result.implementation?.progress).toBeUndefined();
    });

    it("progress内のすべてのフィールドが存在する", () => {
      const specification = {
        ...baseSpecification,
        implementation: {
          issues: [],
          totalEstimatedHours: 0,
          createdAt: "2026-02-10T10:00:00Z",
          progress: {
            total: 5,
            completed: 2,
            percentage: 40,
            lastSyncedAt: "2026-02-10T16:00:00Z",
          },
        },
      };

      const result = SpecificationSchema.parse(specification);
      expect(result.implementation?.progress?.total).toBe(5);
      expect(result.implementation?.progress?.completed).toBe(2);
      expect(result.implementation?.progress?.percentage).toBe(40);
      expect(result.implementation?.progress?.lastSyncedAt).toBe(
        "2026-02-10T16:00:00Z"
      );
    });

    it("lastSyncedAtが欠けている場合は拒否する", () => {
      const specification = {
        ...baseSpecification,
        implementation: {
          issues: [],
          totalEstimatedHours: 0,
          createdAt: "2026-02-10T10:00:00Z",
          progress: {
            total: 5,
            completed: 2,
            percentage: 40,
          },
        },
      };

      expect(() => SpecificationSchema.parse(specification)).toThrow();
    });
  });
});
