export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly exitCode: number = 1,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export enum ErrorCode {
  UNINITIALIZED = "UNINITIALIZED",
  NOT_FOUND = "NOT_FOUND",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  FILE_READ_ERROR = "FILE_READ_ERROR",
  FILE_WRITE_ERROR = "FILE_WRITE_ERROR",
  INVALID_ARGUMENT = "INVALID_ARGUMENT",
  ALREADY_EXISTS = "ALREADY_EXISTS",
  DEPENDENCY_ERROR = "DEPENDENCY_ERROR",
  MIGRATION_FAILED = "MIGRATION_FAILED",
}
