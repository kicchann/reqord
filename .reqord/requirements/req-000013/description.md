# Specification CRUD

## 概要

Requirementに基づくSpecification（仕様）の作成・管理機能。設計書（design.md）をメインドキュメントとし、補助資料はsupplementary/として自由に追加できる。

> **v1.1.0変更点**: spec design/researchコマンドをファイル管理（表示・更新）に限定。AI駆動の設計書コンテンツ生成は `/reqord:design` コマンド（Claude Codeエコシステム）の責務。Feedback #17 参照。

## ユーザーストーリー

開発者として、要件に基づく仕様書をCLIで管理したい。
なぜなら、要件から設計への追跡可能性を確保できるから。

## CLIコマンド仕様

### reqord spec create \<req-id\>

- Requirementに紐づくSpecificationを生成
- `specifications/spec-NNN.yaml` + `specifications/spec-NNN/` ディレクトリ
- 初期ファイル:
  - `design.md` (テンプレートから生成)

### reqord spec list

- Specification一覧テーブル表示（ID, RequirementID, Status, Version）
- `--status`, `--requirement` でフィルタ可能
- `--json` で機械読み取り可能出力

### reqord spec show \<id\>

- YAML + design.md の内容を整形表示
- supplementaryファイル一覧表示

### reqord spec edit \<id\> --file \<filename\>

- 指定ファイル（design, research等）の表示・更新
- ファイル管理のみ（データの表示・ファイルパス解決・更新日時記録）
- コンテンツ生成はスコープ外（Claude Code `/reqord:design` が担当）

## データ構造

仕様書のYAMLフォーマット。主要フィールド:

- `title`: 仕様のタイトル（グラフ表示等での識別用） ← **#157で追加**
- `requirementId`: 紐づくRequirement ID
- `requirementVersion`: 紐づくRequirementのバージョン（準拠性の追跡用） ← **#220で追加**
- `files`: 外部ファイル参照（design + supplementary）
- `versionHistory`: 承認トラッキング（version, status, gitCommit, approvedAt, approvedBy）

> **注記（#432）**: issue管理情報（旧implementationフィールド）は `.reqord/issues/tasks.yaml` に分離された。Specificationはメタデータと設計文書の管理に専念する。

## 責務分離

| 責務                              | 担当                         |
| --------------------------------- | ---------------------------- |
| Specification YAML/ファイルのCRUD | reqord CLI（本要件）         |
| design.mdテンプレート生成         | reqord CLI（本要件）         |
| AI駆動の設計書コンテンツ生成      | Claude Code `/reqord:design` |
| AI駆動の調査レポート生成          | Claude Code エコシステム     |

## 技術的制約

- @reqord/shared にSpecification Zodスキーマを追加
- テンプレートは `settings/templates/specification-design.md` を使用
- Requirement→Specification の1:N関係をサポート
- reqord自体にはAI SDK依存を追加しない
