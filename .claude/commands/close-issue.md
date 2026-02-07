---
description: issueをコメント付きでクローズする
argument-hint: <issue番号> [コメント]
allowed-tools: Bash(gh:*)
model: haiku
---

# Issue クローズ

指定したissueをコメント付きでクローズします。

## 引数

- `$ARGUMENTS`:
  - 第1引数: issue番号（必須）
  - 第2引数以降: クローズコメント（オプション）

## 実行手順

### 0. リポジトリ名を取得

```bash
# リポジトリ名を取得（プロキシ環境対応）
GH_REPO=$(git remote get-url origin | sed 's/\.git$//' | grep -oE '[^/]+/[^/]+$')
```

### 1. issue情報確認

```bash
# issue詳細を取得
gh issue view -R "$GH_REPO" <issue番号> --json title,state,labels
```

既にクローズ済みの場合はその旨を通知。

### 2. クローズコメントの決定

コメントが指定されている場合はそれを使用。
指定がない場合は以下のデフォルトコメントを使用:

```
✅ Completed
```

### 3. コメント追加とクローズ

```bash
# コメント追加
gh issue comment -R "$GH_REPO" <issue番号> --body "コメント内容"

# issueクローズ
gh issue close -R "$GH_REPO" <issue番号>
```

### 4. 結果報告

- クローズしたissueのタイトルと番号
- 追加したコメント

## 使用例

```
/close-issue 123                    # デフォルトコメントでクローズ
/close-issue 123 PR #456 でマージ済み  # カスタムコメントでクローズ
```
