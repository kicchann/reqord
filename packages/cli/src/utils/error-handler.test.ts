import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handleError } from "./error-handler.js";
import { AppError, ErrorCode } from "./errors.js";

describe("handleError", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let originalExitCode: string | number | null | undefined;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    process.exitCode = originalExitCode;
  });

  it("outputs error message via chalk.red when handling AppError", () => {
    const error = new AppError("Test error message", ErrorCode.NOT_FOUND);
    handleError(error);

    expect(consoleErrorSpy).toHaveBeenCalledOnce();
    const output = consoleErrorSpy.mock.calls[0][0] as string;
    expect(output).toContain("エラー: Test error message");
  });

  it("sets process.exitCode to error.exitCode when handling AppError", () => {
    const error = new AppError("Test error", ErrorCode.FILE_READ_ERROR, 3);
    handleError(error);

    expect(process.exitCode).toBe(3);
  });

  it("outputs unexpected error message for non-AppError", () => {
    const error = new Error("Standard error");
    handleError(error);

    expect(consoleErrorSpy).toHaveBeenCalledOnce();
    const output = consoleErrorSpy.mock.calls[0][0] as string;
    expect(output).toContain("予期しないエラーが発生しました: Standard error");
  });

  it("sets process.exitCode to 1 for non-AppError", () => {
    const error = new Error("Standard error");
    handleError(error);

    expect(process.exitCode).toBe(1);
  });

  it("outputs JSON with code and message when handling AppError with json option", () => {
    const error = new AppError("JSON test error", ErrorCode.VALIDATION_ERROR);
    handleError(error, { json: true });

    expect(consoleErrorSpy).toHaveBeenCalledOnce();
    const output = consoleErrorSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);

    expect(parsed).toEqual({
      error: true,
      code: "VALIDATION_ERROR",
      message: "JSON test error",
    });
  });

  it("outputs JSON with code UNKNOWN for non-AppError with json option", () => {
    const error = new Error("Unknown error");
    handleError(error, { json: true });

    expect(consoleErrorSpy).toHaveBeenCalledOnce();
    const output = consoleErrorSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);

    expect(parsed).toEqual({
      error: true,
      code: "UNKNOWN",
      message: "Unknown error",
    });
  });

  it("handles string error values", () => {
    handleError("string error");

    expect(consoleErrorSpy).toHaveBeenCalledOnce();
    const output = consoleErrorSpy.mock.calls[0][0] as string;
    expect(output).toContain("予期しないエラーが発生しました: string error");
  });

  it("handles number error values", () => {
    handleError(42);

    expect(consoleErrorSpy).toHaveBeenCalledOnce();
    const output = consoleErrorSpy.mock.calls[0][0] as string;
    expect(output).toContain("予期しないエラーが発生しました: 42");
  });

  it("handles null error values", () => {
    handleError(null);

    expect(consoleErrorSpy).toHaveBeenCalledOnce();
    const output = consoleErrorSpy.mock.calls[0][0] as string;
    expect(output).toContain("予期しないエラーが発生しました: null");
  });

  it("handles undefined error values", () => {
    handleError(undefined);

    expect(consoleErrorSpy).toHaveBeenCalledOnce();
    const output = consoleErrorSpy.mock.calls[0][0] as string;
    expect(output).toContain("予期しないエラーが発生しました: undefined");
  });

  it("handles plain object error values", () => {
    handleError({ foo: "bar" });

    expect(consoleErrorSpy).toHaveBeenCalledOnce();
    const output = consoleErrorSpy.mock.calls[0][0] as string;
    expect(output).toContain("予期しないエラーが発生しました: [object Object]");
  });

  it("outputs JSON for string error with json option", () => {
    handleError("string error", { json: true });

    expect(consoleErrorSpy).toHaveBeenCalledOnce();
    const output = consoleErrorSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);

    expect(parsed).toEqual({
      error: true,
      code: "UNKNOWN",
      message: "string error",
    });
  });
});
