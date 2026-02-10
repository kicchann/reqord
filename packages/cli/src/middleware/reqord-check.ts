import { exists, getReqordDir } from "../repositories/file-system.js";
import { AppError, ErrorCode } from "../utils/errors.js";

export async function ensureReqordInitialized(cwd: string): Promise<void> {
  const reqordDir = getReqordDir(cwd);
  if (!(await exists(reqordDir))) {
    throw new AppError(
      ".reqord/ ディレクトリが見つかりません。先に 'reqord init' を実行してください。",
      ErrorCode.UNINITIALIZED,
    );
  }
}
