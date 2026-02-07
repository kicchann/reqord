import { REQORD_DIR, SPECIFICATIONS_DIR } from "@reqord/shared";
import * as fs from "../repositories/file-system.js";

export async function generateNextSpecId(cwd: string): Promise<string> {
  const specDir = fs.joinPath(cwd, REQORD_DIR, SPECIFICATIONS_DIR);
  const files = await fs.readdirFiles(specDir, (name) =>
    /^spec-\d{6}\.json$/.test(name),
  );

  let maxNum = 0;
  for (const file of files) {
    const match = file.match(/^spec-(\d{6})\.json$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) {
        maxNum = num;
      }
    }
  }

  const nextNum = maxNum + 1;
  return `spec-${String(nextNum).padStart(6, "0")}`;
}
