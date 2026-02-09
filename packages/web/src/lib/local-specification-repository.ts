import { SpecificationSchema, type Specification } from "@reqord/shared";
import type { SpecificationRepository } from "./specification-repository";
import * as fs from "./file-system";
import { getSpecificationsDir } from "./reqord-root";

export class LocalSpecificationRepository implements SpecificationRepository {
  async findAll(): Promise<Specification[]> {
    const specDir = getSpecificationsDir();
    const files = await fs.readdirFiles(specDir, (name) =>
      /^spec-\d{6}\.json$/.test(name),
    );

    const specifications: Specification[] = [];
    for (const file of files.sort()) {
      try {
        const raw = await fs.readJSON<unknown>(fs.joinPath(specDir, file));
        const result = SpecificationSchema.safeParse(raw);
        if (result.success) {
          specifications.push(result.data);
        }
      } catch {
        // Skip files with invalid JSON
      }
    }
    return specifications;
  }

  async findById(id: string): Promise<Specification | null> {
    const specDir = getSpecificationsDir();
    const jsonPath = fs.joinPath(specDir, `${id}.json`);

    if (!(await fs.exists(jsonPath))) {
      return null;
    }

    const raw = await fs.readJSON<unknown>(jsonPath);
    const result = SpecificationSchema.safeParse(raw);
    if (!result.success) {
      throw new Error(`Invalid specification ${id}: ${result.error.message}`);
    }
    return result.data;
  }

  async loadDesign(id: string): Promise<string | null> {
    const specDir = getSpecificationsDir();
    const designPath = fs.joinPath(specDir, id, "design.md");

    if (!(await fs.exists(designPath))) {
      return null;
    }

    return fs.readText(designPath);
  }

  async findByRequirementId(
    requirementId: string,
  ): Promise<Specification[]> {
    const all = await this.findAll();
    return all.filter((spec) => spec.requirementId === requirementId);
  }
}
