# Gap Analysis (既存コード差分分析) - 技術設計書

## 1. 設計概要

新しい要件が既存コードベースとどの程度ギャップがあるかをAI（Anthropic SDK）で分析する。`reqord req gap-analysis <id>` コマンドにより、既存実装のカバレッジ（full/partial/none）、不足機能、既存コードとの矛盾をファイル名・行番号付きで出力する。分析結果はRequirement YAMLのgapAnalysisフィールドに記録し、`reqord validate gap <id>` で既存分析の再検証を行う。

## 2. アーキテクチャ

```
Command Layer:  commands/req/gap-analysis.ts   (新規)
                commands/validate/gap.ts        (新規)
                    ↓
Service Layer:  services/gap-analysis-service.ts (新規)
                    ↓
Repository:     repositories/requirement.ts     (既存)
                repositories/ai.ts              (spec-000016で追加)
                repositories/codebase.ts        (新規 - コードベース走査)
                    ↓
External:       Anthropic API (Claude)
                ファイルシステム (プロジェクトコード)
                    ↓
Storage:        .reqord/requirements/req-NNNNNN.yaml (gapAnalysisフィールド)
```

コードベースの走査を専用リポジトリ（codebase.ts）に隔離し、AI分析はspec-000016で導入するAIリポジトリを再利用する。分析対象のファイル収集とAI解析を分離することで、テスト性と拡張性を確保する。

## 3. コンポーネント設計

### 3.1 gap-analysisコマンド (`commands/req/gap-analysis.ts` - 新規)

**責務:** Gap Analysisの実行と結果表示。

```
reqord req gap-analysis <id> [options]
```

| オプション | 説明 |
|-----------|------|
| `<id>` | 分析対象の要件ID（req-NNNNNN） |
| `--json` | 構造化JSON出力 |
| `--path <dir>` | 走査対象ディレクトリ（デフォルト: cwd） |
| `--include <glob>` | 走査対象パターン（デフォルト: `**/*.ts`） |
| `--exclude <glob>` | 除外パターン（デフォルト: `node_modules,dist,.reqord`） |

**表示形式:**
```
Gap Analysis: req-000010 (Zodバリデーションエラー詳細表示)

既存実装カバレッジ: partial

既存実装:
  [FULL]    packages/shared/src/schemas/validation.ts
            → バリデーション結果スキーマが定義済み
  [PARTIAL] packages/cli/src/repositories/requirement.ts
            → safeParse使用だがエラーフォーマット未実装

不足機能:
  1. ZodError.issuesの日本語フォーマッタ
  2. フィールドパスのドット表記変換
  3. 全エラー同時表示ロジック

矛盾:
  [CONFLICT] packages/cli/src/services/requirement-service.ts:162
             → 現在: error.message（Zodデフォルト形式）
             → 要件: フィールドパス+期待値の日本語フォーマット
```

### 3.2 validate gapコマンド (`commands/validate/gap.ts` - 新規)

**責務:** 既存Gap Analysis結果の再検証。

```
reqord validate gap <id> [--json]
```

前回の分析結果が記録されている場合、現在のコードベースに対して再検証を行い、解消されたギャップ・新たに発生したギャップを特定する。

### 3.3 GapAnalysisService (`services/gap-analysis-service.ts` - 新規)

**責務:** Gap Analysis のオーケストレーション。

```typescript
export interface GapAnalysis {
  requirementId: string;
  coverage: "full" | "partial" | "none";
  existingImplementations: ExistingImplementation[];
  missingFeatures: MissingFeature[];
  conflicts: Conflict[];
  analyzedAt: string;
  codebaseSnapshot: {
    totalFiles: number;
    analyzedFiles: number;
    path: string;
  };
}

export interface ExistingImplementation {
  filePath: string;
  coverage: "full" | "partial";
  description: string;
  relevantLines?: { start: number; end: number };
}

export interface MissingFeature {
  description: string;
  priority: "high" | "medium" | "low";
  suggestedLocation?: string;  // 実装推奨ファイルパス
}

export interface Conflict {
  filePath: string;
  line: number;
  currentBehavior: string;
  requiredBehavior: string;
  severity: "breaking" | "incompatible" | "style";
}

export async function analyzeGap(
  cwd: string,
  requirementId: string,
  options?: GapAnalysisOptions,
): Promise<GapAnalysis>;

export async function revalidateGap(
  cwd: string,
  requirementId: string,
): Promise<GapRevalidationResult>;
```

### 3.4 CodebaseRepository (`repositories/codebase.ts` - 新規)

**責務:** プロジェクトコードベースの走査と要約。

```typescript
export interface CodebaseFile {
  path: string;
  content: string;
  lines: number;
}

export interface CodebaseSummary {
  files: CodebaseFile[];
  totalFiles: number;
  totalLines: number;
}

export interface ScanOptions {
  basePath: string;
  include?: string[];    // globパターン
  exclude?: string[];    // globパターン
  maxFileSize?: number;  // バイト（デフォルト: 50KB）
  maxFiles?: number;     // 最大ファイル数（デフォルト: 100）
}

export async function scanCodebase(options: ScanOptions): Promise<CodebaseSummary>;
export async function readFileWithLineNumbers(filePath: string): Promise<string>;
```

**走査戦略:**
1. globパターンでファイル一覧を取得
2. maxFileSize/maxFiles制限を適用
3. 各ファイルの内容を読み込み
4. ファイルサイズの大きなファイルは先頭部分のみ（トークン節約）

### 3.5 AI分析プロンプト設計

**System Prompt:**
```
あなたはソフトウェアエンジニアのアシスタントです。
与えられた要件とコードベースを分析し、以下を特定してください:
1. 要件に関連する既存実装（ファイルパス、カバレッジ）
2. 不足している機能
3. 既存コードと要件の間の矛盾（ファイル名、行番号を含む）

出力は指定されたJSONスキーマに従ってください。
```

**User Prompt構築:**
```
## 要件
ID: {id}
タイトル: {title}
成功基準:
{successCriteria}

説明:
{description}

## コードベース
{files}

## 分析してください
```

コードベースのファイル数が多い場合は、段階的な分析を行う:
1. **Phase 1（候補絞り込み）:** ファイルパスと先頭コメント/export一覧のみをAIに渡し、関連ファイルを特定
2. **Phase 2（詳細分析）:** Phase 1で特定されたファイルの全文をAIに渡し、詳細分析

### 3.6 RequirementSchema拡張

**追加フィールド:**

```typescript
gapAnalysis: z.object({
  coverage: z.enum(["full", "partial", "none"]),
  existingImplementations: z.array(z.object({
    filePath: z.string(),
    coverage: z.enum(["full", "partial"]),
    description: z.string(),
  })),
  missingFeatures: z.array(z.object({
    description: z.string(),
    priority: z.enum(["high", "medium", "low"]),
  })),
  conflicts: z.array(z.object({
    filePath: z.string(),
    line: z.number(),
    currentBehavior: z.string(),
    requiredBehavior: z.string(),
    severity: z.enum(["breaking", "incompatible", "style"]),
  })),
  analyzedAt: z.string(),
}).optional(),
```

### 3.7 再検証ロジック

```typescript
export interface GapRevalidationResult {
  requirementId: string;
  previousAnalysis: GapAnalysis;
  currentAnalysis: GapAnalysis;
  resolvedGaps: string[];       // 解消されたギャップ
  newGaps: string[];            // 新たに発生したギャップ
  unchangedGaps: string[];      // 未解消のギャップ
  coverageChange: {
    before: "full" | "partial" | "none";
    after: "full" | "partial" | "none";
  };
}
```

## 4. データフロー

### Gap Analysis実行フロー

```
ユーザー → reqord req gap-analysis req-000010
  → gapAnalysisCommand.action("req-000010")
    → gapAnalysisService.analyzeGap(cwd, "req-000010")
      → reqRepo.findById(cwd, "req-000010") → Requirement取得
      → reqRepo.loadDescription(cwd, "req-000010") → 説明文取得
      → codebaseRepo.scanCodebase({ basePath: cwd, include: ["**/*.ts"], ... })
        → ファイル一覧取得 → 制限適用 → ファイル内容読み込み
      → Phase 1: 候補絞り込み
        → aiRepo.completeWithSchema(summaryPrompt, CandidateSchema)
        → 関連ファイル5-10件を特定
      → Phase 2: 詳細分析
        → aiRepo.completeWithSchema(detailPrompt, GapAnalysisSchema)
        → GapAnalysis構築
      → reqRepo.save(cwd, { ...requirement, gapAnalysis })
    → GapAnalysis返却
  → 結果表示（テーブル / JSON）
```

### 再検証フロー

```
ユーザー → reqord validate gap req-000010
  → validateGapCommand.action("req-000010")
    → gapAnalysisService.revalidateGap(cwd, "req-000010")
      → reqRepo.findById(cwd, "req-000010") → 既存gapAnalysis取得
      → analyzeGap(cwd, "req-000010") → 最新分析実行
      → 前回結果との差分比較
        → resolvedGaps: 前回あったが今回なくなったギャップ
        → newGaps: 前回なかったが今回発生したギャップ
      → GapRevalidationResult返却
  → 差分表示:
    解消: 2件
    新規: 0件
    未解消: 1件
    カバレッジ: partial → partial
```

## 5. テスト方針

### ユニットテスト

- **gap-analysis-service**:
  - 正常系: full/partial/noneの各カバレッジ判定
  - Conflict検出: ファイルパス・行番号の正確性
  - MissingFeature: priority判定ロジック
  - 前回結果との差分比較（revalidateGap）
- **codebase repository**:
  - globパターンによるファイルフィルタリング
  - maxFileSize制限: 大きなファイルの切り詰め
  - maxFiles制限: ファイル数上限
  - 除外パターン（node_modules, dist等）の動作
- **AI分析プロンプト**:
  - プロンプト構築ロジック（要件情報 + コードベース情報の結合）
  - Phase 1/Phase 2の段階的分析フロー

### 統合テスト

- テスト用の小規模コードベースでの分析実行（AIモック使用）
- gapAnalysisフィールドのYAML永続化
- `--json` 出力フォーマット検証
- `--path`, `--include`, `--exclude` オプションの動作

### AIモックテスト

AIリポジトリをモック化し、事前定義されたレスポンスで分析ロジックを検証。Phase 1 → Phase 2の段階的呼び出しが正しく行われることを確認。

## 6. 技術的決定事項

### 段階的分析（Phase 1 + Phase 2）

**決定:** コードベースの走査を2段階に分けて実行
**理由:** 大規模プロジェクトでは全ファイルをAIに渡すとトークン制限に達する。Phase 1でファイル名ベースの絞り込みを行い、Phase 2で関連ファイルのみを詳細分析することで、精度とコストのバランスを取る。

### コードベースリポジトリの分離

**決定:** プロジェクトコードの走査を専用リポジトリ（codebase.ts）に隔離
**理由:** `.reqord/` 内のファイル管理（requirement.ts, specification.ts）とプロジェクト本体のコード走査は異なる責務。テスト時にコードベース走査をモック化でき、ファイルシステムアクセスのパフォーマンス最適化（キャッシュ等）も独立して行える。

### ファイルサイズ制限

**決定:** 走査対象ファイルにサイズ上限（50KB）を設定し、超過分は先頭部分のみ取得
**理由:** 大きなファイル（生成コード、バンドルファイル等）はAIトークンを大量に消費し、分析品質に寄与しない。先頭部分にexport/import宣言が含まれるため、ファイルの役割理解には十分。

### 再検証機能の提供

**決定:** `reqord validate gap` による既存分析の再検証をサポート
**理由:** Gap Analysisは実装の進行とともに結果が変化する。コード変更後に再検証することで、ギャップの解消状況を追跡可能にする。前回結果との差分表示により、進捗を可視化。

### AIレスポンスのZodスキーマ検証

**決定:** spec-000016と同様に、AIレスポンスをZodスキーマで検証
**理由:** AIの出力に対する型安全性を担保する。不正なレスポンス時はリトライまたは部分的な結果として返却し、ユーザーに分析の限界を明示する。
