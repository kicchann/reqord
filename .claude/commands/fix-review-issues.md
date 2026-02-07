---
description: レビュー指摘事項の修正実装
argument-hint: <PR番号>
allowed-tools: Bash(gh:*), Bash(git:*), Read, Edit, AskUserQuestion
model: opus
---

# レビュー指摘事項の修正実装

PRのレビューコメントで指摘された問題を分析し、修正を実装します。

## 引数

- `$ARGUMENTS`: PR番号（必須）

## 実行手順

### 0. リポジトリ名を取得

```bash
# リポジトリ名を取得（プロキシ環境対応）
GH_REPO=$(git remote get-url origin | sed 's/\.git$//' | grep -oE '[^/]+/[^/]+$')
```

### 1. レビューコメント取得

```bash
# PRのレビューを取得
gh pr view -R "$GH_REPO" <PR番号> --json reviews

# インラインコメントを取得
gh api repos/$GH_REPO/pulls/<PR番号>/comments
```

### 2. 指摘事項の分析

各コメントを分析して分類:
- **修正必須**: バグ、セキュリティ問題、ロジックエラー
- **修正推奨**: コードスタイル、命名、可読性
- **議論必要**: 設計判断、トレードオフ

### 3. AskUserQuestionで修正対象を選択

指摘事項一覧を表示し、修正する項目を選択させる:

```
以下の指摘事項が見つかりました:

[修正必須]
1. src/main.py:42 - 変数名が分かりにくい
2. src/utils.py:15 - エラーハンドリング不足

[修正推奨]
3. tests/test_main.py:8 - テストケース追加

[議論必要]
4. src/api.py:100 - 設計に関する質問

どの項目を修正しますか？
```

### 4. 修正の実装

選択された各項目について:

1. 該当ファイルを読み込み
2. 指摘内容を理解
3. 修正案を生成
4. AskUserQuestionで修正内容を確認
5. 承認されたらEditツールで修正

### 5. 修正コミット

```bash
git add -A
git commit -m "fix: レビュー指摘事項を修正

- [修正内容1]
- [修正内容2]
..."
git push
```

### 6. 返信コメント投稿

修正した項目について自動で返信:

```bash
gh api repos/$GH_REPO/pulls/<PR番号>/comments/<comment_id>/replies -f body="修正しました。[コミットハッシュ]で対応済みです。"
```

### 7. 結果報告

- 修正した項目の一覧
- コミットハッシュ
- 残りの未対応項目（あれば）

## 安全チェック

- セキュリティ関連の修正は特に慎重に確認
- 修正前後の動作確認を促す
- 大規模な変更は段階的に実施

## 注意事項

- すべての修正はユーザー確認を取る
- 修正不要と判断した場合は理由を説明

## 使用例

```
/fix-review-issues 123
```
