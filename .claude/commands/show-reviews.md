---
description: レビューコメント一覧表示
argument-hint: [PR番号]
allowed-tools: Bash(gh:*)
model: haiku
---

# レビューコメント一覧表示

PRのレビューコメントを一覧表示します。

## 引数

- `$ARGUMENTS`: PR番号（オプション。省略時は現在のブランチのPRを検索）

## 実行手順

### 0. リポジトリ名を取得

```bash
# リポジトリ名を取得（プロキシ環境対応）
GH_REPO=$(git remote get-url origin | sed 's/\.git$//' | grep -oE '[^/]+/[^/]+$')
```

### 1. PR番号の特定

引数がない場合:

```bash
# 現在のブランチに紐づくPRを検索
gh pr view -R "$GH_REPO" --json number,title,state
```

### 2. レビューコメント取得

```bash
# PRのレビューを取得
gh pr view -R "$GH_REPO" <PR番号> --json reviews --jq '.reviews[] | {author: .author.login, state: .state, body: .body}'

# インラインコメントを取得
gh api repos/$GH_REPO/pulls/<PR番号>/comments --jq '.[] | {path: .path, line: .line, author: .user.login, body: .body, created_at: .created_at}'
```

### 3. 結果を整形表示

```
=== PR #123: タイトル ===

## Reviews
- @reviewer1 (APPROVED): LGTM
- @reviewer2 (CHANGES_REQUESTED): いくつか修正お願いします

## Inline Comments (3件)

### src/main.py:42 (@reviewer2)
> この変数名は分かりにくいです

### src/utils.py:15 (@reviewer2)
> エラーハンドリングを追加してください

### tests/test_main.py:8 (@reviewer1)
> このテストケースを追加してください
```

### 4. 未対応コメントのハイライト

返信がないコメントや、CHANGES_REQUESTEDのレビューを目立つように表示。

## 使用例

```
/show-reviews          # 現在のブランチのPR
/show-reviews 123      # PR #123
```
