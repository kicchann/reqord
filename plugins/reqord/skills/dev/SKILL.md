---
name: dev
description: Specificationのdesign.mdに基づく機能開発。実装計画の生成からTDD実装・レビューまでを一貫して行う。planサブコマンドで計画のみも可能。Feature development from design.md through TDD implementation and code review. Use when implementing features, coding specifications, or running the full dev cycle.
argument-hint: <spec-id> [plan]
disable-model-invocation: true
---

# Specification機能開発コマンド

対象: $ARGUMENTS

design.mdに基づく機能開発を実行する。計画生成からTDD実装・レビューまでを一貫して行う。

---

## Step 0: 引数解析

$ARGUMENTSを解析してサブコマンドを振り分ける。

### パターン判定

| $ARGUMENTS         | モード   | 処理                                 |
| ------------------ | -------- | ------------------------------------ |
| `spec-NNNNNN`      | フル開発 | Step 1〜7を順に実行                  |
| `spec-NNNNNN plan` | 計画のみ | plan-phase.md に従い計画生成のみ実行 |
| 空                 | エラー   | spec-idの指定を求める                |

### バリデーション

1. spec-idの形式チェック（`spec-NNNNNN`）
2. `reqord spec show <spec-id> --json` で存在確認
3. specのstatusが `approved` であることを確認（`draft`なら承認を促す、`implemented`なら再実装の確認）

---

## Step 1: コンテキスト読み込み

contextスキルの「コンテキスト読み込み標準手順」に従い、以下を**並列で**読み込む。

### グループA（並列実行）

- **Specification**: `.reqord/specifications/<spec-id>/index.yaml` + `design.md`
- **Requirement**: specのrequirementIdから `.reqord/requirements/<req-id>.yaml` + `<req-id>/description.md`
- **ProjectContext**: `.reqord/context/context.yaml` → 参照先ファイル群

### グループB（グループA完了後）

- 関連specのdesign.md（同じreq-idに紐づく他のspec）
- dependenciesのblockedByに指定されたreqの情報

---

## Step 2: Success Criteria確認

requirementのsuccessCriteriaを一覧表示し、ユーザーと理解を合わせる。

### 表示形式

```
### req-NNNNNN: [タイトル]

Success Criteria:
1. [ ] [基準1の内容]
2. [ ] [基準2の内容]
3. [ ] [基準3の内容]

Spec Scope: spec-NNNNNN - [specタイトル]
Complexity: [estimatedComplexity]
Priority: [priority]
```

AskUserQuestionで確認:

- 「理解に相違はないか」
- 「スコープの追加/除外はあるか」
- 「技術的な制約や懸念はあるか」

---

## Step 3: 既存コード調査

`reqord-explorer`エージェント（code-explorerのreqord版）を起動し、関連コードを調査する。

### エージェントプロンプト

> "spec-NNNNNN「[specタイトル]」の実装に関連する既存コードを調査してください。
> design.mdの内容:
> [design.mdの全文または要約]
>
> 以下を報告してください:
>
> - 変更対象となるファイル一覧（パス + 現在の責務）
> - 関連するスキーマ・型定義
> - 使用されている実装パターン（コマンド登録、サービス層、リポジトリ層等）
> - テストの構成パターン（テストファイル配置、使用ライブラリ、モック手法）
> - 再利用可能な既存ユーティリティ"

---

## Step 4: 設計・実装計画

`reqord-architect`エージェント（code-architectのreqord版）にdesign.mdを入力し、具体的な実装ブループリントを生成する。

### エージェントプロンプト

> "以下のdesign.mdに基づき、実装ブループリントを作成してください。
>
> ## Specification
>
> [spec index.yaml + design.md]
>
> ## Requirement
>
> [req yaml + description.md]
>
> ## 既存コード調査結果
>
> [Step 3の結果]
>
> ## ProjectContext
>
> [technical.yaml + structure.yaml の要約]
>
> 以下を含めてください:
>
> - 実装コンポーネント一覧（ファイルパス、責務、インターフェース）
> - TDD実装順序（どのテストから書くか）
> - 各コンポーネントの依存関係
> - テスト戦略（Output-based / State-based / Communication-based の使い分け）"

### ユーザー承認

実装ブループリントを表示し、AskUserQuestionで承認を求める:

- 「承認して実装開始」
- 「修正してほしい点がある」（フィードバックを受けて再生成）
- 「計画をファイルに保存のみ」（plan-phase.mdに委譲）

承認後、計画を `plans/spec-NNNNNN-implementation.md` に保存する。

---

## Step 5: TDD実装

`reqord-implementer`エージェント（tdd-implementerのreqord版）に実装を委譲する。

詳細手順は implement-phase.md を参照。

### 実装の進め方

1. 実装ブループリントのBuild Sequenceに従い、フェーズごとに実装
2. 各フェーズでRed-Green-Refactorサイクルを実行
3. 全テストがパスすることを確認してから次のフェーズへ

### フェーズ完了ごとの確認

各フェーズ完了時にテスト実行結果を報告する。テスト・リント・型チェックのコマンドはProjectContextの`technical.yaml`に定義されたビルド・テスト設定に従う（例: `pnpm test`, `npm test` 等）。

---

## Step 6: コードレビュー

`reqord-reviewer`エージェント（code-reviewerのreqord版）でセルフレビューを実行する。

### レビュー観点

- design.mdとの整合性
- success criteriaの充足
- 既存パターンとの一貫性
- テスト品質（Four Pillars）
- セキュリティ・パフォーマンス

### 指摘対応

confidence >= 80 の指摘がある場合:

1. 指摘内容を表示
2. 修正を実施
3. テスト再実行で確認

---

## Step 7: 完了サマリー

### 7.1 実装結果

```
### 完了: spec-NNNNNN - [タイトル]

#### 変更ファイル
- [新規/変更] packages/shared/src/schemas/xxx.ts
- [新規/変更] packages/cli/src/commands/xxx.ts
- [新規] packages/cli/src/commands/__tests__/xxx.test.ts

#### テスト結果
- テスト: XX passed, 0 failed
- カバレッジ: XX%
- 型チェック: OK
- リント: OK

#### Success Criteria 充足状況
1. [x] [基準1] - テスト xxx.test.ts:L10 で検証
2. [x] [基準2] - テスト xxx.test.ts:L25 で検証
3. [ ] [基準3] - 未充足（理由: ...）
```

### 7.2 次のステップ案内

```
次のステップ:
- コミット・PR: /reqord:git commit spec-NNNNNN
- 検証: /reqord:verify done spec-NNNNNN
- CLAUDE.md更新: /update-claude-md
- カバレッジ確認: /show-coverage
```
