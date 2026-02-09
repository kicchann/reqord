import { describe, it, expect } from "vitest";
import { AppError, ErrorCode } from "./errors.js";

describe("AppError", () => {
  it("has correct name property (AppError)", () => {
    const error = new AppError("test message", ErrorCode.NOT_FOUND);
    expect(error.name).toBe("AppError");
  });

  it("stores message, code, and exitCode", () => {
    const error = new AppError("test message", ErrorCode.NOT_FOUND, 2);
    expect(error.message).toBe("test message");
    expect(error.code).toBe(ErrorCode.NOT_FOUND);
    expect(error.exitCode).toBe(2);
  });

  it("defaults exitCode to 1 when not specified", () => {
    const error = new AppError("test message", ErrorCode.VALIDATION_ERROR);
    expect(error.exitCode).toBe(1);
  });

  it("uses custom exitCode when provided", () => {
    const error = new AppError("test message", ErrorCode.FILE_READ_ERROR, 5);
    expect(error.exitCode).toBe(5);
  });

  it("is instanceof Error", () => {
    const error = new AppError("test message", ErrorCode.INVALID_ARGUMENT);
    expect(error).toBeInstanceOf(Error);
  });
});

describe("ErrorCode", () => {
  it("contains all expected values", () => {
    expect(ErrorCode.UNINITIALIZED).toBe("UNINITIALIZED");
    expect(ErrorCode.NOT_FOUND).toBe("NOT_FOUND");
    expect(ErrorCode.VALIDATION_ERROR).toBe("VALIDATION_ERROR");
    expect(ErrorCode.FILE_READ_ERROR).toBe("FILE_READ_ERROR");
    expect(ErrorCode.FILE_WRITE_ERROR).toBe("FILE_WRITE_ERROR");
    expect(ErrorCode.INVALID_ARGUMENT).toBe("INVALID_ARGUMENT");
    expect(ErrorCode.ALREADY_EXISTS).toBe("ALREADY_EXISTS");
    expect(ErrorCode.DEPENDENCY_ERROR).toBe("DEPENDENCY_ERROR");
  });
});
