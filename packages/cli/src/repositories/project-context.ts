import { ProjectContextSchema, type ProjectContext, CONTEXT_DIR } from "@reqord/shared";
import * as fs from "../repositories/file-system.js";

function getContextDir(cwd: string): string {
  return fs.getReqordDir(cwd, CONTEXT_DIR);
}

function getContextJsonPath(cwd: string): string {
  return fs.joinPath(getContextDir(cwd), "context.json");
}

export async function load(cwd: string): Promise<ProjectContext | null> {
  const jsonPath = getContextJsonPath(cwd);

  if (!(await fs.exists(jsonPath))) {
    return null;
  }

  const raw = await fs.readJSON<unknown>(jsonPath);
  const result = ProjectContextSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid context.json: ${result.error.message}`);
  }
  return result.data;
}

export async function save(cwd: string, context: ProjectContext): Promise<void> {
  const contextDir = getContextDir(cwd);
  await fs.mkdirp(contextDir);
  await fs.writeJSON(getContextJsonPath(cwd), context);
}

export async function contextExists(cwd: string): Promise<boolean> {
  return fs.exists(getContextJsonPath(cwd));
}

export type ContextFileType = "product" | "technical" | "structure";

function getContextFilePath(cwd: string, fileType: ContextFileType): string {
  return fs.joinPath(getContextDir(cwd), `${fileType}.json`);
}

export async function loadContextFile(cwd: string, fileType: ContextFileType): Promise<unknown | null> {
  const filePath = getContextFilePath(cwd, fileType);
  if (!(await fs.exists(filePath))) {
    return null;
  }
  return fs.readJSON<unknown>(filePath);
}

export async function saveContextFile(cwd: string, fileType: ContextFileType, data: unknown): Promise<void> {
  const filePath = getContextFilePath(cwd, fileType);
  await fs.writeJSON(filePath, data);
}
