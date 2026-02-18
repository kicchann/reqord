import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ImplValidation } from "../../services/impl-validation-service.js";
import { implValidateCommand } from "./impl.js";

vi.mock("../../services/impl-validation-service.js", () => ({
  validateImplementation: vi.fn(),
}));

import { validateImplementation } from "../../services/impl-validation-service.js";

const mockValidateImplementation = vi.mocked(validateImplementation);

function makeValidation(
  overrides: Partial<ImplValidation> = {},
): ImplValidation {
  return {
    specId: "spec-000001",
    requirementId: "req-000001",
    issueCheck: { total: 2, completed: 1, issues: [
      { number: 1, title: "Task 1", state: "closed", priority: "P1" },
      { number: 2, title: "Task 2", state: "open", priority: "P2" },
    ] },
    componentCheck: { total: 2, exists: 1, components: [
      { path: "packages/cli/src/services/foo.ts", exists: true },
      { path: "packages/cli/src/services/bar.ts", exists: false },
    ] },
    testCheck: { total: 1, exists: 1, tests: [
      { path: "packages/cli/src/services/foo.test.ts", exists: true, type: "unit" },
    ] },
    overallStatus: "partial",
    validatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("validate impl command", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = 0;
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    implValidateCommand.setOptionValue("json", undefined);
    implValidateCommand.setOptionValue("strict", undefined);
  });

  it("正常系: テーブル表示確認", async () => {
    mockValidateImplementation.mockResolvedValue(makeValidation());

    await implValidateCommand.parseAsync(["node", "test", "spec-000001"]);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("実装検証: spec-000001"),
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("GitHub Issues:"),
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("コンポーネント:"),
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("サマリー: Issues 1/2, Components 1/2, Tests 1/1"),
    );
  });

  it("--json: JSON.parseableな出力", async () => {
    const validation = makeValidation();
    mockValidateImplementation.mockResolvedValue(validation);

    await implValidateCommand.parseAsync([
      "node", "test", "spec-000001", "--json",
    ]);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      JSON.stringify(validation, null, 2),
    );
  });

  it("--strict: 未完了時にexit code 1", async () => {
    mockValidateImplementation.mockResolvedValue(
      makeValidation({ overallStatus: "partial" }),
    );

    await implValidateCommand.parseAsync([
      "node", "test", "spec-000001", "--strict",
    ]);

    expect(process.exitCode).toBe(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("実装検証失敗"),
    );
  });

  it("--strict: not-started時にexit code 1", async () => {
    mockValidateImplementation.mockResolvedValue(
      makeValidation({ overallStatus: "not-started" }),
    );

    await implValidateCommand.parseAsync([
      "node", "test", "spec-000001", "--strict",
    ]);

    expect(process.exitCode).toBe(1);
  });

  it("--strict: 完了時にexit code 0", async () => {
    mockValidateImplementation.mockResolvedValue(
      makeValidation({ overallStatus: "complete" }),
    );

    await implValidateCommand.parseAsync([
      "node", "test", "spec-000001", "--strict",
    ]);

    expect(process.exitCode).toBe(0);
  });

  it("不正なspec-id: エラーメッセージ", async () => {
    mockValidateImplementation.mockRejectedValue(
      new Error("Specification not found: spec-999999"),
    );

    await implValidateCommand.parseAsync(["node", "test", "spec-999999"]);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Specification not found"),
    );
  });
});
