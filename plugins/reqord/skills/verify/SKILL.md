---
name: verify
description: Specificationの実装検証・トレーサビリティ確認・完了処理。紐づくRequirementのsuccess criteriaに対する充足確認からステータス更新までをカバーする。Validate implementation against success criteria, trace requirement-to-code links, and mark specifications as complete. Use when verifying features, checking traceability, or completing implementation.
argument-hint: "<validate|trace|done> <id> (validate/done: spec-id, trace: spec-id|req-id)"
disable-model-invocation: true
---

# reqord-verify: 実装検証・トレーサビリティ確認

Specificationの実装完了度を検証し、トレーサビリティチェーンを可視化し、完了処理を行う。

---

## 引数解析

ユーザー入力: `$ARGUMENTS`

パターンマッチ:

- `validate <spec-id>` → **validateサブコマンド**へ
- `trace <req-id|spec-id>` → **traceサブコマンド**へ
- `done <spec-id>` → **doneサブコマンド**へ
- 上記以外 → エラー: `使い方: /reqord:verify <validate|trace|done> <spec-id|req-id>`

IDは `spec-NNNNNN` または `req-NNNNNN` 形式であることを検証する。

---

## validateサブコマンド

Specificationの実装が、紐づくRequirementのsuccess criteriaを充足しているか検証する。

### Step 1: Specification・Requirement読み込み

```bash
reqord spec show <spec-id> --json
```

requirementIdを取得し:

```bash
reqord req show <req-id> --json
```

取得するフィールド:

- spec: title, status, requirementId
- req: title, successCriteria

### Step 2: design.md読み込み

`.reqord/specifications/<spec-id>/design.md` をReadツールで読み取る。

取得する情報:

- 期待されるコンポーネント（ファイルパス）
- インターフェース定義
- 実装方針

design.mdが未記述（テンプレートのまま）の場合:

```
WARNING: design.mdが未記述です。`/reqord:design <spec-id>` で設計書を作成してください。
```

検証は続行するが、コンポーネント確認はスキップする。

### Step 3: 実コード調査

`reqord-explorer`エージェント（Taskツール subagent_type=Explore）を使って実装状況を調査する。

調査指示:

```
以下のspecificationの実装状況を調査してください:
- spec-id: <spec-id>
- title: <spec-title>
- 紐づくrequirementのsuccess criteria: <各基準をリスト>
- 期待コンポーネント: <design.mdのファイルパス>

各success criterionについて:
1. 関連するコードを検索（Grep/Glob）
2. 実装の有無と完成度を判定
3. 対応するテストの存在を確認
```

### Step 4: Success Criteria判定

各success criterionを以下の基準で判定する。
（判定ロジックの詳細は `validate-criteria.md` を参照）

判定結果:

- ✅ **実装済み**: コードが存在し、テストがあり、passing
- ⚠️ **一部実装**: コードは存在するがテスト不足、または部分実装
- ❌ **未実装**: 関連コードが見つからない

### Step 5: コンポーネント存在確認

design.mdから抽出したファイルパスに対して、GlobツールとGrepツールでファイル存在・インターフェース・クラスの存在を確認する。

### Step 6: テストカバレッジ確認

ProjectContextの`technical.yaml`に定義されたテストコマンドを実行する。

テスト結果から:

- 対象ファイルに対応するテストファイルが存在するか
- テストがpassingか

### Step 7: 検証レポート出力

```
## Validation Report: <spec-id>

**Specification**: <spec-title>
**Requirement**: <req-id> - <req-title>
**Status**: <spec-status>

### Success Criteria

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | <criterion-1> | ✅ | <file:line or test name> |
| 2 | <criterion-2> | ⚠️ | <partial evidence> |
| 3 | <criterion-3> | ❌ | - |

### Components

| Expected Path | Exists | Notes |
|---------------|--------|-------|
| packages/cli/src/commands/xxx.ts | ✅ | |
| packages/shared/src/schemas/yyy.ts | ❌ | Missing |

### Test Coverage

| Test File | Status |
|-----------|--------|
| packages/cli/src/__tests__/xxx.test.ts | ✅ passing |

### Summary

- Success Criteria: 2/3 implemented
- Components: 1/2 exist
- Tests: passing
- **Overall: ⚠️ Partially Implemented**
```

---

## traceサブコマンド

req-idまたはspec-idを起点にトレーサビリティチェーンを可視化する。

### Step 1: 起点特定

引数が `req-NNNNNN` の場合 → req-idとして扱う
引数が `spec-NNNNNN` の場合 → spec-idとして扱い、requirementIdからreq-idも取得

```bash
reqord req show <req-id> --json
```

### Step 2: 関連Specification一覧取得

```bash
reqord spec list --requirement <req-id> --json
```

各specのid, title, statusを取得する。

### Step 3: 依存関係取得

```bash
reqord impact analyze <id> --json
```

blockedBy, blocks, relatedToを取得する。

### Step 4: コード内参照検索

各spec-id, req-idについて、Grepツールで検索する:

- パターン: `spec-NNNNNN` / `req-NNNNNN`
- 対象: `*.ts`, `*.md` ファイル
- 出力モード: `files_with_matches`

コード内で参照しているファイルを収集する。

### Step 5: Git履歴・PR検索

```bash
git log --oneline --grep "spec-NNNNNN"
git log --oneline --grep "req-NNNNNN"
gh pr list --search "spec-NNNNNN" --json number,title,state --limit 10
gh pr list --search "req-NNNNNN" --json number,title,state --limit 10
```

関連するコミットとPRを収集する。

### Step 6: フィードバック検索

```bash
reqord feedback list --json
```

JSONからlinkedToフィールドでreq-id/spec-idに関連するフィードバックをフィルタする。

### Step 7: トレーサビリティマップ表示

```
## Traceability Map

req-NNNNNN: <req-title> (<req-status>)
├── spec-NNNNNN: <spec-title> (implemented)
│   ├── commits: abc1234, def5678
│   ├── PRs: #42 (merged), #45 (open)
│   └── code: packages/cli/src/commands/xxx.ts
│              packages/shared/src/schemas/yyy.ts
├── spec-NNNNNN: <spec-title> (approved)
│   └── (未実装)
├── spec-NNNNNN: <spec-title> (draft)
│   └── (未実装)
├── dependencies:
│   ├── blockedBy: req-NNNNNN
│   └── blocks: req-NNNNNN
└── feedback:
    ├── #208: <title> (bug, closed)
    └── #215: <title> (improvement, open)
```

---

## doneサブコマンド

validateを実行し、全項目が合格であればステータスを更新する。

### Step 1: validate実行

上記validateサブコマンドと同じ検証を実行する。

### Step 2: Flag残存チェック

specまたは紐づくreqにfeedback-review flagが残存していないか確認する:

```bash
reqord spec show <spec-id> --json
reqord req show <req-id> --json
```

flagが残存している場合は警告を表示する（ブロックはしない）:

```
⚠ 以下のfeedback-review flagが残存しています:
- spec-NNNNNN: feedback-review (from #208) - severity: medium
- req-NNNNNN: feedback-review (from #209) - severity: low

flagが残存したまま完了処理を続行します。
flag解消は `reqord feedback resolve <artifact-id> --issue <issue-number>` で実行してください。
```

### Step 3: 結果判定

**全項目 ✅ の場合**:

```bash
reqord spec implement <spec-id>
```

```
✅ <spec-id> を「implemented」に更新しました。
```

**⚠️ または ❌ がある場合**:

```
以下の項目が未達です:

⚠️ <criterion-2>: <理由>
❌ <criterion-3>: <理由>

修正が必要です。`/reqord:dev <spec-id>` で追加実装してください。
```

ステータス更新は行わない。

### Step 4: Requirement完了確認（全項目 ✅ の場合のみ）

紐づくrequirementの全specのステータスを確認:

```bash
reqord spec list --requirement <req-id> --json
```

全specが `implemented` の場合、AskUserQuestionで確認:

```
<req-id> に紐づく全specが実装済みです。
requirementも「implemented」に更新しますか？

Specifications:
  - spec-NNNNNN: <title> (implemented)
  - spec-NNNNNN: <title> (implemented)
```

承認された場合:

```bash
reqord req implement <req-id>
```

```
✅ <req-id> を「implemented」に更新しました。
```

---

## エラーハンドリング

### spec-id/req-idが見つからない場合

```
Error: <id> が見つかりません。
`reqord spec list` / `reqord req list` で有効なIDを確認してください。
```

### reqord CLIが利用不可の場合

直接ファイル読み取りにフォールバック:

1. `.reqord/specifications/<spec-id>/index.yaml` をReadツールで読み取り
2. `.reqord/requirements/<req-id>.yaml` をReadツールで読み取り
3. yqまたは手動パースでフィールドを抽出

### テスト実行失敗時

```
WARNING: テスト実行に失敗しました。テストカバレッジの確認をスキップします。
テストコマンドを手動で実行して問題を確認してください。
```

検証レポートのテストセクションには「確認不可」と表示する。
