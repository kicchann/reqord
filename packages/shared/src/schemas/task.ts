import { z } from "zod";

export const TaskDefinitionSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  priority: z.enum(["P0", "P1", "P2", "P3"]).default("P2"),
  estimatedHours: z.number().positive(),
  dependencies: z.array(z.string()).default([]),
});

export const TaskDefinitionFileSchema = z.object({
  tasks: z.array(TaskDefinitionSchema).min(1),
});

export type TaskDefinition = z.infer<typeof TaskDefinitionSchema>;
export type TaskDefinitionFile = z.infer<typeof TaskDefinitionFileSchema>;

export const TaskLinkedToSchema = z.object({
  specifications: z.array(z.string()).default([]),
});

export const TaskEntrySchema = z.object({
  number: z.number().int().positive(),
  title: z.string().min(1),
  url: z.string().url(),
  linkedTo: TaskLinkedToSchema,
  priority: z.enum(["P0", "P1", "P2", "P3"]).optional(),
  status: z.enum(["open", "closed"]),
  estimatedHours: z.number().positive().optional(),
  syncedAt: z.string().datetime(),
});

export const TasksIndexSchema = z.object({
  title: z.string(),
  tasks: z.array(TaskEntrySchema),
});

export type TaskLinkedTo = z.infer<typeof TaskLinkedToSchema>;
export type TaskEntry = z.infer<typeof TaskEntrySchema>;
export type TasksIndex = z.infer<typeof TasksIndexSchema>;
