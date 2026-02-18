---
name: status
description: Reqordの要件・仕様の実装進捗ダッシュボードを表示する。Show requirement and specification implementation progress dashboard. Use when checking project status, finding next tasks, or reviewing progress.
argument-hint: "[approved|implemented|all] (デフォルト: approved)"
---

# Reqord進捗ダッシュボード

フィルタ: $ARGUMENTS（デフォルト: approved = 実装待ち）

要件・仕様の実装進捗を一覧表示し、次に着手すべきspecを特定する。

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

### フィルタ判定

| $ARGUMENTS      | 表示対象                  | 説明                           |
| --------------- | ------------------------- | ------------------------------ |
| 空 / `approved` | status=approved のspec    | 実装待ち（次に着手すべきもの） |
| `implemented`   | status=implemented のspec | 実装済み（確認用）             |
| `all`           | 全spec                    | 全件表示                       |

### 詳細テーブル

フィルタ対象のspecについて、以下のテーブルを表示する:

```
| Spec ID | Req ID | Title | Priority | Complexity | design.md | Flags |
|---------|--------|-------|----------|------------|-----------|-------|
| spec-000003 | req-000003 | CLI仕様表示 | high | small | 148行 | - |
| spec-000005 | req-000005 | バージョン管理 | medium | medium | テンプレート | - |
| spec-000007 | req-000007 | Web画面 | low | large | 253行 | feedback-review |
```

---

## Step 4: design.md行数の取得

各specのdesign.mdを確認し、行数とテンプレート判定を行う。

### 確認手順

各specディレクトリの `design.md` をReadツールで読み取り、行数を数える。

### テンプレート判定

以下のいずれかに該当する場合は「テンプレート」と判定:

- 内容に「Specification Design Template」のみが含まれている
- 内容に「Phase 3で実装予定」のみが含まれている
- 行数が10行以下

テンプレートのままの場合、design.md列に「テンプレート」と表示する（行数の代わりに）。

---

## Step 5: 未解決Feedback Flagの表示

Step 1で取得したfeedback一覧から、openかつlinkedToが設定されているものを抽出する。

### Flag表示

未解決flagがある場合:

```
### 未解決Feedback Flags

| Issue | Type | Severity | LinkedTo | Title |
|-------|------|----------|----------|-------|
| #208 | bug | medium | spec-000011 | エラーメッセージが不明瞭 |
| #209 | requirement-gap | medium | req-000011 | 一括操作機能が未定義 |
```

未解決flagがない場合:

```
未解決のfeedback flagはありません。
```

---

## Step 6: 次のアクション提案

### 6.1 着手推奨specの選定

フィルタがapprovedの場合、以下の優先順位で着手推奨specを選定する:

1. **priority: high** かつ **design.md記述済み** → すぐに実装着手可能
2. **priority: high** かつ **design.mdテンプレート** → まずdesign.md作成が必要
3. **priority: medium** かつ **design.md記述済み** → 次の候補
4. **feedback-review flagあり** → フィードバック対応が先

### 6.2 依存関係チェック

推奨specに紐づくrequirementのdependencies（blockedBy）を確認し、ブロッカーがある場合は報告する。

### 6.3 アクション提案

状況に応じた次のアクションを提案する:

```
### 推奨アクション

1. **spec-000003** (high/small, design.md記述済み) → `/reqord:dev spec-000003` で実装開始
2. **spec-000005** (medium/medium, テンプレート) → `/reqord:design spec-000005` でdesign.md作成
3. **#208 feedback** → `/reqord:feedback 208` でフィードバック対応
```

### 6.4 ワークフロー案内

```
次のステップ:
- 実装開始: /reqord:dev <spec-id>
- 設計書作成: /reqord:design <spec-id>
- フィードバック対応: /reqord:feedback [issue-number]
- ブランチ作成: /reqord:git branch <spec-id>
```
