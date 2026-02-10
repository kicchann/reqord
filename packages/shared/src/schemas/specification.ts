import { z } from "zod";
import { StatusSchema, VersionHistoryEntrySchema } from "./common.js";
import { FeedbackFlagSchema } from "./requirement.js";

const SpecificationCurrentApprovalSchema = z.object({
  version: z.string(),
  phase: z.literal("specification"),
  prNumber: z.number(),
  prUrl: z.string(),
  approvedBy: z.array(z.string()),
  approvedAt: z.string().optional(),
});

export const SpecificationSchema = z.object({
  id: z.string().regex(/^spec-\d{6}$/),
  requirementId: z.string().regex(/^req-\d{6}$/),
  version: z.string().default("1.0.0"),
  status: StatusSchema.default("draft"),
  createdAt: z.string(),
  updatedAt: z.string(),
  versionHistory: z.array(VersionHistoryEntrySchema).default([]),
  files: z.object({
    design: z.string(),
    supplementary: z.array(z.string()).default([]),
  }),
  flags: z.array(FeedbackFlagSchema).default([]),
  currentApproval: SpecificationCurrentApprovalSchema.optional(),
});

export type Specification = z.infer<typeof SpecificationSchema>;
