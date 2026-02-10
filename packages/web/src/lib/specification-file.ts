import * as fs from "./file-system";
import { getSpecificationsDir } from "./reqord-root";

export async function loadSpecFile(
  specId: string,
  filename: string,
): Promise<string | null> {
  const specDir = getSpecificationsDir();
  const filePath = fs.joinPath(specDir, specId, filename);
  if (!(await fs.exists(filePath))) return null;
  return fs.readText(filePath);
}
