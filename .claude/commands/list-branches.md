---
description: ブランチ一覧を表示する
argument-hint: [-a]
allowed-tools: Bash(git branch:*)
model: haiku
---

# ブランチ一覧表示

ローカルブランチの一覧を表示します。

## 引数

- `$ARGUMENTS`:
  - なし: ローカルブランチのみ
  - `-a`: リモートブランチも含めて表示

## 実行

```bash
# ローカルブランチ一覧（現在のブランチに * マーク）
git branch

# リモート含む全ブランチ（-a オプション時）
git branch -a
```

## 出力

- 現在のブランチには `*` が付く
- ブランチ名を一覧表示
