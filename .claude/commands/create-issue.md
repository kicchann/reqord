---
description: ISSUE_TEMPLATEを確認してissueを作成する
argument-hint: <タイトル> [本文]
allowed-tools: Bash(gh:*), Bash(git rev-parse:*), Bash(git remote:*), Bash(ls:*), Read
model: haiku
---

# Issue 作成

現在のGitリポジトリのISSUE_TEMPLATEを確認し、テンプレートに従ってissueを作成します。

## 引数

- `$ARGUMENTS`:
  - 第1引数: issueタイトル（必須）
  - 第2引数以降: issue本文（オプション）

## 実行手順

### 0. リポジトリ情報を取得

```bash
# 現在のGitリポジトリのルートディレクトリを取得
REPO_ROOT=$(git rev-parse --show-toplevel)

# リポジトリ名を取得（プロキシ環境対応）
GH_REPO=$(git remote get-url origin | sed 's/\.git$//' | grep -oE '[^/]+/[^/]+$')

echo "Repository root: $REPO_ROOT"
echo "GitHub repo: $GH_REPO"
```

### 1. ISSUE_TEMPLATEの確認（必須）

**リポジトリルートを基準に**以下の場所をチェック:

```bash
# テンプレートディレクトリの確認
ls -la "$REPO_ROOT/.github/ISSUE_TEMPLATE/" 2>/dev/null || echo "ISSUE_TEMPLATE directory not found"

# 単一テンプレートファイルの確認
ls -la "$REPO_ROOT/.github/ISSUE_TEMPLATE.md" 2>/dev/null || echo "ISSUE_TEMPLATE.md not found"
```

**重要:** モノレポ環境では、プロジェクトルートではなく**現在のGitリポジトリのルート**を基準にする。
例: `apps/frontend/`で作業中なら `apps/frontend/.github/ISSUE_TEMPLATE/` を確認する。

### 2. テンプレートの適用

**テンプレートが存在する場合:**

1. テンプレートファイルを読み込む
2. テンプレートの構造（セクション、チェックリスト等）を維持
3. YAMLフロントマターがあれば、指定されたラベルを使用
4. ユーザーの入力内容をテンプレートに沿って整形

**テンプレートが存在しない場合:**

以下の基本フォーマットを使用:

```markdown
## 概要

[issueの説明]

## 詳細

[必要に応じて詳細を記載]
```

### 3. Issue作成

```bash
# ラベルがある場合
gh issue create -R "$GH_REPO" --title "タイトル" --body "本文" --label "ラベル1,ラベル2"

# ラベルがない場合
gh issue create -R "$GH_REPO" --title "タイトル" --body "本文"
```

### 4. 結果報告

- 作成したissueの番号とURL
- 使用したテンプレート（あれば）
- 適用したラベル（あれば）

## 使用例

```
/create-issue "ログイン機能の実装"
/create-issue "バグ修正: ボタンが押せない" "詳細な説明をここに記載"
```

## 注意事項

- ISSUE_TEMPLATEの確認は必須。スキップしないこと
- テンプレートで指定されたラベルは必ず適用する
- タイトルの形式がテンプレートで指定されている場合はそれに従う
- **モノレポ環境では必ず `git rev-parse --show-toplevel` でリポジトリルートを特定すること**
  - 各サブリポジトリ（例: `apps/frontend/`, `apps/backend/`）は独自のISSUE_TEMPLATEを持つ可能性がある
