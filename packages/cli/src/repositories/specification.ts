import { SpecificationSchema, type Specification, REQORD_DIR, SPECIFICATIONS_DIR } from "@reqord/shared";
import * as fs from "../repositories/file-system.js";

function getReqordRoot(cwd: string): string {
  return fs.joinPath(cwd, REQORD_DIR);
}

function getSpecificationsDir(cwd: string): string {
  return fs.joinPath(getReqordRoot(cwd), SPECIFICATIONS_DIR);
}

export async function ensureSpecDir(cwd: string, id: string): Promise<void> {
  const specDir = fs.joinPath(getSpecificationsDir(cwd), id);
  await fs.mkdirp(specDir);
}

export async function save(cwd: string, spec: Specification): Promise<void> {
  const specsDir = getSpecificationsDir(cwd);
  const jsonPath = fs.joinPath(specsDir, `${spec.id}.json`);
  await fs.writeJSON(jsonPath, spec);
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

export async function findById(cwd: string, id: string): Promise<Specification | null> {
  const specsDir = getSpecificationsDir(cwd);
  const jsonPath = fs.joinPath(specsDir, `${id}.json`);

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

export async function findAll(cwd: string): Promise<Specification[]> {
  const specsDir = getSpecificationsDir(cwd);
  const files = await fs.readdirFiles(specsDir, (name) =>
    /^spec-\d{6}\.json$/.test(name),
  );

  const specifications: Specification[] = [];
  for (const file of files.sort()) {
    const raw = await fs.readJSON<unknown>(fs.joinPath(specsDir, file));
    const result = SpecificationSchema.safeParse(raw);
    if (result.success) {
      specifications.push(result.data);
    }
  }
  return specifications;
}

export async function deleteById(cwd: string, id: string): Promise<void> {
  const specsDir = getSpecificationsDir(cwd);
  const jsonPath = fs.joinPath(specsDir, `${id}.json`);
  const specDir = fs.joinPath(specsDir, id);

  await fs.remove(jsonPath);
  await fs.remove(specDir);
}
