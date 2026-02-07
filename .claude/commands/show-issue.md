---
description: 指定したissueの詳細情報を表示する
argument-hint: <issue-number>
allowed-tools: Bash(gh issue view:*)
model: haiku
---
# Issue詳細表示

指定されたissue番号の詳細情報を表示します。

## 引数

- `$ARGUMENTS`: issue番号（必須）

## 実行内容

1. 引数からissue番号を取得
2. `gh issue view <number> --comments` で詳細とコメントを取得
3. 構造化して表示

## 出力フォーマット

以下の情報を構造化して表示:

- タイトル
- 状態 (Open/Closed)
- ラベル
- 担当者
- マイルストーン
- 本文
- コメント（ある場合）

## 実行

issue番号が指定されていない場合はエラーメッセージを表示してください。

```bash
# リポジトリ名を取得（プロキシ環境対応）
GH_REPO=$(git remote get-url origin | sed 's/\.git$//' | grep -oE '[^/]+/[^/]+$')

# issue詳細取得
gh issue view $ARGUMENTS -R "$GH_REPO" --comments
```

結果をユーザーに分かりやすく構造化して表示してください。
