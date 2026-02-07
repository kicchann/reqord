---
description: CHANGELOG.md更新提案を生成する
allowed-tools: Bash(git:*), Read, AskUserQuestion
model: sonnet
---

# CHANGELOG.md 更新提案

コミット履歴を分析し、CHANGELOG.mdの更新提案を生成します。

## 実行手順

### 1. CHANGELOG.mdの確認

```bash
# CHANGELOG.mdの存在確認
ls -la CHANGELOG.md 2>/dev/null || echo "CHANGELOG.md not found"
```

CHANGELOG.mdがない場合は新規作成を提案。

### 2. 現在のCHANGELOGを読み込み

```bash
cat CHANGELOG.md 2>/dev/null || echo "No CHANGELOG.md found"
```

### 3. 最近のコミットを分析

```bash
# Conventional Commits形式を想定
git log --oneline --pretty=format:"%h %s" -50

# タグ間のコミット（バージョン管理している場合）
git log $(git describe --tags --abbrev=0 2>/dev/null || echo "HEAD~50")..HEAD --oneline 2>/dev/null || git log --oneline -50
```

### 4. 変更をカテゴリ分類

コミットメッセージを解析してカテゴリ分類:

| Prefix | カテゴリ |
|--------|---------|
| feat: | Added |
| fix: | Fixed |
| docs: | Documentation |
| refactor: | Changed |
| perf: | Performance |
| test: | Tests |
| chore: | Maintenance |
| BREAKING CHANGE | Breaking Changes |

### 5. CHANGELOG形式で提案生成

[Keep a Changelog](https://keepachangelog.com/) 形式で生成:

```markdown
## [Unreleased]

### Added
- 新機能の説明 (#PR番号)

### Changed
- 変更内容の説明 (#PR番号)

### Fixed
- バグ修正の説明 (#PR番号)

### Removed
- 削除された機能 (#PR番号)

### Security
- セキュリティ修正 (#PR番号)
```

### 6. AskUserQuestionで確認

提案内容をユーザーに提示し、以下を選択:
- 「提案を適用する」
- 「編集して適用する」
- 「適用しない」

### 7. 適用（承認時）

承認された場合、CHANGELOG.mdの先頭（またはUnreleasedセクション）に追加。

## 出力フォーマット

```
=== CHANGELOG.md 更新提案 ===

分析期間: [最後のタグ] → HEAD
コミット数: N

## 提案内容

[カテゴリ別の変更リスト]

適用しますか？
```

## 使用例

```
/update-changelog
```

→ コミット履歴からCHANGELOG更新提案を生成

## 注意事項

- Keep a Changelog形式を推奨
- Conventional Commits形式のコミットメッセージを想定
- バージョン番号は人間が決定
