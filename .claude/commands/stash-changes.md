---
description: 一時退避
argument-hint: "[save|pop|list|drop] [message]"
allowed-tools: Bash(git:*)
model: haiku
---

# 変更の一時退避

作業中の変更を一時的に退避（stash）します。

## 引数

- `$ARGUMENTS`:
  - `save [message]`: 変更を退避（メッセージ任意）
  - `pop`: 最新のstashを適用して削除
  - `list`: stash一覧表示
  - `drop [stash@{n}]`: stashを削除
  - なし: `save` と同じ

## 実行手順

### 現在の状態確認

```bash
git status --short
```

### stash操作

#### 退避（save）

```bash
# メッセージなし
git stash push

# メッセージあり
git stash push -m "<message>"
```

#### 復元（pop）

```bash
# 最新を適用して削除
git stash pop

# 特定のstashを適用（削除しない）
git stash apply stash@{n}
```

#### 一覧（list）

```bash
git stash list
```

#### 削除（drop）

```bash
# 最新を削除
git stash drop

# 特定のstashを削除
git stash drop stash@{n}
```

## 出力

操作後、以下を表示:
- 実行結果
- 現在のstash一覧（`git stash list`）

## 注意

- 未追跡ファイルは `-u` オプションで含める
- stashは LIFO（後入れ先出し）
