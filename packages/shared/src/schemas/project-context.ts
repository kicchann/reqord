import { z } from "zod";

export const ProjectContextSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string().default("0.1.0"),
  language: z.string().default("ja"),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  files: z.object({
    product: z.union([
      z.string(),
      z.object({ path: z.string(), format: z.string() }),
    ]),
    technical: z.union([
      z.string(),
      z.object({ structured: z.string(), narrative: z.string().optional() }),
    ]),
    structure: z.union([
      z.string(),
      z.object({ structured: z.string(), narrative: z.string().optional() }),
    ]),
    domain: z.array(z.string()).default([]),
  }),
});

export type ProjectContext = z.infer<typeof ProjectContextSchema>;
