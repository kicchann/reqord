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
