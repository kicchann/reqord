import { SpecificationSchema, type Specification, SPECIFICATIONS_DIR, formatZodError } from "@reqord/shared";
import * as fs from "../repositories/file-system.js";

function getSpecificationsDir(cwd: string): string {
  return fs.getReqordDir(cwd, SPECIFICATIONS_DIR);
}

export async function ensureSpecDir(cwd: string, id: string): Promise<void> {
  const specDir = fs.joinPath(getSpecificationsDir(cwd), id);
  await fs.mkdirp(specDir);
}

export async function save(cwd: string, spec: Specification): Promise<void> {
  const specsDir = getSpecificationsDir(cwd);
  const yamlPath = fs.joinPath(specsDir, `${spec.id}.yaml`);
  await fs.writeYAML(yamlPath, spec);
}

export async function saveFile(
  cwd: string,
  id: string,
  filename: string,
  content: string,
): Promise<void> {
  const specDir = fs.joinPath(getSpecificationsDir(cwd), id);
  await fs.mkdirp(specDir);
  await fs.writeText(fs.joinPath(specDir, filename), content);
}

export async function loadFile(
  cwd: string,
  id: string,
  filename: string,
): Promise<string | null> {
  const filePath = fs.joinPath(getSpecificationsDir(cwd), id, filename);

  if (!(await fs.exists(filePath))) {
    return null;
  }

  return fs.readText(filePath);
}

export async function findByIdOrThrow(cwd: string, id: string): Promise<Specification> {
  const specification = await findById(cwd, id);
  if (!specification) {
    throw new Error(`Specification ${id} not found.`);
  }
  return specification;
}

export async function findById(cwd: string, id: string): Promise<Specification | null> {
  const specsDir = getSpecificationsDir(cwd);
  const yamlPath = fs.joinPath(specsDir, `${id}.yaml`);

  if (!(await fs.exists(yamlPath))) {
    return null;
  }

  const raw = await fs.readYAML<unknown>(yamlPath);
  const result = SpecificationSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Validation error for specification ${id}:\n${formatZodError(result.error)}`);
  }
  return result.data;
}

export async function findAll(cwd: string): Promise<Specification[]> {
  const specsDir = getSpecificationsDir(cwd);
  const files = await fs.readdirFiles(specsDir, (name) =>
    /^spec-\d{6}\.yaml$/.test(name),
  );

  const specifications: Specification[] = [];
  for (const file of files.sort()) {
    const raw = await fs.readYAML<unknown>(fs.joinPath(specsDir, file));
    const result = SpecificationSchema.safeParse(raw);
    if (result.success) {
      specifications.push(result.data);
    }
  }
  return specifications;
}

export async function deleteById(cwd: string, id: string): Promise<void> {
  const specsDir = getSpecificationsDir(cwd);
  const yamlPath = fs.joinPath(specsDir, `${id}.yaml`);
  const specDir = fs.joinPath(specsDir, id);

  await fs.remove(yamlPath);
  await fs.remove(specDir);
}
