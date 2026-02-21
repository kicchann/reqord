---
name: git
description: Specification参照付きのGit操作（ブランチ作成・コミット・PR）。spec-idベースの命名規則とトレーサビリティ情報をPRに含める。Spec-aware Git operations - create branches, commit, push, and create PRs with automatic traceability. Use when branching for a specification, committing implementation, or creating pull requests.
argument-hint: "<branch|commit> <spec-id> (branch: [type], commit: [message])"
---

> **ユーザー確認必須**: このスキルはGit操作（ブランチ作成・コミット・プッシュ・PR作成）を伴います。自律実行時は操作内容をユーザーに提示し、承認を得てから実行してください。

# reqord-git: Specification連携Git操作

spec-idを起点にブランチ作成・コミット・PR作成を行い、トレーサビリティを自動付与する。

---

## 引数解析

ユーザー入力: `$ARGUMENTS`

パターンマッチ:

- `branch <spec-id> [type]` → **branchサブコマンド**へ
- `commit <spec-id> [message]` → **commitサブコマンド**へ
- 上記以外 → エラー: `使い方: /reqord:git <branch|commit> <spec-id> [options]`

spec-idは `spec-NNNNNN` 形式であることを検証する。

---

## branchサブコマンド

### Step 1: Specification情報取得

```bash
reqord spec show <spec-id> --json
```

JSONからtitle, requirementId, statusを取得する。

### Step 2: Requirement情報取得

```bash
reqord req show <req-id> --json
```

JSONからtitle, successCriteriaを取得する。

### Step 3: Issue番号取得

GitHub CLIでreq-idまたはspec-idに関連するissueを検索:

```bash
gh issue list --search "<req-id> OR <spec-id>" --json number,title --limit 10
```

マッチするissue番号を収集する。

### Step 4: ブランチ名生成

命名規則:

- issue番号あり: `feature/spec-NNNNNN-issues-<N1>-<N2>-<sanitized-title>`
- issue番号なし: `feature/spec-NNNNNN-<sanitized-title>`

sanitized-title生成ルール:

1. specのtitleを使用
2. 小文字化
3. 英数字とハイフン以外を除去
4. 連続ハイフンを単一ハイフンに
5. 先頭・末尾のハイフンを除去
6. 50文字以内に切り詰め

type引数が指定された場合は `feature/` を `<type>/` に置換する（fix, refactor, docs等）。

### Step 5: 未コミット変更チェック

```bash
git status --porcelain
```

出力がある場合:

```
WARNING: 未コミットの変更があります。
ブランチ作成を続行しますか？（変更は新ブランチに引き継がれます）
```

AskUserQuestionで確認する。キャンセルされたら中止。

### Step 6: ブランチ作成

```bash
git checkout -b <branch-name>
```

### Step 7: サマリー表示

```
Branch created: <branch-name>

Specification: <spec-id> - <spec-title>
Requirement:   <req-id> - <req-title>
Status:        <spec-status>

Success Criteria:
  1. <criterion-1>
  2. <criterion-2>
  ...
```

---

## commitサブコマンド

### Step 1: Specification・Requirement情報取得

```bash
reqord spec show <spec-id> --json
reqord req show <req-id> --json
```

specからtitle, requirementIdを、reqからtitle, successCriteriaを取得する。

### Step 2: 現状確認

```bash
git status
git diff --stat
git log --oneline -5
```

変更がない場合はエラー: `コミットする変更がありません。`

### Step 3: 変更内容の分析

`git diff --stat` の結果からスコープとタイプを判定:

- **type**: 変更内容から推定
  - 新機能追加 → `feat`
  - バグ修正 → `fix`
  - リファクタリング → `refactor`
  - テスト → `test`
  - ドキュメント → `docs`
  - ビルド/設定 → `chore`

- **scope**: 変更対象パッケージから推定
  - `packages/shared/` → `shared`
  - `packages/cli/` → `cli`
  - `packages/web/` → `web`
  - `.reqord/` → `reqord`
  - `.claude/` → `claude`
  - 複数パッケージ → 主要な変更のパッケージ

### Step 4: コミットメッセージ生成

message引数が指定されている場合はそれを使用。なければ自動生成:

```
<type>(<scope>): <summary>

Implements <spec-id> (<req-id>: <req-title>)
```

summaryは変更内容を簡潔に記述（50文字以内、英語）。

### Step 5: ステージング確認

AskUserQuestionでステージ対象を確認:

```
以下のファイルが変更されています。ステージするファイルを選択してください:

Modified:
  - packages/cli/src/commands/show.ts
  - packages/shared/src/schemas/requirement.ts

Untracked:
  - packages/cli/src/commands/new-feature.ts

選択肢:
  1. すべてステージ
  2. ファイルを指定（カンマ区切り or パターン）
  3. キャンセル
```

ユーザーの選択に応じて `git add` を実行する。

### Step 6: バージョンバンプ確認

`.reqord/` 配下のreq/spec YAML・description.md・design.mdに変更がある場合、`reqord version` でバージョンバンプが必要かを確認する:

```bash
# .reqord/ 配下の変更を確認
git diff --name-only -- '.reqord/'

# 変更があるreq/specに対してバージョンバンプ
reqord version <id> --patch --summary "<変更概要>"
```

**重要**: `.reqord/` 配下のYAMLファイル（version, versionHistory, flags等）を直接編集してはならない。必ず `reqord version`, `reqord feedback resolve` 等のCLIコマンドを使用すること。

### Step 7: コミット・プッシュ

```bash
git add <files>
git commit -m "<commit-message>"
git push -u origin <current-branch>
```

プッシュ失敗時は `git push` のエラー内容を表示して対処を案内する。

### Step 8: PR作成

```bash
gh pr create --title "<type>(<scope>): <summary>" --body "<PR本文>"
```

**PR本文テンプレート**:

```markdown
## Specification

**<spec-id>**: <spec-title>

## Requirement

**<req-id>**: <req-title>

## Success Criteria

- [ ] <criterion-1>
- [ ] <criterion-2>
- [ ] <criterion-3>

## Changes

<git diff --statの要約>

---

Co-Authored-By: Claude <noreply@anthropic.com> (使用モデルに応じて更新)
```

PR作成後、URLを表示:

```
PR created: <PR-URL>

Specification: <spec-id> - <spec-title>
Requirement:   <req-id> - <req-title>
```

---

## エラーハンドリング

### spec-idが見つからない場合

```
Error: <spec-id> が見つかりません。
`reqord spec list` で有効なspec-idを確認してください。
```

### reqord CLIが利用不可の場合

直接ファイル読み取りにフォールバック:

1. `.reqord/specifications/<spec-id>.yaml` をReadツールで読み取り
2. `.reqord/requirements/<req-id>.yaml` をReadツールで読み取り
3. yqまたは手動パースでフィールドを抽出

### mainブランチでの操作警告

commitサブコマンド実行時、現在のブランチがmainまたはmasterの場合:

```
WARNING: mainブランチ上で作業しています。
先に `/reqord:git branch <spec-id>` でブランチを作成してください。
続行しますか？
```

AskUserQuestionで確認する。
