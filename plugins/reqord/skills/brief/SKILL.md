---
name: brief
description: spec/req/issueの包括的コンテキストを一括表示する。実装着手前の状況把握に使用。
argument-hint: <spec-id|req-id|issue-number>
allowed-tools: Read, Glob, Grep, Bash(reqord:req show *), Bash(reqord:spec show *), Bash(reqord:spec list *), Bash(reqord:feedback list *), Bash(gh:issue view *)
model: sonnet
---

## Scope

- **Do**: reqordデータ（spec, req, design.md, SC, feedback, dependencies）を読み集めて全体像を提示する
- **Don't**: 実装手段の推奨や実装の実行。判断と実装方法の選択はユーザーに委ねる

---

# コンテキスト一括表示

対象: $ARGUMENTS

---

## Step 0: 引数解析

$ARGUMENTSを解析して表示モードを振り分ける。

| $ARGUMENTS パターン | モード | 処理 |
|---------------------|--------|------|
| `spec-NNNNNN` | Spec詳細 | Step 1a を実行 |
| `req-NNNNNN` | Req概観 | Step 1b を実行 |
| `#N` または数値 | Issue連携 | Step 1c を実行 |
| 空 | エラー | 対象ID（spec-id, req-id, issue番号）の指定を求める |

---

## Step 1a: Spec詳細モード

以下を**並列で**読み込む:

### グループA（並列実行）

```bash
reqord spec show <spec-id> --json
```

- `.reqord/specifications/<spec-id>/design.md`（Readツール）
- specのrequirementIdから `reqord req show <req-id> --json`
- `.reqord/requirements/<req-id>/description.md`（Readツール）
- `.reqord/context/context.yaml`（Readツール）

### グループB（グループA完了後）

- 関連specのdesign.md状況（同じreq-idに紐づく他のspec）: `reqord spec list --requirement <req-id> --json`
- dependenciesのblockedByに指定されたreqの情報
- 未解決feedback: `reqord feedback list --state open --json` からlinkedToが対象spec/reqのもの

### 表示

```
## spec-NNNNNN: [specタイトル]

Status: [status] | Req: req-NNNNNN | Priority: [priority] | Complexity: [complexity]

### Success Criteria (req-NNNNNN: [reqタイトル])
1. [ ] [基準1]
2. [ ] [基準2]
3. [ ] [基準3]

### design.md
[design.mdの全文、またはテンプレートのみの場合は「テンプレートのみ（`/reqord:edit <spec-id>` で作成）」]

### 関連Spec
| Spec ID | Title | Status | design.md |
|---------|-------|--------|-----------|
| spec-NNNNNN | ... | implemented | 120行 |

### Dependencies
- blockedBy: [あれば表示、なければ「なし」]

### 未解決Feedback
[あれば表示、なければ「なし」]

### ProjectContext要約
- Tech Stack: [technical.yamlの主要項目]
- Structure: [structure.yamlの主要項目]

### Git操作ガイド
- Branch: `.reqord/settings/setting.yaml` の `branchNaming` 設定の prefix を使用する（例: `<prefix>/spec-NNNNNN-<sanitized-title>`）
- Commit: `feat(<scope>): <summary>` + `Implements spec-NNNNNN (req-NNNNNN: <title>)`
- 詳細: context/resources/git-conventions.md を参照
```

---

## Step 1b: Req概観モード

以下を**並列で**読み込む:

```bash
reqord req show <req-id> --json
reqord spec list --requirement <req-id> --json
reqord feedback list --state open --json
```

- `.reqord/requirements/<req-id>/description.md`（Readツール）

### 表示

```
## req-NNNNNN: [reqタイトル]

Status: [status] | Priority: [priority] | Complexity: [complexity]

### Description
[description.mdの内容]

### Success Criteria
1. [ ] [基準1]
2. [ ] [基準2]

### Specifications
| Spec ID | Title | Status | design.md |
|---------|-------|--------|-----------|
| spec-NNNNNN | ... | approved | 148行 |
| spec-NNNNNN | ... | draft | テンプレート |

### Dependencies
- blockedBy: [あれば表示]
- blocks: [あれば表示]

### 未解決Feedback
[あれば表示、なければ「なし」]
```

---

## Step 1c: Issue連携モード

```bash
gh issue view <issue-number> --json title,body,labels,state,assignees
reqord feedback list --state open --json
```

feedbackリストからissue番号に一致するエントリを検索。linkedToがあればそのspec/reqの情報も読み込む。

### 表示

```
## Issue #N: [issueタイトル]

State: [state] | Labels: [labels]

### Issue本文
[body]

### Reqordリンク
[feedbackエントリがあれば]
- Feedback: [type] / [severity]
- LinkedTo: spec-NNNNNN / req-NNNNNN
- [linkedToのspec/req情報を Step 1a/1b と同様に表示]

[feedbackエントリがなければ]
このissueはreqordにリンクされていません。
リンクするには: /reqord:feedback
```

---

## エラーハンドリング

### reqord CLIが見つからない場合

```
❌ reqord CLI が見つかりません。
インストール方法: npm install -g @reqord/cli
環境チェック: `/reqord:setup --check`
```

### 指定IDが存在しない場合

```
❌ <id> が見つかりません。
利用可能なIDを確認: /reqord:status
```
