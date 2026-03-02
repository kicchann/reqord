import { describe, it, expect } from "vitest";
import { ProjectSettingsSchema } from "./project-settings.js";

describe("ProjectSettingsSchema", () => {
  describe("デフォルト値補完", () => {
    it("空オブジェクトを渡すと全フィールドがデフォルト値で補完される", () => {
      const result = ProjectSettingsSchema.parse({});
      // invariants
      expect(result.invariants.versioning).toBe(true);
      expect(result.invariants.cyclicDependencyCheck).toBe(true);
      expect(result.invariants.statusTransitionRules).toBe(true);
      expect(result.invariants.schemaValidation).toBe(true);
      // approvalPrerequisites
      expect(result.approvalPrerequisites.designMdCheck).toBe(true);
      expect(result.approvalPrerequisites.descriptionMdCheck).toBe(false);
      expect(result.approvalPrerequisites.customFiles).toEqual([]);
      // statusTransitionPr
      expect(result.statusTransitionPr.draftToApproved).toBe(true);
      expect(result.statusTransitionPr.approvedToImplemented).toBe(false);
      expect(result.statusTransitionPr.toDraft).toBe(true);
      // branchNaming
      expect(result.branchNaming.toApprovedPrefix).toBe("reqord");
      expect(result.branchNaming.toImplementedPrefix).toBe("reqord");
      expect(result.branchNaming.toDraftPrefix).toBe("reqord");
      // feedbackValidation
      expect(result.feedbackValidation.blockOnUnresolved).toBe(false);
      expect(result.feedbackValidation.severityThreshold).toBe("critical");
      // autoRevert
      expect(result.autoRevert.onContentChange).toBe("always");
      // consistencyCheck
      expect(result.consistencyCheck.specNotImplementedLevel).toBe("warning");
    });

    it("部分定義の場合は未指定フィールドのみデフォルト値で補完される", () => {
      const result = ProjectSettingsSchema.parse({
        approvalPrerequisites: { designMdCheck: false },
      });
      expect(result.approvalPrerequisites.designMdCheck).toBe(false);
      expect(result.approvalPrerequisites.descriptionMdCheck).toBe(false);
      expect(result.approvalPrerequisites.customFiles).toEqual([]);
    });

    it("invariantsに空オブジェクトを渡すと全項目がtrueで補完される", () => {
      const result = ProjectSettingsSchema.parse({ invariants: {} });
      expect(result.invariants.versioning).toBe(true);
      expect(result.invariants.cyclicDependencyCheck).toBe(true);
      expect(result.invariants.statusTransitionRules).toBe(true);
      expect(result.invariants.schemaValidation).toBe(true);
    });
  });

  describe("全フィールド指定", () => {
    it("全フィールドを指定するとそのまま通過する", () => {
      const input = {
        invariants: {
          versioning: true,
          cyclicDependencyCheck: true,
          statusTransitionRules: true,
          schemaValidation: true,
        },
        approvalPrerequisites: {
          designMdCheck: false,
          descriptionMdCheck: true,
          customFiles: ["CHANGELOG.md"],
        },
        statusTransitionPr: {
          draftToApproved: false,
          approvedToImplemented: true,
          toDraft: false,
        },
        branchNaming: {
          toApprovedPrefix: "custom",
          toImplementedPrefix: "impl",
          toDraftPrefix: "draft",
        },
        feedbackValidation: {
          blockOnUnresolved: true,
          severityThreshold: "high" as const,
        },
        autoRevert: { onContentChange: "never" as const },
        consistencyCheck: { specNotImplementedLevel: "error" as const },
      };
      const result = ProjectSettingsSchema.parse(input);
      expect(result).toEqual(input);
    });
  });

  describe("不明キーのstrip", () => {
    it("不明なキーが含まれる場合はstripされて正常に通過する", () => {
      const result = ProjectSettingsSchema.parse({
        unknownKey: "value",
        approvalPrerequisites: { unknownNested: true },
      });
      expect((result as Record<string, unknown>).unknownKey).toBeUndefined();
    });
  });

  describe("バリデーションエラー", () => {
    it.each([
      ["versioning"],
      ["cyclicDependencyCheck"],
      ["statusTransitionRules"],
      ["schemaValidation"],
    ])("invariants.%sにfalseを設定するとZodErrorになる", (field) => {
      expect(() =>
        ProjectSettingsSchema.parse({ invariants: { [field]: false } })
      ).toThrow();
    });

    it("branchNaming.toApprovedPrefixに空文字を設定するとZodErrorになる", () => {
      expect(() =>
        ProjectSettingsSchema.parse({ branchNaming: { toApprovedPrefix: "" } })
      ).toThrow();
    });

    it("autoRevert.onContentChangeに無効な値を設定するとZodErrorになる", () => {
      expect(() =>
        ProjectSettingsSchema.parse({ autoRevert: { onContentChange: "sometimes" } })
      ).toThrow();
    });

    it("consistencyCheck.specNotImplementedLevelに無効な値を設定するとZodErrorになる", () => {
      expect(() =>
        ProjectSettingsSchema.parse({ consistencyCheck: { specNotImplementedLevel: "info" } })
      ).toThrow();
    });

    it("feedbackValidation.severityThresholdに無効な値を設定するとZodErrorになる", () => {
      expect(() =>
        ProjectSettingsSchema.parse({ feedbackValidation: { severityThreshold: "urgent" } })
      ).toThrow();
    });

    it("customFilesに文字列以外が含まれるとZodErrorになる", () => {
      expect(() =>
        ProjectSettingsSchema.parse({ approvalPrerequisites: { customFiles: [123] } })
      ).toThrow();
    });
  });
});
