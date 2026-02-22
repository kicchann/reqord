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

  describe("title", () => {
    it("titleフィールドを持つSpecificationを受け入れる", () => {
      const specification = {
        ...baseSpecification,
        title: "テスト仕様",
      };

      const result = SpecificationSchema.parse(specification);
      expect(result.title).toBe("テスト仕様");
    });

    it("titleなしの既存データが引き続きパースできる（後方互換性）", () => {
      const result = SpecificationSchema.parse(baseSpecification);
      expect(result.title).toBeUndefined();
    });

    it("空文字列のtitleを拒否する", () => {
      const specification = {
        ...baseSpecification,
        title: "",
      };

      expect(() => SpecificationSchema.parse(specification)).toThrow();
    });
  });

  describe("requirementVersion", () => {
    it("requirementVersionフィールドを持つSpecificationを受け入れる", () => {
      const specification = {
        ...baseSpecification,
        requirementVersion: "1.0",
      };

      const result = SpecificationSchema.parse(specification);
      expect(result.requirementVersion).toBe("1.0");
    });

    it("requirementVersionなしの既存データが引き続きパースできる（後方互換性）", () => {
      const result = SpecificationSchema.parse(baseSpecification);
      expect(result.requirementVersion).toBeUndefined();
    });

    it("空文字列のrequirementVersionを拒否する", () => {
      const specification = {
        ...baseSpecification,
        requirementVersion: "",
      };

      expect(() => SpecificationSchema.parse(specification)).toThrow();
    });
  });

  describe("implementation field (removed)", () => {
    it("implementationフィールドを含む入力データはパース時に除去される", () => {
      const specification = {
        ...baseSpecification,
        implementation: {
          issues: [
            {
              number: 101,
              title: "Implement feature X",
              url: "https://github.com/owner/repo/issues/101",
              priority: "P1",
              status: "in_progress",
            },
          ],
          totalEstimatedHours: 15,
          createdAt: "2026-02-10T10:00:00Z",
        },
      };

      // implementation field should be stripped (Zod default strip behavior for unknown keys)
      const result = SpecificationSchema.parse(specification);
      expect(result.id).toBe("spec-000001");
      expect("implementation" in result).toBe(false);
    });

    it("implementationなしのデータが引き続きパースできる", () => {
      const result = SpecificationSchema.parse(baseSpecification);
      expect(result.id).toBe("spec-000001");
      expect("implementation" in result).toBe(false);
    });
  });
});
