import { RequirementSchema, type Requirement, REQUIREMENTS_DIR } from "@reqord/shared";
import * as fs from "../repositories/file-system.js";

function getRequirementsDir(cwd: string): string {
  return fs.getReqordDir(cwd, REQUIREMENTS_DIR);
}

export async function save(cwd: string, requirement: Requirement): Promise<void> {
  const reqDir = getRequirementsDir(cwd);
  const jsonPath = fs.joinPath(reqDir, `${requirement.id}.json`);
  await fs.writeJSON(jsonPath, requirement);
}

export async function saveDescription(
  cwd: string,
  id: string,
  content: string,
): Promise<void> {
  const reqDir = getRequirementsDir(cwd);
  const descDir = fs.joinPath(reqDir, id);
  await fs.mkdirp(descDir);
  await fs.writeText(fs.joinPath(descDir, "description.md"), content);
}

export async function findByIdOrThrow(cwd: string, id: string): Promise<Requirement> {
  const requirement = await findById(cwd, id);
  if (!requirement) {
    throw new Error(`Requirement ${id} not found.`);
  }
  return requirement;
}

export async function findById(cwd: string, id: string): Promise<Requirement | null> {
  const reqDir = getRequirementsDir(cwd);
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

export async function loadDescription(cwd: string, id: string): Promise<string | null> {
  const reqDir = getRequirementsDir(cwd);
  const descPath = fs.joinPath(reqDir, id, "description.md");

  if (!(await fs.exists(descPath))) {
    return null;
  }

  return fs.readText(descPath);
}

export async function deleteById(cwd: string, id: string): Promise<void> {
  const reqDir = getRequirementsDir(cwd);
  const jsonPath = fs.joinPath(reqDir, `${id}.json`);
  const descDir = fs.joinPath(reqDir, id);

  await fs.remove(jsonPath);
  await fs.remove(descDir);
}

export async function findAll(cwd: string): Promise<Requirement[]> {
  const reqDir = getRequirementsDir(cwd);
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
