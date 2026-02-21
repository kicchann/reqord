# Specification CRUD - 技術設計書

## 1. 設計概要

要件（Requirement）に対応する仕様書（Specification）のCRUD操作をCLIコマンドとして提供する。各仕様はYAML（メタデータ）とMarkdown（設計文書）のハイブリッドストレージに保存され、Requirementとの1:N関係で管理される。本機能は既に実装済みであり、`commands/spec/{create,list,show,design}.ts`、`services/specification-service.ts`、`repositories/specification.ts` で構成される。この設計書は既存実装のアーキテクチャを文書化する。

> **v1.1変更点（Feedback #157, #220）:**
> - `title`フィールド追加: グラフ表示等でSpecificationを識別可能にする
> - `requirementVersion`フィールド追加: 紐づくRequirementのどのバージョンに準拠しているかを追跡する

## 2. アーキテクチャ

```
Command Layer:  commands/spec/create.ts   (実装済み)
                commands/spec/list.ts     (実装済み)
                commands/spec/show.ts     (実装済み)
                commands/spec/design.ts   (実装済み)
                    ↓
Service Layer:  services/specification-service.ts (実装済み)
                    ↓ 依存
                repositories/requirement.ts      (要件の存在確認)
                    ↓
Repository:     repositories/specification.ts    (実装済み)
                    ↓
File System:    repositories/file-system.ts      (実装済み)
                    ↓
Storage:        .reqord/specifications/
                  ├── spec-NNNNNN.yaml          (メタデータ)
                  └── spec-NNNNNN/
                      └── design.md             (設計文書)

Shared:         @reqord/shared
                  schemas/specification.ts       (SpecificationSchema)
                  constants/paths.ts             (SPECIFICATIONS_DIR)
```

Requirement CRUDと同様の3層構成。Command層はCommander.jsによるCLIインターフェースに専念し、ビジネスロジックはService層に委譲する。Specification作成時にはRequirementの存在確認を行い、トレーサビリティを確保する。

## 3. コンポーネント設計

### 3.1 コマンド群 (`commands/spec/*.ts` - 実装済み)

**責務:** CLIオプション解析、ユーザー入出力、サービス呼び出し。

| コマンド | 引数・オプション | 出力 |
|---------|-----------------|------|
| `create <req-id>` | Requirement ID（必須）, `--title <title>`（任意） | 作成したSpec ID・メタデータ・design.mdパス表示 |
| `list` | `-s, --status`, `-r, --requirement`, `--json` | cli-table3によるテーブル表示（Title列を含む） |
| `show <id>` | `--json` | メタデータ全フィールド + design.md内容表示 |
| `design <id>` | `--content-file <path>` | design.mdパス表示 or ファイル更新 |

### 3.2 SpecificationService (`services/specification-service.ts` - 実装済み)

**責務:** CRUD操作のビジネスロジック。

- `createSpecification(cwd, { requirementId, title? })`:
  - Requirementの存在確認（reqRepo.findById）
  - Requirementの現行バージョンを取得し`requirementVersion`に設定
  - ID自動採番（spec-NNNNNN形式）
  - title未指定時はRequirementのtitleをデフォルト値として使用
  - Specificationオブジェクト構築
  - ディレクトリ作成 + YAML保存
  - design.mdテンプレート配置（プロジェクトカスタム or デフォルト）

- `listSpecifications(cwd, { status?, requirementId? })`:
  - 全件取得 + status/requirementIdフィルタリング

- `showSpecification(cwd, id)`:
  - メタデータ + design.md読み込み

- `updateSpecDesign(cwd, id, { content? })`:
  - design.mdの内容更新
  - updatedAt自動更新
  - content未指定時はファイルパスのみ返却

### 3.3 SpecificationRepository (`repositories/specification.ts` - 実装済み)

**責務:** ファイルI/O。Zodバリデーション付きread、YAML/Markdown write。

- `ensureSpecDir(cwd, id)`: spec-NNNNNNディレクトリ作成
- `save(cwd, specification)`: spec-NNNNNN.yamlへYAML書き込み
- `saveFile(cwd, id, filename, content)`: 任意ファイルへテキスト書き込み
- `loadFile(cwd, id, filename)`: ファイルテキスト読み込み
- `findById(cwd, id)`: YAML読み込み + SpecificationSchema.safeParse
- `findAll(cwd)`: `spec-\d{6}\.yaml`パターンマッチで全件取得
- `deleteById(cwd, id)`: YAMLファイル + ディレクトリの再帰削除

### 3.4 SpecificationSchema (`@reqord/shared/schemas/specification.ts` - 実装済み)

```typescript
export const SpecificationSchema = z.object({
  id: z.string().regex(/^spec-\d{6}$/),
  title: z.string(),                                    // ← #157で追加
  requirementId: z.string().regex(/^req-\d{6}$/),
  requirementVersion: z.string(),                       // ← #220で追加
  version: z.string().default("1.0.0"),
  status: StatusSchema.default("draft"),
  createdAt: z.string(),
  updatedAt: z.string(),
  versionHistory: z.array(VersionHistoryEntrySchema).default([]),
  files: z.object({
    design: z.string(),
    supplementary: z.array(z.string()).default([]),
  }),
  flags: z.array(FeedbackFlagSchema).default([]),
});
```

**新フィールドの仕様:**

- `title`: 仕様のタイトル。create時に`--title`で指定可能。未指定時はRequirementのtitleをデフォルト値として使用。グラフ表示やlist出力での識別に利用。
- `requirementVersion`: 仕様が準拠するRequirementのバージョン（例: `"1.1"`）。create時にRequirementの現行versionを自動取得して設定。Requirementが更新された際に、Specificationが最新バージョンに準拠しているか判別できる。

### 3.5 ID自動採番 (`utils/spec-id-generator.ts` - 実装済み)

**責務:** 既存spec-NNNNNN.yamlファイル名をスキャンし、最大番号+1で次IDを生成。

- パターン: `spec-NNNNNN`（6桁ゼロパディング）
- 既存ファイルがない場合は `spec-000001` から開始

### 3.6 テンプレート管理 (`utils/templates.ts` - 既存)

- `loadProjectTemplate(cwd, "specification-design.md")`: プロジェクトカスタムテンプレート読み込み
- `DEFAULT_SPECIFICATION_DESIGN_TEMPLATE`: テンプレート未カスタマイズ時のデフォルト
- テンプレート変数: `{id}`, `{title}`, `{requirementId}`（二重波括弧で囲む）

## 4. データフロー

### Create

```
ユーザー → reqord spec create req-000013 --title "Specification CRUD設計"
  → specCreateCommand.action("req-000013", { title: "Specification CRUD設計" })
    → createSpecification(cwd, { requirementId: "req-000013", title: "Specification CRUD設計" })
      → reqRepo.findById(cwd, "req-000013") → Requirement存在確認 + version取得
      → title未指定の場合、Requirement.titleをデフォルト値として使用
      → generateNextSpecId(cwd) → "spec-000013"
      → Specificationオブジェクト構築（title, requirementVersion を含む）
      → specRepo.ensureSpecDir(cwd, "spec-000013")
      → specRepo.save(cwd, specification) → spec-000013.yaml書き込み
      → loadProjectTemplate(cwd, "specification-design.md") → テンプレート取得
      → テンプレート変数置換（{id}, {title}, {requirementId} を二重波括弧で展開）
      → specRepo.saveFile(cwd, "spec-000013", "design.md", content)
  → 成功メッセージ: "Created specification: spec-000013"
  → メタデータ表示 + design.mdパス
```

### Design更新

```
ユーザー → reqord spec design spec-000013 --content-file ./new-design.md
  → specDesignCommand.action("spec-000013", { contentFile: "./new-design.md" })
    → readFile("./new-design.md") → 新しいdesign.md内容
    → updateSpecDesign(cwd, "spec-000013", { content })
      → specRepo.findById(cwd, "spec-000013") → 存在確認
      → specRepo.saveFile(cwd, "spec-000013", "design.md", content)
      → specRepo.save(cwd, { ...spec, updatedAt: now })
  → 成功メッセージ: "Updated design for spec-000013"
```

## 5. テスト方針

### ユニットテスト（実装済み: specification-service.test.ts）

- **createSpecification**: Requirement存在確認、ID自動採番、テンプレート適用
- **createSpecification（title）**: title指定時はそのまま使用、未指定時はRequirement.titleがデフォルト
- **createSpecification（requirementVersion）**: Requirementの現行versionが自動設定されること
- **listSpecifications**: status/requirementIdフィルタリング、Title列の表示
- **showSpecification**: メタデータ（title, requirementVersion含む）+ design.md読み込み
- **updateSpecDesign**: content指定時のファイル更新、未指定時のスキップ
- **存在しないRequirement**: エラーが投げられること
- **存在しないSpecification**: show/designでエラーが投げられること

### 統合テスト

- 一時ディレクトリで create → list → show → design更新 の一連フロー
- 複数Specificationの同一Requirementへの関連付け
- --jsonオプションでの出力フォーマット検証

## 6. 技術的決定事項

### RequirementとSpecificationの1:N関係

**決定:** 1つのRequirementに対して複数のSpecificationを作成可能
**理由:** 1つの要件に対して複数の設計アプローチ（比較検討）や、段階的な詳細化が必要になるケースがある。requirementIdフィールドにより追跡可能性を確保。

### design.md単独のテンプレート構成

**決定:** Specification作成時にdesign.mdのみを生成（research.md等は将来拡張）
**理由:** 最小限の構成で早期にリリースし、フィードバックを得てから拡張する。supplementary配列により、将来的な追加ファイルへの対応は可能。

### テンプレートのカスタマイズ戦略

**決定:** `.reqord/settings/templates/specification-design.md` が存在すればそれを使用、なければハードコードされたデフォルトを使用
**理由:** Requirement CRUDと同一のテンプレート管理パターンを踏襲。プロジェクト固有のテンプレートをGitで管理可能にしつつ、初期セットアップの手間を削減。

### ファイル操作の汎用化

**決定:** specRepo.saveFile/loadFileは汎用的なファイル名を受け取る設計
**理由:** design.md以外のファイル（research.md, architecture.mmd等）を将来追加する際に、リポジトリ層の変更が不要。

### titleフィールドのデフォルト値（#157）

**決定:** `spec create`時に`--title`未指定の場合、紐づくRequirementのtitleをデフォルト値として使用
**理由:** 多くのケースでSpecificationのタイトルはRequirementと同じか類似する。手動入力の手間を省きつつ、`--title`で明示的に異なるタイトルも指定可能にする。

### requirementVersionの自動設定（#220）

**決定:** `spec create`時にRequirementの現行versionを自動取得して`requirementVersion`に設定。手動指定は不要。
**理由:** Specificationは常にcreate時点のRequirementバージョンに基づいて作成される。Requirementが後から更新された場合、`requirementVersion`と現行versionの差分からSpecificationの準拠性を判別できる。
