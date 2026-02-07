---
description: コミット・プッシュ・PR作成を一括実行する
argument-hint: [commit message]
allowed-tools: Bash(git:*), Bash(gh:*), AskUserQuestion
model: sonnet
---

# コミット・プッシュ・PR作成

変更をコミットし、リモートにプッシュし、PRを作成します。

## 引数

- `$ARGUMENTS`: issue番号（例: `#10`）またはコミットメッセージ（オプション。省略時は自動生成）
  - `#N` 形式の場合: issue内容を参照してコミットメッセージを生成し、PRに `Closes #N` を含める

## 実行手順

### 0. リポジトリ名を取得

```bash
# リポジトリ名を取得（プロキシ環境対応）
GH_REPO=$(git remote get-url origin | sed 's/\.git$//' | grep -oE '[^/]+/[^/]+$')
```

### 1. 現状確認

```bash
# ブランチ確認
git branch --show-current

# 変更確認
git status --porcelain

# 差分確認（staged + unstaged）
git diff HEAD --stat

# 最近のコミット（スタイル参考）
git log --oneline -5
```

### 2. 変更がない場合

変更がなければ処理を中断し、ユーザーに通知。

### 3. コミット作成

1. すべての変更をステージング (`git add -A`)
2. コミットメッセージを決定:
   - 引数で指定されていればそれを使用
   - 指定がなければ差分から自動生成
3. コミット実行

**コミットメッセージ規約**:
- Conventional Commits形式を推奨（feat:, fix:, docs:, refactor:, test:, chore:）
- 1行目は50文字以内の要約
- 必要に応じて本文を追加

### 4. リモートにプッシュ

```bash
# リモート追跡ブランチを設定してプッシュ
git push -u origin $(git branch --show-current)
```

### 5. PR作成

`/create-pr` の手順に従ってPRを作成:
- issue番号が指定されている場合は `/create-pr #N` として実行
- PR作成確認、WIPラベル削除は `/create-pr` 側で処理される

### 6. 結果報告

- PR URLを表示
- 次のステップ（レビュー依頼など）を案内

## 安全チェック

- mainブランチでの実行は警告を出す
- 未プッシュのコミットがある場合は確認
- コンフリクトの可能性がある場合は警告

## 注意事項

- PRのマージは人間が判断する（auto-merge禁止）
- セキュリティ関連の変更は特に注意を促す
