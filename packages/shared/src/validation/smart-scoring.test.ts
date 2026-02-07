import { describe, it, expect } from "vitest";
import { calculateSmartScore, countAmbiguousPhrases, isComplexityHoursConsistent } from "./smart-scoring.js";
import { AMBIGUOUS_PHRASES_JA } from "./ambiguous-phrases.js";
import type { Requirement } from "../schemas/requirement.js";

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
    successCriteria: [],
    format: { type: "user-story", userStory: { as: "", iWant: "", soThat: "" } },
    dependencies: { blockedBy: [], blocks: [], relatedTo: [] },
    ...overrides,
  };
}

describe("calculateSmartScore", () => {
  it("空の要件は低スコアを返す", () => {
    const req = makeRequirement({ title: "短い" });
    const score = calculateSmartScore({ requirement: req, description: null });

    expect(score.overall).toBeLessThan(0.5);
    expect(score.measurable).toBeLessThan(0.3);
  });

  it("充実した要件は高スコアを返す", () => {
    const req = makeRequirement({
      title: "ユーザー認証機能の実装 - JWTベースのログイン",
      successCriteria: [
        "ユーザーがメールとパスワードでログインできる",
        "JWT トークンの有効期限が24時間に設定されている",
        "不正なパスワードで3回失敗するとアカウントがロックされる",
        "レスポンスタイムが200ms以内である",
      ],
      format: {
        type: "user-story",
        userStory: {
          as: "未認証ユーザー",
          iWant: "メールとパスワードでログインしたい",
          soThat: "保護されたリソースにアクセスできる",
        },
      },
      dependencies: { blockedBy: ["req-000002"], blocks: [], relatedTo: ["req-000003"] },
      estimatedComplexity: "medium",
      estimatedHours: 16,
    });

    const description = "## 概要\n\nJWTベースの認証機能を実装する。ユーザーはメールアドレスとパスワードを使用してログインし、JWTトークンを取得する。トークンは24時間有効で、以降のAPIリクエストの認証に使用される。\n\n## 詳細仕様\n\n- bcryptでパスワードをハッシュ化\n- リフレッシュトークンは7日間有効";

    const score = calculateSmartScore({ requirement: req, description });

    expect(score.overall).toBeGreaterThan(0.7);
    expect(score.specific).toBeGreaterThan(0.7);
    expect(score.measurable).toBeGreaterThan(0.7);
  });

  it("曖昧表現が多い要件はspecificスコアが低い", () => {
    const req = makeRequirement({
      title: "適切にデータを処理する機能",
      successCriteria: ["なるべく高速に処理される", "適切なエラーハンドリング"],
    });

    const description = "適切にデータを処理し、効率的なパフォーマンスを実現する。";

    const score = calculateSmartScore({ requirement: req, description, language: "ja" });
    expect(score.specific).toBeLessThan(0.7);
  });

  it("成功基準が0件のときmeasurableが低い", () => {
    const req = makeRequirement({ successCriteria: [] });
    const score = calculateSmartScore({ requirement: req, description: null });
    expect(score.measurable).toBe(0);
  });

  it("見積もりがないときtimeBoundが低い", () => {
    const req = makeRequirement();
    const score = calculateSmartScore({ requirement: req, description: null });
    expect(score.timeBound).toBe(0);
  });

  it("見積もりがあるときtimeBoundが上がる", () => {
    const req = makeRequirement({
      estimatedComplexity: "medium",
      estimatedHours: 16,
    });
    const score = calculateSmartScore({ requirement: req, description: null });
    expect(score.timeBound).toBeGreaterThan(0.5);
  });

  it("スコアは0〜1の範囲に収まる", () => {
    const req = makeRequirement({
      title: "ユーザー認証機能の実装 - JWTベースのログイン・ログアウト",
      successCriteria: [
        "基準1 100件のデータ",
        "基準2 200件のデータ",
        "基準3 300件のデータ",
        "基準4 400件のデータ",
        "基準5 500件のデータ",
      ],
      format: {
        type: "user-story",
        userStory: { as: "ユーザー", iWant: "ログインしたい", soThat: "利用できる" },
      },
      dependencies: { blockedBy: ["req-000002"], blocks: ["req-000003"], relatedTo: [] },
      estimatedComplexity: "large",
      estimatedHours: 40,
    });

    const score = calculateSmartScore({ requirement: req, description: "長い説明文" + "x".repeat(300) });

    for (const key of ["specific", "measurable", "achievable", "relevant", "timeBound", "overall"] as const) {
      expect(score[key]).toBeGreaterThanOrEqual(0);
      expect(score[key]).toBeLessThanOrEqual(1);
    }
  });
});

describe("countAmbiguousPhrases", () => {
  it("曖昧表現をカウントする", () => {
    const text = "適切にデータを処理し、なるべく高速に動作させる";
    const count = countAmbiguousPhrases(text, AMBIGUOUS_PHRASES_JA);
    expect(count).toBeGreaterThanOrEqual(3); // 適切に, なるべく, 高速に
  });

  it("曖昧表現がない場合は0を返す", () => {
    const text = "ユーザーがボタンをクリックするとデータが保存される";
    const count = countAmbiguousPhrases(text, AMBIGUOUS_PHRASES_JA);
    expect(count).toBe(0);
  });
});

describe("isComplexityHoursConsistent", () => {
  it("smallで1-8時間は整合性あり", () => {
    expect(isComplexityHoursConsistent("small", 4)).toBe(true);
  });

  it("smallで40時間は整合性なし", () => {
    expect(isComplexityHoursConsistent("small", 40)).toBe(false);
  });

  it("mediumで16時間は整合性あり", () => {
    expect(isComplexityHoursConsistent("medium", 16)).toBe(true);
  });

  it("largeで100時間は整合性あり", () => {
    expect(isComplexityHoursConsistent("large", 100)).toBe(true);
  });

  it("不明な複雑度はtrueを返す", () => {
    expect(isComplexityHoursConsistent("unknown", 999)).toBe(true);
  });
});
