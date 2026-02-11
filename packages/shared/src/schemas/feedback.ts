import { z } from "zod";

export const FeedbackTypeSchema = z.enum([
  "bug",
  "improvement",
  "requirement-gap",
  "spec-mismatch",
  "security",
]);

export const FeedbackSeveritySchema = z.enum([
  "critical",
  "high",
  "medium",
  "low",
]);

export const FeedbackStatusSchema = z.enum(["open", "closed"]);

const FeedbackResolvedSchema = z.object({
  requirements: z.array(z.string()),
  specifications: z.array(z.string()),
});

const FeedbackLinkedToSchema = z.object({
  requirements: z.array(z.string()),
  createdRequirements: z.array(z.string()),
  specifications: z.array(z.string()),
  createdSpecifications: z.array(z.string()).default([]),
  resolved: FeedbackResolvedSchema.optional(),
});

export const FeedbackEntrySchema = z.object({
  githubIssue: z.number(),
  type: FeedbackTypeSchema.optional(),
  severity: FeedbackSeveritySchema.optional(),
  linkedTo: FeedbackLinkedToSchema,
  syncedAt: z.string().datetime(),
  status: FeedbackStatusSchema,
});

export const FeedbackIndexSchema = z.object({
  feedbacks: z.array(FeedbackEntrySchema),
});

export type FeedbackType = z.infer<typeof FeedbackTypeSchema>;
export type FeedbackSeverity = z.infer<typeof FeedbackSeveritySchema>;
export type FeedbackStatus = z.infer<typeof FeedbackStatusSchema>;
export type FeedbackLinkedTo = z.infer<typeof FeedbackLinkedToSchema>;
export type FeedbackResolved = z.infer<typeof FeedbackResolvedSchema>;
export type FeedbackEntry = z.infer<typeof FeedbackEntrySchema>;
export type FeedbackIndex = z.infer<typeof FeedbackIndexSchema>;
