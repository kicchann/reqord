---
description: PR作成
argument-hint: [issue番号 例: #10]
allowed-tools: Bash(git:*), Bash(gh:*), Read, AskUserQuestion
model: sonnet
---

# PR作成

現在のブランチからPRを作成します。コミット・プッシュは事前に完了している前提。

## 引数

- `$ARGUMENTS`: issue番号（例: `#10`）（オプション）
  - 指定時: PR説明文に `Closes #N` を含め、作成後にWIPラベルを削除

## 実行手順

### 0. リポジトリ情報を取得

```bash
# リポジトリルートとリポジトリ名を取得
REPO_ROOT=$(git rev-parse --show-toplevel)
GH_REPO=$(git remote get-url origin | sed 's/\.git$//' | grep -oE '[^/]+/[^/]+$')
```

### 1. 事前チェック

```bash
# 現在のブランチ
git branch --show-current

# リモートとの差分確認
git log origin/main..HEAD --oneline 2>/dev/null || git log origin/master..HEAD --oneline
```

mainブランチの場合は警告して終了。

### 2. 未プッシュコミットの確認

```bash
git status -sb
```

未プッシュのコミットがあれば自動でプッシュ:

```bash
git push -u origin $(git branch --show-current)
```

### 3. PULL_REQUEST_TEMPLATE確認

```bash
# テンプレートの存在確認
ls "$REPO_ROOT/.github/PULL_REQUEST_TEMPLATE.md" 2>/dev/null || \
ls "$REPO_ROOT/.github/PULL_REQUEST_TEMPLATE"/*.md 2>/dev/null || \
ls "$REPO_ROOT/.github/pull_request_template.md" 2>/dev/null || \
echo "No template found"
```

### 4. PR説明文の準備

1. 変更内容を収集:

```bash
# コミット一覧
git log origin/main..HEAD --oneline 2>/dev/null || git log origin/master..HEAD --oneline

# 変更ファイル
git diff origin/main..HEAD --name-status 2>/dev/null || git diff origin/master..HEAD --name-status
```

2. PR説明文を生成:

**テンプレートが存在する場合:** テンプレートに沿って内容を埋める

**テンプレートが存在しない場合:**

```markdown
## Summary

Closes #N（issue番号が指定された場合）

- [変更内容の要約を2-3文で記述]

## Changes

### Added

- [新規ファイル]

### Modified

- [変更ファイル]

### Deleted

- [削除ファイル]

## Test plan

- [ ] [テスト項目]

---

🤖 Generated with Claude Code
```

### 5. PR内容確認（AskUserQuestion）

PRを作成する前にユーザーに確認:

- PRタイトル（デフォルト: 最新コミットメッセージ）
- PR説明文の内容
- ドラフトPRにするかどうか

### 6. PR作成

```bash
# 通常PR
gh pr create -R "$GH_REPO" --title "タイトル" --body "説明文"

# ドラフトPR
gh pr create -R "$GH_REPO" --title "タイトル" --body "説明文" --draft
```

### 7. WIPラベル削除（issue指定時）

issue番号（`#N`形式）が指定されていた場合、WIPラベルを削除:

```bash
gh issue edit -R "$GH_REPO" N --remove-label "WIP" 2>/dev/null || true
```

※ラベルが存在しない場合はエラーを無視

### 8. 結果報告

- 作成されたPRのURLを表示
- 次のステップ（レビュー依頼など）を案内
