import { z } from "zod";
import { StatusSchema } from "./common.js";

export const SpecComplexitySchema = z.enum(["S", "M", "L", "XL"]);
export type SpecComplexity = z.infer<typeof SpecComplexitySchema>;

const VersionHistoryEntrySchema = z.object({
  version: z.string(),
  changedAt: z.string(),
  changes: z.string(),
});

const CoverageEntrySchema = z.object({
  status: z.enum(["not-covered", "partial", "covered"]),
  specSection: z.string().optional(),
  notes: z.string().optional(),
});

const TechnicalDecisionSchema = z.object({
  title: z.string(),
  decision: z.string(),
  rationale: z.string(),
  alternatives: z.array(z.string()).default([]),
  decidedAt: z.string(),
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
    research: z.string(),
    design: z.string(),
    architecture: z.string(),
    examples: z.array(z.string()).default([]),
  }),
  requirementCoverage: z.record(CoverageEntrySchema).default({}),
  technicalDecisions: z.array(TechnicalDecisionSchema).default([]),
  complexity: SpecComplexitySchema.optional(),
  estimatedHours: z.number().positive().optional(),
});

export type Specification = z.infer<typeof SpecificationSchema>;
