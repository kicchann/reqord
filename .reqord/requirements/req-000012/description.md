# 影響範囲分析

## 概要

指定したRequirementまたはSpecificationに関連するSpecification、GitHub Issue、他のRequirementを即座に分析・一覧表示し、必要に応じて影響先に通知する機能。

## ユーザーストーリー

プロジェクトマネージャーとして、要件変更時の影響範囲を自動で把握したい。
なぜなら、変更による意図しない副作用を防げるから。

## CLIコマンド仕様

### reqord impact analyze \<id\>

- 対象はRequirement（req-NNNNNN）またはSpecification（spec-NNNNNN）
- Requirementの場合:
  - 依存関係（blockedBy, blocks, relatedTo）を走査し、関連Requirementを検出
  - `requirementId` で紐づく関連Specificationを検索
  - `.reqord/issues/tasks.yaml` から該当Specificationに紐づくGitHub Issueを取得
- Specificationの場合:
  - `.reqord/issues/tasks.yaml` から該当Specificationに紐づくGitHub Issueを取得
  - 同一Requirementに紐づく他のSpecificationを検索
- 出力:
  - 直接影響: blocks先のRequirement
  - Spec影響: 紐づくSpecification
  - Issue影響: 関連する未完了Issue
  - `--json` オプションで構造化出力

### reqord impact notify \<id\>

- `analyze` 結果に基づき通知を送信
- 関連IssueにGitHubコメントを追加
- 関連PRにレビューリクエストを送信
- `--dry-run` で通知内容のプレビュー

## 技術的制約

- 依存グラフの循環検出が必要
- GitHub APIレート制限への配慮（通知バッチ処理）
