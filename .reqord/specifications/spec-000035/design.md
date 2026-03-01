# 設定スキーマ定義とロード基盤（setting.yaml） - 技術設計書

## 1. 設計概要

`.reqord/settings/setting.yaml` にプロジェクト固有のワークフロー設定を定義し、CLIコマンド群から参照するための基盤を構築する。Zodスキーマを `@reqord/shared` に定義し、設定ファイルのバリデーション・デフォルト値マージ・ロードAPIを提供する。

本specは他のsetting関連spec（spec-000036〜spec-000040）の前提となる基盤であり、設定の「読み込み・バリデーション・マージ」のみを担当する。各設定項目の「利用側への適用」は個別specで実装する。

## 2. setting.yaml リファレンス（全設定項目のデフォルト値）

```yaml
# .reqord/settings/setting.yaml

# 不変条件（変更不可・常に強制。falseを設定するとバリデーションエラー）
invariants:
  versioning: true              # バージョン履歴の記録
  cyclicDependencyCheck: true   # 巡回参照チェック
  statusTransitionRules: true   # ステータス遷移ルール（state machine）
  schemaValidation: true        # YAMLスキーマ検証

# 承認前チェック項目 (spec-000036)
approvalPrerequisites:
  designMdCheck: true           # spec approve時のdesign.md存在・内容チェック
  descriptionMdCheck: false     # req approve時のdescription.md内容チェック
  customFiles: []               # 承認時に必須とする追加ファイル

# ステータス遷移のPR要否 (spec-000037)
statusTransitionPr:
  draftToApproved: true         # approve時にPR作成
  approvedToImplemented: false  # implement時にPR作成
  toDraft: true                 # draft戻し時にPR作成

# ブランチ命名規則 (spec-000038)
branchNaming:
  toApprovedPrefix: "reqord"    # approve PRのブランチプレフィックス
  toImplementedPrefix: "reqord" # implement PRのブランチプレフィックス
  toDraftPrefix: "reqord"       # draft戻しPRのブランチプレフィックス

# フィードバックバリデーション (spec-000039)
feedbackValidation:
  blockOnUnresolved: false      # 未解決feedback時に承認をブロックするか
  severityThreshold: "critical" # ブロック対象の最低severity

# 自動draft戻し制御 (spec-000041)
autoRevert:
  onContentChange: "always"     # always | major-only | never

# 整合性チェック (spec-000040)
consistencyCheck:
  specNotImplementedLevel: "warning"  # warning | error
```

未指定の項目はデフォルト値でマージされるため、変更したい項目のみ記述すればよい。

## 3. アーキテクチャ

```
packages/shared/src/
  └── schemas/
      └── project-settings.ts          (新規: ProjectSettingsSchema定義)

packages/cli/src/
  ├── repositories/
  │   └── project-settings.ts          (新規: setting.yamlの読み込み・保存)
  └── services/
      └── project-settings-service.ts  (新規: 設定ロードAPI - デフォルトマージ)
```

### データフロー

```
CLIコマンド実行
  → loadProjectSettings(cwd)
    → .reqord/settings/setting.yaml 読み込み（存在しない場合は空オブジェクト）
    → ProjectSettingsSchema.parse() でバリデーション + デフォルト値マージ
    → ProjectSettings 型を返却
  → 各コマンドが必要な設定項目を参照
```

## 4. コンポーネント設計

### 4.1 ProjectSettingsSchema（@reqord/shared）

```typescript
// packages/shared/src/schemas/project-settings.ts

import { FeedbackSeveritySchema } from "./feedback.js";

export const ApprovalPrerequisitesSchema = z.object({
  designMdCheck: z.boolean().default(true),
  descriptionMdCheck: z.boolean().default(false),
  customFiles: z.array(z.string()).default([]),
});

export const StatusTransitionPrSchema = z.object({
  draftToApproved: z.boolean().default(true),
  approvedToImplemented: z.boolean().default(false),
  toDraft: z.boolean().default(true),
});

export const BranchNamingSchema = z.object({
  toApprovedPrefix: z.string().min(1).default("reqord"),
  toImplementedPrefix: z.string().min(1).default("reqord"),
  toDraftPrefix: z.string().min(1).default("reqord"),
});

export const FeedbackValidationSchema = z.object({
  blockOnUnresolved: z.boolean().default(false),
  severityThreshold: FeedbackSeveritySchema.default("critical"),
});

export const AutoRevertSchema = z.object({
  onContentChange: z.enum(["always", "major-only", "never"]).default("always"),
});

export const ConsistencyCheckSchema = z.object({
  specNotImplementedLevel: z.enum(["warning", "error"]).default("warning"),
});

export const InvariantsSchema = z.object({
  versioning: z.literal(true).default(true),
  cyclicDependencyCheck: z.literal(true).default(true),
  statusTransitionRules: z.literal(true).default(true),
  schemaValidation: z.literal(true).default(true),
});

export const ProjectSettingsSchema = z.object({
  invariants: InvariantsSchema.default({}),
  approvalPrerequisites: ApprovalPrerequisitesSchema.default({}),
  statusTransitionPr: StatusTransitionPrSchema.default({}),
  branchNaming: BranchNamingSchema.default({}),
  feedbackValidation: FeedbackValidationSchema.default({}),
  autoRevert: AutoRevertSchema.default({}),
  consistencyCheck: ConsistencyCheckSchema.default({}),
});

export type ProjectSettings = z.infer<typeof ProjectSettingsSchema>;
export type ApprovalPrerequisites = z.infer<typeof ApprovalPrerequisitesSchema>;
export type StatusTransitionPr = z.infer<typeof StatusTransitionPrSchema>;
export type BranchNaming = z.infer<typeof BranchNamingSchema>;
export type FeedbackValidation = z.infer<typeof FeedbackValidationSchema>;
export type AutoRevert = z.infer<typeof AutoRevertSchema>;
export type Invariants = z.infer<typeof InvariantsSchema>;
export type ConsistencyCheck = z.infer<typeof ConsistencyCheckSchema>;
```

### 4.2 project-settings リポジトリ（@reqord/cli）

```typescript
// packages/cli/src/repositories/project-settings.ts

export async function readProjectSettings(cwd: string): Promise<unknown> {
  // .reqord/settings/setting.yaml を読み込み
  // ファイルが存在しない場合は {} を返す
  // 不正なYAMLの場合はパースエラーを警告表示し {} を返す
}
```

### 4.3 project-settings-service（@reqord/cli）

```typescript
// packages/cli/src/services/project-settings-service.ts

export async function loadProjectSettings(cwd: string): Promise<ProjectSettings> {
  // 1. readProjectSettings(cwd) で生データ取得
  // 2. ProjectSettingsSchema.parse(raw) でバリデーション + デフォルトマージ
  //    - Zodの.default()により未定義フィールドはデフォルト値で補完される
  //    - 不明なキーはZodのデフォルト動作（strip）で無視
  // 3. パース失敗時は警告を出しデフォルト設定を返す
}

export function getDefaultProjectSettings(): ProjectSettings {
  return ProjectSettingsSchema.parse({});
}
```

## 5. テスト方針

### 単体テスト

- **ProjectSettingsSchema のバリデーション**
  - 空オブジェクト `{}` → 全フィールドがデフォルト値で補完される
  - 部分定義 → 未定義フィールドのみデフォルト値で補完
  - 全フィールド指定 → そのまま通過
  - 不明なキーが含まれる場合 → stripされて正常に通過
  - 不正な値（型不一致など）→ ZodError
  - invariantsに `false` を設定 → ZodError（`z.literal(true)` により拒否）
  - invariants未指定 → 全項目が `true` で補完

- **loadProjectSettings**
  - setting.yaml が存在しない場合 → デフォルト設定を返す
  - setting.yaml が空ファイルの場合 → デフォルト設定を返す
  - setting.yaml が不正なYAMLの場合 → 警告を出しデフォルト設定を返す
  - 正常なsetting.yaml → パース結果を返す
  - 部分定義のsetting.yaml → デフォルトとマージされた結果を返す

## 6. 実装順序

1. `ProjectSettingsSchema` を `@reqord/shared` に追加
2. `@reqord/shared` の index.ts からエクスポート
3. `project-settings` リポジトリを実装
4. `project-settings-service` を実装
5. 単体テスト作成・実行

## 7. 後方互換性

- setting.yaml が存在しない場合は全デフォルト値で動作するため、既存プロジェクトへの影響なし
- Zodの `strip` モードにより将来追加されるキーがあっても旧バージョンのCLIでエラーにならない
