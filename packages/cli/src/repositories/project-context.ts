import { ProjectContextSchema, type ProjectContext, CONTEXT_DIR } from "@reqord/shared";
import * as fs from "../repositories/file-system.js";

function getContextDir(cwd: string): string {
  return fs.getReqordDir(cwd, CONTEXT_DIR);
}

function getContextYamlPath(cwd: string): string {
  return fs.joinPath(getContextDir(cwd), "context.yaml");
}

export async function load(cwd: string): Promise<ProjectContext | null> {
  const yamlPath = getContextYamlPath(cwd);

  if (!(await fs.exists(yamlPath))) {
    return null;
  }

  const raw = await fs.readYAML<unknown>(yamlPath);
  const result = ProjectContextSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid context.yaml: ${result.error.message}`);
  }
  return result.data;
}

export async function save(cwd: string, context: ProjectContext): Promise<void> {
  const contextDir = getContextDir(cwd);
  await fs.mkdirp(contextDir);
  await fs.writeYAML(getContextYamlPath(cwd), context);
}

export async function contextExists(cwd: string): Promise<boolean> {
  return fs.exists(getContextYamlPath(cwd));
}

export type ContextFileType = "product" | "technical" | "structure";

function getContextFilePath(cwd: string, fileType: ContextFileType): string {
  return fs.joinPath(getContextDir(cwd), `${fileType}.yaml`);
}

export async function loadContextFile(cwd: string, fileType: ContextFileType): Promise<unknown | null> {
  const filePath = getContextFilePath(cwd, fileType);
  if (!(await fs.exists(filePath))) {
    return null;
  }
  return fs.readYAML<unknown>(filePath);
}

export async function saveContextFile(cwd: string, fileType: ContextFileType, data: unknown): Promise<void> {
  const filePath = getContextFilePath(cwd, fileType);
  await fs.writeYAML(filePath, data);
}
