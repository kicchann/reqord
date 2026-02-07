---
description: テスト・レビュー・PR作成を一括実行
argument-hint: [issue番号]
allowed-tools: Bash(git:*), Bash(gh:*), Bash(pytest:*), Read, Grep, Glob, AskUserQuestion
model: opus
---

# Quick PR

テスト実行、セルフレビュー、PR作成までを一括で実行します。各ステップでエラーがあれば停止します。

## 引数

- `$ARGUMENTS`: issue番号（オプション、例: `#10`）

## 実行フロー

```
/test → /lint → /review-local → /commit-push-pr
```

## 実行手順

### 0. 事前確認

```bash
# ブランチ確認
git branch --show-current

# 変更確認
git status --porcelain
```

変更がない場合は終了。
mainブランチの場合は警告。

### 1. テスト実行

```bash
# pytest実行
pytest -v --tb=short
```

**失敗時**: エラー内容を表示して停止。

### 2. Lint実行

```bash
# ruff check
ruff check . --fix

# ruff format
ruff format .
```

**失敗時**: エラー内容を表示して停止。

### 3. セルフレビューチェック

以下をチェック:
- デバッグコードの残存
- 認証情報のハードコード
- 不要なコメントアウト

```bash
# 潜在的問題の検出
git diff --cached -U0 | grep -E '^\+.*(console\.log|print\(|debugger|TODO|FIXME|password|secret|api_key)' || true
```

問題がある場合は警告を表示し、続行するか確認。

### 4. コミット・プッシュ・PR作成

1. 変更をステージング
2. コミットメッセージ生成（差分から自動生成またはissue参照）
3. プッシュ
4. PR作成

```bash
GH_REPO=$(git remote get-url origin | sed 's/\.git$//' | grep -oE '[^/]+/[^/]+$')

git add -A
git commit -m "メッセージ"
git push -u origin $(git branch --show-current)
gh pr create -R "$GH_REPO" --fill
```

### 5. 結果サマリー

```
=== Quick PR 完了 ===

✅ テスト: 10 passed
✅ Lint: no issues
✅ セルフレビュー: OK
✅ PR作成: #123

PR URL: https://github.com/owner/repo/pull/123
```

## エラー時の動作

各ステップでエラーが発生した場合:
1. エラー内容を表示
2. 処理を停止
3. 修正方法を提案

## 使用例

```
/quick-pr          # issue指定なし
/quick-pr #10      # issue #10 を参照
```
