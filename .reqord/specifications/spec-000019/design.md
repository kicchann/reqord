# ステータス表示コマンド - 技術設計書

## 1. 設計概要

`reqord status` コマンドにより、プロジェクト全体の進捗ダッシュボードを提供する。Requirements・Specifications・GitHub Issuesの各カテゴリのステータス集計とASCIIプログレスバーで視覚的に進捗を表示する。`reqord status <req-id>` で要件単位の詳細ステータス（関連Specification・Gap Analysis結果）、`reqord status <spec-id>` で仕様単位の詳細（カバレッジ・Issue進捗）を表示する。`--json` と `--quiet`（CI用の数値のみ出力）オプションをサポートする。

Requirement/Specification間のステータス整合性チェックは `@reqord/shared` の `checkConsistency()` ルールを使用し、不整合を警告表示する（Feedback #16）。また、`feedback-review` フラグを持つRequirement/Specificationについて情報表示を行う。

## 2. アーキテクチャ

```
Command Layer:  commands/status.ts               (新規)
                    ↓
Service Layer:  services/status-service.ts        (新規)
                    ↓
Repository:     repositories/requirement.ts       (既存)
                repositories/specification.ts     (既存)
                repositories/project-context.ts   (既存)
                    ↓
Shared:         @reqord/shared
                  schemas/requirement.ts          (既存: gapAnalysisフィールド参照)
                  schemas/specification.ts        (既存: statusフィールド等参照)
                  rules/consistency.ts            (既存: checkConsistency)
                    ↓
Storage:        .reqord/requirements/req-NNNNNN.yaml
                .reqord/specifications/spec-NNNNNN.yaml
```

集計ロジックをstatus-serviceに集約し、表示フォーマットはコマンド層に委譲する。リポジトリ層の既存findAll/findByIdメソッドを活用し、新規のリポジトリ追加は不要。

## 3. コンポーネント設計

### 3.1 statusコマンド (`commands/status.ts` - 新規)

**責務:** ステータス表示のルーティングと出力フォーマット。

```
reqord status [<id>] [options]
```

| オプション | 説明 |
|-----------|------|
| `[<id>]` | 省略: プロジェクト全体、req-NNNNNN: 要件詳細、spec-NNNNNN: 仕様詳細 |
| `--json` | 構造化JSON出力 |
| `--quiet` | 数値のみ出力（CI用: `完了率%`） |

**ID形式の判定:**
```typescript
function routeStatus(id?: string) {
  if (!id) return showProjectStatus();
  if (/^req-\d{6}$/.test(id)) return showRequirementStatus(id);
  if (/^spec-\d{6}$/.test(id)) return showSpecificationStatus(id);
  throw new Error(`不正なID形式: ${id}`);
}
```

### 3.2 プロジェクト全体ステータス (`reqord status`)

**表示形式:**
```
reqord プロジェクトステータス

Requirements:
  approved  ████████████░░░░░░░░  60% (6/10)
  pending   ██░░░░░░░░░░░░░░░░░░  10% (1/10)
  draft     ██████░░░░░░░░░░░░░░  30% (3/10)

Specifications:
  approved  ██████████░░░░░░░░░░  50% (4/8)
  pending   ████░░░░░░░░░░░░░░░░  25% (2/8)
  draft     ████░░░░░░░░░░░░░░░░  25% (2/8)

Issues:
  closed    ████████████████░░░░  80% (16/20)
  open      ████░░░░░░░░░░░░░░░░  20% (4/20)

⚠ 警告:
  - req-000010: Gap Analysisが未実行です
  - spec-000014: 設計検証が失敗しています（1 error）
  - req-000012: 依存先 req-000011 が未承認です
  - req-000016: 全関連Specificationがimplementedですが、Requirementがapprovedのままです
  - req-000020: deprecatedですが、関連Specificationがactiveです

ℹ 情報:
  - req-000015: フィードバックレビュー待ち: セキュリティ関連の指摘（関連Issue: #42, #43）
```

### 3.3 StatusService (`services/status-service.ts` - 新規)

**責務:** 各種ステータス情報の集計。

```typescript
export interface ProjectStatus {
  requirements: StatusSummary;
  specifications: StatusSummary;
  issues: IssueSummary;
  warnings: Warning[];
  generatedAt: string;
}

export interface StatusSummary {
  total: number;
  byStatus: Record<string, number>;  // "draft": 3, "approved": 6, ...
  approvedPercentage: number;
}

export interface IssueSummary {
  total: number;
  closed: number;
  open: number;
  closedPercentage: number;
}

export interface Warning {
  id: string;
  type: "gap-missing" | "validation-failed" | "blocked-dependency" | "no-specification"
    | "all-specs-implemented" | "deprecated-with-active-specs" | "feedback-review";
  message: string;
  severity: "warning" | "info";  // warningはデフォルト、feedback-reviewはinfo
}

export async function getProjectStatus(cwd: string): Promise<ProjectStatus>;
export async function getRequirementStatus(cwd: string, reqId: string): Promise<RequirementDetailStatus>;
export async function getSpecificationStatus(cwd: string, specId: string): Promise<SpecificationDetailStatus>;
```

### 3.4 要件詳細ステータス (`reqord status <req-id>`)

```typescript
export interface RequirementDetailStatus {
  requirement: Requirement;
  specifications: Array<{
    id: string;
    status: string;
  }>;
  gapAnalysis: {
    hasAnalysis: boolean;
    coverage?: "full" | "partial" | "none";
    missingCount?: number;
    conflictCount?: number;
  };
  dependencyStatus: Array<{
    id: string;
    title: string;
    status: string;
    relation: "blockedBy" | "blocks" | "relatedTo";
  }>;
  issueProgress: {
    total: number;
    completed: number;
  };
}
```

**表示形式:**
```
要件ステータス: req-000016 (GitHub Issue生成)

  ステータス:   approved
  優先度:       high
  複雑度:       large

関連Specification:
  spec-000016   approved

Gap Analysis:
  カバレッジ:   partial
  不足機能:     3件
  矛盾:         1件

依存関係:
  blockedBy:    req-000011 (approved) ✓
  blockedBy:    req-000013 (approved) ✓
  blocks:       req-000018 (draft)

Issue進捗:  ████████████████░░░░  80% (4/5)
```

### 3.5 仕様詳細ステータス (`reqord status <spec-id>`)

```typescript
export interface SpecificationDetailStatus {
  specification: Specification;
  requirement: {
    id: string;
    title: string;
    status: string;
  };
  designValidation?: {
    passed: number;
    warnings: number;
    errors: number;
  };
  issueProgress: {
    total: number;
    completed: number;
  };
  coverageStatus: "covered" | "partial" | "not-covered";
}
```

### 3.6 警告検出ロジック

```typescript
import { checkConsistency } from "@reqord/shared";

function detectWarnings(
  requirements: Requirement[],
  specifications: Specification[],
): Warning[] {
  const warnings: Warning[] = [];

  for (const req of requirements) {
    // Gap Analysisが未実行
    if (!req.gapAnalysis && req.status === "approved") {
      warnings.push({
        id: req.id,
        type: "gap-missing",
        message: `Gap Analysisが未実行です`,
        severity: "warning",
      });
    }

    // Specificationが存在しない承認済み要件
    const hasSpec = specifications.some(s => s.requirementId === req.id);
    if (!hasSpec && req.status !== "draft") {
      warnings.push({
        id: req.id,
        type: "no-specification",
        message: `Specificationが作成されていません`,
        severity: "warning",
      });
    }

    // 依存先が未承認
    for (const depId of req.dependencies.blockedBy) {
      const dep = requirements.find(r => r.id === depId);
      if (dep && dep.status !== "approved") {
        warnings.push({
          id: req.id,
          type: "blocked-dependency",
          message: `依存先 ${depId} が未承認です（現在: ${dep.status}）`,
          severity: "warning",
        });
      }
    }

    // --- 整合性チェック（@reqord/shared checkConsistency使用）--- (Feedback #16)
    // checkConsistency() の ConsistencyWarning 型に type フィールドを追加する前提:
    //   type ConsistencyWarningType = "all-specs-implemented" | "deprecated-with-active-specs";
    //   type ConsistencyWarning = { ..., type: ConsistencyWarningType };
    const relatedSpecs = specifications.filter(s => s.requirementId === req.id);
    const consistencyWarnings = checkConsistency(req, relatedSpecs);
    for (const cw of consistencyWarnings) {
      warnings.push({
        id: req.id,
        type: cw.type,  // ConsistencyWarning.type を直接使用（メッセージ文字列判定ではない）
        message: cw.message,
        severity: "warning",
      });
    }

    // --- feedback-reviewフラグ情報表示 --- (Feedback #16)
    const feedbackFlags = req.flags?.filter(f => f.type === "feedback-review") ?? [];
    for (const flag of feedbackFlags) {
      warnings.push({
        id: req.id,
        type: "feedback-review",
        message: `フィードバックレビュー待ち: ${flag.reason}（関連Issue: ${flag.relatedIssues.map(n => `#${n}`).join(", ")}）`,
        severity: "info",
      });
    }
  }

  for (const spec of specifications) {
    // 設計検証が失敗
    if (spec.designValidation && spec.designValidation.errors > 0) {
      warnings.push({
        id: spec.id,
        type: "validation-failed",
        message: `設計検証が失敗しています（${spec.designValidation.errors} error）`,
        severity: "warning",
      });
    }

    // --- Specificationのfeedback-reviewフラグ情報表示 --- (Feedback #16)
    const specFeedbackFlags = spec.flags?.filter(f => f.type === "feedback-review") ?? [];
    for (const flag of specFeedbackFlags) {
      warnings.push({
        id: spec.id,
        type: "feedback-review",
        message: `フィードバックレビュー待ち: ${flag.reason}（関連Issue: ${flag.relatedIssues.map(n => `#${n}`).join(", ")}）`,
        severity: "info",
      });
    }
  }

  return warnings;
}
```

### 3.7 ASCIIプログレスバー生成

```typescript
function renderProgressBar(percentage: number, width: number = 20): string {
  const filled = Math.round(percentage / 100 * width);
  const empty = width - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

// 例: renderProgressBar(60) → "████████████░░░░░░░░"
```

## 4. データフロー

### プロジェクト全体ステータス

```
ユーザー → reqord status
  → statusCommand.action()
    → statusService.getProjectStatus(cwd)
      → reqRepo.findAll(cwd) → 全要件取得
      → specRepo.findAll(cwd) → 全仕様取得
      → Requirements集計:
        → byStatus: { draft: 3, approved: 6, approved: 1 }
        → approvedPercentage: 60%
      → Specifications集計:
        → byStatus: { draft: 2, approved: 4, approved: 2 }
        → approvedPercentage: 50%
      → Issues集計（tasks.yamlから各specに紐づくIssueを取得）:
        → total: 20, closed: 16, closedPercentage: 80%
      → 警告検出:
        → detectWarnings(requirements, specifications)
      → ProjectStatus構築
  → ASCIIダッシュボード表示
```

### 要件詳細ステータス

```
ユーザー → reqord status req-000016
  → statusCommand.action("req-000016")
    → statusService.getRequirementStatus(cwd, "req-000016")
      → reqRepo.findById(cwd, "req-000016") → Requirement取得
      → specRepo.findAll(cwd) → requirementIdでフィルタ → 関連Spec取得
      → gapAnalysisフィールド読み取り
      → 依存関係ステータス: blockedByの各要件のstatus取得
      → Issue進捗: tasks.yamlから関連Specに紐づくIssueを集計
    → RequirementDetailStatus返却
  → 詳細表示
```

### quietモード

```
ユーザー → reqord status --quiet
  → statusService.getProjectStatus(cwd)
  → stdout: "60"  (Requirementsの承認率%のみ出力)
```

## 5. テスト方針

### ユニットテスト

- **getProjectStatus**:
  - 全要件draftの場合: approvedPercentage = 0
  - 全要件approvedの場合: approvedPercentage = 100
  - 要件0件の場合: total = 0, approvedPercentage = 0
  - tasks.yamlにエントリがないSpecificationのIssue集計スキップ
- **警告検出**:
  - Gap Analysis未実行の承認済み要件
  - 未承認の依存先がある要件
  - Specificationが存在しない非draft要件
  - 設計検証エラーがあるSpecification
  - 整合性チェック（checkConsistency統合）:
    - 全関連SpecがimplementedだがReqがapproved → `all-specs-implemented` 警告
    - Reqがdeprecatedだが関連Specがdraft/approved → `deprecated-with-active-specs` 警告
    - Specが0件の場合: 整合性警告なし
  - feedback-reviewフラグ検出:
    - Requirementにfeedback-reviewフラグ → `feedback-review` info表示
    - Specificationにfeedback-reviewフラグ → `feedback-review` info表示
    - フラグなし: 情報表示なし
    - severity: "info"であること（"warning"ではない）
- **renderProgressBar**: 0%, 50%, 100%での正しいバー生成
- **routeStatus**: req-NNNNNN/spec-NNNNNNの正しいルーティング、不正ID時のエラー

### 統合テスト

- テスト用のRequirement・Specification群を用意し、集計結果が正確であることを確認
- `--json` 出力のスキーマ検証
- `--quiet` 出力が数値のみであること

## 6. 技術的決定事項

### 単一コマンドでのルーティング

**決定:** `reqord status [<id>]` の1コマンドで3種類の表示（全体/要件/仕様）を提供
**理由:** 利便性のため。ユーザーはIDの有無と形式だけで表示内容を切り替えられる。サブコマンド（`reqord status project`, `reqord status req`等）に分割するとコマンド体系が冗長になる。

### Issue集計のデータソース

**決定:** `tasks.yaml` からIssue情報を取得し、GitHub APIへのリアルタイム問い合わせは行わない
**理由:** `reqord status` は高頻度で実行されるコマンドであり、毎回GitHub API呼び出しを行うとレイテンシが大きくなる。Issue同期（spec-000024で実装予定）により、tasks.yamlのstatusは定期的に更新される前提。リアルタイム情報が必要な場合は `reqord validate impl` を使用する。

### 警告の自動検出

**決定:** ステータス表示時に自動的に警告を検出・表示
**理由:** ユーザーが個別の検証コマンド（validate, coverage等）を実行しなくても、`reqord status` だけでプロジェクトの潜在的な問題を把握できるようにする。ただし、警告検出はローカルデータのみを使用し、外部API呼び出しは行わない。

### @reqord/shared checkConsistencyルールの統合（Feedback #16）

**決定:** `detectWarnings` 内で `@reqord/shared` の `checkConsistency()` を呼び出し、その結果をWarning型にマッピングする
**理由:** 整合性チェックロジックを `@reqord/shared` に集約することで、CLI（status-service）とWeb（dashboard-data）の両方で同一ルールを再利用可能にする。`checkConsistency` は純粋関数であり、Requirement + Specification[] を受け取って `ConsistencyWarning[]` を返すため、呼び出し元を選ばない。

### feedback-reviewフラグの情報表示レベル

**決定:** `feedback-review` フラグの表示は `severity: "info"` とし、警告（warning）とは区別して表示する
**理由:** フィードバックレビューは「対応が必要な問題」ではなく「レビュー待ちの情報」であり、他の警告（整合性エラー、未承認依存等）とは性質が異なる。info レベルとすることで、ユーザーが緊急度を正しく判断できる。表示時にはアイコン（`ℹ`）と色分けで警告（`⚠`）と区別する。
