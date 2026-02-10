import chalk from "chalk";
import { AppError } from "./errors.js";

export function handleError(
  error: unknown,
  options?: { json?: boolean },
): void {
  const isAppError = error instanceof AppError;
  const code = isAppError ? error.code : "UNKNOWN";
  const message = error instanceof Error ? error.message : String(error);
  const exitCode = isAppError ? error.exitCode : 1;
  const prefix = isAppError ? "エラー" : "予期しないエラーが発生しました";

  if (options?.json) {
    console.error(JSON.stringify({ error: true, code, message }));
  } else {
    console.error(chalk.red(`${prefix}: ${message}`));
  }
  process.exitCode = exitCode;
}
