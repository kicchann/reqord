import path from "node:path";
import { exists } from "../repositories/file-system.js";
import { AppError, ErrorCode } from "../utils/errors.js";

const REQORD_DIR = ".reqord";

export async function ensureReqordInitialized(cwd: string): Promise<void> {
  const reqordDir = path.join(cwd, REQORD_DIR);
  if (!(await exists(reqordDir))) {
    throw new AppError(
      ".reqord/ ディレクトリが見つかりません。先に 'reqord init' を実行してください。",
      ErrorCode.UNINITIALIZED,
    );
  }
}
