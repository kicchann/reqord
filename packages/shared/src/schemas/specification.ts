import { z } from "zod";
import { StatusSchema, VersionHistoryEntrySchema } from "./common.js";
import { FeedbackFlagSchema } from "./requirement.js";

const SpecCurrentApprovalSchema = z.object({
  version: z.string(),
  phase: z.literal("specification"),
  prNumber: z.number(),
  prUrl: z.string(),
  approvedBy: z.array(z.string()),
  approvedAt: z.string().optional(),
});

export const ImplementationIssueSchema = z.object({
  number: z.number(),
  title: z.string(),
  url: z.string(),
  priority: z.enum(["P0", "P1", "P2", "P3"]),
  status: z.enum(["open", "in_progress", "closed"]).default("open"),
});

export const ProgressSchema = z.object({
  total: z.number(),
  completed: z.number(),
  percentage: z.number(),
  lastSyncedAt: z.string(),
});

export const ImplementationSchema = z.object({
  issues: z.array(ImplementationIssueSchema),
  totalEstimatedHours: z.number(),
  createdAt: z.string(),
  progress: ProgressSchema.optional(),
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
  flags: z.array(FeedbackFlagSchema).default([]),
  currentApproval: SpecCurrentApprovalSchema.optional(),
  implementation: ImplementationSchema.optional(),
});

export type Specification = z.infer<typeof SpecificationSchema>;
export type ImplementationIssue = z.infer<typeof ImplementationIssueSchema>;
export type Implementation = z.infer<typeof ImplementationSchema>;
export type Progress = z.infer<typeof ProgressSchema>;
