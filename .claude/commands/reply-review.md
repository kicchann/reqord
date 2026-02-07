---
description: レビューコメントへの返信作成
argument-hint: <PR番号>
allowed-tools: Bash(gh:*), AskUserQuestion
model: sonnet
---

# レビューコメントへの返信作成

PRのレビューコメントに対する返信を作成・投稿します。

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
# PRのインラインコメントを取得
gh api repos/$GH_REPO/pulls/<PR番号>/comments --jq '.[] | {id: .id, path: .path, line: .line, author: .user.login, body: .body}'
```

### 2. 未返信コメントの特定

返信がないコメントをリストアップ。

### 3. AskUserQuestionで返信対象を選択

未返信コメントを一覧表示し、ユーザーに返信するコメントを選択させる。

### 4. 返信内容の生成

選択されたコメントについて:

1. コメント内容を分析
2. 関連コードを確認
3. 返信案を生成（**コメント投稿者への@メンションを含める**）:
   - 修正する場合: 「@{username} 修正しました。[コミットハッシュ]で対応済みです。」
   - 説明する場合: 「@{username} [理由の説明]のため、現状のままとします。」
   - 質問する場合: 「@{username} [質問内容]について教えてください。」

### 5. AskUserQuestionで返信内容確認

生成した返信案をユーザーに確認:
- そのまま投稿
- 編集して投稿
- キャンセル

### 6. 返信投稿

```bash
# コメント投稿者のusernameを取得（Step 1で取得済み）
COMMENTER="username_from_step1"

# @メンション付きで返信
gh api repos/$GH_REPO/pulls/<PR番号>/comments/<comment_id>/replies -f body="@$COMMENTER 返信内容"
```

### 7. 結果報告

投稿した返信のURLを表示。

## 注意事項

- 返信内容は必ずユーザー確認を取る
- 自動生成の返信案はあくまで提案

## 使用例

```
/reply-review 123
```
