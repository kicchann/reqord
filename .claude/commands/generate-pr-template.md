---
description: PR説明文テンプレート生成
allowed-tools: Bash(git:*), Bash(gh:*)
model: sonnet
---

# PR説明文テンプレート生成

現在のブランチの変更内容からPR説明文を生成します。PRを作成せず、テンプレートのみ出力。

## 引数

- `$ARGUMENTS`: issue番号（オプション、例: `#10`）

## 実行手順

### 0. リポジトリ名を取得

```bash
# リポジトリ名を取得（プロキシ環境対応）
GH_REPO=$(git remote get-url origin | sed 's/\.git$//' | grep -oE '[^/]+/[^/]+$')
```

### 1. 変更内容の収集

```bash
# 現在のブランチ
git branch --show-current

# コミット一覧
git log origin/main..HEAD --oneline 2>/dev/null || git log origin/master..HEAD --oneline

# 変更ファイル一覧
git diff origin/main..HEAD --stat 2>/dev/null || git diff origin/master..HEAD --stat

# 差分の詳細（要約用）
git diff origin/main..HEAD --name-status 2>/dev/null || git diff origin/master..HEAD --name-status
```

### 2. issue情報の取得（指定時）

引数でissue番号が指定された場合:

```bash
gh issue view -R "$GH_REPO" <番号> --json title,body
```

### 3. テンプレート生成

以下の形式でPR説明文を生成:

```markdown
## Summary

[issueが指定された場合]
Closes #N

[変更内容の要約を2-3文で記述]

## Changes

[変更ファイルをカテゴリ別に整理]

### Added
- `path/to/new-file.md` - 新機能の説明

### Modified
- `path/to/existing.md` - 変更内容の説明

### Deleted
- `path/to/removed.md` - 削除理由

## Test plan

- [ ] [テスト項目1]
- [ ] [テスト項目2]

---
🤖 Generated with Claude Code
```

### 4. 出力

生成したテンプレートをそのまま表示。ユーザーは必要に応じてコピー・編集して使用。

## 使用例

```
/generate-pr-template #10
```

→ issue #10 に関連するPR説明文テンプレートを生成
