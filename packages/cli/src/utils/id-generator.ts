import { REQUIREMENTS_DIR, SPECIFICATIONS_DIR } from "@reqord/shared";
import * as fs from "../repositories/file-system.js";

async function generateNextPrefixedId(
  cwd: string,
  dir: string,
  prefix: string,
): Promise<string> {
  const pattern = new RegExp(`^${prefix}-(\\d{6})\\.yaml$`);
  const targetDir = fs.getReqordDir(cwd, dir);
  const files = await fs.readdirFiles(targetDir, (name) => pattern.test(name));

  let maxNum = 0;
  for (const file of files) {
    const match = file.match(pattern);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }

  return `${prefix}-${String(maxNum + 1).padStart(6, "0")}`;
}

export function generateNextId(cwd: string): Promise<string> {
  return generateNextPrefixedId(cwd, REQUIREMENTS_DIR, "req");
}

export function generateNextSpecId(cwd: string): Promise<string> {
  return generateNextPrefixedId(cwd, SPECIFICATIONS_DIR, "spec");
}
