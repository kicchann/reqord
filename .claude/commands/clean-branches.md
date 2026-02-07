---
description: マージ後のブランチ削除（local & remote）
allowed-tools: Bash(git:*), AskUserQuestion
model: haiku
---

# マージ済みブランチの削除

マージ済みのブランチをローカルとリモートから削除します。

## 実行手順

### 1. 現在のブランチ確認

```bash
git branch --show-current
```

現在のブランチが削除対象ブランチの場合は、まず main/master に切り替える。

### 2. マージ済みブランチの一覧表示

```bash
# main/masterに切り替えてからマージ済みブランチを確認
git checkout main 2>/dev/null || git checkout master
git branch --merged | grep -v -E '^\*|main|master'
```

### 3. 削除対象の確認（必須）

**重要: このステップは絶対にスキップしない**

AskUserQuestion を使って、削除対象ブランチを**個別に**ユーザーに確認する。

確認時に以下の情報を提示:
- ブランチ名
- 最終コミット日時 (`git log -1 --format="%ci" <branch>`)
- 作業ブランチ（feat/, feature/ で始まる長期ブランチ）かどうか

**保護対象**（削除候補に含めない）:
- `main`, `master`, `develop`, `staging`
- `feat/*`, `feature/*` で始まる**ベースブランチ**（他のブランチがマージされる先）

### 4. ブランチ削除

ユーザーが明示的に承認したブランチのみ削除:

```bash
# ローカルブランチ削除
git branch -d <branch-name>

# リモートブランチ削除
git push origin --delete <branch-name>
```

**警告が出た場合は即座に停止し、ユーザーに報告する。**

## 安全チェック

- `main`/`master`/`develop`/`staging` ブランチは削除しない
- 現在チェックアウト中のブランチは削除しない
- **削除前に必ず AskUserQuestion でユーザー確認を行う**
- `git branch -d` で警告が出た場合は削除を中止
- 強制削除 (`-D`) は使用しない

## 典型的なユースケース

### PRマージ後のクリーンアップ

PRがマージされた直後は、マージ**元**ブランチのみを削除する：
- ✅ 削除: `feature/issue-245-xxx`（マージ元）
- ❌ 保持: `feat/r3f-panorama-viewer`（マージ先、作業継続中）

## 注意

- `--merged` は現在のブランチにマージ済みのブランチを表示
- 他のブランチにマージされただけでは main の `--merged` に表示されない場合がある
- 作業ブランチ（ベースブランチ）は保護する
