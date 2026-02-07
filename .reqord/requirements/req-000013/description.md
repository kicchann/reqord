# Specification CRUD

## 概要

Requirementに基づくSpecification（仕様）の作成・管理機能。設計書（design.md）をメインドキュメントとし、補助資料（research、architecture図、コード例等）はsupplementaryとして自由に追加できる。

## ユーザーストーリー

開発者として、要件に基づく仕様書をCLIで管理したい。
なぜなら、要件から設計への追跡可能性を確保できるから。

## CLIコマンド仕様

### reqord spec create \<req-id\>

- Requirementに紐づくSpecificationを生成
- `specifications/spec-NNN.json` + `specifications/spec-NNN/` ディレクトリ
- 初期ファイル:
  - `design.md` (テンプレートから生成)

### reqord spec list

- Specification一覧テーブル表示（ID, RequirementID, Status, Version）
- `--status`, `--requirement` でフィルタ可能
- `--json` で機械読み取り可能出力

### reqord spec show \<id\>

- JSON + design.md の内容を整形表示
- supplementaryファイル一覧表示

### reqord spec design \<id\>

- 設計書の閲覧・更新
- design.mdの編集（テンプレート付き）

## データ構造

仕様書のJSONフォーマットはdocs/main.mdの `Specification` 定義に準拠。主要フィールド:

- `requirementId`: 紐づくRequirement ID
- `files`: 外部ファイル参照（design + supplementary）
- `versionHistory`: 承認トラッキング（version, status, gitCommit, approvedAt, approvedBy）

## 技術的制約

- @reqord/shared にSpecification Zodスキーマを追加
- テンプレートは `settings/templates/specification-design.md` を使用
- Requirement→Specification の1:N関係をサポート
