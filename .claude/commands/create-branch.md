---
description: issue番号から新しいブランチを作成する
argument-hint: <issue-number> [branch-type]
allowed-tools: Bash(gh issue view:*), Bash(git checkout:*), Bash(git branch:*), Bash(git status:*)
model: opus
---
# Issueからブランチ作成

issue番号を元に適切な命名規則でブランチを作成します。

## 引数

- `$ARGUMENTS`:
  - 第1引数: issue番号（必須）
  - 第2引数: ブランチタイプ（オプション、デフォルト: feature）
    - `feature`: 新機能
    - `fix`: バグ修正
    - `docs`: ドキュメント
    - `refactor`: リファクタリング

## ブランチ命名規則

`<type>/issue-<number>-<sanitized-title>`

例:

- `feature/issue-123-add-login-function`
- `fix/issue-45-fix-null-pointer`

**注意**: 日本語タイトルの場合、ブランチ名はissue番号のみ使用します。
例: `feature/issue-123`

## 実行手順

1. 引数からissue番号を取得（必須チェック）
2. 未コミット変更がないか確認 (`git status`)
3. issueの情報を取得 (`gh issue view`)
4. 既存ブランチの確認 (`git branch -a | grep issue-<number>`)
5. ブランチを作成・チェックアウト

## 安全チェック

以下の場合は処理を中断し、ユーザーに確認:

- 未コミットの変更がある場合
- 同じissue番号のブランチが既に存在する場合

## 実行

```bash
# リポジトリ名を取得（プロキシ環境対応）
GH_REPO=$(git remote get-url origin | sed 's/\.git$//' | grep -oE '[^/]+/[^/]+$')

# 1. 未コミット変更チェック
git status --porcelain

# 2. issue情報取得
gh issue view <number> -R "$GH_REPO"

# 3. 既存ブランチ確認
git branch -a | grep "issue-<number>" || true

# 4. ブランチ作成（上記チェック後）
git checkout -b <branch-name>
```

**重要**: `git push` は含めません（人間判断が必要なため）。ブランチ作成後、ユーザーに次のステップを案内してください。
