---
description: 変更の取り消し
argument-hint: [--soft|--hard] [file]
allowed-tools: Bash(git:*)
model: haiku
---

# 変更の取り消し

作業ツリーやステージングの変更を取り消します。

## 引数

- `$ARGUMENTS`:
  - `--soft`: ステージングのみ取り消し（作業ツリーは維持）
  - `--hard`: 作業ツリーも含めて取り消し（要確認）
  - `<file>`: 特定ファイルのみ取り消し
  - なし: インタラクティブに選択

## 実行手順

### 1. 現在の状態確認

```bash
git status --short
```

### 2. 変更の取り消し

#### 特定ファイルの場合

```bash
# ステージング解除
git restore --staged <file>

# 作業ツリーの変更を破棄
git restore <file>
```

#### 全体の場合

```bash
# ステージング全解除
git restore --staged .

# 作業ツリー全体を破棄（危険）
git restore .
```

## 安全チェック

- `--hard` や作業ツリー変更破棄は必ずユーザー確認
- 未追跡ファイルの削除には `git clean` が必要（このコマンドでは行わない）
- 取り消し前に `git stash` を提案

## 注意

**作業ツリーの変更破棄は元に戻せません。** 重要な変更がある場合は先に `git stash` を実行してください。
