import {
  readFile,
  writeFile,
  mkdir,
  readdir,
  access,
  rm,
} from "node:fs/promises";
import { join } from "node:path";

export async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function readJSON<T>(path: string): Promise<T> {
  const content = await readFile(path, "utf-8");
  return JSON.parse(content) as T;
}

export async function writeJSON(
  path: string,
  data: unknown,
): Promise<void> {
  await writeFile(path, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

export async function readText(path: string): Promise<string> {
  return readFile(path, "utf-8");
}

export async function writeText(
  path: string,
  content: string,
): Promise<void> {
  await writeFile(path, content, "utf-8");
}

export async function mkdirp(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

export async function readdirFiles(
  dirPath: string,
  filter?: (name: string) => boolean,
): Promise<string[]> {
  try {
    const entries = await readdir(dirPath);
    return filter ? entries.filter(filter) : entries;
  } catch {
    return [];
  }
}

export async function remove(path: string): Promise<void> {
  await rm(path, { recursive: true, force: true });
}

export function joinPath(...segments: string[]): string {
  return join(...segments);
}
