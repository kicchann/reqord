# validateサブコマンド詳細

引数の種類に応じて検証対象を切り替える。

---

## validate req

Requirementの品質・整合性を検証する。

```bash
reqord req validate <req-id> --json
```

CLIが返すSMARTバリデーション結果を整形表示する:

```
## Requirement Validation: <req-id>

**Title**: <req-title>
**Status**: <req-status>

### SMART Validation

| 基準 | Status | 詳細 |
|------|--------|------|
| Specific | ✅ | |
| Measurable | ⚠ | success criteriaが曖昧 |
| Achievable | ✅ | |
| Relevant | ✅ | |
| Time-bound | ❌ | 期限未設定 |

### 依存関係整合性

| 参照先 | 存在 | Status |
|--------|------|--------|
| blockedBy: req-000003 | ✅ | implemented |
| relatedTo: req-000005 | ✅ | approved |

### Specification紐づき

| Spec ID | Title | Status |
|---------|-------|--------|
| spec-000001 | ... | approved |
| spec-000002 | ... | implemented |
```

---

## validate spec

Specificationの実装がsuccess criteriaを充足しているか検証する。

### Step 1: データ読み込み

#### グループA（並列実行）

```bash
reqord spec show <spec-id> --json
reqord spec validate <spec-id> --json
```

`.reqord/specifications/<spec-id>/design.md` をReadツールで読み取り。

#### グループB（グループA完了後）

グループAの `spec show` 結果から `requirementId` を取得し:

```bash
reqord req show <req-id> --json
```

取得するフィールド:

- spec: title, status, requirementId
- req: title, successCriteria

CLIが返すdesign.mdバリデーション結果を表示する。

加えて、design.mdから以下を取得:

- 期待されるコンポーネント（ファイルパス）
- インターフェース定義
- 実装方針

design.mdが未記述（テンプレートのまま）の場合:

`.reqord/settings/setting.yaml` の `approvalPrerequisites.designMdCheck` を確認する:

- **`true`（デフォルト）の場合**: 警告を表示する:
  ```
  WARNING: design.mdが未記述です。`/reqord:edit <spec-id>` で設計書を作成してください。
  ```
  検証は続行するが、コンポーネント確認はスキップする。

- **`false` の場合**: design.md未記述でも警告を出さない。コンポーネント確認もスキップする。

### Step 3: 実コード調査

**Exploreエージェント**（Agentツール subagent_type=Explore）を使って実装状況を調査する。

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
- ⚠ **一部実装**: コードは存在するがテスト不足、または部分実装
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
## Spec Validation Report: <spec-id>

**Specification**: <spec-title>
**Requirement**: <req-id> - <req-title>
**Status**: <spec-status>

### Design Validation

<reqord spec validate の結果>

### Success Criteria

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | <criterion-1> | ✅ | <file:line or test name> |
| 2 | <criterion-2> | ⚠ | <partial evidence> |
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
- **Overall: ⚠ Partially Implemented**
```

---

## validate context

ProjectContextの参照整合性を検証する。

```bash
reqord context show --json
```

以下を確認し、結果をレポート表示する:

| 確認項目 | 方法 |
|---------|------|
| `files.product` の参照先ファイル存在 | Globツール |
| `files.technical` の参照先ファイル存在 | Globツール |
| `files.structure` の参照先ファイル存在 | Globツール |
| `files.domain` の参照先ファイル存在 | Globツール |
| `technical.yaml` のテストコマンド実行可否 | Bashで `which` 確認 |

```
## Context Validation

| 参照 | ファイル | Status |
|------|---------|--------|
| product | .reqord/context/product.yaml | ✅ |
| technical | .reqord/context/technical.yaml | ✅ |
| structure | .reqord/context/structure.yaml | ⚠ 未作成 |
| domain | .reqord/context/domain/glossary.md | ✅ |
```

---

## validate all

全データの一括バリデーションを実行する。

```bash
reqord req list --json
reqord spec list --json
reqord context show --json
```

各req/specに対してCLIバリデーションを**並列で実行**し、contextの参照整合性も確認する:

```bash
# 各reqに対して（並列実行）
reqord req validate <req-id> --json

# 各specに対して（並列実行）
reqord spec validate <spec-id> --json
```

サマリーレポートを出力する:

```
## Full Validation Summary

### Requirements (N件)

| Req ID | Title | SMART Score | Issues |
|--------|-------|-------------|--------|
| req-000001 | ... | 4/5 | Time-bound未設定 |
| req-000002 | ... | 5/5 | - |

### Specifications (N件)

| Spec ID | Title | Design | Issues |
|---------|-------|--------|--------|
| spec-000001 | ... | ✅ passed | - |
| spec-000002 | ... | ⚠ 2 warnings | section-missing: testing |

### Context

<validate contextと同じ出力>

### Overall

- Requirements: N件中 M件に問題あり
- Specifications: N件中 M件に問題あり
- Context: <status>
```

注意: `validate all` ではSC充足チェック（実コード調査）は行わない。CLIバリデーション（SMART・design.mdルール準拠）のみ実行する。実装充足は `validate <spec-id>` で個別に確認すること。

---

## 次のステップ

### 全項目 ✅ の場合

```
完了処理を実行: /reqord:verify done <spec-id>
```

### ⚠ または ❌ がある場合

```
1. 仕様確認・修正:     /reqord:edit <spec-id|req-id>
2. 実装詳細の再確認:   /reqord:brief <spec-id>
3. 実装修正
4. 再検証:             /reqord:verify validate <spec-id>
```
