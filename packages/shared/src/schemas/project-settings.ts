import { z } from "zod";
import { FeedbackSeveritySchema } from "./feedback.js";

export const InvariantsSchema = z.object({
  versioning: z.literal(true).default(true),
  cyclicDependencyCheck: z.literal(true).default(true),
  statusTransitionRules: z.literal(true).default(true),
  schemaValidation: z.literal(true).default(true),
});

export const ApprovalPrerequisitesSchema = z.object({
  designMdCheck: z.boolean().default(true),
  descriptionMdCheck: z.boolean().default(false),
  customFiles: z.array(z.string()).default([]),
});

export const StatusTransitionPrSchema = z.object({
  draftToApproved: z.boolean().default(true),
  approvedToImplemented: z.boolean().default(false),
  toDraft: z.boolean().default(true),
});

export const BranchNamingSchema = z.object({
  toApprovedPrefix: z.string().min(1).default("reqord"),
  toImplementedPrefix: z.string().min(1).default("reqord"),
  toDraftPrefix: z.string().min(1).default("reqord"),
});

export const FeedbackValidationSchema = z.object({
  blockOnUnresolved: z.boolean().default(false),
  severityThreshold: FeedbackSeveritySchema.default("critical"),
});

export const AutoRevertSchema = z.object({
  onContentChange: z.enum(["always", "major-only", "never"]).default("always"),
});

export const ConsistencyCheckSchema = z.object({
  specNotImplementedLevel: z.enum(["warning", "error"]).default("warning"),
});

export const ProjectSettingsSchema = z.object({
  invariants: InvariantsSchema.default({}),
  approvalPrerequisites: ApprovalPrerequisitesSchema.default({}),
  statusTransitionPr: StatusTransitionPrSchema.default({}),
  branchNaming: BranchNamingSchema.default({}),
  feedbackValidation: FeedbackValidationSchema.default({}),
  autoRevert: AutoRevertSchema.default({}),
  consistencyCheck: ConsistencyCheckSchema.default({}),
});

export type ProjectSettings = z.infer<typeof ProjectSettingsSchema>;
export type ApprovalPrerequisites = z.infer<typeof ApprovalPrerequisitesSchema>;
export type StatusTransitionPr = z.infer<typeof StatusTransitionPrSchema>;
export type BranchNaming = z.infer<typeof BranchNamingSchema>;
export type FeedbackValidation = z.infer<typeof FeedbackValidationSchema>;
export type AutoRevert = z.infer<typeof AutoRevertSchema>;
export type Invariants = z.infer<typeof InvariantsSchema>;
export type ConsistencyCheck = z.infer<typeof ConsistencyCheckSchema>;
