import { readFile, writeFile, mkdir, readdir, access, stat, rm } from "node:fs/promises";
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

export async function isDirectory(path: string): Promise<boolean> {
  try {
    const s = await stat(path);
    return s.isDirectory();
  } catch {
    return false;
  }
}

export async function readJSON<T>(path: string): Promise<T> {
  const content = await readFile(path, "utf-8");
  return JSON.parse(content) as T;
}

export async function writeJSON(path: string, data: unknown): Promise<void> {
  await writeFile(path, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

export async function readText(path: string): Promise<string> {
  return readFile(path, "utf-8");
}

export async function writeText(path: string, content: string): Promise<void> {
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

export function getReqordDir(cwd: string, ...subPaths: string[]): string {
  return join(cwd, ".reqord", ...subPaths);
}

export function fixUnquotedHash(content: string, filePath: string): string {
  const lines = content.split("\n");
  const fixedLines: string[] = [];
  let modified = false;
  let inBlockScalar = false;
  let blockIndent = -1;

  for (const line of lines) {
    // Skip empty lines
    if (line.trim() === "") {
      fixedLines.push(line);
      continue;
    }

    // Skip comment-only lines
    if (/^\s*#/.test(line)) {
      fixedLines.push(line);
      continue;
    }

    // Detect block scalar indicators (>-, |, >, |-)
    if (/:\s+[>|][-+]?\s*$/.test(line)) {
      inBlockScalar = true;
      blockIndent = -1;
      fixedLines.push(line);
      continue;
    }

    // If in block scalar, check indentation to detect end
    if (inBlockScalar) {
      const currentIndent = line.length - line.trimStart().length;
      if (blockIndent === -1) {
        blockIndent = currentIndent;
        fixedLines.push(line);
        continue;
      }
      if (currentIndent >= blockIndent && blockIndent > 0) {
        fixedLines.push(line);
        continue;
      }
      inBlockScalar = false;
    }

    // Skip lines that don't contain ' #' with digits
    if (!/ #\d/.test(line)) {
      fixedLines.push(line);
      continue;
    }

    // Check if it's a key-value line with quoted value
    const kvMatch = line.match(/^(\s*[\w-]+:\s+)('.*'|".*")\s*$/);
    if (kvMatch) {
      fixedLines.push(line);
      continue;
    }

    // Check if it's a list item with quoted value
    const listMatch = line.match(/^(\s*-\s+)('.*'|".*")\s*$/);
    if (listMatch) {
      fixedLines.push(line);
      continue;
    }

    // Key-value line with unquoted value containing ' #\d'
    const kvUnquoted = line.match(/^(\s*[\w-]+:\s+)(.+)$/);
    if (kvUnquoted) {
      const [, prefix, value] = kvUnquoted;
      if (/ #\d/.test(value) && !(/^'.*'$/.test(value) || /^".*"$/.test(value))) {
        const escaped = value.replace(/'/g, "''");
        fixedLines.push(`${prefix}'${escaped}'`);
        modified = true;
        continue;
      }
    }

    // List item with unquoted value containing ' #\d'
    const listUnquoted = line.match(/^(\s*-\s+)(.+)$/);
    if (listUnquoted) {
      const [, prefix, value] = listUnquoted;
      if (/ #\d/.test(value) && !(/^'.*'$/.test(value) || /^".*"$/.test(value))) {
        const escaped = value.replace(/'/g, "''");
        fixedLines.push(`${prefix}'${escaped}'`);
        modified = true;
        continue;
      }
    }

    fixedLines.push(line);
  }

  if (modified) {
    console.warn(
      `[reqord] Warning: Auto-fixed unquoted ' #' in YAML plain scalar (${filePath}). Data would be silently truncated by js-yaml.`,
    );
  }

  return fixedLines.join("\n");
}

export async function readYAML<T>(filePath: string): Promise<T> {
  const content = await readFile(filePath, "utf-8");
  const fixed = fixUnquotedHash(content, filePath);
  try {
    return yamlLoad(fixed, { schema: JSON_SCHEMA }) as T;
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
