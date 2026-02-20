---
name: feedback
description: Feedback運用（作成・同期・分類・リンク・クローズ・フラグ解消）。GitHub Issueとしてフィードバックを作成、または既存フィードバックの取り込みワークフローを実行する。Manage feedback lifecycle - create, sync GitHub issues, classify, link to requirements/specifications, close, and resolve flags. Use when creating feedback, processing issues, triaging bugs, or linking feedback.
argument-hint: "[create | issue-number...] (省略時は未処理一覧から選択)"
---

> **ユーザー確認必須**: このスキルはGitHub Issue操作（クローズ・コメント）を伴います。自律実行時は操作内容をユーザーに提示し、承認を得てから実行してください。

# Feedback運用コマンド

対象: $ARGUMENTS

GitHub Issueとしてフィードバックを新規作成、または既存フィードバックの同期・分類・リンク・クローズを行う運用ワークフロー。
正しいリンク先（req vs spec）の判断ルールを組み込み、誤リンクを防止する。

---

## $ARGUMENTS が "create" の場合 → Step C へ

## $ARGUMENTS が "create" 以外の場合 → Step 1 へ

---

## Step C: フィードバック新規作成

会話の文脈からフィードバック内容を整理し、`reqord feedback create` で GitHub Issue を作成する。

### C.1 内容の整理

会話の文脈から以下を特定する:

- **タイトル**: フィードバックの要約（簡潔に）
- **説明**: 何が起きたか / 何に気づいたか
- **Type**: bug / improvement / requirement-gap / spec-mismatch / security
- **Severity**: critical / high / medium / low
- **関連 req/spec**: 分かっていれば（任意）

不明な項目がある場合は AskUserQuestion で確認する。

### C.2 作成実行

```bash
reqord feedback create \
  --title "<タイトル>" \
  --description "<説明>" \
  --type <type> \
  --severity <severity> \
  [--related-req <req-id>] \
  [--related-spec <spec-id>]
```

### C.3 結果報告

- 作成された Issue 番号と URL
- 適用された Type / Severity
- 次のアクション: 「`/reqord:feedback <issue-number>` でリンク・クローズ処理を続行できます」

**ここで終了。** 以降の Step 1〜8 は既存フィードバックの取り込みワークフロー。

---

## Step 1: 同期

GitHub Issueの最新状態をローカルに同期する:

```bash
reqord feedback sync
```

---

## Step 2: 対象フィードバックの特定

### $ARGUMENTSが空の場合

1. `reqord feedback list --state open --json` を実行して未処理一覧を取得
2. テーブル形式で表示:

```
| # | Issue | Type | Severity | LinkedTo | Status |
|---|-------|------|----------|----------|--------|
| 1 | #208 | bug | medium | spec-000011, spec-000015 | open |
| 2 | #209 | requirement-gap | medium | req-000011, req-000005 | open |
```

3. AskUserQuestionで対象を選択してもらう（複数選択可、「全件処理」オプションも提示）

### $ARGUMENTSが指定されている場合

- スペース区切りで複数issue番号を受け付ける
- 各issue番号の存在確認を行い、存在しないものはエラー表示してスキップ

---

## Step 3: 内容確認

対象フィードバックごとに `reqord feedback show <issue-number> --json` を**並列実行**し、内容を確認する。

表示内容:

- GitHub Issue のタイトル・本文
- 現在の type / severity / linkedTo / status

---

## Step 4: 分類・リンク判断

### 4.1 中核ルール: リンク先の判断基準

全 type は最終的に **spec か req のどちらかに帰結する**。
リンク先は type ではなく **「原因がどこにあるか」** で決める。

| 原因の所在                   | リンク先        | 使うオプション     |
| ---------------------------- | --------------- | ------------------ |
| spec の設計/実装に問題がある | spec            | `--spec <spec-id>` |
| req 自体に不足/不備がある    | req（既存）     | `--req <req-id>`   |
| 対応する req がまだない      | req（新規作成） | `--created-req`    |

### 4.2 Type 判定フローチャート

```
Issue内容を読む
  ├─「動かない」「エラーが出る」「期待と違う動作」
  │   → type: bug → 通常 --spec（実装の元となった spec）
  │
  ├─「要件の成功基準は正しいが、設計アプローチが不適切」
  │   → type: spec-mismatch → --spec（問題のある spec）
  │
  ├─「そもそも要件にない」「要件のスコープ外」
  │   → type: requirement-gap → --req（不足のある req）or --created-req
  │
  ├─「テスト不足」「UX改善」「パフォーマンス」「追加要望」
  │   → type: improvement → --req（既存）or --created-req（新規）
  │
  └─「認証・認可・データ保護に関する問題」
      → type: security → 原因次第で --spec or --req
```

### 4.3 Type 別の典型パターン

| Type            | 定義                                   | 典型的なリンク先                  | 判定基準                                   |
| --------------- | -------------------------------------- | --------------------------------- | ------------------------------------------ |
| bug             | 実装が壊れている                       | `--spec`（実装元の spec）         | 「動かない」「エラー」「期待と違う動作」   |
| spec-mismatch   | spec が req の成功基準を満たせない設計 | `--spec`（問題のある spec）       | 成功基準は正しいが設計アプローチが不適切   |
| requirement-gap | req 自体に不足がある                   | `--req`（不足のある req）         | 「要件にない」「スコープ外」               |
| improvement     | 既存機能の品質改善・追加要望           | `--req`（既存）or `--created-req` | 「テスト不足」「UX改善」「パフォーマンス」 |
| security        | セキュリティ上の問題                   | 原因次第で `--spec` or `--req`    | 認証・認可・データ保護の問題               |

**注意**: security は独立した type だが、リンク先の判断は bug/spec-mismatch/requirement-gap と同じロジックに従う。

### 4.4 判断の提示

対象フィードバックごとに、以下を提示する:

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

---

## Step 6: クローズ処理

### 6.1 クローズ判断

リンク完了後、各フィードバックのクローズ可否を判断する:

- **クローズ可能**: type/severity が設定済み、かつリンク先が設定済み
- **クローズ不可**: リンクが未完了、または追加対応が必要

### 6.2 Flag ライフサイクルの注意事項

**重要**: feedback close と flag 解消は独立した概念。

```
feedback close = フィードバックの取り込み完了（分類・リンク済み）
               ≠ flag 解消（req/spec の修正完了）

flag のライフサイクル:
  作成 → feedback link 時に req/spec へ自動付与
  解消 → req/spec の修正完了後に `reqord feedback resolve` で除去
```

flag 解消の手順は Step 8（Flag解消）を参照。

### 6.3 クローズ実行

```bash
reqord feedback close <issue-number>
```

---

## Step 7: 結果確認

### 7.1 処理結果サマリー

```
| Issue | Type | Severity | リンク先 | Status |
|-------|------|----------|----------|--------|
| #208 | bug | medium | spec-000011 | closed |
| #209 | requirement-gap | medium | req-000011 | closed |
```

### 7.2 残存確認

```bash
reqord feedback list --state open
```

未処理のフィードバックが残っている場合はリスト表示する。

### 7.3 Flag 残存の注意喚起

クローズしたフィードバックに関連する req/spec の flag を確認し、未解消の flag がある場合は報告する:

```
⚠ 以下の req/spec に feedback-review flag が残っています（修正完了後に解消が必要）:
- req-000011: feedback-review (from #209)
- spec-000011: feedback-review (from #208)

修正完了後: reqord feedback resolve <artifact-id> --issue <issue-number> でflagを解消
```

---

## Step 8: Flag解消（resolve）

フィードバックに起因するreq/specの修正が完了した後、feedback-review flagを解消する。

### 8.1 解消対象の特定

Step 7.3で報告されたflag残存リスト、またはユーザーが修正完了を報告したタイミングで実行する。

### 8.2 解消実行

```bash
reqord feedback resolve <artifact-id> --issue <issue-number>
```

このコマンドは以下を実行する:

1. 対象req/specからfeedback-review flagを除去
2. feedbackのlinkedTo.resolvedに対象artifact-idを記録

### 8.3 解消確認

```bash
reqord req show <req-id> --json    # flagsが空になっていること
reqord spec show <spec-id> --json  # flagsが空になっていること
```

### 8.4 全flag解消後のフロー

対象フィードバックの全リンク先でflagが解消されたら、次のアクションを案内する:

```
✅ #208 に関連する全flagが解消されました。

次のステップ:
- 実装検証: /reqord:verify validate <spec-id>
- 完了処理: /reqord:verify done <spec-id>
```

---

## 既知の改善点

現在の feedback CLI には以下の改善余地がある。必要に応じて GitHub Issue 化を提案する:

| #   | 改善点                                          | 影響度 | 備考                                     |
| --- | ----------------------------------------------- | ------ | ---------------------------------------- |
| 1   | `feedback close` 時に残存 flag の警告表示がない | medium | flag 放置しがち                          |
