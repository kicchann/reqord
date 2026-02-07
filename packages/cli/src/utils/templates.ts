import { REQORD_DIR, SETTINGS_DIR, TEMPLATES_DIR } from "@reqord/shared";
import * as fs from "../repositories/file-system.js";

export const DEFAULT_REQUIREMENT_DESCRIPTION_TEMPLATE = `# {{title}}

## 概要

{{概要を記述}}

## ユーザーストーリー / EARS形式要件

{{format に応じた要件記述}}

### User Story形式の場合

{{as}} として、{{iWant}}。
なぜなら、{{soThat}} から。

### EARS形式の場合

When {{trigger}},
if {{condition}},
the system shall {{action}},
{{response}}.

## 詳細要件

{{要件の詳細を記述}}

## ユースケース

1. {{ステップ1}}
2. {{ステップ2}}
3. {{ステップ3}}

## 技術的制約

- {{制約1}}
- {{制約2}}

## エッジケース

- {{エッジケース1}}
- {{エッジケース2}}

## 参考資料

- {{参考リンクや関連ドキュメント}}
`;

export const DEFAULT_REQUIREMENT_QUALITY_RULES = `# 要件品質ルール

## SMART基準

- **Specific（具体的）**: 曖昧な表現を避ける
- **Measurable（測定可能）**: 成功基準が定量的に評価できる
- **Achievable（達成可能）**: 技術的・リソース的に実現可能
- **Relevant（関連性）**: プロジェクト目標に貢献する
- **Time-bound（期限）**: 見積もりが設定されている

## バリデーションチェックリスト

- [ ] タイトルが50文字以内
- [ ] 成功基準が3つ以上設定されている
- [ ] 依存関係に循環がない
- [ ] フォーマット（user-story/ears/free-form）が適切
`;

export const DEFAULT_SPECIFICATION_RESEARCH_TEMPLATE = `# {{id}} - Research

## 対象要件: {{requirementId}}

## 調査概要

{{調査の目的と範囲を記述}}

## 技術調査

### 既存実装の分析

{{既存コードベースの関連部分を分析}}

### 技術的選択肢

| 選択肢 | メリット | デメリット | 備考 |
|--------|---------|----------|------|
| {{選択肢1}} | | | |
| {{選択肢2}} | | | |

## 制約事項

- {{制約1}}
- {{制約2}}

## 参考資料

- {{参考リンクや関連ドキュメント}}
`;

export const DEFAULT_SPECIFICATION_DESIGN_TEMPLATE = `# {{id}} - Design

## 対象要件: {{requirementId}}

## 設計概要

{{設計の目的とスコープを記述}}

## インターフェース設計

### 入力

{{入力データの定義}}

### 出力

{{出力データの定義}}

## データモデル

{{データ構造の定義}}

## 処理フロー

1. {{ステップ1}}
2. {{ステップ2}}
3. {{ステップ3}}

## エラーハンドリング

| エラー種別 | 対応方針 |
|-----------|---------|
| {{エラー1}} | {{対応}} |

## テスト方針

- {{テスト観点1}}
- {{テスト観点2}}
`;

export const DEFAULT_SPECIFICATION_ARCHITECTURE_TEMPLATE = `graph TD
    A[{{id}}] --> B[対象要件: {{requirementId}}]

    subgraph コンポーネント
        C[コンポーネント1]
        D[コンポーネント2]
        E[コンポーネント3]
    end

    B --> C
    C --> D
    D --> E
`;

export async function loadProjectTemplate(
  cwd: string,
  templateName: string,
): Promise<string | null> {
  const templatePath = fs.joinPath(
    cwd,
    REQORD_DIR,
    SETTINGS_DIR,
    TEMPLATES_DIR,
    templateName,
  );
  if (await fs.exists(templatePath)) {
    return fs.readText(templatePath);
  }
  return null;
}
