# Feedback操作CLI - 技術設計書

## 1. 設計概要

Feedback一覧表示・詳細表示・紐付け・クローズの4つのCLIコマンドを提供する。本specは以下の責務を担う:

- **list**: feedbacks.yamlからFeedback一覧を表示（フィルタリング対応）
- **show**: GitHub Issue + feedbacks.yamlマージデータの詳細表示
- **link**: Requirement/Specificationへの紐付け + 新Requirement作成
- **close**: Feedbackクローズ + GitHub Issueクローズ

**依存関係**: spec-000027（FeedbackIndex管理）のZodスキーマ・Repository層を前提とする。

### v2.0.0 追加スコープ

- **resolve**: `linkedTo.resolved`への記録（SC-11対応）
- **承認時未解決feedback警告**: 未解決feedbackがあるアーティファクト承認時の警告表示（SC-13対応）

### v3.0.0 追加スコープ

- **unlink**: linkの逆操作。アーティファクトとの紐付け解除（SC-14, SC-15対応）
- **create**: feedbackラベル付きGitHub Issue作成 + feedbacks.yaml登録（SC-17対応）
- **close改善**: クローズ時に未解決feedbackの警告表示（SC-16対応）

## 2. アーキテクチャ

```
┌─────────────────────────────────────────────────────────┐
│ CLI Commands (packages/cli/src/commands/feedback/)     │
│ ├─ list.ts    - reqord feedback list                   │
│ ├─ show.ts    - reqord feedback show <issue-number>    │
│ ├─ link.ts    - reqord feedback link <issue-number>    │
│ ├─ close.ts   - reqord feedback close <issue-number>   │  ← v3.0.0改善
│ ├─ resolve.ts - reqord feedback resolve <artifact-id>  │  ← v2.0.0
│ ├─ unlink.ts  - reqord feedback unlink <issue-number>  │  ← v3.0.0
│ └─ create.ts  - reqord feedback create                 │  ← v3.0.0
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ FeedbackService (packages/cli/src/services/)           │
│ - Feedback操作のビジネスロジック                        │
│ - Requirement/Specificationとの紐付け                   │
│ - feedbacks.yaml の linkedTo/resolved 管理              │
└────────────┬──────────────────┬────────────────────────┘
             │                  │
             ▼                  ▼
┌────────────────────┐   ┌────────────────────┐
│ FeedbackRepository │   │ GitHubClient       │
│ (spec-000027)      │   │ (spec-000027)      │
│ - feedbacks.yaml       │   │ - gh CLI           │
└────────────────────┘   └────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────┐
│ RequirementService / SpecificationService      │
│ (既存実装)                                      │
│ - Requirement CRUD                             │
│ - 存在確認（findByIdOrThrow）                    │
└────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Approval Warning (v2.0.0)                              │
│ ├─ commands/req/approve.ts  - 未解決feedback警告追加    │
│ └─ commands/spec/approve.ts - 未解決feedback警告追加    │
└─────────────────────────────────────────────────────────┘
```

## 3. コンポーネント設計

### 3.1 FeedbackService (packages/cli)

**ファイルパス**: `packages/cli/src/services/feedback-service.ts`

**責務**: Feedback操作のビジネスロジック

**インターフェース**:

```typescript
import type { FeedbackEntry, FeedbackType, FeedbackSeverity } from "@reqord/shared";
import { loadIndex, saveIndex } from "../repositories/feedback";
import { getIssue, closeIssue, createIssue, updateIssueBody, type GitHubIssue } from "./github-client";
import { findByIdOrThrow as findRequirementByIdOrThrow } from "../repositories/requirement";
import { findByIdOrThrow as findSpecificationByIdOrThrow } from "../repositories/specification";
import { createRequirement, saveRequirement } from "./requirement-service";
import { generateNextId } from "../utils/id-generator";
import { upsertReqordComment } from "./reqord-comment";

export interface ListFeedbacksOptions {
  state?: "open" | "closed" | "all";
  type?: FeedbackType;
}

export interface ListFeedbackResult {
  feedbacks: Array<FeedbackEntry & { title?: string }>;
}

export interface ShowFeedbackResult {
  feedback: FeedbackEntry;
  issue: GitHubIssue;
}

export interface LinkToRequirementOptions {
  issueNumber: number;
  requirementId: string;
  type?: FeedbackType;
  severity?: FeedbackSeverity;
}

export interface LinkWithNewRequirementOptions {
  issueNumber: number;
  type?: FeedbackType;
  severity?: FeedbackSeverity;
}

export interface LinkToSpecificationOptions {
  issueNumber: number;
  specificationId: string;
  type?: FeedbackType;
  severity?: FeedbackSeverity;
}

// Feedback一覧取得
export async function listFeedbacks(
  cwd: string,
  options: ListFeedbacksOptions = {}
): Promise<ListFeedbackResult> {
  const index = await loadIndex(cwd);
  let feedbacks = index.feedbacks;

  // フィルタリング
  if (options.state && options.state !== "all") {
    feedbacks = feedbacks.filter((f) => f.status === options.state);
  }
  if (options.type) {
    feedbacks = feedbacks.filter((f) => f.type === options.type);
  }

  return { feedbacks };
}

// Feedback詳細取得（GitHub Issue + feedbacks.yaml マージ）
export async function showFeedback(
  cwd: string,
  issueNumber: number
): Promise<ShowFeedbackResult> {
  const index = await loadIndex(cwd);
  const feedback = index.feedbacks.find((f) => f.githubIssue === issueNumber);

  if (!feedback) {
    throw new Error(`Feedback for issue #${issueNumber} not found in feedbacks.yaml. Run 'reqord feedback sync' first.`);
  }

  const issue = await getIssue(issueNumber);

  return { feedback, issue };
}

// 既存Requirementへの紐付け
export async function linkToRequirement(
  cwd: string,
  options: LinkToRequirementOptions
): Promise<void> {
  // Requirementの存在確認
  await findRequirementByIdOrThrow(cwd, options.requirementId);

  const index = await loadIndex(cwd);
  let feedback = index.feedbacks.find((f) => f.githubIssue === options.issueNumber);

  if (!feedback) {
    // feedbacks.yamlにない場合は新規作成
    feedback = {
      githubIssue: options.issueNumber,
      linkedTo: {
        requirements: [],
        createdRequirements: [],
        specifications: [],
      },
      syncedAt: new Date().toISOString(),
      status: "open",
    };
    index.feedbacks.push(feedback);
  }

  // type, severity設定
  if (options.type) feedback.type = options.type;
  if (options.severity) feedback.severity = options.severity;

  // linkedTo更新
  if (!feedback.linkedTo.requirements.includes(options.requirementId)) {
    feedback.linkedTo.requirements.push(options.requirementId);
  }

  // feedbacks.yaml保存
  await saveIndex(cwd, index);

  // GitHub Issue bodyにHTMLコメントを挿入/更新
  await updateGitHubIssueBody(options.issueNumber, feedback);
}

// 新Requirement作成 + 紐付け
export async function linkWithNewRequirement(
  cwd: string,
  options: LinkWithNewRequirementOptions
): Promise<string> {
  const issue = await getIssue(options.issueNumber);
  const nextId = await generateNextId(cwd);

  // 新Requirement作成
  const result = await createRequirement(cwd, {
    title: `[Feedback #${options.issueNumber}] ${issue.title}`,
    priority: "medium",
  });

  // origin情報を追加
  result.requirement.origin = { feedbackIssue: options.issueNumber };
  await saveRequirement(cwd, result.requirement);

  // feedbacks.yaml更新
  const index = await loadIndex(cwd);
  let feedback = index.feedbacks.find((f) => f.githubIssue === options.issueNumber);

  if (!feedback) {
    feedback = {
      githubIssue: options.issueNumber,
      linkedTo: {
        requirements: [],
        createdRequirements: [],
        specifications: [],
      },
      syncedAt: new Date().toISOString(),
      status: "open",
    };
    index.feedbacks.push(feedback);
  }

  if (options.type) feedback.type = options.type;
  if (options.severity) feedback.severity = options.severity;
  feedback.linkedTo.createdRequirements.push(nextId);

  await saveIndex(cwd, index);

  // GitHub Issue bodyにHTMLコメントを挿入/更新
  await updateGitHubIssueBody(options.issueNumber, feedback);

  return nextId;
}

// Specificationへの紐付け
export async function linkToSpecification(
  cwd: string,
  options: LinkToSpecificationOptions
): Promise<void> {
  // Specificationの存在確認
  await findSpecificationByIdOrThrow(cwd, options.specificationId);

  const index = await loadIndex(cwd);
  let feedback = index.feedbacks.find((f) => f.githubIssue === options.issueNumber);

  if (!feedback) {
    feedback = {
      githubIssue: options.issueNumber,
      linkedTo: {
        requirements: [],
        createdRequirements: [],
        specifications: [],
      },
      syncedAt: new Date().toISOString(),
      status: "open",
    };
    index.feedbacks.push(feedback);
  }

  if (options.type) feedback.type = options.type;
  if (options.severity) feedback.severity = options.severity;

  if (!feedback.linkedTo.specifications.includes(options.specificationId)) {
    feedback.linkedTo.specifications.push(options.specificationId);
  }

  await saveIndex(cwd, index);

  // GitHub Issue bodyにHTMLコメントを挿入/更新
  await updateGitHubIssueBody(options.issueNumber, feedback);
}

// Feedbackクローズ
export async function closeFeedback(
  cwd: string,
  issueNumber: number
): Promise<void> {
  const index = await loadIndex(cwd);
  const feedback = index.feedbacks.find((f) => f.githubIssue === issueNumber);

  if (!feedback) {
    throw new Error(`Feedback for issue #${issueNumber} not found`);
  }

  // feedbacks.yamlステータス更新
  feedback.status = "closed";
  await saveIndex(cwd, index);

  // 影響範囲サマリー生成
  const summary = buildImpactSummary(feedback);

  // GitHub Issueクローズ
  await closeIssue(issueNumber, summary);
}

// v2.0.0: フィードバック解決（SC-11）
export interface ResolveFeedbackOptions {
  issueNumber: number;
  artifactId: string; // req-NNNNNN or spec-NNNNNN
}

export async function resolveFeedback(
  cwd: string,
  options: ResolveFeedbackOptions
): Promise<void> {
  const index = await loadIndex(cwd);
  const feedback = index.feedbacks.find(
    (f) => f.githubIssue === options.issueNumber
  );

  if (!feedback) {
    throw new Error(
      `Feedback for issue #${options.issueNumber} not found in feedbacks.yaml`
    );
  }

  // artifact-idのprefixで判別
  const isReq = options.artifactId.startsWith("req-");
  const isSpec = options.artifactId.startsWith("spec-");

  if (!isReq && !isSpec) {
    throw new Error(
      `Invalid artifact ID: ${options.artifactId}. Must start with "req-" or "spec-"`
    );
  }

  // 対象アーティファクトがlinkedToに含まれるか検証
  const linkedList = isReq
    ? feedback.linkedTo.requirements
    : feedback.linkedTo.specifications;
  if (!linkedList.includes(options.artifactId)) {
    throw new Error(
      `${options.artifactId} is not linked to feedback #${options.issueNumber}`
    );
  }

  // linkedTo.resolvedに追加
  if (!feedback.linkedTo.resolved) {
    feedback.linkedTo.resolved = { requirements: [], specifications: [] };
  }
  const resolvedList = isReq
    ? feedback.linkedTo.resolved.requirements
    : feedback.linkedTo.resolved.specifications;
  if (!resolvedList.includes(options.artifactId)) {
    resolvedList.push(options.artifactId);
  }

  await saveIndex(cwd, index);
}

// v3.0.0: Feedbackのリンク解除（SC-14, SC-15）
export interface UnlinkFromRequirementOptions {
  issueNumber: number;
  requirementId: string;
}

export interface UnlinkFromSpecificationOptions {
  issueNumber: number;
  specificationId: string;
}

export async function unlinkFromRequirement(
  cwd: string,
  options: UnlinkFromRequirementOptions
): Promise<void> {
  const index = await loadIndex(cwd);
  const feedback = index.feedbacks.find((f) => f.githubIssue === options.issueNumber);

  if (!feedback) {
    throw new Error(`Feedback for issue #${options.issueNumber} not found in feedbacks.yaml`);
  }

  // linkedTo.requirementsから削除
  const reqIndex = feedback.linkedTo.requirements.indexOf(options.requirementId);
  if (reqIndex === -1) {
    throw new Error(
      `${options.requirementId} is not linked to feedback #${options.issueNumber}`
    );
  }
  feedback.linkedTo.requirements.splice(reqIndex, 1);

  await saveIndex(cwd, index);

  // GitHub Issue bodyのHTMLコメントを更新
  await updateGitHubIssueBody(options.issueNumber, feedback);
}

export async function unlinkFromSpecification(
  cwd: string,
  options: UnlinkFromSpecificationOptions
): Promise<void> {
  const index = await loadIndex(cwd);
  const feedback = index.feedbacks.find((f) => f.githubIssue === options.issueNumber);

  if (!feedback) {
    throw new Error(`Feedback for issue #${options.issueNumber} not found in feedbacks.yaml`);
  }

  // linkedTo.specificationsから削除
  const specIndex = feedback.linkedTo.specifications.indexOf(options.specificationId);
  if (specIndex === -1) {
    throw new Error(
      `${options.specificationId} is not linked to feedback #${options.issueNumber}`
    );
  }
  feedback.linkedTo.specifications.splice(specIndex, 1);

  await saveIndex(cwd, index);

  // GitHub Issue bodyのHTMLコメントを更新
  await updateGitHubIssueBody(options.issueNumber, feedback);
}

// v3.0.0: ISSUE_TEMPLATE/05-feedback.yml に準拠したbody生成
function buildFeedbackIssueBody(options: CreateFeedbackOptions): string {
  const lines: string[] = [];

  lines.push("### 何が起きた？ / 何に気づいた？");
  lines.push("");
  lines.push(options.description);
  lines.push("");

  lines.push("### フィードバックの種類");
  lines.push("");
  const typeLabel = options.type
    ? feedbackTypeToLabel(options.type)
    : "不明/未分類";
  lines.push(typeLabel);
  lines.push("");

  if (options.relatedReq) {
    lines.push("### 関連する要件 (Requirement)");
    lines.push("");
    lines.push(options.relatedReq);
    lines.push("");
  }

  if (options.relatedSpec) {
    lines.push("### 関連する仕様 (Specification)");
    lines.push("");
    lines.push(options.relatedSpec);
    lines.push("");
  }

  if (options.severity) {
    lines.push("### 深刻度");
    lines.push("");
    lines.push(severityToLabel(options.severity));
    lines.push("");
  }

  return lines.join("\n");
}

function feedbackTypeToLabel(type: FeedbackType): string {
  const map: Record<FeedbackType, string> = {
    "requirement-gap": "requirement-gap (要件の不足)",
    "spec-mismatch": "spec-mismatch (仕様と実装の不一致)",
    "bug": "bug (実装のバグ)",
    "improvement": "improvement (改善提案)",
    "security": "security (セキュリティ)",
  };
  return map[type] ?? type;
}

function severityToLabel(severity: FeedbackSeverity): string {
  const map: Record<FeedbackSeverity, string> = {
    critical: "critical (全ユーザーに影響)",
    high: "high (多数のユーザーに影響)",
    medium: "medium (一部のユーザーに影響)",
    low: "low (軽微な問題)",
  };
  return map[severity] ?? severity;
}

// v3.0.0: Feedback GitHub Issue作成（SC-17）
export interface CreateFeedbackOptions {
  title: string;
  description: string;      // 何が起きた？ / 何に気づいた？（必須）
  type?: FeedbackType;
  severity?: FeedbackSeverity;
  relatedReq?: string;       // 関連要件ID
  relatedSpec?: string;      // 関連仕様ID
}

export async function createFeedbackIssue(
  cwd: string,
  options: CreateFeedbackOptions
): Promise<number> {
  // ISSUE_TEMPLATE/05-feedback.yml に準拠したbody生成
  const body = buildFeedbackIssueBody(options);

  // タイトルに [Feedback] prefix付与（テンプレート準拠）
  const title = options.title.startsWith("[Feedback]")
    ? options.title
    : `[Feedback] ${options.title}`;

  // GitHub Issue作成（feedbackラベル + reqord-generatedラベル付き）
  // reqord-generated: reqord issue createと同様、自動生成タスクであることを示すラベル
  const issueNumber = await createIssue({
    title,
    body,
    labels: ["feedback", "reqord", ...(options.type ? [options.type] : [])],
  });

  // feedbacks.yamlに新規エントリ追加
  const index = await loadIndex(cwd);
  const newEntry: FeedbackEntry = {
    githubIssue: issueNumber,
    type: options.type,
    severity: options.severity,
    linkedTo: {
      requirements: [],
      createdRequirements: [],
      specifications: [],
      createdSpecifications: [],
    },
    syncedAt: new Date().toISOString(),
    status: "open",
  };
  index.feedbacks.push(newEntry);
  await saveIndex(cwd, index);

  return issueNumber;
}

// v3.0.0: close時の未解決feedback警告（SC-16）
export interface RemainingFlag {
  artifactId: string;
  issueNumber: number;
  severity: string;
}

export async function checkRemainingFlags(
  _cwd: string,
  feedback: FeedbackEntry
): Promise<RemainingFlag[]> {
  const remaining: RemainingFlag[] = [];
  const resolvedReqs = new Set(feedback.linkedTo.resolved?.requirements ?? []);
  const resolvedSpecs = new Set(feedback.linkedTo.resolved?.specifications ?? []);

  for (const reqId of feedback.linkedTo.requirements) {
    if (!resolvedReqs.has(reqId)) {
      remaining.push({
        artifactId: reqId,
        issueNumber: feedback.githubIssue,
        severity: feedback.severity ?? "medium",
      });
    }
  }
  for (const specId of feedback.linkedTo.specifications) {
    if (!resolvedSpecs.has(specId)) {
      remaining.push({
        artifactId: specId,
        issueNumber: feedback.githubIssue,
        severity: feedback.severity ?? "medium",
      });
    }
  }
  return remaining;
}

function buildImpactSummary(feedback: FeedbackEntry): string {
  const lines = ["**Feedback closed - Impact summary:**", ""];

  if (feedback.linkedTo.requirements.length > 0) {
    lines.push(`- Linked Requirements: ${feedback.linkedTo.requirements.join(", ")}`);
  }
  if (feedback.linkedTo.createdRequirements.length > 0) {
    lines.push(`- Created Requirements: ${feedback.linkedTo.createdRequirements.join(", ")}`);
  }
  if (feedback.linkedTo.specifications.length > 0) {
    lines.push(`- Linked Specifications: ${feedback.linkedTo.specifications.join(", ")}`);
  }

  return lines.join("\n");
}
```

### 3.2 CLIコマンド実装

#### 3.2.1 list.ts

**ファイルパス**: `packages/cli/src/commands/feedback/list.ts`

```typescript
import { Command } from "commander";
import chalk from "chalk";
import Table from "cli-table3";
import { listFeedbacks } from "../../services/feedback-service";

export const listCommand = new Command("list")
  .description("List feedback issues from feedbacks.yaml")
  .option("--state <state>", "Filter by state (open|closed|all)", "all")
  .option("--type <type>", "Filter by type")
  .option("--json", "Output as JSON")
  .action(async (options) => {
    try {
      const cwd = process.cwd();
      const result = await listFeedbacks(cwd, {
        state: options.state,
        type: options.type,
      });

      if (options.json) {
        console.log(JSON.stringify(result.feedbacks, null, 2));
        return;
      }

      if (result.feedbacks.length === 0) {
        console.log(chalk.yellow("No feedbacks found. Run 'reqord feedback sync' first."));
        return;
      }

      const table = new Table({
        head: ["Issue", "State", "Type", "Severity", "Requirements", "Specs"],
      });

      result.feedbacks.forEach((f) => {
        table.push([
          `#${f.githubIssue}`,
          f.status === "closed" ? chalk.gray("closed") : chalk.green("open"),
          f.type || "-",
          f.severity || "-",
          f.linkedTo.requirements.join(", ") || "-",
          f.linkedTo.specifications.join(", ") || "-",
        ]);
      });

      console.log(table.toString());
    } catch (error) {
      console.error(chalk.red(`Error: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });
```

#### 3.2.2 show.ts

**ファイルパス**: `packages/cli/src/commands/feedback/show.ts`

```typescript
import { Command } from "commander";
import chalk from "chalk";
import { showFeedback } from "../../services/feedback-service";

export const showCommand = new Command("show")
  .description("Show feedback details (GitHub Issue + feedbacks.yaml)")
  .argument("<issue-number>", "GitHub issue number")
  .action(async (issueNumberStr: string) => {
    try {
      const cwd = process.cwd();
      const issueNumber = parseInt(issueNumberStr, 10);
      const result = await showFeedback(cwd, issueNumber);

      console.log(chalk.bold(`Issue #${result.issue.number}: ${result.issue.title}`));
      console.log(`State: ${result.issue.state}`);
      console.log(`Type: ${result.feedback.type || "(not set)"}`);
      console.log(`Severity: ${result.feedback.severity || "(not set)"}`);
      console.log(`Linked Requirements: ${result.feedback.linkedTo.requirements.join(", ") || "(none)"}`);
      console.log(`Linked Specifications: ${result.feedback.linkedTo.specifications.join(", ") || "(none)"}`);
      console.log(`Created Requirements: ${result.feedback.linkedTo.createdRequirements.join(", ") || "(none)"}`);
      console.log(`Created: ${result.issue.createdAt}`);
      console.log();
      console.log(chalk.gray("--- Issue Body ---"));
      console.log(result.issue.body || "(empty)");
    } catch (error) {
      console.error(chalk.red(`Error: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });
```

#### 3.2.3 link.ts

**ファイルパス**: `packages/cli/src/commands/feedback/link.ts`

```typescript
import { Command } from "commander";
import chalk from "chalk";
import {
  linkToRequirement,
  linkWithNewRequirement,
  linkToSpecification,
} from "../../services/feedback-service";

export const linkCommand = new Command("link")
  .description("Link feedback to requirement/specification")
  .argument("<issue-number>", "GitHub issue number")
  .option("--req <id>", "Link to existing requirement")
  .option("--created-req", "Create new requirement from feedback")
  .option("--spec <id>", "Link to specification")
  .option("--type <type>", "Feedback type (bug|improvement|requirement-gap|spec-mismatch|security)")
  .option("--severity <level>", "Severity (critical|high|medium|low)")
  .action(async (issueNumberStr: string, options) => {
    try {
      const cwd = process.cwd();
      const issueNumber = parseInt(issueNumberStr, 10);

      // 排他チェック
      const modes = [options.req, options.createdReq, options.spec].filter(Boolean);
      if (modes.length !== 1) {
        throw new Error("Specify exactly one of --req, --created-req, or --spec");
      }

      if (options.req) {
        await linkToRequirement(cwd, {
          issueNumber,
          requirementId: options.req,
          type: options.type,
          severity: options.severity,
        });
        console.log(chalk.green(`✓ Linked Feedback #${issueNumber} to ${options.req}`));
      } else if (options.createdReq) {
        const newId = await linkWithNewRequirement(cwd, {
          issueNumber,
          type: options.type,
          severity: options.severity,
        });
        console.log(chalk.green(`✓ Created ${newId} from Feedback #${issueNumber}`));
      } else if (options.spec) {
        await linkToSpecification(cwd, {
          issueNumber,
          specificationId: options.spec,
          type: options.type,
          severity: options.severity,
        });
        console.log(chalk.green(`✓ Linked Feedback #${issueNumber} to ${options.spec}`));
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });
```

#### 3.2.4 close.ts

**ファイルパス**: `packages/cli/src/commands/feedback/close.ts`

```typescript
import { Command } from "commander";
import chalk from "chalk";
import { closeFeedback } from "../../services/feedback-service";

export const closeCommand = new Command("close")
  .description("Close feedback (updates feedbacks.yaml and closes GitHub Issue)")
  .argument("<issue-number>", "GitHub issue number")
  .action(async (issueNumberStr: string) => {
    try {
      const cwd = process.cwd();
      const issueNumber = parseInt(issueNumberStr, 10);

      await closeFeedback(cwd, issueNumber);

      console.log(chalk.green(`✓ Closed Feedback #${issueNumber}`));
    } catch (error) {
      console.error(chalk.red(`Error: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });
```

#### 3.2.5 close.ts（v3.0.0改善）

**ファイルパス**: `packages/cli/src/commands/feedback/close.ts`

v3.0.0で未解決feedback警告を追加:

```typescript
import { Command } from "commander";
import chalk from "chalk";
import { closeFeedback, checkRemainingFlags, showFeedback } from "../../services/feedback-service";

export const closeCommand = new Command("close")
  .description("Close feedback (updates feedbacks.yaml and closes GitHub Issue)")
  .argument("<issue-number>", "GitHub issue number")
  .action(async (issueNumberStr: string) => {
    try {
      const cwd = process.cwd();
      const issueNumber = parseInt(issueNumberStr, 10);

      // v3.0.0: 未解決feedback警告
      const { feedback } = await showFeedback(cwd, issueNumber);
      const remainingFlags = await checkRemainingFlags(cwd, feedback);
      if (remainingFlags.length > 0) {
        console.log(
          chalk.yellow(
            `⚠ Warning: Linked artifacts have unresolved feedbacks:`
          )
        );
        for (const flag of remainingFlags) {
          console.log(
            chalk.yellow(
              `  - ${flag.artifactId}: unresolved (issue #${flag.issueNumber}, ${flag.severity})`
            )
          );
        }
      }

      await closeFeedback(cwd, issueNumber);

      console.log(chalk.green(`✓ Closed Feedback #${issueNumber}`));
      if (remainingFlags.length > 0) {
        console.log(chalk.gray("  Unresolved feedbacks remain on linked artifacts. Use 'reqord feedback resolve' to mark as resolved."));
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });
```

#### 3.2.6 unlink.ts（v3.0.0追加）

**ファイルパス**: `packages/cli/src/commands/feedback/unlink.ts`

```typescript
import { Command } from "commander";
import chalk from "chalk";
import {
  unlinkFromRequirement,
  unlinkFromSpecification,
} from "../../services/feedback-service";

export const unlinkCommand = new Command("unlink")
  .description("Unlink feedback from requirement/specification (reverse of link)")
  .argument("<issue-number>", "GitHub issue number")
  .option("--req <id>", "Unlink from requirement")
  .option("--spec <id>", "Unlink from specification")
  .action(async (issueNumberStr: string, options) => {
    try {
      const cwd = process.cwd();
      const issueNumber = parseInt(issueNumberStr, 10);

      // 排他チェック
      const modes = [options.req, options.spec].filter(Boolean);
      if (modes.length !== 1) {
        throw new Error("Specify exactly one of --req or --spec");
      }

      if (options.req) {
        await unlinkFromRequirement(cwd, {
          issueNumber,
          requirementId: options.req,
        });
        console.log(chalk.green(`✓ Unlinked Feedback #${issueNumber} from ${options.req}`));
      } else if (options.spec) {
        await unlinkFromSpecification(cwd, {
          issueNumber,
          specificationId: options.spec,
        });
        console.log(chalk.green(`✓ Unlinked Feedback #${issueNumber} from ${options.spec}`));
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });
```

#### 3.2.7 create.ts（v3.0.0追加）

**ファイルパス**: `packages/cli/src/commands/feedback/create.ts`

```typescript
import { Command } from "commander";
import chalk from "chalk";
import { createFeedbackIssue } from "../../services/feedback-service";

export const createCommand = new Command("create")
  .description("Create a new feedback GitHub Issue (follows ISSUE_TEMPLATE/05-feedback.yml)")
  .requiredOption("--title <title>", "Issue title (auto-prefixed with [Feedback])")
  .requiredOption("--description <text>", "What happened / what did you notice?")
  .option("--type <type>", "Feedback type (bug|improvement|requirement-gap|spec-mismatch|security)")
  .option("--severity <level>", "Severity (critical|high|medium|low)")
  .option("--related-req <id>", "Related requirement ID")
  .option("--related-spec <id>", "Related specification ID")
  .action(async (options) => {
    try {
      const cwd = process.cwd();

      const issueNumber = await createFeedbackIssue(cwd, {
        title: options.title,
        description: options.description,
        type: options.type,
        severity: options.severity,
        relatedReq: options.relatedReq,
        relatedSpec: options.relatedSpec,
      });

      console.log(chalk.green(`✓ Created Feedback Issue #${issueNumber}`));
      console.log(chalk.gray(`  Label: feedback, reqord-generated`));
      console.log(chalk.gray(`  Updated .reqord/issues/feedbacks.yaml`));
    } catch (error) {
      console.error(chalk.red(`Error: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });
```

#### 3.2.8 resolve.ts（v2.0.0追加）

**ファイルパス**: `packages/cli/src/commands/feedback/resolve.ts`

```typescript
import { Command } from "commander";
import chalk from "chalk";
import { resolveFeedback } from "../../services/feedback-service";

export const resolveCommand = new Command("resolve")
  .description("Mark feedback as resolved on a requirement/specification")
  .argument("<artifact-id>", "Requirement or Specification ID (e.g., req-000006)")
  .requiredOption("--issue <number>", "GitHub issue number")
  .action(async (artifactId: string, options) => {
    try {
      const cwd = process.cwd();
      const issueNumber = parseInt(options.issue, 10);

      await resolveFeedback(cwd, { issueNumber, artifactId });

      console.log(
        chalk.green(
          `✓ Resolved feedback #${issueNumber} on ${artifactId}`
        )
      );
      console.log(chalk.gray(`  Added ${artifactId} to linkedTo.resolved`));
    } catch (error) {
      console.error(chalk.red(`Error: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });
```

### 3.3 コマンドグループ登録

**ファイルパス**: `packages/cli/src/commands/feedback/index.ts`

```typescript
import { Command } from "commander";
import { syncCommand } from "./sync"; // spec-000027
import { listCommand } from "./list";
import { showCommand } from "./show";
import { linkCommand } from "./link";
import { closeCommand } from "./close";
import { resolveCommand } from "./resolve"; // v2.0.0追加
import { unlinkCommand } from "./unlink"; // v3.0.0追加
import { createCommand } from "./create"; // v3.0.0追加

export const feedbackCommand = new Command("feedback")
  .description("Manage feedback (GitHub Issue integration)")
  .addCommand(syncCommand)
  .addCommand(listCommand)
  .addCommand(showCommand)
  .addCommand(linkCommand)
  .addCommand(closeCommand)
  .addCommand(resolveCommand)  // v2.0.0追加
  .addCommand(unlinkCommand)   // v3.0.0追加
  .addCommand(createCommand);  // v3.0.0追加
```

**メインエントリーポイント**: `packages/cli/src/index.ts`

```typescript
import { feedbackCommand } from "./commands/feedback";

const program = new Command();
// ... 既存コマンド
program.addCommand(feedbackCommand);
```

## 4. データフロー

### 4.1 Feedback一覧表示

```
1. ユーザー実行
   $ reqord feedback list --state open

2. listFeedbacks()
   ├─ loadIndex() でfeedbacks.yamlを読み込み
   ├─ フィルタリング（state, type）
   └─ テーブル表示

3. 出力例
   ┌───────┬────────┬────────────────┬──────────┬──────────────┬────────┐
   │ Issue │ State  │ Type           │ Severity │ Requirements │ Specs  │
   ├───────┼────────┼────────────────┼──────────┼──────────────┼────────┤
   │ #17   │ closed │ improvement    │ high     │ req-000006   │ -      │
   │ #21   │ open   │ improvement    │ medium   │ req-000022   │ -      │
   └───────┴────────┴────────────────┴──────────┴──────────────┴────────┘
```

### 4.2 Feedback詳細表示

```
1. ユーザー実行
   $ reqord feedback show 17

2. showFeedback()
   ├─ loadIndex() でfeedbacks.yamlから取得
   ├─ getIssue() でGitHub Issueから取得
   └─ マージして表示

3. 出力例
   Issue #17: AI補助機能のClaude Codeエコシステムへの分離
   State: closed
   Type: improvement
   Severity: high
   Linked Requirements: req-000006, req-000017
   Created: 2026-02-07T...

   --- Issue Body ---
   [本文表示]
```

### 4.3 既存Requirementへの紐付け

```
1. ユーザー実行
   $ reqord feedback link 17 --req req-000006 --type improvement --severity high

2. linkToRequirement()
   ├─ Requirementの存在確認（findByIdOrThrow）
   ├─ feedbacks.yaml更新
   │  ├─ linkedTo.requirements に追加
   │  └─ type, severity設定
   └─ Issue bodyにHTMLコメント挿入/更新
      └─ <!-- reqord:feedback {"type":"improvement","linkedTo":{"requirements":["req-000006"]}} -->

3. 出力
   ✓ Linked Feedback #17 to req-000006
```

### 4.4 新Requirement作成

```
1. ユーザー実行
   $ reqord feedback link 13 --created-req --type requirement-gap

2. linkWithNewRequirement()
   ├─ getIssue() でタイトル取得
   ├─ generateNextId() で連番採番
   ├─ createRequirement() で新Requirement作成
   ├─ origin: { feedbackIssue: 13 } を記録
   ├─ feedbacks.yaml更新（linkedTo.createdRequirements）
   └─ Issue bodyにHTMLコメント挿入/更新

3. 出力
   ✓ Created req-000024 from Feedback #13
```

### 4.5 Feedbackクローズ

```
1. ユーザー実行
   $ reqord feedback close 17

2. closeFeedback()
   ├─ feedbacks.yamlのstatus更新（closed）
   ├─ 影響範囲サマリー生成
   └─ gh issue close --comment でクローズ

3. 出力
   ✓ Closed Feedback #17
```

### 4.6 フィードバック解決（v2.0.0追加）

```
1. ユーザー実行
   $ reqord feedback resolve req-000006 --issue 17

2. resolveFeedback()
   ├─ feedbacks.yamlからfeedbackエントリを検索
   ├─ artifact-idがlinkedTo.requirementsに含まれるか検証
   └─ feedbacks.yamlのlinkedTo.resolvedに追加
      ├─ resolved.requirements にartifact-idを追加
      └─ 保存

3. 出力
   ✓ Resolved feedback #17 on req-000006
     Added req-000006 to linkedTo.resolved
```

### 4.7 Feedbackリンク解除（v3.0.0追加）

```
1. ユーザー実行
   $ reqord feedback unlink 224 --req req-000023

2. unlinkFromRequirement()
   ├─ feedbacks.yamlからfeedbackエントリを検索
   ├─ linkedTo.requirementsからreq-000023を削除
   ├─ feedbacks.yaml保存
   └─ Issue bodyのHTMLコメントを更新

3. 出力
   ✓ Unlinked Feedback #224 from req-000023
```

### 4.8 Feedback Issue作成（v3.0.0追加）

```
1. ユーザー実行
   $ reqord feedback create \
       --title "closeコマンドに警告がない" \
       --description "feedback close実行時に未解決feedbackがあっても警告なしでクローズされる" \
       --type improvement \
       --severity low

2. createFeedbackIssue()
   ├─ buildFeedbackIssueBody() でISSUE_TEMPLATE準拠のbody生成
   │  ├─ "### 何が起きた？ / 何に気づいた？" セクション
   │  ├─ "### フィードバックの種類" セクション
   │  └─ "### 深刻度" セクション（指定時）
   ├─ タイトルに "[Feedback] " prefix付与
   ├─ gh issue create --label feedback,reqord,improvement でGitHub Issue作成
   ├─ feedbacks.yamlに新規エントリ追加（type, severity設定）
   └─ feedbacks.yaml保存

3. 出力
   ✓ Created Feedback Issue #228
     Label: feedback
     Updated .reqord/issues/feedbacks.yaml
```

### 4.9 Close時の未解決feedback警告（v3.0.0改善）

```
1. ユーザー実行
   $ reqord feedback close 17

2. close処理
   ├─ checkRemainingFlags()
   │  ├─ linkedTo.requirementsのうちlinkedTo.resolved.requirementsに含まれないものを収集
   │  └─ linkedTo.specificationsのうちlinkedTo.resolved.specificationsに含まれないものを収集
   ├─ 未解決feedbackがあれば警告表示
   │  ⚠ Warning: Linked artifacts have unresolved feedbacks:
   │    - req-000006: unresolved (issue #17, high)
   ├─ closeFeedback()
   │  ├─ feedbacks.yamlのstatus更新（closed）
   │  └─ gh issue close --comment でクローズ
   └─ 未解決feedback案内表示

3. 出力
   ⚠ Warning: Linked artifacts have unresolved feedbacks:
     - req-000006: unresolved (issue #17, high)
   ✓ Closed Feedback #17
     Unresolved feedbacks remain on linked artifacts. Use 'reqord feedback resolve' to mark as resolved.
```

### 4.10 承認時未解決feedback警告（v2.0.0追加）

```
1. ユーザー実行
   $ reqord req approve req-000006

2. startApproval() 呼び出し前のチェック
   ├─ feedbackRepo.findUnresolvedByArtifactId(cwd, artifactId)
   │  └─ feedbacks.yamlからlinkedTo.requirementsに含まれ、かつlinkedTo.resolved.requirementsに含まれないfeedbackを検索
   └─ 未解決feedbackがある場合:
      ⚠ Warning: req-000006 has 1 unresolved feedback(s):
        - #17 (improvement, high)
      Proceeding with approval...

3. 承認処理は通常通り続行（警告のみ、ブロックしない）
```

**変更ファイル**:
- `packages/cli/src/commands/req/approve.ts`
- `packages/cli/src/commands/spec/approve.ts`

**実装**:
```typescript
import chalk from "chalk";
import * as feedbackRepo from "../../repositories/feedback";

// startApproval() 呼び出し前に追加
const unresolvedFeedbacks = await feedbackRepo.findUnresolvedByArtifactId(cwd, entity.id);
if (unresolvedFeedbacks.length > 0) {
  console.log(
    chalk.yellow(
      `⚠ Warning: ${entity.id} has ${unresolvedFeedbacks.length} unresolved feedback(s):`
    )
  );
  for (const fb of unresolvedFeedbacks) {
    console.log(
      chalk.yellow(
        `  - #${fb.githubIssue} (${fb.type ?? "unclassified"}, ${fb.severity ?? "medium"})`
      )
    );
  }
  console.log(chalk.yellow("Proceeding with approval..."));
  console.log();
}
```

**仕様**: 警告のみ（ブロックしない） — human-in-the-loop原則に従い、ユーザーに判断を委ねる

## 5. テスト方針

### 5.1 ユニットテスト

**feedback-service.test.ts**
- listFeedbacks(): フィルタリングロジック
- linkToRequirement(): 重複チェック、feedbacks.yaml更新
- linkWithNewRequirement(): ID採番、origin記録
- closeFeedback(): summary生成
- v2.0.0: resolveFeedback(): linkedTo.resolved追加
  - req-プレフィックスのアーティファクト解決
  - spec-プレフィックスのアーティファクト解決
  - linkedToに含まれないartifact-idの場合エラー
  - 既にresolvedに含まれている場合の重複防止
- v3.0.0: unlinkFromRequirement(): linkedToから削除
  - linkedToに含まれないreqの場合エラー
  - GitHub Issue body更新
- v3.0.0: unlinkFromSpecification(): linkedToから削除
  - linkedToに含まれないspecの場合エラー
- v3.0.0: createFeedbackIssue(): GitHub Issue作成 + feedbacks.yaml登録
  - feedbackラベル付きIssueが作成される
  - feedbacks.yamlに新規エントリが追加される
- v3.0.0: checkRemainingFlags(): 未解決feedback収集
  - linkedTo.requirementsのうちlinkedTo.resolved.requirementsに含まれないものを収集
  - linkedTo.specificationsのうちlinkedTo.resolved.specificationsに含まれないものを収集

**commands/feedback/*.test.ts**
- オプション解析
- エラーハンドリング
- JSON出力モード
- v2.0.0: resolve.ts: --issueオプション必須、artifact-idバリデーション
- v3.0.0: unlink.ts: --req/--specの排他チェック、リンクされていない場合のエラー
- v3.0.0: create.ts: --titleオプション必須、type/severityバリデーション
- v3.0.0: close.ts: 未解決feedback警告表示の検証

**commands/req/approve.test.ts / commands/spec/approve.test.ts**（v2.0.0追加）
- feedbackRepo.findUnresolvedByArtifactId()が未解決feedbackを返す場合に警告が表示される
- 未解決feedbackがない場合は警告なし
- 警告後も承認処理は続行される（ブロックしない）

### 5.2 統合テスト

**E2Eシナリオ**:
1. `reqord feedback sync` でGitHub Issueを同期
2. `reqord feedback list` で一覧表示
3. `reqord feedback show <issue>` で詳細確認
4. `reqord feedback link <issue> --req <id>` で紐付け
5. feedbacks.yamlのlinkedTo.requirementsに追加されることを確認
6. `reqord feedback close <issue>` でクローズ
7. GitHub Issue上でcloseされていることを確認
8. v2.0.0: `reqord feedback resolve <artifact-id> --issue <number>` でfeedback解決
9. v2.0.0: feedbacks.yamlのlinkedTo.resolvedに記録されることを確認
10. v2.0.0: 未解決feedbackがあるアーティファクトの承認時に警告が表示されることを確認
11. v3.0.0: `reqord feedback unlink <issue> --req <id>` でlinkedToから削除されることを確認
12. v3.0.0: `reqord feedback unlink <issue> --spec <id>` でlinkedToから削除されることを確認
13. v3.0.0: `reqord feedback create --title <title> --type <type>` でGitHub Issueが作成されfeedbacks.yamlに登録されることを確認
14. v3.0.0: `reqord feedback close <issue>` 実行時に未解決feedbackの警告が表示されることを確認

## 6. 技術的決定事項

### 6.1 feedbacks.yaml未存在時の挙動

**決定**: feedbacks.yamlにない場合でもlinkコマンドで新規エントリを作成

**理由**:
- `reqord feedback sync`実行を強制しない柔軟性
- GitHub Issueが先に作成され、後からreqordで管理開始するケースに対応

**実装**:
- linkコマンド実行時、feedbacks.yamlにissueNumberがなければ新規FeedbackEntryを作成
- syncコマンド実行で既存エントリとマージ

### 6.2 新Requirement作成時のタイトル形式

**決定**: `[Feedback #N] <GitHub Issueタイトル>`

**理由**:
- Feedbackからの派生であることを明示
- GitHub Issueとの対応が一目瞭然

**代替案（不採用）**:
- GitHub Issueタイトルそのまま: 起源が不明確
- ユーザー入力: 自動化の利点が減る

### 6.3 linkedToの重複防止

**決定**: 同じアーティファクトIDがlinkedToに既存の場合は追加しない

**理由**:
- 複数回linkコマンド実行時の冗長データ回避
- linkedToの整合性維持

**実装**:
```typescript
if (!feedback.linkedTo.requirements.includes(options.requirementId)) {
  feedback.linkedTo.requirements.push(options.requirementId);
}
```

### 6.4 --req/--created-req/--spec の排他制御

**決定**: linkコマンドで3つのオプションは排他的（1つのみ指定可能）

**理由**:
- 1つのFeedbackを複数の振り分けパターンに同時適用すると意図が不明確
- ユーザーが明示的に選択することでhuman-in-the-loop維持

**エラーメッセージ**:
```
Error: Specify exactly one of --req, --created-req, or --spec
```

### 6.5 close時のfeedback解決状態の保持方針

**決定**: Feedbackクローズ時にlinkedTo.resolvedは変更しない

**理由**:
- Feedbackのクローズは「影響範囲の確定」であり、「対応完了」ではない
- 解決はRequirement/Specification改訂完了時に`reqord feedback resolve`で明示的に行う

**影響範囲サマリー**:
- closeコマンドでGitHub Issueにコメント追加
- 未解決のfeedbackがあるRequirement/Specificationを明記
- human-in-the-loopを維持

### 6.6 resolve操作（v2.0.0）

**決定**: resolveはfeedbacks.yamlのlinkedTo.resolvedにアーティファクトIDを追加する

**理由**:
- feedbacks.yamlのlinkedTo/resolvedをSingle Source of Truthとして管理
- アーティファクト側（requirement/specification）にフラグデータを持たせない
- 未解決feedbackはlinkedToに含まれるがresolvedに含まれないアーティファクトとしてクエリで導出

### 6.7 承認時の警告方針（v2.0.0）

**決定**: 未解決feedbackがあるアーティファクトの承認時は警告のみ（ブロックしない）

**理由**:
- human-in-the-loop原則: ユーザーに判断を委ねる
- feedbackの内容によっては承認を優先する正当なケースがある
- ブロックすると`reqord feedback resolve`の実行を強制することになり柔軟性が失われる

**代替案（不採用）**:
- 承認ブロック + `--force`オプション: 過度に制限的
- 確認プロンプト: 自動化ワークフローで支障

### 6.8 resolveとcloseの関係（v2.0.0）

**決定**: resolveとcloseは独立した操作

**理由**:
- close: Feedbackの影響範囲が確定した時点で実行（GitHub Issueをクローズ）
- resolve: 個々のアーティファクトの対応が完了した時点で実行
- 1つのFeedbackが複数のアーティファクトにリンクされている場合、各アーティファクトは個別にresolveされる
- closeとresolveの実行順序に制約はない（closeしてからresolveも可能）

### 6.9 unlinkとresolveの使い分け（v3.0.0）

**決定**: unlinkは「誤ったリンクの解除」、resolveは「対応完了後の解決記録」

**理由**:
- unlink: linkedTo自体を削除する。紐付けが誤りだった場合に使用。トレーサビリティからも削除される
- resolve: linkedToは残し、resolvedに追加。正しいリンクで対応が完了した場合に使用
- 両者は意味的に異なる操作であり、結果のデータ状態も異なる

**使い分け例**:
| シナリオ | 操作 | 結果 |
|---------|------|------|
| 誤ってreq-000006にリンクした | `unlink --req req-000006` | linkedToから削除 |
| req-000006の改訂が完了した | `resolve req-000006 --issue 17` | linkedTo残存、resolved追加 |

### 6.10 close時の未解決feedback警告方針（v3.0.0）

**決定**: 警告のみ（ブロックしない）。closeは続行される

**理由**:
- human-in-the-loop原則: close判断はユーザーに委ねる
- 未解決feedbackがある状態でのcloseは正当なケース（影響範囲は確定したが対応はこれから）
- 警告により「未解決のfeedbackがある」ことをユーザーに明示

### 6.11 createコマンドのラベル管理（v3.0.0）

**決定**: `feedback` + `reqord` ラベルは必ず付与。`--type`指定時はtypeもラベルとして追加

**理由**:
- `feedback`ラベルはsync対象の判定に使用される必須ラベル
- `reqord`ラベルはCLIから作成されたことを示すトレーサビリティ用ラベル
- typeラベルはGitHub UI上での視認性向上のため
- `gh issue list --label reqord` でCLI経由の作成物をフィルタ可能
