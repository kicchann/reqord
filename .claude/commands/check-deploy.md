---
description: デプロイ前の全チェックを一括実行
allowed-tools: Bash(git:*), Bash(gh:*), Bash(pytest:*), Bash(ruff:*)
model: opus
---

# Deploy Ready

デプロイ前に必要なすべてのチェックを一括で実行します。

## 実行フロー

```
/run-full-check → /check-merge → セキュリティチェック → 最終確認
```

## 実行手順

### 0. リポジトリ名を取得

```bash
# リポジトリ名を取得（プロキシ環境対応）
GH_REPO=$(git remote get-url origin | sed 's/\.git$//' | grep -oE '[^/]+/[^/]+$')
```

### 1. コード品質チェック

#### Lint
```bash
ruff check .
ruff format --check .
```

#### テスト
```bash
pytest -v --tb=short
```

#### カバレッジ
```bash
pytest --cov=. --cov-report=term-missing --cov-fail-under=70
```

### 2. PR/ブランチ状態チェック

```bash
# PR情報取得
gh pr view -R "$GH_REPO" --json state,mergeable,mergeStateStatus,reviews,statusCheckRollup

# CIステータス
gh pr checks -R "$GH_REPO"
```

チェック項目:
- [ ] CIがすべてパス
- [ ] レビュー承認済み
- [ ] コンフリクトなし
- [ ] ベースブランチと同期済み

### 3. セキュリティチェック

```bash
# 認証情報の検出
git diff origin/main...HEAD | grep -iE '(password|secret|api_key|token|credential)\s*=' || echo "OK"

# .env ファイルの変更確認
git diff origin/main...HEAD --name-only | grep -E '\.env' || echo "OK"
```

チェック項目:
- [ ] ハードコードされた認証情報なし
- [ ] .env ファイルがコミットされていない
- [ ] セキュリティ関連の変更に注意フラグ

### 4. 依存関係チェック

```bash
# requirements.txt の変更確認
git diff origin/main...HEAD --name-only | grep -E 'requirements.*\.txt|pyproject\.toml' || echo "変更なし"
```

### 5. 結果サマリー

```
=== デプロイ準備チェック ===

## コード品質
| Check | Status |
|-------|--------|
| Lint | ✅ / ❌ |
| Test | ✅ N passed / ❌ N failed |
| Coverage | ✅ XX% / ⚠️ XX% (below threshold) |

## PR状態
| Check | Status |
|-------|--------|
| CI | ✅ all pass / ❌ N failed |
| Review | ✅ approved / ⚠️ pending |
| Conflicts | ✅ none / ❌ conflicts |
| Sync | ✅ up to date / ⚠️ behind |

## セキュリティ
| Check | Status |
|-------|--------|
| Credentials | ✅ none found / ⚠️ potential issue |
| .env files | ✅ not committed / ⚠️ found |

## 総合判定
🚀 デプロイ可能
⚠️ 要確認項目あり（上記参照）
❌ デプロイ不可（修正が必要）
```

### 6. 最終確認

すべてのチェックがパスした場合:
- デプロイ手順を案内
- 最終確認のプロンプト

## 使用例

```
/check-deploy
```

→ デプロイ前の全チェックを実行

## 注意事項

- すべてのチェックをパスするまでデプロイしない
- セキュリティ警告は必ず人間が確認
- 本番デプロイは人間の判断で実行
