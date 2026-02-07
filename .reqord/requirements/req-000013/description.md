# Specification CRUD

## 概要

Requirementに基づくSpecification（仕様）の作成・管理機能。調査（Research）と設計（Design）の2フェーズに分離し、段階的に仕様を具体化する。

## ユーザーストーリー

開発者として、要件に基づく仕様書をCLIで管理したい。
なぜなら、要件から設計への追跡可能性を確保できるから。

## CLIコマンド仕様

### reqord spec create \<req-id\>

- Requirementに紐づくSpecificationを生成
- `specifications/spec-NNN.json` + `specifications/spec-NNN/` ディレクトリ
- 初期ファイル:
  - `design.md` (テンプレートから生成)
  - `research.md` (オプション)
- `requirementCoverage` に対象Requirementを自動登録

### reqord spec list

- Specification一覧テーブル表示（ID, RequirementID, Status, Version）
- `--status`, `--requirement` でフィルタ可能
- `--json` で機械読み取り可能出力

### reqord spec show \<id\>

- JSON + design.md + research.md の内容を整形表示
- requirementCoverageのサマリー表示
- 技術的決定事項の一覧表示

### reqord spec research \<id\>

- 調査フェーズの開始・更新
- research.mdの編集（テンプレート付き）
- 調査結果のメタデータ更新

### reqord spec design \<id\>

- 設計フェーズの開始・更新
- design.mdの編集（テンプレート付き）
- コード例の追加（`examples/` ディレクトリ）
- architecture.mmdの生成・更新

## データ構造

仕様書のJSONフォーマットはdocs/main.mdの `Specification` 定義に準拠。主要フィールド:

- `requirementId`: 紐づくRequirement ID
- `files`: 外部ファイル参照（research, design, architecture, examples）
- `requirementCoverage`: 各要件のカバレッジ状態
- `technicalDecisions`: 技術的決定事項
- `implementation`: Issue管理情報

## 技術的制約

- @reqord/shared にSpecification Zodスキーマを追加
- テンプレートは `settings/templates/specification-*.md` を使用
- Requirement→Specification の1:N関係をサポート
