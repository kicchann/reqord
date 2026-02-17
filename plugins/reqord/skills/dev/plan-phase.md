# 計画生成フェーズ（plan-phase）

`/reqord:dev <spec-id> plan` で呼び出される計画生成の詳細手順。

---

## 前提確認

### design.md存在確認

`.reqord/specifications/<spec-id>/design.md` を読み取り、内容を確認する。

| 状態 | 判定基準 | アクション |
|------|----------|-----------|
| 記述済み | 実質的な設計内容がある（20行以上） | 計画生成へ進む |
| テンプレート | 「Specification Design Template」のみ / 10行以下 | `/reqord:design <spec-id>` でdesign.md作成を案内して終了 |
| 存在しない | ファイルがない | `/reqord:design <spec-id>` を案内して終了 |

テンプレートまたは存在しない場合のメッセージ:

```
design.mdが未記述です。先に設計書を作成してください:
  /reqord:design <spec-id>
```

---

## コンテキスト収集

SKILL.md の Step 1 と同じ手順でコンテキストを読み込む（並列実行）。

---

## reqord-architectエージェントへの委譲

### プロンプト構成

以下の情報をまとめてreqord-architect（code-architect）エージェントに渡す:

```
## 目的
spec-NNNNNN の実装計画（ブループリント）を作成してください。
コードの実装は行わず、計画のみを出力してください。

## Specification
[spec index.yaml の内容]

## Design Document
[design.md の全文]

## Requirement
[req yaml の内容]
[description.md の全文]

## ProjectContext
### Technical
[technical.yaml の要約]
### Structure
[structure.yaml の要約]

## 出力形式
以下のセクションを含む実装計画を作成してください:

### 1. 実装概要
- 目的と成果物の要約

### 2. コンポーネント一覧
- ファイルパス、責務、インターフェース定義
- 新規作成 / 既存変更 の区分

### 3. 依存関係
- コンポーネント間の依存グラフ
- 外部依存（新規パッケージ等）

### 4. TDD実装順序
- フェーズ分け（Phase 1, 2, ...）
- 各フェーズで作成するテストと実装のペア
- フェーズ間の依存関係

### 5. テスト戦略
- 各コンポーネントのテストスタイル（Output-based / State-based / Communication-based）
- モック対象の特定
- success criteriaとテストの対応表

### 6. リスク・注意事項
- 技術的リスク
- 既存コードへの影響範囲
- 破壊的変更の有無
```

---

## 計画の出力

### plan形式での表示

エージェントの出力をユーザーに提示する。修正のフィードバックがあれば反映する。

### ファイル保存

ユーザー承認後、計画を以下のパスに保存する:

```
plans/spec-NNNNNN-implementation.md
```

保存前に `plans/` ディレクトリの存在を確認し、なければ作成する。

### 保存ファイルのヘッダー

```markdown
# Implementation Plan: spec-NNNNNN - [specタイトル]

- Requirement: req-NNNNNN - [reqタイトル]
- Created: YYYY-MM-DD
- Status: planned

---

[エージェント出力の本文]
```

---

## 完了メッセージ

```
計画を保存しました: plans/spec-NNNNNN-implementation.md

次のステップ:
- フル開発実行: /reqord:dev spec-NNNNNN
- 設計書の修正: /reqord:design spec-NNNNNN
- ブランチ作成: /reqord:git branch spec-NNNNNN
```
