import { z } from "zod";
import { StatusSchema, VersionHistoryEntrySchema } from "./common.js";
import { FeedbackFlagSchema, CurrentApprovalSchema } from "./requirement.js";

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
  currentApproval: CurrentApprovalSchema.optional(),
});

export type Specification = z.infer<typeof SpecificationSchema>;
