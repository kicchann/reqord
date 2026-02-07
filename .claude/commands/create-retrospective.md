---
description: 振り返りメモ作成テンプレート
argument-hint: [PR番号 or issue番号]
allowed-tools: Bash(gh:*), Bash(git:*)
model: sonnet
---

# 振り返りメモ作成

完了したPRやissueの振り返りメモを作成するテンプレートを生成します。

## 引数

- `$ARGUMENTS`: PR番号またはissue番号（オプション。省略時は直近のマージPR）

## 実行手順

### 0. リポジトリ名を取得

```bash
# リポジトリ名を取得（プロキシ環境対応）
GH_REPO=$(git remote get-url origin | sed 's/\.git$//' | grep -oE '[^/]+/[^/]+$')
```

### 1. 対象の特定

引数がある場合:
```bash
# PR情報を取得
gh pr view -R "$GH_REPO" <番号> --json title,body,mergedAt,additions,deletions,changedFiles,reviews

# または issue情報を取得
gh issue view -R "$GH_REPO" <番号> --json title,body,closedAt,comments
```

引数がない場合:
```bash
# 直近のマージ済みPRを取得
gh pr list -R "$GH_REPO" --state merged --limit 1 --json number,title,mergedAt
```

### 2. 関連情報の収集

```bash
# コミット履歴
git log --oneline -10

# 変更ファイル一覧（PRの場合）
gh pr diff -R "$GH_REPO" <PR番号> --name-only
```

### 3. テンプレート生成

以下の形式で振り返りメモを出力:

```markdown
# 振り返りメモ: [タイトル]

**日付**: YYYY-MM-DD
**PR/Issue**: #番号
**所要時間**: [見積もり vs 実績]

## 概要
[何を実装/修正したか]

## やったこと
- [実施内容1]
- [実施内容2]
- [実施内容3]

## よかったこと
- [うまくいった点]
- [学んだこと]

## 改善点
- [次回気をつけること]
- [もっと良くできた点]

## 技術メモ
- [参考にしたドキュメント/記事]
- [新しく知った技術/手法]

## 次のアクション
- [ ] [フォローアップタスク]
```

### 4. 出力

テンプレートをそのまま表示。ユーザーが編集して保存できる形式。

## 使用例

```
/create-retrospective          # 直近のマージPR
/create-retrospective 123      # PR #123 or Issue #123
```
