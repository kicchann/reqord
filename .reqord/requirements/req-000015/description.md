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

### reqord spec draft \<id\> [--major|--minor|--patch]

flag付き、またはapproved/implementedのspecをdraft状態に戻し、再編集を可能にする。

1. 対象Specificationのstatusが `draft` 以外であることを検証
2. `status` を `draft` に更新
3. バージョンを引数に応じてインクリメント（デフォルト: `--minor`）
4. `versionHistory` にエントリを追加
5. flagsがある場合、draft化の理由として記録

```bash
reqord spec draft spec-000011 --minor
```

### reqord spec approve \<id\>

承認依頼PRを作成するコマンド。PRマージによって承認が確定する。

1. 対象Specificationのstatusが `draft` であることを検証
2. 対象Requirementが `approved` 状態であることを検証
3. Gitブランチを作成: `reqord/spec-<id>-approve-v<version>`
4. Specification YAMLの `status` を `approved` に更新してコミット
   - **バージョンはインクリメントしない**（バージョンアップはdraft化時に行う）
5. GitHub PRを作成:
   - タイトル: `[Reqord] Approve spec-<id>: <title> v<version>`
   - design.mdの概要をPRボディに含める
   - CODEOWNERSからレビュアーを自動アサイン
   - Reqordメタデータコメントタグをボディに含める
6. PRマージ時:
   - `currentApproval` を記録（version, phase, prNumber）
   - `versionHistory` に承認記録を追加
   - `approvedBy`/`approvedAt`はPRの承認者・マージ日時が証跡となるため、YAMLに重複記録しない

### reqord spec implement \<id\>

approvedのspecをimplemented状態に遷移させる。

1. 対象Specificationのstatusが `approved` であることを検証
2. `status` を `implemented` に更新
3. `versionHistory` にエントリを追加
4. **バージョンはインクリメントしない**

```bash
reqord spec implement spec-000011
```

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
