# 影響範囲分析

## 概要

Requirementが変更・バージョンアップされた際に、関連するSpecification、GitHub Issue、他のRequirementへの影響を自動分析・通知する機能。

## ユーザーストーリー

プロジェクトマネージャーとして、要件変更時の影響範囲を自動で把握したい。
なぜなら、変更による意図しない副作用を防げるから。

## CLIコマンド仕様

### reqord impact analyze \<id\>

- 対象Requirementの依存関係（blockedBy, blocks, relatedTo）を走査
- 関連Specificationの `requirementCoverage` を検索
- 生成済みGitHub Issueを検索
- 出力:
  - 直接影響: blocks先のRequirement
  - Spec影響: カバレッジ対象のSpecification（outdatedフラグ）
  - Issue影響: 関連する未完了Issue
  - `--json` オプションで構造化出力

### reqord impact notify \<id\>

- `analyze` 結果に基づき通知を送信
- 関連IssueにGitHubコメントを追加
- 関連PRにレビューリクエストを送信
- `--dry-run` で通知内容のプレビュー

## impactフィールド自動計算

Requirement更新時（`reqord req update`）に `impact` フィールドを自動再計算:

```json
{
  "impact": {
    "specifications": ["spec-001"],
    "issues": [123, 124],
    "requirements": ["req-003"]
  }
}
```

## 技術的制約

- 依存グラフの循環検出が必要
- GitHub APIレート制限への配慮（通知バッチ処理）
