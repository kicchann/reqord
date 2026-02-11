# ProjectContext CRUD

## 概要

プロジェクトコンテキスト（product, technical, structure）の読取・更新をCLIから行う機能。

## ユーザーストーリー

開発者として、プロジェクトのコンテキスト情報をCLIで管理したい。
なぜなら、プロジェクト情報を正確に維持し、外部ツールとの連携に活用できるから。

## コマンド仕様

### reqord context show

- context.yaml のサマリーを表示
- `--detail` で product/technical/structure の詳細表示
- `--json` で機械読み取り可能な出力

### reqord context update

- 対話形式またはオプション指定でコンテキスト更新
- `--product`, `--technical`, `--structure` で個別更新
- `updatedAt` 自動更新

## データ構造

- `context.yaml` - メタ情報（プロジェクト名、バージョン、更新日時）
- `product.yaml` - プロダクト情報（ビジョン、ターゲット、スコープ）
- `technical.yaml` - 技術情報（言語、フレームワーク、インフラ）
- `structure.yaml` - プロジェクト構造（ディレクトリ、パッケージ）

## 技術的制約

- スキーマバリデーション
- 部分更新対応（パッチ的な更新）
- ドメイン用語ファイル（domain/）は将来拡張
