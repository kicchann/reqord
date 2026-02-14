import {
  readFile,
  writeFile,
  mkdir,
  readdir,
  access,
  rm,
} from "node:fs/promises";
import { join } from "node:path";
import { load as yamlLoad, dump as yamlDump, JSON_SCHEMA } from "js-yaml";

export async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
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

export async function readYAML<T>(filePath: string): Promise<T> {
  const content = await readFile(filePath, "utf-8");
  try {
    return yamlLoad(content, { schema: JSON_SCHEMA }) as T;
  } catch (error) {
    throw new Error(
      `YAML構文エラー (${filePath}): ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function writeYAML(filePath: string, data: unknown): Promise<void> {
  const yamlContent = yamlDump(data, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
    sortKeys: false,
    schema: JSON_SCHEMA,
  });
  await writeFile(filePath, yamlContent, "utf-8");
}
