import type { Requirement } from "../schemas/requirement.js";
import type { SmartScore } from "../schemas/validation.js";
import { getAmbiguousPhrases } from "./ambiguous-phrases.js";

export interface SmartScoringInput {
  requirement: Requirement;
  description: string | null;
  language?: string;
}

/**
 * SMART基準に基づくスコアを算出する。
 * ルールベース（AI不要）でオフライン動作する。
 */
export function calculateSmartScore(input: SmartScoringInput): SmartScore {
  const specific = scoreSpecific(input);
  const measurable = scoreMeasurable(input);
  const achievable = scoreAchievable(input);
  const relevant = scoreRelevant(input);
  const timeBound = scoreTimeBound(input);
  const overall = (specific + measurable + achievable + relevant + timeBound) / 5;

  return {
    specific: round(specific),
    measurable: round(measurable),
    achievable: round(achievable),
    relevant: round(relevant),
    timeBound: round(timeBound),
    overall: round(overall),
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Specific: 具体性スコア
 * - タイトルの長さ
 * - description有無・長さ
 * - format詳細の充実度
 * - 曖昧表現の少なさ
 */
function scoreSpecific(input: SmartScoringInput): number {
  const { requirement, description, language } = input;
  let score = 0;

  // タイトルの充実度 (0〜0.2)
  if (requirement.title.length >= 10) score += 0.2;
  else if (requirement.title.length >= 5) score += 0.1;

  // description有無・長さ (0〜0.3)
  if (description) {
    if (description.length >= 200) score += 0.3;
    else if (description.length >= 50) score += 0.2;
    else score += 0.1;
  }

  // format詳細の充実度 (0〜0.3)
  score += scoreFormatDetail(requirement);

  // 曖昧表現の少なさ (0〜0.2)
  const ambiguousPhrases = getAmbiguousPhrases(language);
  const allText = gatherText(requirement, description);
  const ambiguousCount = countAmbiguousPhrases(allText, ambiguousPhrases);
  if (ambiguousCount === 0) score += 0.2;
  else if (ambiguousCount <= 2) score += 0.1;

  return Math.min(score, 1);
}

/**
 * Measurable: 測定可能性スコア
 * - 成功基準の数と具体性
 */
function scoreMeasurable(input: SmartScoringInput): number {
  const { requirement } = input;
  const criteria = requirement.successCriteria;
  let score = 0;

  // 成功基準の有無 (0〜0.4)
  if (criteria.length >= 3) score += 0.4;
  else if (criteria.length >= 1) score += 0.2;

  // 成功基準の具体性 — 平均文字数 (0〜0.3)
  if (criteria.length > 0) {
    const avgLen = criteria.reduce((sum, c) => sum + c.length, 0) / criteria.length;
    if (avgLen >= 30) score += 0.3;
    else if (avgLen >= 15) score += 0.2;
    else score += 0.1;
  }

  // 数値的な基準が含まれているか (0〜0.3)
  const hasNumeric = criteria.some((c) => /\d+/.test(c));
  if (hasNumeric) score += 0.3;
  else if (criteria.length > 0) score += 0.1;

  return Math.min(score, 1);
}

/**
 * Achievable: 達成可能性スコア
 * - 複雑度と見積もり時間の整合性
 * - 依存関係の明確性
 */
function scoreAchievable(input: SmartScoringInput): number {
  const { requirement } = input;
  let score = 0.5; // ベーススコア

  // 複雑度が設定されている (0〜0.2)
  if (requirement.estimatedComplexity) score += 0.2;

  // 見積もり時間が設定されている (0〜0.2)
  if (requirement.estimatedHours) score += 0.2;

  // 複雑度と見積もり時間の整合性 (0〜0.1)
  if (requirement.estimatedComplexity && requirement.estimatedHours) {
    if (isComplexityHoursConsistent(requirement.estimatedComplexity, requirement.estimatedHours)) {
      score += 0.1;
    }
  }

  return Math.min(score, 1);
}

/**
 * Relevant: 関連性スコア
 * - formatが充実しているか（ユーザーストーリー/EARS）
 * - 依存関係が定義されているか
 */
function scoreRelevant(input: SmartScoringInput): number {
  const { requirement } = input;
  let score = 0.4; // ベーススコア

  // formatタイプが具体的か (0〜0.3)
  if (requirement.format.type === "user-story") {
    const us = requirement.format.userStory;
    if (us.as && us.iWant && us.soThat) score += 0.3;
    else if (us.as || us.iWant) score += 0.15;
  } else if (requirement.format.type === "ears") {
    const ears = requirement.format.ears;
    if (ears.action) score += 0.3;
    else score += 0.15;
  } else {
    score += 0.1; // free-form
  }

  // 依存関係が定義されているか (0〜0.3)
  const deps = requirement.dependencies;
  const hasDeps = deps.blockedBy.length > 0 || deps.blocks.length > 0 || deps.relatedTo.length > 0;
  if (hasDeps) score += 0.3;
  else score += 0.1;

  return Math.min(score, 1);
}

/**
 * TimeBound: 期限・時間制約スコア
 * - 見積もり時間の有無
 * - 複雑度の設定
 */
function scoreTimeBound(input: SmartScoringInput): number {
  const { requirement } = input;
  let score = 0;

  // 見積もり時間 (0〜0.5)
  if (requirement.estimatedHours) score += 0.5;

  // 複雑度 (0〜0.3)
  if (requirement.estimatedComplexity) score += 0.3;

  // 成功基準に時間制約的な表現があるか (0〜0.2)
  const timeRelated = requirement.successCriteria.some((c) =>
    /(\d+秒|\d+ms|\d+分|\d+時間|\d+日|以内|まで|期限|deadline)/i.test(c),
  );
  if (timeRelated) score += 0.2;

  return Math.min(score, 1);
}

// --- Helper functions ---

function scoreFormatDetail(requirement: Requirement): number {
  if (requirement.format.type === "user-story") {
    const us = requirement.format.userStory;
    let filled = 0;
    if (us.as) filled++;
    if (us.iWant) filled++;
    if (us.soThat) filled++;
    return (filled / 3) * 0.3;
  }
  if (requirement.format.type === "ears") {
    const ears = requirement.format.ears;
    let filled = 0;
    if (ears.type) filled++;
    if (ears.action) filled++;
    if (ears.trigger) filled++;
    if (ears.condition) filled++;
    if (ears.response) filled++;
    return (filled / 5) * 0.3;
  }
  return 0;
}

function gatherText(requirement: Requirement, description: string | null): string {
  const parts = [requirement.title, ...requirement.successCriteria];
  if (description) parts.push(description);
  return parts.join(" ");
}

export function countAmbiguousPhrases(text: string, phrases: readonly string[]): number {
  let count = 0;
  for (const phrase of phrases) {
    if (text.includes(phrase)) count++;
  }
  return count;
}

const COMPLEXITY_HOURS_RANGES: Record<string, [number, number]> = {
  small: [1, 8],
  medium: [4, 40],
  large: [20, 120],
  xlarge: [80, 500],
};

export function isComplexityHoursConsistent(complexity: string, hours: number): boolean {
  const range = COMPLEXITY_HOURS_RANGES[complexity];
  if (!range) return true;
  return hours >= range[0] && hours <= range[1];
}
