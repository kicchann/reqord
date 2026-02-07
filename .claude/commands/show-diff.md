---
description: 変更差分の整理・サマリー作成
allowed-tools: Bash(git:*)
model: sonnet
---

# 変更差分サマリー

現在の変更内容を整理し、分かりやすいサマリーを作成します。PR説明文やコミットメッセージの作成に役立ちます。

## 実行手順

### 1. 変更の概要取得

```bash
# ブランチ情報
git branch --show-current

# 変更ファイル一覧（ステータス付き）
git diff --cached --name-status 2>/dev/null || git diff HEAD --name-status

# 変更統計
git diff --cached --stat 2>/dev/null || git diff HEAD --stat
```

### 2. 変更をカテゴリ別に整理

変更ファイルを以下のカテゴリに分類:

| カテゴリ | 対象 |
|---------|------|
| Added | 新規追加ファイル (A) |
| Modified | 変更ファイル (M) |
| Deleted | 削除ファイル (D) |
| Renamed | リネームファイル (R) |

### 3. 主要な変更内容の分析

```bash
# 追加行数・削除行数
git diff --cached --shortstat 2>/dev/null || git diff HEAD --shortstat

# 変更の詳細（ファイルごと）
git diff --cached --stat 2>/dev/null || git diff HEAD --stat
```

### 4. サマリー出力

以下の形式でサマリーを作成:

```markdown
## 変更サマリー

**ブランチ**: feature/xxx
**変更ファイル数**: N files
**変更行数**: +XX / -YY

### Added (N files)
- `path/to/new-file.py` - [簡単な説明]

### Modified (N files)
- `path/to/changed-file.py` - [変更内容の要約]

### Deleted (N files)
- `path/to/removed-file.py` - [削除理由]

### 主な変更点
1. [変更点1の説明]
2. [変更点2の説明]
3. [変更点3の説明]
```

### 5. 変更の詳細表示（オプション）

ユーザーが詳細を求めた場合、特定ファイルの差分を表示:

```bash
git diff --cached <file> 2>/dev/null || git diff HEAD <file>
```

## 出力のポイント

- 変更の意図が分かるように要約
- 技術的な詳細は簡潔に
- PR説明文にそのまま使える形式

## 使用例

```
/show-diff
```

→ 現在の変更に対してサマリーを生成
