# 共有型定義 (@reqord/shared) - 技術設計書

## 1. 設計概要

モノレポ内のpackages/cli と packages/web が共有するZodスキーマ、TypeScript型、定数、バリデーションロジックを `@reqord/shared` パッケージとして提供する。Zodによるランタイムバリデーションと静的型推論の統合により、単一定義から型安全性と実行時検証の両方を実現する。

## 2. アーキテクチャ

```
@reqord/shared (packages/shared/)
  ├── src/
  │   ├── index.ts                      (re-export)
  │   ├── schemas/
  │   │   ├── index.ts                  (schemas re-export)
  │   │   ├── common.ts                 (共通型: Status, Priority, Complexity)
  │   │   ├── requirement.ts            (RequirementSchema)
  │   │   ├── project-context.ts        (ProjectContextSchema)
  │   │   ├── specification.ts          (SpecificationSchema)
  │   │   └── validation.ts             (ValidationResultSchema)
  │   ├── constants/
  │   │   ├── index.ts                  (constants re-export)
  │   │   └── paths.ts                  (ディレクトリパス定数)
  │   └── validation/
  │       ├── smart-scoring.ts          (SMARTスコア算出)
  │       └── ambiguous-phrases.ts      (曖昧表現リスト)
  └── dist/                            (tscビルド出力)

依存関係:
  packages/cli  ──workspace:*──→ @reqord/shared
  packages/web  ──workspace:*──→ @reqord/shared
```

### パッケージ間の依存方向

```
packages/cli   → @reqord/shared ← packages/web
     ↓                                ↓
 ファイルシステム              ファイルシステム（Server Actions経由）
```

cli と web は shared に依存するが、shared は他パッケージに依存しない。外部依存は zod のみ。

## 3. コンポーネント設計

### 3.1 共通スキーマ (`schemas/common.ts`)

**責務:** 複数スキーマから参照される基本型定義。

| スキーマ | 値 | 用途 |
|---------|-----|------|
| `StatusSchema` | `"draft" \| "approved" \| "approved" \| "deprecated"` | 要件・仕様の状態管理 |
| `PrioritySchema` | `"low" \| "medium" \| "high"` | 要件の優先度 |
| `ComplexitySchema` | `"small" \| "medium" \| "large" \| "xlarge"` | 実装複雑度 |
| `FormatTypeSchema` | `"user-story" \| "ears" \| "free-form"` | 要件記述形式 |
| `VersionHistoryEntrySchema` | `{ version, status, gitCommit, approvedAt, approvedBy }` | バージョン履歴エントリ |

### 3.2 RequirementSchema (`schemas/requirement.ts`)

**責務:** 要件データの完全なスキーマ定義。

- ID: `req-\d{6}`パターン（正規表現バリデーション）
- FormatSchema: discriminatedUnion（type フィールドでuser-story/ears/free-formを判別）
- DependenciesSchema: blockedBy/blocks/relatedToの3方向依存関係
- オプションフィールド: estimatedComplexity, estimatedHours

### 3.3 ProjectContextSchema (`schemas/project-context.ts`)

**責務:** プロジェクトコンテキストのスキーマ定義。

- filesフィールド: string | object のユニオン型で柔軟なファイル参照をサポート

### 3.4 SpecificationSchema (`schemas/specification.ts`)

**責務:** 仕様書データのスキーマ定義。

- requirementIdで要件との紐付け
- filesにdesignドキュメントパスを保持

### 3.5 ValidationResultSchema (`schemas/validation.ts`)

**責務:** バリデーション結果の構造化データ定義。

- `ValidationIssueSchema`: type, severity（error/warning/info）, field, message, suggestion
- `SmartScoreSchema`: SMART基準の各軸スコア（0-1）+ overall
- `ValidationMetadataSchema`: criteriaCount, hasDescription, hasDependencyIssues, validatedAt

### 3.6 パス定数 (`constants/paths.ts`)

**責務:** .reqord/配下のディレクトリ名を定数化。

- `REQORD_DIR`, `CONTEXT_DIR`, `REQUIREMENTS_DIR`, `SPECIFICATIONS_DIR`, `SETTINGS_DIR`, `TEMPLATES_DIR`, `RULES_DIR`, `ASSETS_DIR`, `DOMAIN_DIR`, `ISSUE_TEMPLATES_DIR`

### 3.7 SMARTスコアリング (`validation/smart-scoring.ts`)

**責務:** ルールベース（AI不要）でのSMART基準スコア算出。

- Specific: タイトル長 + description有無・長さ + format詳細充実度 + 曖昧表現の少なさ
- Measurable: 成功基準の数・具体性・数値基準の有無
- Achievable: 複雑度設定 + 見積もり時間設定 + 整合性
- Relevant: formatの充実度 + 依存関係の定義
- TimeBound: 見積もり時間 + 複雑度 + 時間制約表現

### 3.8 曖昧表現検出 (`validation/ambiguous-phrases.ts`)

**責務:** 日本語の曖昧表現リスト提供。

- 「適切に」「なるべく」「できるだけ」等の42表現
- `getAmbiguousPhrases(language)`: 言語コードに応じたリスト返却（現時点はjaのみ）

## 4. データフロー

```
CLI/Web → import { RequirementSchema, type Requirement } from "@reqord/shared"
  → Zodスキーマでランタイムバリデーション:
    RequirementSchema.safeParse(rawData) → { success, data, error }
  → 型推論: z.infer<typeof RequirementSchema> → Requirement型

CLI/Web → import { calculateSmartScore } from "@reqord/shared"
  → calculateSmartScore({ requirement, description, language })
  → SmartScore { specific, measurable, achievable, relevant, timeBound, overall }
```

## 5. テスト方針

### ユニットテスト

- **smart-scoring.ts**: 各SMART軸のスコア算出。空の要件→低スコア、充実した要件→高スコア
- **ambiguous-phrases.ts**: 曖昧表現カウント、言語切り替え
- **isComplexityHoursConsistent**: 複雑度と見積もり時間の整合性判定

### スキーマテスト

- RequirementSchema: 正常データのparse成功、不正ID/不正status等のparse失敗
- ProjectContextSchema: filesの各ユニオン型パターンのparse

## 6. 技術的決定事項

### Zodによるスキーマ定義

**決定:** TypeScript型定義ではなくZodスキーマを正とし、`z.infer`で型を導出
**理由:** JSONファイルの読み込み時にランタイムバリデーションが必須。Zodならスキーマ定義と型定義を一箇所に統合でき、型定義の乖離を防止できる。

### tsc composite: trueでのビルド

**決定:** TypeScript Project References（composite: true）を使用
**理由:** cli パッケージが shared を参照する際にインクリメンタルビルドが可能。ただし `--noEmit` と `composite` の競合を避けるため、型チェックには別途 `tsconfig.check.json` を使用。

### workspace:* プロトコル

**決定:** pnpm の `workspace:*` でモノレポ内パッケージ間依存を管理
**理由:** npm publish時に自動的にバージョン番号に変換される。開発時は常に最新のローカルビルドが使用される。

### 外部依存の最小化

**決定:** shared パッケージの外部依存は zod のみ
**理由:** cli や web から広く参照されるパッケージのため、依存ツリーを最小限に保つことが重要。バリデーションロジックはルールベースで実装し、AI SDKなどの重い依存は含めない。
