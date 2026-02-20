import { z } from "zod";

export const StatusSchema = z.enum([
  "draft",
  "approved",
  "implemented",
  "deprecated",
]);
export type Status = z.infer<typeof StatusSchema>;

export const PrioritySchema = z.enum(["low", "medium", "high"]);
export type Priority = z.infer<typeof PrioritySchema>;

export const ComplexitySchema = z.enum(["small", "medium", "large", "xlarge"]);
export type Complexity = z.infer<typeof ComplexitySchema>;

export const FormatTypeSchema = z.enum(["user-story", "ears", "free-form"]);
export type FormatType = z.infer<typeof FormatTypeSchema>;

export const VersionHistoryEntrySchema = z.object({
  version: z.string(),
  status: StatusSchema,
  changedAt: z.string(),
  summary: z.string(),
  approvedAt: z.string().optional(),
  approvedBy: z.array(z.string()).optional(),
});
export type VersionHistoryEntry = z.infer<typeof VersionHistoryEntrySchema>;
