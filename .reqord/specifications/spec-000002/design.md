# Requirement CRUD - 技術設計書

## 1. 設計概要

要件（Requirement）の作成・一覧・詳細表示・更新・削除の5つのCRUD操作をCLIコマンドとして提供する。各要件はYAML（メタデータ）とMarkdown（説明文）のハイブリッドストレージに保存され、6桁ゼロパディングの自動採番IDで管理される。すべての書き込み操作はZodスキーマによるバリデーションを経由する。

## 2. アーキテクチャ

```
Command Layer:  commands/req/create.ts
                commands/req/list.ts
                commands/req/show.ts
                commands/req/update.ts
                commands/req/delete.ts
                    ↓
Service Layer:  services/requirement-service.ts
                    ↓
Repository:     repositories/requirement.ts
                    ↓
File System:    repositories/file-system.ts
                    ↓
Storage:        .reqord/requirements/
                  ├── req-NNNNNN.yaml        (メタデータ)
                  └── req-NNNNNN/
                      └── description.md     (説明文)
```

各レイヤーの依存方向は上から下への一方向。Command層はCommander.jsを用いたCLIインターフェースに専念し、ビジネスロジックはService層に委譲する。

## 3. コンポーネント設計

### 3.1 コマンド群 (`commands/req/*.ts`)

**責務:** CLIオプション解析、ユーザー入出力、サービス呼び出し。

| コマンド | 引数・オプション | 出力 |
|---------|-----------------|------|
| `create <title>` | `-p, --priority`, `-f, --format` | 作成したID・メタデータ表示 |
| `list` | `-s, --status`, `-p, --priority`, `--json` | cli-table3によるテーブル表示 |
| `show <id>` | `--json` | メタデータ全フィールド + description.md表示 |
| `update <id>` | `-t, --title`, `-s, --status`, `-p, --priority`, `--patch-file`, `--description-file`, `--json` | 変更差分表示 |
| `delete <id>` | `-f, --force` | 確認プロンプト後削除 |

### 3.2 RequirementService (`services/requirement-service.ts`)

**責務:** CRUD操作のビジネスロジック。

- `createRequirement(cwd, options)`: ID自動採番、デフォルト値設定、テンプレートからdescription.md生成
- `listRequirements(cwd, options)`: 全件取得 + status/priorityフィルタリング
- `showRequirement(cwd, id)`: メタデータ + description.md読み込み
- `updateRequirement(cwd, id, options)`: マージ戦略（patch-file → 個別フラグ上書き）、Zod再検証、updatedAt自動更新
- `deleteRequirement(cwd, id)`: 存在確認後にYAML + ディレクトリ削除

### 3.3 RequirementRepository (`repositories/requirement.ts`)

**責務:** ファイルI/O。Zodバリデーション付きread、YAML/Markdown write。

- `save(cwd, requirement)`: req-NNNNNN.yamlへYAML書き込み
- `saveDescription(cwd, id, content)`: req-NNNNNN/description.mdへテキスト書き込み
- `findById(cwd, id)`: YAML読み込み + RequirementSchema.safeParse
- `findAll(cwd)`: `req-\d{6}\.yaml`パターンマッチで全件取得
- `loadDescription(cwd, id)`: description.mdテキスト読み込み
- `deleteById(cwd, id)`: YAMLファイル + 説明文ディレクトリの再帰削除

### 3.4 ID自動採番 (`utils/id-generator.ts`)

**責務:** 既存ファイル名をスキャンし、最大番号+1で次IDを生成。

- パターン: `req-NNNNNN`（6桁ゼロパディング）
- 既存ファイルがない場合は `req-000001` から開始

## 4. データフロー

### Create

```
ユーザー → reqord req create "タイトル" -p high
  → createCommand.action(title, options)
    → createRequirement(cwd, { title, priority, format })
      → generateNextId(cwd) → "req-000001"
      → Requirementオブジェクト構築（デフォルト値含む）
      → reqRepo.save(cwd, requirement) → req-000001.yaml書き込み
      → loadProjectTemplate() → テンプレート取得（or デフォルト）
      → reqRepo.saveDescription(cwd, id, description) → description.md書き込み
  → 成功メッセージ + メタデータ表示
```

### Update

```
ユーザー → reqord req update req-000001 --status approved --patch-file patch.json
  → updateCommand.action(id, options)
    → updateRequirement(cwd, id, { status, patchData })
      → reqRepo.findById(cwd, id) → before取得
      → マージ: existing ← patchData ← 個別フラグ
      → updatedAt更新、immutableフィールド保持（id, createdAt, files）
      → RequirementSchema.safeParse(merged) → バリデーション
      → reqRepo.save(cwd, after)
      → descriptionContent指定時: reqRepo.saveDescription()
  → 変更差分表示（before vs after）
```

## 5. テスト方針

### ユニットテスト

- **requirement-service**: 各CRUD関数の正常系・異常系テスト。リポジトリをモック化し、ビジネスロジック（マージ戦略、フィルタリング、存在確認）を検証
- **id-generator**: 既存ファイルなし→req-000001、既存ファイルあり→最大番号+1
- **repositories/requirement.ts**: Zodバリデーション失敗時のエラー、ファイル不在時のnull返却

### 統合テスト

- 一時ディレクトリで create → list → show → update → delete の一連フローを実行
- フィルタリング（--status, --priority）の動作検証
- --patch-file, --description-fileによるバルク更新の検証

## 6. 技術的決定事項

### YAML + Markdownハイブリッドストレージ

**決定:** メタデータはYAML、説明文はMarkdownとして分離保存
**理由:** メタデータの構造化検索・バリデーションにはYAMLが適切。説明文はMarkdownエディタやGitで自然に扱えるフォーマット。人間の編集容易性とプログラム的な構造化の両立。

### 更新時のマージ戦略

**決定:** `patch-file → 個別フラグ上書き`の優先順位。immutableフィールド（id, createdAt, files）は常に元の値を保持
**理由:** patch-fileはAIエージェントからの一括更新用途、個別フラグは人間の明示的指定。明示的指定が優先されるのが直感的。

### 削除時の確認プロンプト

**決定:** デフォルトで確認プロンプト表示、`--force`でスキップ可能
**理由:** 破壊的操作の安全性確保。AIエージェントからの利用時は`--force`で非対話的に実行可能。
