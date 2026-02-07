import { z } from "zod";
import {
  StatusSchema,
  PrioritySchema,
  ComplexitySchema,
  FormatTypeSchema,
  VersionHistoryEntrySchema,
} from "./common.js";

const UserStorySchema = z.object({
  as: z.string(),
  iWant: z.string(),
  soThat: z.string(),
});

const EarsSchema = z.object({
  type: z.string(),
  trigger: z.string().optional(),
  condition: z.string().optional(),
  action: z.string(),
  response: z.string().optional(),
});

const FormatSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("user-story"), userStory: UserStorySchema }),
  z.object({ type: z.literal("ears"), ears: EarsSchema }),
  z.object({ type: z.literal("free-form") }),
]);

const DependenciesSchema = z.object({
  blockedBy: z.array(z.string()).default([]),
  blocks: z.array(z.string()).default([]),
  relatedTo: z.array(z.string()).default([]),
});

export const RequirementSchema = z.object({
  id: z.string().regex(/^req-\d{6}$/),
  version: z.string().default("1.0.0"),
  title: z.string().min(1),
  status: StatusSchema.default("draft"),
  priority: PrioritySchema.default("medium"),
  createdAt: z.string(),
  updatedAt: z.string(),
  versionHistory: z.array(VersionHistoryEntrySchema).default([]),
  files: z.object({
    description: z.string(),
    supplementary: z.array(z.string()).default([]),
  }),
  successCriteria: z.array(z.string()).default([]),
  format: FormatSchema,
  dependencies: DependenciesSchema.default({
    blockedBy: [],
    blocks: [],
    relatedTo: [],
  }),
  estimatedComplexity: ComplexitySchema.optional(),
  estimatedHours: z.number().positive().optional(),
});

export type Requirement = z.infer<typeof RequirementSchema>;
