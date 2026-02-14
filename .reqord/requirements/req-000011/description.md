# Requirement承認フロー (GitHub PR連携)

## 概要

Requirementのライフサイクル（draft → approved → implemented）をCLIで完結させるための、GitHub PRベースの承認ワークフロー。CODEOWNERSと連携し、適切なレビュアーによる承認を保証する。flag付きのreqをdraftに戻す操作も含む。

## ユーザーストーリー

開発チームリーダーとして、要件の承認フローをGitHub PRベースで管理したい。
なぜなら、変更履歴が追跡可能でチーム合意の下で要件が承認されるから。

## ライフサイクル全体像

```
draft ──approve(PR作成)──→ PRマージ ──→ approved ──implement──→ implemented
  ↑                                        │
  └──────────── draft (flag解決) ←── flagged ←┘
```

> `approved`は廃止。PRマージ自体が承認行為となる（#208）。

## CLIコマンド仕様

### reqord req draft \<id\>

flag付き、またはapproved/implementedのreqをdraft状態に戻し、再編集を可能にする。

1. 対象Requirementのstatusが `draft` 以外であることを検証
2. `status` を `draft` に更新（**バージョンはインクリメントしない**）
3. `versionHistory` にエントリを追加
4. flagsがある場合、draft化の理由として記録
5. approved/implementedからの差し戻し時、影響範囲（`blocks`で依存する要件）を表示する

> バージョン変更が必要な場合は `reqord version` コマンドを使用する（req-000005参照）。

```bash
reqord req draft req-000011
```

#### draft差し戻し時のPR作成フロー

approved/implementedからdraftに差し戻す場合、影響範囲を含めたPRを作成してレビュー可能にする。

1. `impact-service.analyzeImpact()` で影響範囲（blocksで依存する要件）を分析
2. Gitブランチを作成: `reqord/req-<id>-revert-to-draft`
3. ステータス変更をコミット
4. PRを作成し、影響範囲をPR本文に記載
5. PRマージで差し戻しが確定

### reqord req approve \<id\>

承認依頼PRを作成するコマンド。PRマージによって承認が確定する。

1. 対象Requirementのstatusが `draft` であることを検証
2. Gitブランチを作成: `reqord/req-<id>-approve-v<version>`
3. Requirement YAMLの `status` を `approved` に更新してコミット
   - **バージョンはインクリメントしない**（バージョン変更は `reqord version` コマンドで行う）
4. GitHub PRを作成:
   - タイトル: `[Reqord] Approve req-<id>: <title> v<version>`
   - CODEOWNERSからレビュアーを自動アサイン
   - Reqordメタデータをボディに含める（下記「PRメタデータコメントタグ」参照）
5. PRマージ時:
   - `currentApproval` を記録（version, phase, prNumber）
   - `versionHistory` にエントリを追加
   - `approvedBy`/`approvedAt`はPRの承認者・マージ日時が証跡となるため、YAMLに重複記録しない

#### コマンドのUX改善

- `--help` の説明文で「承認依頼PRを作成する」ことを明記
- 実行時の出力メッセージで「PRを作成しました。マージされると承認が確定します」と案内
- 承認PR未マージのrequirementに対して再実行した場合、既存PRへのリンクを表示

### reqord req implement \<id\>

approvedのreqをimplemented状態に遷移させる。

1. 対象Requirementのstatusが `approved` であることを検証
2. `status` を `implemented` に更新
3. `versionHistory` にエントリを追加
4. **バージョンはインクリメントしない**

```bash
reqord req implement req-000011
```

## PRメタデータコメントタグ

承認PR本文にHTMLコメントタグを埋め込み、マージ時の自動ステータス更新を可能にする。

```html
<!-- reqord:approval type=requirement id=req-000011 action=approve version=5.0.0 -->
```

### タグ仕様

| フィールド | 説明 | 例 |
|-----------|------|-----|
| type | 対象種別 | `requirement` / `specification` |
| id | 対象ID | `req-000011` |
| action | 操作 | `approve` |
| version | 対象バージョン | `5.0.0` |

### 活用方法

- GitHub Actionsでマージイベントを検知し、コメントタグをパースして自動ステータス更新
- 将来的な自動化の基盤として、現時点ではタグ埋め込みのみを実装

## バージョニングとステータス遷移の分離

すべてのステータス遷移コマンドはバージョンを変更しない:

- `reqord req draft` 実行時: **バージョンをインクリメントしない**（ステータス変更のみ）
- `reqord req approve` 実行時: **バージョンをインクリメントしない**（ステータス変更のみ）
- `reqord req implement` 実行時: **バージョンをインクリメントしない**（ステータス変更のみ）

バージョン変更は `reqord version` コマンドで明示的に行う（req-000005参照）。

## CODEOWNERS連携

- `.github/CODEOWNERS` から `.reqord/requirements/` のオーナーを読み取り
- PR作成時にレビュアーとして自動アサイン
- 最低1名の承認でマージ可能

## 技術的制約

- GitHub CLI (`gh`) を使用してPR作成・操作
- ブランチ名は `reqord/` プレフィックスで統一
- 承認状態の整合性はYAMLとGit履歴の両方で保証

## フィードバック反映履歴

| Issue | 反映内容 |
|-------|---------|
| #109 | approve/implement時にバージョンをインクリメントしない。draft化時のみバージョン変更 |
| #111 | PR本文にメタデータコメントタグを埋め込む |
| #161 | コマンドの動作説明を明確化（「承認依頼PR作成」であることを明示） |
| #208 | approved廃止。approveでstatusをapprovedに設定し、PRマージで完了 |
| #209 | `reqord req draft`と`reqord req implement`をスコープに含める |
| #263 | バージョニングとステータス遷移を完全分離（req-000005 v4.0に準拠） |
| #279 | draft差し戻し時のPR運用ルール（影響範囲をまとめてPRで管理） |
