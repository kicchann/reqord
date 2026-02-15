# Specification承認フロー

## 概要

Specificationのライフサイクル（draft → approved → implemented）をCLIで完結させるための、GitHub PRベースの承認ワークフロー。Requirement承認フロー（req-000011）と同じパターンを踏襲し、仕様フェーズでの承認を実現する。flag付きのspecをdraftに戻す操作も含む。

## ユーザーストーリー

テックリードとして、仕様書の承認をGitHub PRベースで管理したい。
なぜなら、設計のレビューと承認がチームプロセスとして確立されるから。

## ライフサイクル全体像

```
draft ──approve(PR作成)──→ PRマージ ──→ approved ──implement──→ implemented
  ↑                                        │
  └──────────── draft (flag解決) ←── flagged ←┘
```

> `approved`は廃止。PRマージ自体が承認行為となる（#208）。

## CLIコマンド仕様

### reqord spec draft \<id\>

flag付き、またはapproved/implementedのspecをdraft状態に戻し、再編集を可能にする。

1. 対象Specificationのstatusが `draft` 以外であることを検証
2. `status` を `draft` に更新（**バージョンはインクリメントしない**）
3. `versionHistory` にエントリを追加
4. flagsがある場合、draft化の理由として記録
5. approved/implementedからの差し戻し時、影響範囲を表示する

> バージョン変更が必要な場合は `reqord version` コマンドを使用する（req-000005参照）。

```bash
reqord spec draft spec-000011
```

#### draft差し戻し時のPR作成フロー

approved/implementedからdraftに差し戻す場合、影響範囲を含めたPRを作成してレビュー可能にする。

1. `impact-service.analyzeImpact()` で影響範囲を分析
2. Gitブランチを作成: `reqord/spec-<id>-revert-to-draft`
3. ステータス変更をコミット
4. PRを作成し、影響範囲をPR本文に記載
5. PRマージで差し戻しが確定

### reqord spec approve \<id\>

承認依頼PRを作成するコマンド。PRマージによって承認が確定する。

1. 対象Specificationのstatusが `draft` であることを検証
2. 対象Requirementが `approved` 状態であることを検証
3. Gitブランチを作成: `reqord/spec-<id>-approve-v<version>`
4. Specification YAMLの `status` を `approved` に更新してコミット
   - **バージョンはインクリメントしない**（バージョン変更は `reqord version` コマンドで行う）
5. GitHub PRを作成:
   - タイトル: `[Reqord] Approve spec-<id>: <title> v<version>`
   - design.mdの概要をPRボディに含める
   - CODEOWNERSからレビュアーを自動アサイン
   - Reqordメタデータコメントタグをボディに含める（下記「PRメタデータコメントタグ」参照）
6. PRマージ時:
   - `currentApproval` を記録（version, phase, prNumber）
   - `versionHistory` に承認記録を追加
   - `approvedBy`/`approvedAt`はPRの承認者・マージ日時が証跡となるため、YAMLに重複記録しない

#### コマンドのUX改善

- `--help` の説明文で「承認依頼PRを作成する」ことを明記
- 実行時の出力メッセージで「PRを作成しました。マージされると承認が確定します」と案内
- 承認PR未マージのspecificationに対して再実行した場合、既存PRへのリンクを表示

### reqord spec implement \<id\>

approvedのspecをimplemented状態に遷移させる。

1. 対象Specificationのstatusが `approved` であることを検証
2. `status` を `implemented` に更新
3. `versionHistory` にエントリを追加
4. **バージョンはインクリメントしない**

```bash
reqord spec implement spec-000011
```

## PRメタデータコメントタグ

承認PR本文にHTMLコメントタグを埋め込み、マージ時の自動ステータス更新を可能にする。

```html
<!-- reqord:approval type=specification id=spec-000011 action=approve version=5.0.0 -->
```

### タグ仕様

| フィールド | 説明 | 例 |
|-----------|------|-----|
| type | 対象種別 | `requirement` / `specification` |
| id | 対象ID | `spec-000011` |
| action | 操作 | `approve` |
| version | 対象バージョン | `5.0.0` |

### 活用方法

- GitHub Actionsでマージイベントを検知し、コメントタグをパースして自動ステータス更新
- 将来的な自動化の基盤として、現時点ではタグ埋め込みのみを実装

## バージョニングとステータス遷移の分離

すべてのステータス遷移コマンドはバージョンを変更しない:

- `reqord spec draft` 実行時: **バージョンをインクリメントしない**（ステータス変更のみ）
- `reqord spec approve` 実行時: **バージョンをインクリメントしない**（ステータス変更のみ）
- `reqord spec implement` 実行時: **バージョンをインクリメントしない**（ステータス変更のみ）

バージョン変更は `reqord version` コマンドで明示的に行う（req-000005参照）。

## Requirement承認との共通化

- ブランチ作成・PR作成・承認記録のロジックはreq-000011と共通ユーティリティ化
- phase フィールドで `requirement` / `specification` を区別
- draft/implement コマンドも共通ロジックで実装

## 技術的制約

- 承認前にDesign Validation（req-000014）の実行を推奨（警告表示）
- Requirementが未承認の場合はエラーで中断

## フィードバック反映履歴

| Issue | 反映内容 |
|-------|---------|
| #208 | approved廃止。approveでstatusをapprovedに設定し、PRマージで完了 |
| #209 | `reqord spec draft`と`reqord spec implement`をスコープに含める |
| #263 | バージョニングとステータス遷移を完全分離（req-000005 v4.0に準拠） |
| #279 | draft差し戻し時のPR運用ルール（影響範囲をまとめてPRで管理） |
