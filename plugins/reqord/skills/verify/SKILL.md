---
name: verify
description: reqordデータの整合性・品質・実装充足を横断的に検証する。req/spec/contextのバリデーションからspec実装のSC充足チェック、トレーサビリティ可視化、完了処理までをカバーする。
argument-hint: "<validate|trace|done> <spec-id|req-id|context|all>"
allowed-tools: Read, Glob, Grep, Write, Bash(reqord:req *), Bash(reqord:spec *), Bash(reqord:feedback *), Bash(reqord:context show *), Bash(reqord:version *), Bash(gh:issue view *), Bash(gh:pr list *), Bash(gh:pr view *), Agent(Explore), AskUserQuestion
---

## Scope

- **Do**: req/spec/contextの整合性検証、specの実装充足チェック、トレーサビリティ可視化、完了処理
- **Don't**: 検証で見つかった問題の修正や改善提案。報告に徹し、修正はユーザーの判断に委ねる

---

> **ユーザー確認必須**: `done`サブコマンドはSpecificationステータスを変更します。自律実行時はステータス変更前にユーザーの承認を得てください。

# reqord-verify: データ検証・実装確認

reqordデータの整合性・品質を検証し、実装充足を確認し、トレーサビリティを可視化する。

---

## 引数解析

ユーザー入力: `$ARGUMENTS`

パターンマッチ:

- `validate <spec-id>` → **validate spec**（実装充足チェック）→ `resources/validate.md`
- `validate <req-id>` → **validate req**（SMART品質チェック）→ `resources/validate.md`
- `validate context` → **validate context**（参照整合性チェック）→ `resources/validate.md`
- `validate all` → **validate all**（全データ一括チェック）→ `resources/validate.md`
- `trace <req-id|spec-id>` → **trace**（トレーサビリティ可視化）→ `resources/trace.md`
- `done <spec-id>` → **done**（検証＋完了処理）→ `resources/done.md`
- 上記以外 → エラー: `使い方: /reqord:verify <validate|trace|done> <spec-id|req-id|context|all>`

IDは `spec-NNNNNN` または `req-NNNNNN` 形式（`/^(spec|req)-\d{6}$/`）であることを検証する。形式不正な入力はエラーで拒否。

**引数を解析したら、対応するresourcesファイルを読み込んで手順を実行すること。**

---

## リファレンス（resources/）

| ファイル | 内容 | 読むタイミング |
|---------|------|--------------|
| `resources/validate.md` | validate req/spec/context/all の手順 | validateサブコマンド実行時 |
| `resources/trace.md` | トレーサビリティ可視化の手順 | traceサブコマンド実行時 |
| `resources/done.md` | 検証＋完了処理＋Time to Learning＋振り返りの手順 | doneサブコマンド実行時 |
| `resources/validate-criteria.md` | Success Criteria判定ロジック・コンポーネント確認パターン | validate specのStep 4で判定基準を確認する時 |

---

## エラーハンドリング

### spec-id/req-idが見つからない場合

```
❌ <id> が見つかりません。
`reqord spec list` / `reqord req list` で有効なIDを確認してください。
```

### reqord CLIが利用不可の場合

```
❌ reqord CLIが見つかりません。
インストール方法: npm install -g @reqord/cli
環境確認は `/reqord:setup --check` で実行できます。
```

直接ファイル読み取りによるフォールバックは行わない。

### テスト実行失敗時

```
WARNING: テスト実行に失敗しました。テストカバレッジの確認をスキップします。
テストコマンドを手動で実行して問題を確認してください。
```

検証レポートのテストセクションには「確認不可」と表示する。
