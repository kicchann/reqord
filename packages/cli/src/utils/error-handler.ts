import chalk from "chalk";
import { AppError } from "./errors.js";

export function handleError(
  error: unknown,
  options?: { json?: boolean },
): void {
  if (error instanceof AppError) {
    if (options?.json) {
      console.error(
        JSON.stringify({
          error: true,
          code: error.code,
          message: error.message,
        }),
      );
    } else {
      console.error(chalk.red(`エラー: ${error.message}`));
    }
    process.exitCode = error.exitCode;
  } else {
    const errorMessage = (error as Error).message;
    if (options?.json) {
      console.error(
        JSON.stringify({
          error: true,
          code: "UNKNOWN",
          message: errorMessage,
        }),
      );
    } else {
      console.error(chalk.red(`予期しないエラーが発生しました: ${errorMessage}`));
    }
    process.exitCode = 1;
  }
}
