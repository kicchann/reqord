---
description: マージ前最終チェック（CI、Approve、コンフリクト）
argument-hint: [PR番号]
allowed-tools: Bash(gh:*), Bash(git:*), AskUserQuestion
model: haiku
---

# マージ前最終チェック

PRをマージする前に、必要な条件がすべて満たされているか確認します。

## 引数

- `$ARGUMENTS`: PR番号（オプション。省略時は現在のブランチのPR）

## 実行手順

### 0. リポジトリ名を取得

```bash
# リポジトリ名を取得（プロキシ環境対応）
GH_REPO=$(git remote get-url origin | sed 's/\.git$//' | grep -oE '[^/]+/[^/]+$')
```

### 1. PR情報の取得

```bash
# PR情報を取得
gh pr view -R "$GH_REPO" <PR番号> --json number,title,state,mergeable,mergeStateStatus,reviews,statusCheckRollup,headRefName,baseRefName
```

### 2. チェック項目

以下の項目をチェックしてレポート:

#### CI/CDステータス
```bash
gh pr checks -R "$GH_REPO" <PR番号>
```

| ステータス | 意味 |
|-----------|------|
| pass | すべてのチェックが成功 |
| fail | 失敗したチェックあり |
| pending | 実行中のチェックあり |

#### レビュー状態
- Approved: 承認済みレビューの数
- Changes Requested: 変更要求の有無
- Pending: 未レビューの有無

#### マージ可能性
- `mergeable`: マージ可能か
- `mergeStateStatus`: マージ状態
  - `CLEAN`: マージ可能
  - `DIRTY`: コンフリクトあり
  - `BLOCKED`: ブランチ保護ルールでブロック
  - `BEHIND`: ベースブランチより遅れている

### 3. コンフリクトチェック

```bash
# ベースブランチとの差分確認
git fetch origin
git diff --stat origin/main...HEAD 2>/dev/null || git diff --stat origin/master...HEAD
```

### 4. 結果レポート

```text
=== マージ前チェック: PR #123 ===

## CI/CD
[ ] テスト: pass/fail/pending
[ ] ビルド: pass/fail/pending
[ ] Lint: pass/fail/pending

## レビュー
[x] Approved: 2
[ ] Changes Requested: なし

## マージ状態
[x] コンフリクト: なし
[x] ベースブランチ: 最新

## 結果
✅ マージ可能 / ⚠️ 要対応項目あり / ❌ マージ不可
```

### 5. 推奨アクション

問題がある場合、解決方法を提案:
- CI失敗 → ログ確認コマンドを案内
- コンフリクト → リベース手順を案内
- レビュー不足 → レビュー依頼を案内

### 6. マージ案内（Human-in-the-loop）

**重要**: PRマージはセキュリティ上の理由から自動実行しません（Human-in-the-loop設計）。

マージ可能な状態（✅ マージ可能）の場合、以下を提示:

```text
## マージ方法

**GitHub UI:**
https://github.com/<owner>/<repo>/pull/<PR番号>

**コマンドライン:**
gh pr merge -R <owner>/<repo> <PR番号> --merge --delete-branch

**マージ後のローカル操作:**
git checkout main && git pull origin main
git branch -d <branch-name>
```

マージ不可の場合は、チェック結果と推奨アクションのみ報告する。

## 使用例

```text
/check-merge          # 現在のブランチのPR
/check-merge 123      # PR #123
```
