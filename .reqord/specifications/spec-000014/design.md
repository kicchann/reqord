# 設計検証・要件カバレッジ - 技術設計書

## 1. 設計概要

Specificationのdesign.mdがプロジェクトの設計原則（アーキテクチャパターン、命名規則、依存関係ルール）に準拠しているかをルールベースで自動検証する。また、Requirementの成功基準がSpecificationでカバーされているかを分析し、カバレッジ状況を可視化する。AIは使用せず、ProjectContextの技術情報と構造情報に基づく静的チェックを行う。

## 2. アーキテクチャ

```
Command Layer:  commands/spec/validate.ts   (新規)
                commands/spec/coverage.ts   (新規)
                    ↓
Service Layer:  services/spec-validation-service.ts (新規)
                services/coverage-service.ts        (新規)
                    ↓
Repository:     repositories/specification.ts  (既存)
                repositories/requirement.ts    (既存)
                repositories/project-context.ts (既存)
                    ↓
Shared:         @reqord/shared
                  schemas/specification.ts     (拡張: designValidation)
                  schemas/project-context.ts   (既存: files.technical, files.structure)
```

ProjectContextのtechnical.md（技術スタック・アーキテクチャパターン）とstructure.md（ディレクトリ構造・命名規則）を参照して検証ルールを構築する。検証結果はSpecification JSONのdesignValidationフィールドに永続化する。

## 3. コンポーネント設計

### 3.1 validateコマンド (`commands/spec/validate.ts` - 新規)

**責務:** 設計検証の実行と結果表示。

```
reqord spec validate <id> [--json] [--fix]
```

| オプション | 説明 |
|-----------|------|
| `<id>` | 検証対象のSpecification ID |
| `--json` | 構造化JSON出力 |
| `--fix` | 自動修正可能な問題を修正（将来拡張） |

**表示形式:**
```
設計検証: spec-000014

  [PASS] アーキテクチャパターン整合性
  [WARN] 命名規則: "ImpactService" → プロジェクト規則では接尾辞 "Service" を使用 ✓
  [FAIL] 依存方向: Service層からCommand層への参照が検出されました
         → design.md L42: "import { specCreateCommand } from ..."

検証結果: 1 error, 1 warning, 1 passed
```

### 3.2 coverageコマンド (`commands/spec/coverage.ts` - 新規)

**責務:** 要件カバレッジの分析と表示。

```
reqord spec coverage [<req-id>] [--json]
```

| オプション | 説明 |
|-----------|------|
| `[<req-id>]` | 特定要件のカバレッジ表示（省略時: 全要件） |
| `--json` | 構造化JSON出力 |

**表示形式:**
```
要件カバレッジ:

  ID           タイトル                   カバレッジ    Spec数
  req-000001   CLI初期化コマンド          covered       1
  req-000002   Requirement CRUD          covered       1
  req-000010   Zodバリデーション詳細表示   not-covered   0
  req-000011   Requirement承認フロー      partial       1 (draft)

サマリー: 5 covered, 2 partial, 3 not-covered (合計: 10)
```

### 3.3 SpecValidationService (`services/spec-validation-service.ts` - 新規)

**責務:** design.mdの静的検証ロジック。

```typescript
export interface DesignValidation {
  specId: string;
  rules: ValidationRuleResult[];
  passed: number;
  warnings: number;
  errors: number;
  validatedAt: string;
}

export interface ValidationRuleResult {
  ruleId: string;
  ruleName: string;
  severity: "error" | "warning" | "info";
  status: "pass" | "fail";
  message?: string;
  location?: { line: number; content: string };
}

export async function validateSpecDesign(
  cwd: string,
  specId: string,
): Promise<DesignValidation>;
```

**検証ルール一覧:**

| ルールID | 名称 | 検証内容 | 重要度 |
|---------|------|---------|--------|
| `arch-layer` | レイヤー整合性 | design.mdに記載されたレイヤー構成がtechnical.mdのパターンに準拠 | error |
| `arch-dependency` | 依存方向 | 上位レイヤーから下位レイヤーへの一方向依存 | error |
| `naming-convention` | 命名規則 | コンポーネント名がstructure.mdの命名パターンに準拠 | warning |
| `dep-conflict` | 依存関係矛盾 | 対象Specificationの要件が依存する他要件のSpecificationが存在すること | warning |
| `design-sections` | セクション構成 | 必須セクション（設計概要、アーキテクチャ、コンポーネント設計等）の存在チェック | warning |
| `test-strategy` | テスト方針記載 | テスト方針セクションにユニットテスト/統合テストの記載があること | info |

### 3.4 CoverageService (`services/coverage-service.ts` - 新規)

**責務:** 要件カバレッジの計算。

```typescript
export type CoverageStatus = "covered" | "partial" | "not-covered";

export interface RequirementCoverage {
  requirementId: string;
  title: string;
  status: CoverageStatus;
  specifications: Array<{
    id: string;
    status: Status;
  }>;
}

export interface CoverageReport {
  requirements: RequirementCoverage[];
  summary: {
    covered: number;
    partial: number;
    notCovered: number;
    total: number;
  };
  analyzedAt: string;
}

export async function analyzeRequirementCoverage(
  cwd: string,
  requirementId?: string,
): Promise<CoverageReport>;
```

**カバレッジ判定ロジック:**
- `covered`: approved状態のSpecificationが1件以上存在
- `partial`: draft/approved状態のSpecificationのみ存在
- `not-covered`: Specificationが0件

### 3.5 SpecificationSchema拡張

**追加フィールド:**

```typescript
designValidation: z.object({
  passed: z.number(),
  warnings: z.number(),
  errors: z.number(),
  rules: z.array(z.object({
    ruleId: z.string(),
    status: z.enum(["pass", "fail"]),
    severity: z.enum(["error", "warning", "info"]),
    message: z.string().optional(),
  })),
  validatedAt: z.string(),
}).optional(),
```

## 4. データフロー

### 設計検証フロー

```
ユーザー → reqord spec validate spec-000014
  → validateCommand.action("spec-000014")
    → specValidationService.validateSpecDesign(cwd, "spec-000014")
      → specRepo.findById(cwd, "spec-000014") → Specification取得
      → specRepo.loadFile(cwd, "spec-000014", "design.md") → 設計文書取得
      → contextRepo.load(cwd) → ProjectContext取得
        → technical.md → アーキテクチャパターン抽出
        → structure.md → 命名規則パターン抽出
      → 各検証ルールを順次実行:
        → archLayerRule(design, technicalPatterns)
        → archDependencyRule(design, technicalPatterns)
        → namingConventionRule(design, structurePatterns)
        → depConflictRule(spec, allSpecs, allReqs)
        → designSectionsRule(design)
        → testStrategyRule(design)
      → DesignValidation構築
    → specRepo.save(cwd, { ...spec, designValidation }) → 結果永続化
  → 検証結果テーブル表示
```

### カバレッジ分析フロー

```
ユーザー → reqord spec coverage
  → coverageCommand.action()
    → coverageService.analyzeRequirementCoverage(cwd)
      → reqRepo.findAll(cwd) → 全要件取得
      → specRepo.findAll(cwd) → 全仕様取得
      → 各要件に対して:
        → requirementIdでSpecificationをフィルタ
        → カバレッジステータス判定
      → CoverageReport構築
  → テーブル表示 + サマリー
```

## 5. テスト方針

### ユニットテスト

- **各検証ルール**: ルールごとにpass/failケースを検証
  - archLayerRule: 正しいレイヤー構成→pass、不正な依存→fail
  - namingConventionRule: 規則準拠→pass、規則違反→warning
  - designSectionsRule: 必須セクション全存在→pass、欠落→fail
- **カバレッジ計算**: covered/partial/not-coveredの判定ロジック
- **ProjectContext未設定時**: デフォルトルールでの検証（エラーにならないこと）

### 統合テスト

- Specification作成 → design.md記載 → validate の一連フロー
- 全要件に対するcoverage分析の実行
- designValidationフィールドが正しくJSON永続化されること
- `--json` 出力フォーマット検証

## 6. 技術的決定事項

### ルールベース検証（AIなし）

**決定:** 検証はルールベースの静的チェックのみ（AI/LLMは使用しない）
**理由:** 検証の再現性と決定論的な結果が重要。AIベースの検証は結果が不安定になり、CI/CDパイプラインでの利用に適さない。将来的にAI支援による高度な検証を追加する場合は別コマンドとして提供する。

### ProjectContextへの依存

**決定:** 検証ルールのパラメータはProjectContext（technical.md, structure.md）から動的に取得
**理由:** プロジェクトごとに異なるアーキテクチャパターンや命名規則に対応する必要がある。ハードコードではなく、ProjectContextから読み取ることで汎用性を確保。ProjectContext未設定時はデフォルトルール（セクション構成チェック等）のみ実行。

### カバレッジの3段階評価

**決定:** covered / partial / not-covered の3段階で評価
**理由:** approved状態のSpecificationがある（covered）と、draft段階のSpecificationしかない（partial）では品質保証レベルが異なる。この区別を明確にすることで、プロジェクト全体の仕様策定進捗を正確に把握できる。
