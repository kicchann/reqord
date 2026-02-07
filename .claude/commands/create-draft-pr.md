---
description: ドラフトPR作成
allowed-tools: Bash(git:*), Bash(gh:*)
model: haiku
---

# ドラフトPR作成

現在のブランチからドラフトPRを作成します。WIP（作業中）の変更を共有したい場合に使用。

## 実行手順

### 0. リポジトリ名を取得

```bash
# リポジトリ名を取得（プロキシ環境対応）
GH_REPO=$(git remote get-url origin | sed 's/\.git$//' | grep -oE '[^/]+/[^/]+$')
```

### 1. 事前チェック

```bash
# 現在のブランチ
git branch --show-current

# コミット一覧
git log origin/main..HEAD --oneline 2>/dev/null || git log origin/master..HEAD --oneline
```

mainブランチの場合は警告して終了。

### 2. 未プッシュコミットの確認・プッシュ

```bash
git status -sb
```

未プッシュのコミットがあれば:

```bash
git push -u origin $(git branch --show-current)
```

### 3. ドラフトPR作成

```bash
gh pr create -R "$GH_REPO" --draft --fill
```

### 4. 結果報告

- 作成されたドラフトPRのURLを表示
- 「Ready for review」にする方法を案内: `gh pr ready -R "$GH_REPO"`
