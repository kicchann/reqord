---
description: 直前のコミット取り消し
argument-hint: [--soft|--hard]
allowed-tools: Bash(git:*)
model: haiku
---

# 直前のコミット取り消し

最後のコミットを取り消します。

## 引数

- `$ARGUMENTS`:
  - `--soft`: コミットのみ取り消し（変更はステージングに残る）
  - `--hard`: コミットと変更を完全に破棄（危険）
  - なし: `--soft` と同じ（デフォルト）

## 実行手順

### 1. 現在の状態確認

```bash
# 直前のコミット確認
git log -1 --oneline

# 現在の状態
git status --short
```

### 2. リモートにプッシュ済みか確認

```bash
# ローカルとリモートの差分確認
git log origin/$(git branch --show-current)..HEAD --oneline 2>/dev/null || echo "No remote tracking"
```

### 3. コミット取り消し

```bash
# soft: 変更をステージングに残す（デフォルト）
git reset --soft HEAD~1

# hard: 変更も破棄（要確認）
git reset --hard HEAD~1
```

## 安全チェック

- **リモートにプッシュ済みの場合は警告**
  - `git revert` の使用を推奨
- `--hard` は必ずユーザー確認
- 取り消し前にコミット内容を表示

## 注意

- **プッシュ済みのコミットには `git revert` を使用**
- `--hard` は変更が完全に失われる
- 複数コミットの取り消しは `HEAD~n` を使用

## プッシュ済みの場合

```bash
# revertで打ち消しコミットを作成
git revert HEAD
```
