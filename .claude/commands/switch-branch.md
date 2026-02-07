---
description: ブランチを切り替える
argument-hint: [branch-name]
allowed-tools: Bash(git branch:*), Bash(git checkout:*), Bash(git switch:*), Bash(git status:*)
model: haiku
---

# ブランチ切り替え

ローカルブランチを一覧表示し、選択したブランチに切り替えます。

## 引数

- `$ARGUMENTS`: ブランチ名（オプション）
  - 指定あり: そのブランチに直接切り替え
  - 指定なし: ブランチ一覧を表示して選択を促す

## 実行手順

### 1. 未コミット変更の確認

```bash
git status --porcelain
```

未コミット変更がある場合は警告を表示し、続行するか確認。

### 2. ブランチ一覧の取得

```bash
git branch -a
```

### 3. ブランチ切り替え

```bash
git switch <branch-name>
```

## 安全チェック

- 未コミットの変更がある場合は警告を表示
- 存在しないブランチ名が指定された場合はエラー

## 出力

切り替え後、現在のブランチを表示:

```bash
git branch --show-current
```
