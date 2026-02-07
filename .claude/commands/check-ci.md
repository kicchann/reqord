---
description: CI/CD結果確認
allowed-tools: Bash(gh:*)
model: haiku
---

# CI/CD結果確認

現在のブランチまたはPRのCI/CD実行結果を確認します。

## 実行手順

### 0. リポジトリ名を取得

```bash
# リポジトリ名を取得（プロキシ環境対応）
GH_REPO=$(git remote get-url origin | sed 's/\.git$//' | grep -oE '[^/]+/[^/]+$')
```

### 1. 現在のブランチ/PR確認

```bash
# 現在のブランチ
git branch --show-current

# このブランチのPR（存在する場合）
gh pr view -R "$GH_REPO" --json number,title,state,statusCheckRollup 2>/dev/null || echo "No PR found"
```

### 2. ワークフロー実行状況

```bash
# 最新のワークフロー実行一覧
gh run list -R "$GH_REPO" --limit 5
```

### 3. 特定のワークフロー詳細（必要に応じて）

```bash
# 実行IDを指定して詳細表示
gh run view -R "$GH_REPO" <run-id>
```

## 出力フォーマット

以下の情報を表示:

- ワークフロー名
- ステータス（success/failure/in_progress/queued）
- 実行時間
- コミットSHA

## ステータス表示

| Status | 表示 |
|--------|------|
| success | 成功 |
| failure | 失敗 |
| in_progress | 実行中 |
| queued | 待機中 |
| cancelled | キャンセル |

## 失敗時

失敗したワークフローがある場合は、ログ確認コマンドを案内:

```bash
gh run view -R "$GH_REPO" <run-id> --log-failed
```
