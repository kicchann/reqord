---
description: コードの簡素化・リファクタリング（code-simplifierプラグインのラッパー）
argument-hint: [対象ファイルまたはスコープ（省略時は最近の変更）]
model: haiku
---

# Code Simplifier

Skillツールを使用して `code-simplifier:code-simplifier` スキルを実行してください。

## 引数

$ARGUMENTS

- 引数が指定されている場合: その対象に対してcode-simplifierを実行
- 引数が空の場合: 最近変更されたコード（`git diff HEAD~1` または unstaged changes）を対象に実行

## 実行

```
Skill: code-simplifier:code-simplifier
Args: $ARGUMENTS
```
