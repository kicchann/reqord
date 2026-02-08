# CLI初期化コマンド - 技術設計書

## 1. 設計概要

`reqord init` コマンドにより `.reqord/` ディレクトリ構造を作成し、要件管理の初期セットアップを行う。ディレクトリ作成、デフォルトテンプレート配置、初期ルールファイル配置を一括で実行する。

## 2. アーキテクチャ

```
Command Layer:  commands/init.ts
                    ↓
Service Layer:  services/init-service.ts
                    ↓
Repository:     repositories/file-system.ts
                    ↓
File System:    .reqord/ ディレクトリ構造
```

単一コマンドで完結する初期化処理のため、レイヤーはシンプルな3層構成。

## 3. コンポーネント設計

### 3.1 initコマンド (`commands/init.ts`)

**責務:** CLIエントリポイント。`process.cwd()` を取得し、サービス層に委譲。

### 3.2 initサービス (`services/init-service.ts`)

**責務:** 初期化ロジックの実行。以下を順次処理:

1. `.reqord/` の存在チェック（既存時はエラー）
2. ディレクトリ構造の作成:
   - `context/` + `context/domain/`
   - `requirements/`
   - `specifications/`
   - `settings/templates/` + `settings/rules/`
   - `assets/`
3. デフォルトテンプレートの配置:
   - `settings/templates/requirement-description.md`
   - `settings/templates/specification-design.md`
4. デフォルトルールの配置:
   - `settings/rules/requirement-quality.md`

### 3.3 ファイルシステムリポジトリ (`repositories/file-system.ts`)

**責務:** ファイルI/O抽象化。`mkdirp`, `writeText`, `writeJSON`, `exists` 等を提供。

## 4. データフロー

```
ユーザー → reqord init
  → initService.initProject(cwd)
    → fs.exists(.reqord/) → 既存ならエラー
    → fs.mkdirp() × 6ディレクトリ
    → fs.writeText() × テンプレートファイル
    → fs.writeText() × ルールファイル
  → 完了サマリー表示
```

## 5. テスト方針

### ユニットテスト
- `initProject` がディレクトリ・ファイルを正しく作成すること
- 既存 `.reqord/` がある場合にエラーを返すこと

### 統合テスト
- 一時ディレクトリで `reqord init` を実行し、全構造が作成されることを検証

## 6. 技術的決定事項

### テンプレートの埋め込み vs 外部ファイル
**決定:** `utils/templates.ts` にデフォルトテンプレートをハードコード
**理由:** npmパッケージ配布時にテンプレートファイルのパス解決が複雑になるため。カスタマイズは `.reqord/settings/templates/` で上書き可能。
