import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateRequirement } from "./validation-service.js";
import type { Requirement } from "@reqord/shared";

// Mock the repository module
vi.mock("../repositories/requirement.js", () => ({
  findById: vi.fn(),
  loadDescription: vi.fn(),
  findAll: vi.fn(),
}));

import * as reqRepo from "../repositories/requirement.js";

function makeRequirement(overrides: Partial<Requirement> = {}): Requirement {
  return {
    id: "req-000001",
    version: "1.0.0",
    title: "テスト要件タイトル",
    status: "draft",
    priority: "medium",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    versionHistory: [],
    files: { description: "requirements/req-000001/description.md", supplementary: [] },
    successCriteria: [
      "基準1: ユーザーがログインできる",
      "基準2: セッションが24時間有効である",
      "基準3: ログアウト後にセッションが無効になる",
    ],
    format: { type: "user-story", userStory: { as: "ユーザー", iWant: "ログインしたい", soThat: "利用できる" } },
    dependencies: { blockedBy: [], blocks: [], relatedTo: [] },
    estimatedComplexity: "medium",
    estimatedHours: 16,
    flags: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("validateRequirement", () => {
  it("存在しない要件でエラーを投げる", async () => {
    vi.mocked(reqRepo.findById).mockResolvedValue(null);

    await expect(validateRequirement("/cwd", "req-999999")).rejects.toThrow(
      "Requirement req-999999 not found.",
    );
  });

  it("有効な要件でvalid=trueを返す", async () => {
    const req = makeRequirement();
    vi.mocked(reqRepo.findById).mockResolvedValue(req);
    vi.mocked(reqRepo.loadDescription).mockResolvedValue("## 概要\n\n詳細な説明文です。");
    vi.mocked(reqRepo.findAll).mockResolvedValue([req]);

    const result = await validateRequirement("/cwd", "req-000001");

    expect(result.valid).toBe(true);
    expect(result.id).toBe("req-000001");
    expect(result.smartScore).toBeDefined();
    expect(result.metadata.criteriaCount).toBe(3);
    expect(result.metadata.hasDescription).toBe(true);
    expect(result.metadata.hasDependencyIssues).toBe(false);
  });

  it("成功基準が0件の場合、error issueが含まれvalid=false", async () => {
    const req = makeRequirement({ successCriteria: [] });
    vi.mocked(reqRepo.findById).mockResolvedValue(req);
    vi.mocked(reqRepo.loadDescription).mockResolvedValue(null);
    vi.mocked(reqRepo.findAll).mockResolvedValue([req]);

    const result = await validateRequirement("/cwd", "req-000001");

    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.type === "missing_criteria" && i.severity === "error")).toBe(true);
  });

  it("成功基準が2件の場合、warning issueが含まれる", async () => {
    const req = makeRequirement({
      successCriteria: ["基準1", "基準2"],
    });
    vi.mocked(reqRepo.findById).mockResolvedValue(req);
    vi.mocked(reqRepo.loadDescription).mockResolvedValue(null);
    vi.mocked(reqRepo.findAll).mockResolvedValue([req]);

    const result = await validateRequirement("/cwd", "req-000001");

    expect(result.issues.some((i) => i.type === "insufficient_criteria" && i.severity === "warning")).toBe(true);
  });

  it("成功基準が8件の場合、excessive warning", async () => {
    const req = makeRequirement({
      successCriteria: ["1", "2", "3", "4", "5", "6", "7", "8"],
    });
    vi.mocked(reqRepo.findById).mockResolvedValue(req);
    vi.mocked(reqRepo.loadDescription).mockResolvedValue(null);
    vi.mocked(reqRepo.findAll).mockResolvedValue([req]);

    const result = await validateRequirement("/cwd", "req-000001");

    expect(result.issues.some((i) => i.type === "excessive_criteria")).toBe(true);
  });

  it("曖昧表現を検出する", async () => {
    const req = makeRequirement({
      title: "適切にデータを処理する",
      successCriteria: ["なるべく高速に処理される"],
    });
    vi.mocked(reqRepo.findById).mockResolvedValue(req);
    vi.mocked(reqRepo.loadDescription).mockResolvedValue(null);
    vi.mocked(reqRepo.findAll).mockResolvedValue([req]);

    const result = await validateRequirement("/cwd", "req-000001");

    const ambiguousIssues = result.issues.filter((i) => i.type === "ambiguous");
    expect(ambiguousIssues.length).toBeGreaterThanOrEqual(2);
  });

  it("存在しない依存先を検出する", async () => {
    const req = makeRequirement({
      dependencies: { blockedBy: ["req-999999"], blocks: [], relatedTo: [] },
    });
    vi.mocked(reqRepo.findById).mockResolvedValue(req);
    vi.mocked(reqRepo.loadDescription).mockResolvedValue(null);
    vi.mocked(reqRepo.findAll).mockResolvedValue([req]);

    const result = await validateRequirement("/cwd", "req-000001");

    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.type === "invalid_dependency")).toBe(true);
    expect(result.metadata.hasDependencyIssues).toBe(true);
  });

  it("循環依存を検出する", async () => {
    const req1 = makeRequirement({
      id: "req-000001",
      dependencies: { blockedBy: ["req-000002"], blocks: [], relatedTo: [] },
    });
    const req2 = makeRequirement({
      id: "req-000002",
      dependencies: { blockedBy: ["req-000001"], blocks: [], relatedTo: [] },
    });
    vi.mocked(reqRepo.findById).mockResolvedValue(req1);
    vi.mocked(reqRepo.loadDescription).mockResolvedValue(null);
    vi.mocked(reqRepo.findAll).mockResolvedValue([req1, req2]);

    const result = await validateRequirement("/cwd", "req-000001");

    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.type === "circular_dependency")).toBe(true);
  });

  it("複雑度と見積もりの不整合を検出する", async () => {
    const req = makeRequirement({
      estimatedComplexity: "small",
      estimatedHours: 100,
    });
    vi.mocked(reqRepo.findById).mockResolvedValue(req);
    vi.mocked(reqRepo.loadDescription).mockResolvedValue(null);
    vi.mocked(reqRepo.findAll).mockResolvedValue([req]);

    const result = await validateRequirement("/cwd", "req-000001");

    expect(result.issues.some((i) => i.type === "inconsistent_estimate")).toBe(true);
  });
});
