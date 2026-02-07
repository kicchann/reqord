# Specification承認フロー

## 概要

Specificationの承認をGitHub PRベースで管理する機能。Requirement承認フロー（req-000011）と同じパターンを踏襲し、仕様フェーズ（Specification Phase）での承認を実現する。

## ユーザーストーリー

テックリードとして、仕様書の承認をGitHub PRベースで管理したい。
なぜなら、設計のレビューと承認がチームプロセスとして確立されるから。

## CLIコマンド仕様

### reqord spec approve \<id\>

1. 対象Specificationのstatusが `draft` であることを検証
2. 対象Requirementが `approved` 状態であることを検証
3. Gitブランチを作成: `reqord/spec-<id>-approve-v<version>`
4. Specification JSONの `status` を `pending_approval` に更新してコミット
5. GitHub PRを作成:
   - タイトル: `[Reqord] Approve spec-<id>: <title> v<version>`
   - design.mdの概要をPRボディに含める
   - CODEOWNERSからレビュアーを自動アサイン
6. PRマージ時:
   - `status` を `approved` に更新
   - `versionHistory` に承認記録を追加（version, status, gitCommit, approvedAt, approvedBy）

## Requirement承認との共通化

- ブランチ作成・PR作成・承認記録のロジックはreq-000011と共通ユーティリティ化
- phase フィールドで `requirements` / `specification` を区別

## 技術的制約

- 承認前にDesign Validation（req-000014）の実行を推奨（警告表示）
- Requirementが未承認の場合はエラーで中断
