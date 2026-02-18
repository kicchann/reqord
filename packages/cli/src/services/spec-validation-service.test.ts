import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateSpecDesign } from "./spec-validation-service.js";

vi.mock("../repositories/specification.js", () => ({
  findByIdOrThrow: vi.fn(),
  loadFile: vi.fn(),
  findAll: vi.fn(),
}));

vi.mock("../repositories/requirement.js", () => ({
  findAll: vi.fn(),
}));

vi.mock("../repositories/project-context.js", () => ({
  loadContextFile: vi.fn(),
}));

import * as specRepo from "../repositories/specification.js";
import * as reqRepo from "../repositories/requirement.js";
import * as contextRepo from "../repositories/project-context.js";

const GOOD_DESIGN = `# テスト設計書

## 1. 設計概要
テスト用の設計概要です。

## 2. アーキテクチャ
Command Layer → Service Layer → Repository

## 3. コンポーネント設計
### SampleService (services/sample-service.ts)
サンプルのサービス

## 5. テスト方針
### ユニットテスト
- SampleServiceのテスト

### 統合テスト
- エンドツーエンドのフロー
`;

describe("validateSpecDesign", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(specRepo.findByIdOrThrow).mockResolvedValue({
      id: "spec-000001",
      requirementId: "req-000001",
      version: "1.0",
      status: "draft",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      versionHistory: [],
      files: { design: "specifications/spec-000001/design.md", supplementary: [] },
      flags: [],
    });
    vi.mocked(specRepo.findAll).mockResolvedValue([]);
    vi.mocked(reqRepo.findAll).mockResolvedValue([
      {
        id: "req-000001",
        version: "1.0",
        title: "テスト要件",
        status: "approved",
        priority: "medium",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        versionHistory: [],
        files: { description: "requirements/req-000001/description.md", supplementary: [] },
        successCriteria: [],
        format: { type: "free-form" },
        dependencies: { blockedBy: [], blocks: [], relatedTo: [] },
        flags: [],
      },
    ]);
    vi.mocked(contextRepo.loadContextFile).mockResolvedValue(null);
  });

  it("design.mdが存在しない場合はerror", async () => {
    vi.mocked(specRepo.loadFile).mockResolvedValue(null);

    const { validation } = await validateSpecDesign("/tmp", "spec-000001");

    expect(validation.errors).toBe(1);
    expect(validation.rules[0].ruleId).toBe("design-exists");
    expect(validation.rules[0].status).toBe("fail");
  });

  it("正しい設計文書は全ルールpass", async () => {
    vi.mocked(specRepo.loadFile).mockResolvedValue(GOOD_DESIGN);

    const { validation } = await validateSpecDesign("/tmp", "spec-000001");

    expect(validation.errors).toBe(0);
    for (const rule of validation.rules) {
      expect(rule.status).toBe("pass");
    }
  });

  it("必須セクション不足でdesign-sections warning", async () => {
    vi.mocked(specRepo.loadFile).mockResolvedValue("# 簡易設計\n\n内容");

    const { validation } = await validateSpecDesign("/tmp", "spec-000001");

    const sectionRule = validation.rules.find(
      (r) => r.ruleId === "design-sections",
    );
    expect(sectionRule?.status).toBe("fail");
    expect(sectionRule?.severity).toBe("warning");
  });

  it("テスト方針がなければtest-strategy info fail", async () => {
    const design = `# 設計
## 1. 設計概要
概要
## 2. アーキテクチャ
Command → Service → Repository
## 3. コンポーネント設計
コンポーネント
`;
    vi.mocked(specRepo.loadFile).mockResolvedValue(design);

    const { validation } = await validateSpecDesign("/tmp", "spec-000001");

    const testRule = validation.rules.find((r) => r.ruleId === "test-strategy");
    expect(testRule?.status).toBe("fail");
    expect(testRule?.severity).toBe("warning");
  });

  it("戻り値にvalidationとspecが含まれる", async () => {
    vi.mocked(specRepo.loadFile).mockResolvedValue(GOOD_DESIGN);

    const result = await validateSpecDesign("/tmp", "spec-000001");

    expect(result.validation).toHaveProperty("specId", "spec-000001");
    expect(result.validation).toHaveProperty("rules");
    expect(result.validation).toHaveProperty("passed");
    expect(result.validation).toHaveProperty("warnings");
    expect(result.validation).toHaveProperty("errors");
    expect(result.validation).toHaveProperty("validatedAt");
    expect(result.spec).toHaveProperty("id", "spec-000001");
  });

  it("criteria-6: technical.yaml のパースエラー時も検証が続行され、エラー原因が表示される", async () => {
    vi.mocked(specRepo.loadFile).mockResolvedValue(GOOD_DESIGN);
    vi.mocked(contextRepo.loadContextFile).mockImplementation(
      async (_cwd, filename) => {
        if (filename === "technical") {
          throw new Error("YAMLパースエラー: unexpected token");
        }
        return null;
      },
    );

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { validation } = await validateSpecDesign("/tmp", "spec-000001");

    expect(validation.specId).toBe("spec-000001");
    expect(validation.rules.length).toBeGreaterThan(0);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("technical.yaml のパースに失敗しました"),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("unexpected token"),
    );

    warnSpy.mockRestore();
  });

  it("criteria-6: structure.yaml のパースエラー時も検証が続行され、エラー原因が表示される", async () => {
    vi.mocked(specRepo.loadFile).mockResolvedValue(GOOD_DESIGN);
    vi.mocked(contextRepo.loadContextFile).mockImplementation(
      async (_cwd, filename) => {
        if (filename === "structure") {
          throw new Error("YAMLパースエラー: invalid yaml");
        }
        return null;
      },
    );

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { validation } = await validateSpecDesign("/tmp", "spec-000001");

    expect(validation.specId).toBe("spec-000001");
    expect(validation.rules.length).toBeGreaterThan(0);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("structure.yaml のパースに失敗しました"),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("invalid yaml"),
    );

    warnSpy.mockRestore();
  });
});
