# GitHub Issue生成 - 技術設計書

## 1. 設計概要

SpecificationからGitHub Issueを自動生成する機能を提供する。Anthropic SDK（Claude API）を使用してSpecificationのdesign.mdを解析し、実装タスクに分解する。分解戦略（by-layer, by-feature, by-requirement, custom）を選択可能にし、並列グループ（P0/P1/P2）とクリティカルパスを自動計算する。GitHub Issue Templateの適用、ラベル自動付与、`--dry-run`によるプレビューをサポートする。本specでは分解とIssue作成（書き込み操作）を扱い、Issue同期・追跡（spec-000024）は対象外とする。

## 2. アーキテクチャ

```
Command Layer:  commands/issue/create.ts      (新規)
                    ↓
Service Layer:  services/issue-service.ts      (新規)
                services/decomposition-service.ts (新規 - AI分解)
                    ↓
Repository:     repositories/specification.ts  (既存)
                repositories/requirement.ts    (既存)
                repositories/github.ts         (spec-000011で追加)
                repositories/ai.ts             (新規 - Anthropic SDK)
                    ↓
External:       Anthropic API (Claude)
                gh CLI (Issue作成)
                    ↓
Storage:        .reqord/specifications/spec-NNNNNN.json (implementationフィールド)
                .reqord/issue-templates/                (テンプレート)
                GitHub Issues
```

AI分解ロジックはdecomposition-serviceに隔離し、issue-serviceはGitHub Issue作成の調整役として機能する。AI APIへのアクセスはリポジトリ層（ai.ts）に抽象化し、テスト時のモック化を容易にする。

## 3. コンポーネント設計

### 3.1 createコマンド (`commands/issue/create.ts` - 新規)

**責務:** Issue生成の実行と結果表示。

```
reqord issue create <spec-id> [options]
```

| オプション | 説明 |
|-----------|------|
| `<spec-id>` | 対象のSpecification ID |
| `--strategy <type>` | 分解戦略: by-layer, by-feature, by-requirement, custom（デフォルト: by-layer） |
| `--dry-run` | Issue作成をせず分解結果のみ表示 |
| `--json` | 構造化JSON出力 |
| `--max-issues <n>` | 生成Issue最大数（デフォルト: 20） |
| `--no-ai` | AI分解を使用せず、手動分解テンプレートを表示 |

### 3.2 DecompositionService (`services/decomposition-service.ts` - 新規)

**責務:** SpecificationのAI分解ロジック。

```typescript
export type DecompositionStrategy = "by-layer" | "by-feature" | "by-requirement" | "custom";

export interface DecomposedTask {
  title: string;
  description: string;
  priority: "P0" | "P1" | "P2";
  estimatedHours: number;
  dependencies: string[];  // 他タスクへの参照（タイトルベース）
  labels: string[];
  layer?: string;           // by-layer時: "command", "service", "repository", "shared"
  feature?: string;         // by-feature時: 機能グループ名
}

export interface DecompositionResult {
  specId: string;
  strategy: DecompositionStrategy;
  tasks: DecomposedTask[];
  parallelGroups: ParallelGroup[];
  criticalPath: string[];
  totalEstimatedHours: number;
}

export interface ParallelGroup {
  priority: "P0" | "P1" | "P2";
  tasks: DecomposedTask[];
  description: string;
}

export async function decomposeSpecification(
  cwd: string,
  specId: string,
  strategy: DecompositionStrategy,
  options?: { maxTasks?: number },
): Promise<DecompositionResult>;
```

### 3.3 分解戦略

**by-layer（デフォルト）:**
アーキテクチャレイヤーごとにタスクを分解。
```
P0: Shared（スキーマ定義、型定義）
P1: Repository（データアクセス層）
P1: Service（ビジネスロジック）
P2: Command（CLIインターフェース）
P2: Test（テストコード）
```

**by-feature:**
機能単位でタスクを分解。各機能内にレイヤーを包含。
```
P0: コア機能A（Schema + Service + Command）
P1: 補助機能B（Schema + Service + Command）
P2: オプション機能C
```

**by-requirement:**
成功基準ごとにタスクを分解。各基準を実現するための実装タスクを生成。

**custom:**
AIに自由に分解させる（プロンプトでガイダンスのみ提供）。

### 3.4 AIRepository (`repositories/ai.ts` - 新規)

**責務:** Anthropic SDKのラッパー。

```typescript
import Anthropic from "@anthropic-ai/sdk";

export interface AICompletionOptions {
  model?: string;         // デフォルト: "claude-sonnet-4-20250514"
  maxTokens?: number;
  systemPrompt?: string;
}

export async function complete(
  userPrompt: string,
  options?: AICompletionOptions,
): Promise<string>;

export async function completeWithSchema<T>(
  userPrompt: string,
  schema: z.ZodSchema<T>,
  options?: AICompletionOptions,
): Promise<T>;
```

APIキーは環境変数 `ANTHROPIC_API_KEY` から取得。未設定時はAppError(MISSING_API_KEY)をスロー。

### 3.5 IssueService (`services/issue-service.ts` - 新規)

**責務:** 分解結果からGitHub Issueを作成。

```typescript
export interface CreateIssuesOptions {
  specId: string;
  strategy: DecompositionStrategy;
  dryRun?: boolean;
  maxIssues?: number;
}

export interface CreateIssuesResult {
  specId: string;
  issues: CreatedIssue[];
  parallelGroups: ParallelGroup[];
  criticalPath: string[];
}

export interface CreatedIssue {
  title: string;
  number?: number;      // dry-run時はundefined
  url?: string;         // dry-run時はundefined
  priority: string;
  labels: string[];
}

export async function createIssuesFromSpec(
  cwd: string,
  options: CreateIssuesOptions,
): Promise<CreateIssuesResult>;
```

### 3.6 GitHub Issue Template適用

Issue作成時に `.reqord/issue-templates/reqord-implementation.yml` または `.github/ISSUE_TEMPLATE/reqord-implementation.yml` のテンプレートを適用する。

**テンプレート構造:**
```yaml
name: reqord実装タスク
description: reqordから自動生成された実装タスク
labels: ["reqord-generated"]
body:
  - type: markdown
    attributes:
      value: "## タスク概要"
  - type: textarea
    id: description
    attributes:
      label: 説明
  - type: input
    id: spec-id
    attributes:
      label: Specification ID
  - type: input
    id: priority
    attributes:
      label: 優先度
```

### 3.7 ラベル自動付与

各Issueに以下のラベルを自動付与:
- `reqord-generated`: reqordから生成されたIssue
- `spec:<spec-id>`: 対象Specification（例: `spec:spec-000016`）
- `req:<req-id>`: 関連Requirement（例: `req:req-000016`）
- `P<n>`: 優先度（例: `P0`, `P1`, `P2`）

### 3.8 SpecificationSchema拡張

**追加フィールド:**

```typescript
implementation: z.object({
  issues: z.array(z.object({
    number: z.number(),
    title: z.string(),
    url: z.string(),
    priority: z.string(),
    status: z.enum(["open", "in_progress", "closed"]).default("open"),
  })),
  strategy: z.string(),
  totalEstimatedHours: z.number(),
  createdAt: z.string(),
}).optional(),
```

### 3.9 クリティカルパス計算

タスク間の依存関係（dependencies）に基づいてクリティカルパスを計算:

```typescript
function calculateCriticalPath(tasks: DecomposedTask[]): string[] {
  // トポロジカルソート + 最長パス計算
  // 各タスクのestimatedHoursを重みとして使用
  // 最長パスのタスクタイトル配列を返す
}
```

## 4. データフロー

### Issue生成フロー

```
ユーザー → reqord issue create spec-000016 --strategy by-layer
  → createCommand.action("spec-000016", { strategy: "by-layer" })
    → issueService.createIssuesFromSpec(cwd, options)
      → specRepo.findById(cwd, "spec-000016") → Specification取得
      → specRepo.loadFile(cwd, "spec-000016", "design.md") → 設計文書取得
      → reqRepo.findById(cwd, spec.requirementId) → 関連Requirement取得
      → decompositionService.decomposeSpecification(cwd, "spec-000016", "by-layer")
        → aiRepo.completeWithSchema(prompt, DecompositionResultSchema)
          → Anthropic API呼び出し
          → レスポンスをZodスキーマでパース
        → 並列グループ計算
        → クリティカルパス計算
        → DecompositionResult返却
      → Issue Template読み込み
      → 各タスクに対して:
        → ラベル生成: ["reqord-generated", "spec:spec-000016", "req:req-000016", "P0"]
        → Issue本文生成（テンプレート適用）
        → githubRepo.createIssue({ title, body, labels })
          → gh issue create --title "..." --body "..." --label "..."
      → Specification JSONにimplementationフィールド記録
    → CreateIssuesResult返却
  → テーブル表示:
    | # | タイトル | 優先度 | Issue# | URL |
    | 1 | スキーマ定義 | P0 | #42 | https://... |
```

### dry-runフロー

```
ユーザー → reqord issue create spec-000016 --dry-run
  → decompositionService.decomposeSpecification(...) → 分解実行
  → GitHub Issueは作成しない
  → 分解結果をテーブル表示:
    | # | タイトル | 優先度 | 見積もり | 依存 |
    | 1 | スキーマ定義 | P0 | 2h | なし |
    | 2 | Repository実装 | P1 | 4h | 1 |
  →
  → 並列グループ表示:
    P0: スキーマ定義
    P1: Repository実装, Service実装（並列可）
    P2: Command実装, テスト
  →
  → クリティカルパス: スキーマ定義 → Repository実装 → Service実装 → Command実装
```

## 5. テスト方針

### ユニットテスト

- **decomposition-service**:
  - 各分解戦略のプロンプト生成（by-layer, by-feature, by-requirement, custom）
  - AIレスポンスのZodパース（正常系・不正レスポンス時のエラー）
  - 並列グループ計算: P0/P1/P2への正しい分類
  - クリティカルパス計算: 線形依存、分岐依存、独立タスク
- **issue-service**:
  - ラベル生成ロジック
  - Issue本文テンプレート適用
  - dry-runモード: GitHub API呼び出しなし
  - maxIssues制限の動作
- **ai repository**:
  - APIキー未設定時のエラー
  - Zodスキーマでのレスポンスパース

### 統合テスト

- Specification作成 → issue create --dry-run の一連フロー（API呼び出しなし）
- implementationフィールドのJSON永続化
- `--json` 出力フォーマット検証

### AIレスポンスのモックテスト

AIリポジトリをモック化し、事前定義されたレスポンスで分解ロジックを検証。実際のAPI呼び出しはテストから除外する。

## 6. 技術的決定事項

### Anthropic SDK（Claude API）の採用

**決定:** タスク分解にAnthropic SDK（Claude API）を使用
**理由:** Specificationの設計文書（自然言語）を解析して構造化されたタスクに分解するには、LLMの自然言語理解能力が必要。reqordプロジェクトの主要AIとしてClaudeを採用しており、SDKの型安全性とストリーミングサポートが利用可能。

### 分解結果のZodスキーマ検証

**決定:** AIレスポンスをZodスキーマで検証し、型安全なDecompositionResultとして返す
**理由:** AIの出力は非決定論的であり、期待するフォーマットに準拠していない可能性がある。Zodスキーマによる検証でランタイムエラーを防ぎ、不正なレスポンス時はリトライまたはエラーメッセージを表示する。

### dry-runモードの必須サポート

**決定:** `--dry-run` オプションを必須サポート
**理由:** AI分解結果は予測困難であり、意図しないIssue大量生成のリスクがある。Human-in-the-loopの原則に基づき、生成前にプレビューを確認できる仕組みが必須。

### Issue同期の分離（spec-000024）

**決定:** Issue作成（本spec）とIssue同期・追跡（spec-000024）を分離
**理由:** 作成は一方向の書き込み操作であり、同期は双方向の状態管理が必要。責務を分離することで、それぞれの複雑さを独立して管理可能にする。

### APIキーの環境変数管理

**決定:** Anthropic APIキーは環境変数 `ANTHROPIC_API_KEY` から取得
**理由:** APIキーをファイルに保存するとGitにコミットされるリスクがある。環境変数による管理はセキュリティのベストプラクティス。未設定時は明確なエラーメッセージを表示する。
