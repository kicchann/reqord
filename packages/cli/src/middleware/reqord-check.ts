import { exists, getReqordDir } from "../repositories/file-system.js";
import { AppError, ErrorCode } from "../utils/errors.js";

export async function ensureReqordInitialized(cwd: string): Promise<void> {
  const reqordDir = getReqordDir(cwd);
  if (!(await exists(reqordDir))) {
    throw new AppError(
      ".reqord/ directory not found. Run 'reqord init' first.",
      ErrorCode.UNINITIALIZED,
    );
  }
}
