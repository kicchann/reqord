import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Specification } from "@reqord/shared";
import { specValidateCommand } from "./validate.js";

vi.mock("../../services/spec-validation-service.js", () => ({
  validateSpecDesign: vi.fn(),
}));

vi.mock("../../repositories/specification.js", () => ({
  save: vi.fn(),
}));

import { validateSpecDesign } from "../../services/spec-validation-service.js";
import * as specRepo from "../../repositories/specification.js";

const mockValidateSpecDesign = vi.mocked(validateSpecDesign);
const mockSave = vi.mocked(specRepo.save);

function makeSpec(overrides: Partial<Specification> = {}): Specification {
  return {
    id: "spec-000001",
    requirementId: "req-000001",
    version: "1.0",
    status: "draft",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    versionHistory: [],
    files: { design: "specifications/spec-000001/design.md", supplementary: [] },
    flags: [],
    ...overrides,
  };
}

function makeValidateResult(overrides = {}) {
  const spec = makeSpec();
  return {
    validation: {
      specId: "spec-000001",
      rules: [
        { ruleId: "arch-layer", ruleName: "レイヤー整合性", severity: "warning" as const, status: "pass" as const },
      ],
      passed: 1,
      warnings: 0,
      errors: 0,
      validatedAt: "2026-01-01T00:00:00Z",
      ...overrides,
    },
    spec,
  };
}

describe("spec validate command", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let _consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = 0;
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    _consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    specValidateCommand.setOptionValue("json", undefined);
  });

  it("criteria-4: 検証結果がspecRepo.saveで永続化される", async () => {
    const result = makeValidateResult();

    mockValidateSpecDesign.mockResolvedValue(result);
    mockSave.mockResolvedValue(undefined);

    await specValidateCommand.parseAsync(["node", "test", "spec-000001"]);

    expect(mockSave).toHaveBeenCalledOnce();
    expect(mockSave).toHaveBeenCalledWith(
      process.cwd(),
      expect.objectContaining({
        id: "spec-000001",
        designValidation: expect.objectContaining({
          passed: result.validation.passed,
          warnings: result.validation.warnings,
          errors: result.validation.errors,
          validatedAt: result.validation.validatedAt,
        }),
      }),
    );
  });

  it("criteria-4: 保存されるdesignValidationはrulesを含む", async () => {
    const result = makeValidateResult({
      rules: [
        { ruleId: "arch-layer", ruleName: "レイヤー整合性", severity: "warning" as const, status: "pass" as const },
        { ruleId: "design-sections", ruleName: "セクション構成", severity: "warning" as const, status: "fail" as const, message: "欠落あり" },
      ],
      passed: 1,
      warnings: 1,
      errors: 0,
    });

    mockValidateSpecDesign.mockResolvedValue(result);
    mockSave.mockResolvedValue(undefined);

    await specValidateCommand.parseAsync(["node", "test", "spec-000001"]);

    const savedSpec = mockSave.mock.calls[0][1];
    expect(savedSpec.designValidation?.rules).toHaveLength(2);
    expect(savedSpec.designValidation?.rules[0].ruleId).toBe("arch-layer");
    expect(savedSpec.designValidation?.rules[1].ruleId).toBe("design-sections");
  });

  it("criteria-4: --jsonオプション時も永続化される", async () => {
    const result = makeValidateResult();

    mockValidateSpecDesign.mockResolvedValue(result);
    mockSave.mockResolvedValue(undefined);

    await specValidateCommand.parseAsync(["node", "test", "spec-000001", "--json"]);

    expect(mockSave).toHaveBeenCalledOnce();
    expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify(result.validation, null, 2));
  });

  it("検証結果を画面出力する", async () => {
    const result = makeValidateResult();

    mockValidateSpecDesign.mockResolvedValue(result);
    mockSave.mockResolvedValue(undefined);

    await specValidateCommand.parseAsync(["node", "test", "spec-000001"]);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("設計検証: spec-000001"),
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("0 error"),
    );
  });

  it("errorsが1以上の場合、exitCodeが1になる", async () => {
    const result = makeValidateResult({
      rules: [
        { ruleId: "dep-conflict", ruleName: "依存関係矛盾", severity: "error" as const, status: "fail" as const, message: "依存先なし" },
      ],
      passed: 0,
      warnings: 0,
      errors: 1,
    });

    mockValidateSpecDesign.mockResolvedValue(result);
    mockSave.mockResolvedValue(undefined);

    await specValidateCommand.parseAsync(["node", "test", "spec-000001"]);

    expect(process.exitCode).toBe(1);
  });
});
