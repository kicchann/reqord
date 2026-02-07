import { RequirementSchema, type Requirement } from "@reqord/shared";
import type { RequirementRepository } from "./repository";
import * as fs from "./file-system";
import { generateNextId } from "./id-generator";
import { getReqordRoot, getRequirementsDir } from "./reqord-root";

export class LocalRequirementRepository implements RequirementRepository {
  async findAll(): Promise<Requirement[]> {
    const reqDir = getRequirementsDir();
    const files = await fs.readdirFiles(reqDir, (name) =>
      /^req-\d{6}\.json$/.test(name),
    );

    const requirements: Requirement[] = [];
    for (const file of files.sort()) {
      const raw = await fs.readJSON<unknown>(fs.joinPath(reqDir, file));
      const result = RequirementSchema.safeParse(raw);
      if (result.success) {
        requirements.push(result.data);
      }
    }
    return requirements;
  }

  async findById(id: string): Promise<Requirement | null> {
    const reqDir = getRequirementsDir();
    const jsonPath = fs.joinPath(reqDir, `${id}.json`);

    if (!(await fs.exists(jsonPath))) {
      return null;
    }

    const raw = await fs.readJSON<unknown>(jsonPath);
    const result = RequirementSchema.safeParse(raw);
    if (!result.success) {
      throw new Error(`Invalid requirement ${id}: ${result.error.message}`);
    }
    return result.data;
  }

  async loadDescription(id: string): Promise<string | null> {
    const reqDir = getRequirementsDir();
    const descPath = fs.joinPath(reqDir, id, "description.md");

    if (!(await fs.exists(descPath))) {
      return null;
    }

    return fs.readText(descPath);
  }

  async save(requirement: Requirement): Promise<void> {
    const reqDir = getRequirementsDir();
    await fs.mkdirp(reqDir);
    const jsonPath = fs.joinPath(reqDir, `${requirement.id}.json`);
    await fs.writeJSON(jsonPath, requirement);
  }

  async saveDescription(id: string, content: string): Promise<void> {
    const reqDir = getRequirementsDir();
    const descDir = fs.joinPath(reqDir, id);
    await fs.mkdirp(descDir);
    await fs.writeText(fs.joinPath(descDir, "description.md"), content);
  }

  async deleteById(id: string): Promise<void> {
    const reqDir = getRequirementsDir();
    const jsonPath = fs.joinPath(reqDir, `${id}.json`);
    const descDir = fs.joinPath(reqDir, id);

    await fs.remove(jsonPath);
    await fs.remove(descDir);
  }

  async generateNextId(): Promise<string> {
    return generateNextId(getReqordRoot());
  }
}
