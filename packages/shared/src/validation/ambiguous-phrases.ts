/**
 * 曖昧表現リスト — 要件の品質チェックで使用
 * 現在はJapanese-onlyスコープ（v0.1）
 */

export const AMBIGUOUS_PHRASES_JA = [
  "適切に",
  "適切な",
  "なるべく",
  "できるだけ",
  "可能な限り",
  "必要に応じて",
  "等",
  "など",
  "その他",
  "ある程度",
  "十分に",
  "十分な",
  "高速に",
  "高速な",
  "効率的に",
  "効率的な",
  "柔軟に",
  "柔軟な",
  "簡単に",
  "容易に",
  "使いやすい",
  "わかりやすい",
  "見やすい",
  "きれいに",
  "きれいな",
  "スムーズに",
  "スムーズな",
  "シンプルに",
  "シンプルな",
  "正しく",
  "うまく",
  "良い",
  "悪い",
  "多い",
  "少ない",
  "大きい",
  "小さい",
] as const;

/**
 * 言語コードに応じた曖昧表現リストを返す。
 * 現時点ではjaのみ。将来はlanguage codeで切り替え可能。
 */
export function getAmbiguousPhrases(language: string = "ja"): readonly string[] {
  switch (language) {
    case "ja":
      return AMBIGUOUS_PHRASES_JA;
    default:
      return AMBIGUOUS_PHRASES_JA; // TODO: i18n — 英語等の曖昧表現リスト追加
  }
}
