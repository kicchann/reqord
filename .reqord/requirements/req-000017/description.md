# Gap Analysis (既存コード差分分析)

> **DEPRECATED (v1.1.0)**: AI駆動のコード分析機能はreqord CLIの責務外。Claude Codeエコシステム（code-explorerエージェント等）で実現する。詳細は Feedback #17 を参照。

## 概要

新規・変更Requirementと既存コードベースとのギャップを分析する機能。既存実装のカバレッジ評価、不足機能の特定、コード矛盾の検出を行い、実装計画の精度を向上させる。

## ユーザーストーリー

開発者として、新しい要件が既存コードとどの程度ギャップがあるか把握したい。
なぜなら、実装工数を正確に見積もり、既存コードとの衝突を事前に防げるから。

## CLIコマンド仕様

### reqord req gap-analysis \<id\>

1. 対象RequirementのsuccessCriteria・description.mdを読み取り
2. AI（Anthropic SDK）でコードベースを走査:
   - 既存実装ファイルの特定
   - カバレッジ判定（full / partial / none）
   - 不足機能のリスト化
   - コンフリクト検出（ファイルパス + 行番号）
3. 結果をRequirement JSONの `gapAnalysis` フィールドに保存
4. 結果を整形表示

出力例:
```
Gap Analysis: req-001
  Existing Implementations:
    📄 src/export/ifc-exporter.ts - partial
       IFC2x3のみ対応、IFC4未対応
  Missing Features:
    ❌ IFC4スキーマ対応
    ❌ 属性マッピング
  Conflicts:
    ⚠️ src/export/ifc-exporter.ts:45
       現在IFC2x3で実装されている ↔ IFC4形式要件
```

### reqord validate gap \<id\>

- 既存のgapAnalysis結果の妥当性を再検証
- 前回分析以降のコード変更を検出
- 結果が古い場合は警告表示

## gapAnalysisフィールド

```json
{
  "gapAnalysis": {
    "analyzedAt": "2026-02-10T14:00:00Z",
    "existingImplementations": [...],
    "missingFeatures": [...],
    "conflicts": [...]
  }
}
```

## 技術的制約

- コードベース走査にはAI（Anthropic SDK）を使用
- プロジェクトルートからの相対パスで表示
- 大規模コードベースではファイル数上限を設ける（設定可能）
