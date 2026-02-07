---
description: Linter/Formatterを実行する
argument-hint: [path]
allowed-tools: Bash(ruff:*)
model: haiku
---

# Linter/Formatter実行

ruffを使用してコード品質をチェックします。

## 引数

- `$ARGUMENTS`: 対象パス（オプション、デフォルト: `.`）

## 実行順序

### 1. ruff check（Linter）

```bash
# 自動修正付きでチェック
ruff check --fix $ARGUMENTS
```

### 2. ruff format（Formatter）

```bash
ruff format $ARGUMENTS
```

## 出力

- 各ツールの実行結果
- エラー/警告の一覧
- 修正が必要な場合は具体的な提案

## 注意事項

- 設定ファイル（pyproject.toml等）の設定を尊重
