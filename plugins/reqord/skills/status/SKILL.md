---
name: status
description: Reqordの要件・仕様の実装進捗ダッシュボードを表示する。ステータス別集計、design.md準備状況、未解決フィードバックを一覧表示する。
argument-hint: "[approved|implemented|all] (デフォルト: approved)"
allowed-tools: Read, Glob, Bash(reqord:req list *), Bash(reqord:spec list *), Bash(reqord:feedback list *)
model: sonnet
disable-model-invocation: true
---

## Scope

- **Do**: reqordデータを集計し、進捗状況・準備状況を事実として表示する
- **Don't**: 着手順序の推奨や実装判断。判断はユーザーに委ねる

---

# Reqord進捗ダッシュボード

フィルタ: $ARGUMENTS（デフォルト: approved = 実装待ち）

---

## Step 1: データ取得

以下を**並列実行**:

```bash
reqord req list --json
reqord spec list --json
reqord feedback list --state open --json
```

---

## Step 2: ステータス別集計テーブル

取得データからステータス別の集計テーブルを生成する。

### Requirements

```
| Status | Count | IDs |
|--------|-------|-----|
| draft | 2 | req-000001, req-000002 |
| approved | 3 | req-000003, req-000004, req-000005 |
| implemented | 5 | req-000006, ... |
| deprecated | 0 | - |
| Total | 10 | |
```

### Specifications

```
| Status | Count | IDs |
|--------|-------|-----|
| draft | 1 | spec-000001 |
| approved | 4 | spec-000002, spec-000003, ... |
| implemented | 3 | spec-000004, ... |
| Total | 8 | |
```

---

## Step 3: フィルタに応じた詳細表示

$ARGUMENTSに基づいて詳細表示する対象を決定する。

| $ARGUMENTS | 表示対象 | 説明 |
|------------|----------|------|
| 空 / `approved` | status=approved のspec | 実装待ち |
| `implemented` | status=implemented のspec | 実装済み |
| `all` | 全spec | 全件表示 |

フィルタ対象のspecについて、以下のテーブルを表示する:

```
| Spec ID | Req ID | Title | Priority | Complexity | design.md | Flags |
|---------|--------|-------|----------|------------|-----------|-------|
| spec-000003 | req-000003 | CLI仕様表示 | high | small | 148行 | - |
| spec-000005 | req-000005 | バージョン管理 | medium | medium | テンプレート | - |
| spec-000007 | req-000007 | Web画面 | low | large | 253行 | feedback-review |
```

design.md列: `.reqord/settings/setting.yaml` の `approvalPrerequisites.designMdCheck` を確認する。`true`（デフォルト）の場合、各specのdesign.mdを読み取り行数を表示する。「Specification Design Template」のみ、「Phase 3で実装予定」のみ、または10行以下の場合は「テンプレート」と表示。`false` の場合、design.md列は `-` と表示する（チェック不要のため）。

---

## Step 4: 未解決Feedback Flagの表示

Step 1で取得したfeedback一覧から、openかつlinkedToが設定されているものを抽出する。

未解決flagがある場合:

```
### 未解決Feedback Flags

| Issue | Type | Severity | LinkedTo | Title |
|-------|------|----------|----------|-------|
| #208 | bug | medium | spec-000011 | エラーメッセージが不明瞭 |
| #209 | requirement-gap | medium | req-000011 | 一括操作機能が未定義 |
```

---

## Step 5: 準備状況サマリー

フィルタがapprovedの場合、各specの準備状況を分類して表示する:

```
### 準備状況

| Status | Spec IDs | 説明 |
|--------|----------|------|
| Ready | spec-000003 (high/small) | design.md記述済み（designMdCheck有効時）、ブロッカーなし |
| Needs design | spec-000005 (medium/medium) | design.mdがテンプレートのまま（designMdCheck有効時のみ表示） |
| Blocked | spec-000008 (high/medium) | blockedBy: spec-000003 |
| Feedback pending | spec-000007 (low/large) | feedback-review flagあり |
```

依存関係チェック: 各specに紐づくrequirementのdependencies（blockedBy）を確認し、ブロッカーがある場合はテーブルに反映する。

---

## エラーハンドリング

### reqord CLIが見つからない場合

```
❌ reqord CLIが見つかりません。
インストール: npm install -g @reqord/cli
環境チェック: `/reqord:setup --check`
```
