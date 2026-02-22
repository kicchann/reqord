import { z } from "zod";
import { StatusSchema, VersionHistoryEntrySchema } from "./common.js";
import { FlagSchema } from "./requirement.js";

export const DesignValidationRuleSchema = z.object({
  ruleId: z.string(),
  status: z.enum(["pass", "fail"]),
  severity: z.enum(["error", "warning", "info"]),
  message: z.string().optional(),
});

export const DesignValidationSchema = z.object({
  passed: z.number(),
  warnings: z.number(),
  errors: z.number(),
  rules: z.array(DesignValidationRuleSchema),
  validatedAt: z.string(),
});

export const SpecificationSchema = z.object({
  id: z.string().regex(/^spec-\d{6}$/),
  requirementId: z.string().regex(/^req-\d{6}$/),
  title: z.string().min(1).optional(),
  requirementVersion: z.string().min(1).optional(),
  version: z.string().default("1.0.0"),
  status: StatusSchema.default("draft"),
  createdAt: z.string(),
  updatedAt: z.string(),
  versionHistory: z.array(VersionHistoryEntrySchema).default([]),
  files: z.object({
    design: z.string(),
    supplementary: z.array(z.string()).default([]),
  }),
  flags: z.array(FlagSchema).default([]),
  designValidation: DesignValidationSchema.optional(),
}).passthrough();

export type Specification = z.infer<typeof SpecificationSchema>;
export type DesignValidation = z.infer<typeof DesignValidationSchema>;
export type DesignValidationRule = z.infer<typeof DesignValidationRuleSchema>;
