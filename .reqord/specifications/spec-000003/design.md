# ProjectContext CRUD - 技術設計書

## 1. 設計概要

プロジェクトコンテキスト（プロダクト情報、技術スタック、プロジェクト構造、ドメイン知識）の初期化・表示・更新を提供する。コンテキストは複数のYAMLファイルに分散保存され、`context.yaml`がルートメタデータ、`product.yaml`/`technical.yaml`/`structure.yaml`が個別の詳細情報、`domain/`ディレクトリがドメイン知識ファイルを格納する。

## 2. アーキテクチャ

```
Command Layer:  commands/context/init.ts
                commands/context/show.ts
                commands/context/update.ts
                    ↓
Service Layer:  services/context-service.ts
                    ↓
Repository:     repositories/project-context.ts
                    ↓
File System:    repositories/file-system.ts
                    ↓
Storage:        .reqord/context/
                  ├── context.yaml       (ルートメタデータ)
                  ├── product.yaml       (プロダクト情報)
                  ├── technical.yaml     (技術スタック)
                  ├── structure.yaml     (プロジェクト構造)
                  └── domain/            (ドメイン知識)
```

RequirementのCRUDと同じCommand → Service → Repository → FileSystemパターンに従う。

## 3. コンポーネント設計

### 3.1 コマンド群 (`commands/context/*.ts`)

| コマンド | 引数・オプション | 出力 |
|---------|-----------------|------|
| `context init <name>` | `-l, --language <lang>` (デフォルト: ja) | メタデータ表示 + 生成ファイル一覧 |
| `context show` | `--json`, `--detail` | サマリー表示 / JSON出力 / ファイル内容表示 |
| `context update` | `-n, --name`, `-v, --version`, `--product <path>`, `--technical <path>`, `--structure <path>`, `--json` | 変更差分表示 |

### 3.2 ContextService (`services/context-service.ts`)

**責務:** コンテキスト管理のビジネスロジック。

- `initContext(cwd, options)`: 既存チェック → context.yaml生成 → テンプレートファイル（product/technical/structure）配置 → domain/ディレクトリ作成
- `showContext(cwd)`: context.yaml読み込み + 各ファイルの存在確認 + domain/配下のファイル一覧取得 + 各ファイルの内容読み込み
- `updateContext(cwd, options)`: context.yamlのメタデータ更新 + 各サブファイルのパッチ適用（シャローマージ）

**ヘルパー:**
- `resolveFilePath(fileRef)`: files構造のファイル参照（文字列/オブジェクト）をパスに解決

### 3.3 ProjectContextRepository (`repositories/project-context.ts`)

**責務:** コンテキスト関連ファイルのI/O。

- `load(cwd)`: context.yaml読み込み + ProjectContextSchema.safeParse
- `save(cwd, context)`: context.yaml書き込み
- `contextExists(cwd)`: context.yamlの存在確認
- `loadContextFile(cwd, fileType)`: product/technical/structureの個別読み込み
- `saveContextFile(cwd, fileType, data)`: 個別ファイル書き込み

### 3.4 ProjectContextSchema (`@reqord/shared`)

```typescript
{
  id: string,
  name: string,
  version: string,       // デフォルト "0.1.0"
  language: string,      // デフォルト "ja"
  createdAt?: string,
  updatedAt?: string,
  files: {
    product: string | { path: string, format: string },
    technical: string | { structured: string, narrative?: string },
    structure: string | { structured: string, narrative?: string },
    domain: string[],
  }
}
```

## 4. データフロー

### Init

```
ユーザー → reqord context init "MyProject"
  → contextInitCommand.action(name, options)
    → initContext(cwd, { id, name, language })
      → contextRepo.contextExists(cwd) → false確認
      → ProjectContextオブジェクト構築
      → contextRepo.save(cwd, context)
      → テンプレートファイル生成:
        - product.yaml: { name, vision, goals, targetUsers }
        - technical.yaml: { stack, constraints, decisions }
        - structure.yaml: { modules, layers }
      → domain/ディレクトリ作成
  → メタデータ + 生成ファイル一覧表示
```

### Update（パッチファイル使用）

```
ユーザー → reqord context update --technical tech-patch.json
  → contextUpdateCommand.action(options)
    → loadPatchFile("tech-patch.json") → JSONオブジェクト
    → updateContext(cwd, { technicalPatch })
      → contextRepo.load(cwd) → before
      → context.yamlのupdatedAt更新 → contextRepo.save()
      → contextRepo.loadContextFile(cwd, "technical") → existing
      → シャローマージ: { ...existing, ...patch }
      → contextRepo.saveContextFile(cwd, "technical", merged)
  → 変更サマリー表示
```

## 5. テスト方針

### ユニットテスト

- **context-service**: init/show/updateの各関数。リポジトリモック化。既存context.yamlがある場合のinit拒否、ファイル不在時のshow動作
- **project-context repository**: Zodバリデーション、ファイル読み書き
- **resolveFilePath**: 文字列/オブジェクト形式両方のファイル参照解決

### 統合テスト

- 一時ディレクトリで init → show → update の一連フローを実行
- --detail オプションでファイル内容が正しく表示されることを検証
- パッチファイルによる更新がシャローマージされることを検証

## 6. 技術的決定事項

### ファイル分散構造

**決定:** context.yaml + product.yaml + technical.yaml + structure.yaml + domain/ に分離
**理由:** 一つのファイルにすべてを格納すると巨大化し、部分更新が困難になる。各領域を独立ファイルにすることで、AIエージェントやユーザーが特定領域のみを更新できる。

### filesフィールドの柔軟な参照形式

**決定:** `string | { path, format }` や `{ structured, narrative? }` のユニオン型
**理由:** 初期は単純なパス文字列で開始し、将来的にnarrativeドキュメント（自然言語による説明）やフォーマット指定を追加可能にする拡張性の確保。

### パッチファイルによる更新

**決定:** JSON patchファイルをシャローマージで適用
**理由:** AIエージェントが技術スタック情報などを一括で設定・更新する際に、個別CLIオプションでは表現しきれない複雑な構造を扱える。
