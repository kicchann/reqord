import { REQORD_DIR, REQUIREMENTS_DIR } from "@reqord/shared";
import * as fs from "../repositories/file-system.js";

export async function generateNextId(cwd: string): Promise<string> {
  const reqDir = fs.joinPath(cwd, REQORD_DIR, REQUIREMENTS_DIR);
  const files = await fs.readdirFiles(reqDir, (name) =>
    /^req-\d{6}\.json$/.test(name),
  );

  let maxNum = 0;
  for (const file of files) {
    const match = file.match(/^req-(\d{6})\.json$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) {
        maxNum = num;
      }
    }
  }

  const nextNum = maxNum + 1;
  return `req-${String(nextNum).padStart(6, "0")}`;
}
