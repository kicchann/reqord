---
name: feedback
description: フィードバック運用（作成・同期・分類・リンク・クローズ・フラグ解消）。GitHub Issueの作成または既存フィードバックの取り込みワークフローを実行する。
argument-hint: "[create | issue-number...] (省略時は未処理一覧から選択)"
allowed-tools: Read, Glob, Bash(reqord:feedback *), Bash(reqord:task *), Bash(gh:issue *), AskUserQuestion
---

> **ユーザー確認必須**: このスキルはGitHub Issue操作（クローズ・コメント）を伴います。自律実行時は操作内容をユーザーに提示し、承認を得てから実行してください。

## Scope

- **Do**: フィードバックの作成・同期・分類・リンク・クローズ・フラグ解消を実行する
- **Don't**: リンク先req/specの内容修正や実装。修正は別途実施する

---

# Feedback運用コマンド

対象: $ARGUMENTS

---

## 引数解析

| $ARGUMENTS | モード | 処理 |
|------------|--------|------|
| `create` | 新規作成 | resources/create.md に従い GitHub Issue を作成 |
| issue番号（スペース区切りで複数可） | 取り込み | Step 1〜7 を実行 |
| 空 | 未処理一覧 | Step 1〜7 を実行（Step 2 で対象選択） |

---

## Step 1: 同期

```bash
reqord feedback sync
```

---

## Step 1.5: リポジトリ確認

GitHub操作前に対象リポジトリを確認する:

```bash
git remote -v
```

想定と異なるリポジトリの場合はユーザーに確認を取る。

---

## Step 2: 対象フィードバックの特定

### 入力バリデーション

issue番号は正の整数のみ受け付ける（`/^#?\d+$/`）。`#` 接頭辞は任意。形式不正な入力はエラー表示してスキップ。

### $ARGUMENTSが空の場合

1. `reqord feedback list --state open --json` で未処理一覧を取得
2. テーブル形式で表示:

```
| # | Issue | Type | Severity | LinkedTo | Status |
|---|-------|------|----------|----------|--------|
| 1 | #208 | bug | medium | spec-000011 | open |
| 2 | #209 | requirement-gap | medium | req-000011 | open |
```

3. AskUserQuestionで対象を選択してもらう（複数選択可、「全件処理」オプションも提示）

### $ARGUMENTSが指定されている場合

スペース区切りで複数issue番号を受け付ける。存在しないものはエラー表示してスキップ。

---

## Step 3: 内容確認

対象フィードバックごとに `reqord feedback show <issue-number> --json` を**並列実行**し、内容を確認する。

表示内容: GitHub Issue のタイトル・本文、現在の type / severity / linkedTo / status

---

## Step 4: 分類・リンク判断

resources/classify-and-link.md のルールに従い、各フィードバックの Type とリンク先を判定する。

対象フィードバックごとに提示:

```
### #208: [Issueタイトル]
- 推奨 Type: bug
- 推奨リンク先: --spec spec-000011
- 判断理由: [Issueの内容から読み取った根拠]
```

AskUserQuestionで各フィードバックの Type・リンク先を確認する。

---

## Step 5: リンク実行

ユーザー承認後、各フィードバックに対して `reqord feedback link` を実行する:

```bash
# spec にリンクする場合
reqord feedback link <issue-number> --type <type> --severity <severity> --spec <spec-id>

# 既存 req にリンクする場合
reqord feedback link <issue-number> --type <type> --severity <severity> --req <req-id>

# 新規 req を作成してリンクする場合
reqord feedback link <issue-number> --type <type> --severity <severity> --created-req
```

既にリンク済みのフィードバック（linkedTo に値がある）はスキップし、報告のみ行う。

**注意**: 1つのフィードバックが複数のreq/specに影響する場合は、影響を受けるすべてに対してリンクを実行する（複数回実行）。影響範囲の漏れを防ぐため、req/specの description やコードベースを確認すること。

---

## Step 6: クローズ処理

### クローズ判断

- **クローズ可能**: type/severity が設定済み、かつリンク先が設定済み
- **クローズ不可**: リンクが未完了、または追加対応が必要

### Flag ライフサイクルの注意事項

**重要**: feedback close と flag 解消は独立した概念。

```
feedback close = フィードバックの取り込み完了（分類・リンク済み）
               ≠ flag 解消（req/spec の修正完了）

flag のライフサイクル:
  作成 → feedback link 時に req/spec へ自動付与
  解消 → req/spec の修正完了後に `reqord feedback resolve` で除去
```

> `.reqord/settings/setting.yaml` の `feedbackValidation` 設定により、flag 残存時の動作が決まる:
> - `blockOnUnresolved: true` の場合、`severityThreshold` 以上の severity の flag が残存していると `/reqord:verify done` がブロックされる
> - `blockOnUnresolved: false`（デフォルト）の場合、flag 残存は警告のみで完了処理を妨げない

### クローズ実行

```bash
reqord feedback close <issue-number>
```

---

## Step 7: 結果確認・修正フロー案内

### 処理結果サマリー

```
| Issue | Type | Severity | リンク先 | Status |
|-------|------|----------|----------|--------|
| #208 | bug | medium | spec-000011 | closed |
| #209 | requirement-gap | medium | req-000011 | closed |
```

### 残存確認

```bash
reqord feedback list --state open
```

### Flag 残存の注意喚起

クローズしたフィードバックに関連する req/spec の flag を確認し、未解消の flag がある場合は報告:

```
以下の req/spec に feedback-review flag が残っています（修正完了後に解消が必要）:
- req-000011: feedback-review (from #209)
- spec-000011: feedback-review (from #208)

修正方法:
- 要件の修正: `/reqord:edit <req-id>`
- 仕様の修正: `/reqord:edit <spec-id>`

修正完了後のflag解消は resources/resolve.md の手順、または以下を実行:
  reqord feedback resolve <artifact-id> --issue <issue-number>
```

### 修正フロー案内

flag付与後の修正→再検証フロー:

```
1. 修正内容確認・設計更新: /reqord:edit <spec-id|req-id>
2. 実装コンテキスト確認:   /reqord:brief <spec-id>
3. 修正実装
4. flag解消:              reqord feedback resolve <artifact-id> --issue <issue-number>
5. 再検証:                /reqord:verify done <spec-id>
```

---

## リファレンス（resources/）

| ファイル | 内容 | 読むタイミング |
|---------|------|--------------|
| `resources/create.md` | フィードバック新規作成手順 | `create` サブコマンド実行時 |
| `resources/classify-and-link.md` | Type判定・リンク先決定ルール | Step 4 の分類判断時 |
| `resources/resolve.md` | Flag解消手順 | 修正完了後のflag除去時 |

---

## エラーハンドリング

### reqord CLIが見つからない場合

```
❌ reqord CLI が見つかりません。
インストール方法: npm install -g @reqord/cli
環境チェック: `/reqord:setup --check`
```

### gh CLIが未認証の場合

```
⚠ gh CLI が未認証です。GitHub Issue操作にはgh auth loginが必要です。
```

