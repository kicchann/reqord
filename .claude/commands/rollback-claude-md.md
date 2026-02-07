---
description: CLAUDE.md変更差分確認・ロールバック
allowed-tools: Bash(git:*), Read, Edit, AskUserQuestion
model: sonnet
---

# CLAUDE.md 変更差分確認・ロールバック

CLAUDE.mdファイルの変更履歴を確認し、必要に応じてロールバックします。

## 実行手順

### 1. CLAUDE.mdの存在確認

```bash
# CLAUDE.mdファイルの確認
ls -la CLAUDE.md 2>/dev/null || echo "CLAUDE.md not found"
```

### 2. 変更履歴の取得

```bash
# 最近の変更履歴（10件）
git log --oneline -10 -- CLAUDE.md

# 変更を加えたコミットの詳細
git log --pretty=format:"%h %ad %s" --date=short -10 -- CLAUDE.md
```

### 3. 変更差分の表示

```bash
# 直近のコミットとの差分
git diff HEAD~1 -- CLAUDE.md 2>/dev/null || echo "No previous version"

# 特定コミットとの差分（必要に応じて）
git diff <commit-hash> -- CLAUDE.md
```

### 4. AskUserQuestionで操作選択

以下の選択肢を提示:

1. **差分を確認のみ**: 何もしない
2. **特定バージョンにロールバック**: コミットハッシュを指定
3. **直前のバージョンに戻す**: HEAD~1の状態に復元

### 5. ロールバック実行（選択時）

```bash
# 特定コミットの内容で復元
git checkout <commit-hash> -- CLAUDE.md

# または直前の状態に復元
git checkout HEAD~1 -- CLAUDE.md
```

### 6. 確認と案内

ロールバック後:
- 変更内容を確認
- コミットするかどうかを案内

```bash
# 現在の状態確認
git status
git diff --cached -- CLAUDE.md
```

## 出力フォーマット

```
=== CLAUDE.md 変更履歴 ===

| コミット | 日付 | メッセージ |
|---------|------|-----------|
| abc1234 | 2024-01-15 | feat: Add testing guidelines |
| def5678 | 2024-01-10 | docs: Update workflow section |
| ...     | ...  | ... |

現在の変更:
[差分を表示]
```

## 使用例

```
/rollback-claude-md
```

→ CLAUDE.mdの変更履歴を確認し、ロールバックオプションを提示

## 注意事項

- ロールバックは慎重に実行
- 重要な変更が失われないよう確認
- ロールバック後は必ずコミットするか確認
