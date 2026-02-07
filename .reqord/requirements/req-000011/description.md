# Requirement承認フロー (GitHub PR連携)

## 概要

Requirementのステータスをdraftからapprovedへ遷移させるための、GitHub PRベースの承認ワークフロー。CODEOWNERSと連携し、適切なレビュアーによる承認を保証する。

## ユーザーストーリー

開発チームリーダーとして、要件の承認フローをGitHub PRベースで管理したい。
なぜなら、変更履歴が追跡可能でチーム合意の下で要件が承認されるから。

## CLIコマンド仕様

### reqord req approve \<id\>

1. 対象Requirementのstatusが `draft` または `pending_approval` であることを検証
2. Gitブランチを作成: `reqord/req-<id>-approve-v<version>`
3. Requirement JSONの `status` を `pending_approval` に更新してコミット
4. GitHub PRを作成:
   - タイトル: `[Reqord] Approve req-<id>: <title> v<version>`
   - CODEOWNERSからレビュアーを自動アサイン
   - Reqordメタデータをボディに含める
5. PRマージ検知時:
   - `status` を `approved` に更新
   - `currentApproval` を記録（version, phase, prNumber, approvedAt, approvedBy）
   - `versionHistory` にエントリを追加

## CODEOWNERS連携

- `.github/CODEOWNERS` から `.reqord/requirements/` のオーナーを読み取り
- PR作成時にレビュアーとして自動アサイン
- 最低1名の承認でマージ可能

## 技術的制約

- GitHub CLI (`gh`) を使用してPR作成・操作
- ブランチ名は `reqord/` プレフィックスで統一
- 承認状態の整合性はJSONとGit履歴の両方で保証
