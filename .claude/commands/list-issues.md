---
description: GitHub issue一覧を表示する
argument-hint: [-a]
allowed-tools: Bash(gh issue list:*), Bash(git remote:*)
model: haiku
---

# Issue一覧表示

GitHub issueの一覧を取得して表示します。

## 引数

- なし: オープンissueのみ表示
- `-a`: すべてのissue（オープン＋クローズ済み）を表示

## 出力フォーマット

以下の情報を含むテーブルを表示:
- 番号 (#)
- 状態: `WIP`ラベルがあれば「WIP」、なければ「OPEN」、クローズ済みなら「CLOSED」
- タイトル
- ラベル（WIP以外）
- 作成日

## 実行

```bash
# リポジトリ名を取得（プロキシ環境対応）
GH_REPO=$(git remote get-url origin | sed 's/\.git$//' | grep -oE '[^/]+/[^/]+$')

# オープンissueのみ（デフォルト）
gh issue list -R "$GH_REPO" --state open --limit 20

# すべてのissue（-a オプション時）
gh issue list -R "$GH_REPO" --state all --limit 20
```

引数に応じて適切なコマンドを実行してください。issueがない場合はその旨を伝えてください。
