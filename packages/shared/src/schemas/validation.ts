import { z } from "zod";

export const ValidationSeveritySchema = z.enum(["error", "warning", "info"]);
export type ValidationSeverity = z.infer<typeof ValidationSeveritySchema>;

export const ValidationIssueSchema = z.object({
  type: z.string(),
  severity: ValidationSeveritySchema,
  field: z.string(),
  message: z.string(),
  suggestion: z.string().optional(),
});
export type ValidationIssue = z.infer<typeof ValidationIssueSchema>;

export const SmartScoreSchema = z.object({
  specific: z.number().min(0).max(1),
  measurable: z.number().min(0).max(1),
  achievable: z.number().min(0).max(1),
  relevant: z.number().min(0).max(1),
  timeBound: z.number().min(0).max(1),
  overall: z.number().min(0).max(1),
});
export type SmartScore = z.infer<typeof SmartScoreSchema>;

export const ValidationMetadataSchema = z.object({
  criteriaCount: z.number(),
  hasDescription: z.boolean(),
  hasDependencyIssues: z.boolean(),
  validatedAt: z.string(),
});
export type ValidationMetadata = z.infer<typeof ValidationMetadataSchema>;

export const ValidationResultSchema = z.object({
  id: z.string(),
  valid: z.boolean(),
  issues: z.array(ValidationIssueSchema),
  smartScore: SmartScoreSchema,
  metadata: ValidationMetadataSchema,
});
export type ValidationResult = z.infer<typeof ValidationResultSchema>;
