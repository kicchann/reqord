# Feedback操作CLI - 技術設計書

## 1. 設計概要

Feedback一覧表示・詳細表示・紐付け・クローズの4つのCLIコマンドを提供する。本specは以下の責務を担う:

- **list**: index.yamlからFeedback一覧を表示（フィルタリング対応）
- **show**: GitHub Issue + index.yamlマージデータの詳細表示
- **link**: Requirement/Specificationへの紐付け + フラグ管理 + 新Requirement作成
- **close**: Feedbackクローズ + GitHub Issueクローズ

**依存関係**: spec-000027（FeedbackIndex管理）のZodスキーマ・Repository層を前提とする。

### v2.0.0 追加スコープ

- **resolve**: フラグ解決 + `linkedTo.resolved`への記録（SC-11対応）
- **承認時flag警告**: flags付きアーティファクト承認時の警告表示（SC-13対応）

## 2. アーキテクチャ

```
┌─────────────────────────────────────────────────────────┐
│ CLI Commands (packages/cli/src/commands/feedback/)     │
│ ├─ list.ts    - reqord feedback list                   │
│ ├─ show.ts    - reqord feedback show <issue-number>    │
│ ├─ link.ts    - reqord feedback link <issue-number>    │
│ ├─ close.ts   - reqord feedback close <issue-number>   │
│ └─ resolve.ts - reqord feedback resolve <artifact-id>  │  ← v2.0.0
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ FeedbackService (packages/cli/src/services/)           │
│ - Feedback操作のビジネスロジック                        │
│ - Requirement/Specificationとの紐付け                   │
│ - フラグ管理                                            │
│ - フラグ解決 (v2.0.0)                                   │
└────────────┬──────────────────┬────────────────────────┘
             │                  │
             ▼                  ▼
┌────────────────────┐   ┌────────────────────┐
│ FeedbackRepository │   │ GitHubClient       │
│ (spec-000027)      │   │ (spec-000027)      │
│ - index.yaml       │   │ - gh CLI           │
└────────────────────┘   └────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────┐
│ RequirementService / SpecificationService      │
│ (既存実装)                                      │
│ - Requirement CRUD                             │
│ - フラグ追加/削除                               │
└────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Approval Warning (v2.0.0)                              │
│ ├─ commands/req/approve.ts  - flags警告追加             │
│ └─ commands/spec/approve.ts - flags警告追加             │
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
import { getIssue, closeIssue, updateIssueBody, type GitHubIssue } from "./github-client";
import { findById as findRequirementById, save as saveRequirement } from "../repositories/requirement";
import { createRequirement } from "./requirement-service";
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

// Feedback詳細取得（GitHub Issue + index.yaml マージ）
export async function showFeedback(
  cwd: string,
  issueNumber: number
): Promise<ShowFeedbackResult> {
  const index = await loadIndex(cwd);
  const feedback = index.feedbacks.find((f) => f.githubIssue === issueNumber);

  if (!feedback) {
    throw new Error(`Feedback for issue #${issueNumber} not found in index.yaml. Run 'reqord feedback sync' first.`);
  }

  const issue = await getIssue(issueNumber);

  return { feedback, issue };
}

// 既存Requirementへの紐付け
export async function linkToRequirement(
  cwd: string,
  options: LinkToRequirementOptions
): Promise<void> {
  const index = await loadIndex(cwd);
  let feedback = index.feedbacks.find((f) => f.githubIssue === options.issueNumber);

  if (!feedback) {
    // index.yamlにない場合は新規作成
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

  // index.yaml保存
  await saveIndex(cwd, index);

  // Requirementにfeedback-reviewフラグ追加
  const requirement = await findRequirementById(cwd, options.requirementId);
  if (!requirement) {
    throw new Error(`Requirement ${options.requirementId} not found`);
  }

  const flagExists = requirement.flags?.some(
    (f) => f.type === "feedback-review" && f.relatedIssues?.includes(options.issueNumber)
  );

  if (!flagExists) {
    requirement.flags = requirement.flags || [];
    requirement.flags.push({
      type: "feedback-review",
      reason: `Feedback from issue #${options.issueNumber}`,
      createdAt: new Date().toISOString(),
      relatedIssues: [options.issueNumber],
      severity: options.severity || "medium",
    });
    await saveRequirement(cwd, requirement);
  }

  // GitHub Issue bodyにHTMLコメントを挿入/更新
  const issue = await getIssue(options.issueNumber);
  const newBody = upsertReqordComment(issue.body ?? "", {
    type: feedback.type,
    severity: feedback.severity,
    linkedTo: feedback.linkedTo,
  });
  await updateIssueBody(options.issueNumber, newBody);
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

  // index.yaml更新
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
  const newBody = upsertReqordComment(issue.body ?? "", {
    type: feedback.type,
    severity: feedback.severity,
    linkedTo: feedback.linkedTo,
  });
  await updateIssueBody(options.issueNumber, newBody);

  return nextId;
}

// Specificationへの紐付け
export async function linkToSpecification(
  cwd: string,
  options: LinkToSpecificationOptions
): Promise<void> {
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
  const issue = await getIssue(options.issueNumber);
  const newBody = upsertReqordComment(issue.body ?? "", {
    type: feedback.type,
    severity: feedback.severity,
    linkedTo: feedback.linkedTo,
  });
  await updateIssueBody(options.issueNumber, newBody);
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

  // index.yamlステータス更新
  feedback.status = "closed";
  await saveIndex(cwd, index);

  // 影響範囲サマリー生成
  const summary = buildImpactSummary(feedback);

  // GitHub Issueクローズ
  await closeIssue(issueNumber, summary);
}

// v2.0.0: フラグ解決（SC-11）
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
      `Feedback for issue #${options.issueNumber} not found in index.yaml`
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

  // Step 1: アーティファクトからfeedback-reviewフラグを削除（先に実行 = 安全側）
  if (isReq) {
    const requirement = await findRequirementById(cwd, options.artifactId);
    if (!requirement) {
      throw new Error(`Requirement ${options.artifactId} not found`);
    }
    requirement.flags = (requirement.flags || []).filter(
      (f) =>
        !(
          f.type === "feedback-review" &&
          f.relatedIssues?.includes(options.issueNumber)
        )
    );
    await saveRequirement(cwd, requirement);
  } else {
    // Specification flagの削除（同様のロジック）
    const specification = await findSpecificationById(cwd, options.artifactId);
    if (!specification) {
      throw new Error(`Specification ${options.artifactId} not found`);
    }
    specification.flags = (specification.flags || []).filter(
      (f) =>
        !(
          f.type === "feedback-review" &&
          f.relatedIssues?.includes(options.issueNumber)
        )
    );
    await saveSpecification(cwd, specification);
  }

  // Step 2: index.yamlのlinkedTo.resolvedに追加
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

  lines.push("", "Flags remain on linked artifacts. Use `reqord feedback resolve` to remove when resolved.");

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
  .description("List feedback issues from index.yaml")
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
  .description("Show feedback details (GitHub Issue + index.yaml)")
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
        console.log(chalk.gray(`  Added feedback-review flag to ${options.req}`));
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
  .description("Close feedback (updates index.yaml and closes GitHub Issue)")
  .argument("<issue-number>", "GitHub issue number")
  .action(async (issueNumberStr: string) => {
    try {
      const cwd = process.cwd();
      const issueNumber = parseInt(issueNumberStr, 10);

      await closeFeedback(cwd, issueNumber);

      console.log(chalk.green(`✓ Closed Feedback #${issueNumber}`));
      console.log(chalk.gray("  Flags remain on linked requirements"));
    } catch (error) {
      console.error(chalk.red(`Error: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });
```

#### 3.2.5 resolve.ts（v2.0.0追加）

**ファイルパス**: `packages/cli/src/commands/feedback/resolve.ts`

```typescript
import { Command } from "commander";
import chalk from "chalk";
import { resolveFeedback } from "../../services/feedback-service";

export const resolveCommand = new Command("resolve")
  .description("Resolve feedback flag on a requirement/specification")
  .argument("<artifact-id>", "Requirement or Specification ID (e.g., req-000006)")
  .requiredOption("--issue <number>", "GitHub issue number")
  .action(async (artifactId: string, options) => {
    try {
      const cwd = process.cwd();
      const issueNumber = parseInt(options.issue, 10);

      await resolveFeedback(cwd, { issueNumber, artifactId });

      console.log(
        chalk.green(
          `✓ Resolved feedback #${issueNumber} flag on ${artifactId}`
        )
      );
      console.log(chalk.gray(`  Removed feedback-review flag from ${artifactId}`));
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

export const feedbackCommand = new Command("feedback")
  .description("Manage feedback (GitHub Issue integration)")
  .addCommand(syncCommand)
  .addCommand(listCommand)
  .addCommand(showCommand)
  .addCommand(linkCommand)
  .addCommand(closeCommand)
  .addCommand(resolveCommand); // v2.0.0追加
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
   ├─ loadIndex() でindex.yamlを読み込み
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
   ├─ loadIndex() でindex.yamlから取得
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
   ├─ index.yaml更新
   │  ├─ linkedTo.requirements に追加
   │  └─ type, severity設定
   ├─ Requirement JSON読み込み
   │  ├─ feedback-reviewフラグ追加
   │  └─ 保存
   └─ Issue bodyにHTMLコメント挿入/更新
      └─ <!-- reqord:feedback {"type":"improvement","linkedTo":{"requirements":["req-000006"]}} -->

3. 出力
   ✓ Linked Feedback #17 to req-000006
     Added feedback-review flag to req-000006
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
   ├─ index.yaml更新（linkedTo.createdRequirements）
   └─ Issue bodyにHTMLコメント挿入/更新

3. 出力
   ✓ Created req-000024 from Feedback #13
```

### 4.5 Feedbackクローズ

```
1. ユーザー実行
   $ reqord feedback close 17

2. closeFeedback()
   ├─ index.yamlのstatus更新（closed）
   ├─ 影響範囲サマリー生成
   └─ gh issue close --comment でクローズ

3. 出力
   ✓ Closed Feedback #17
     Flags remain on linked requirements
```

### 4.6 フラグ解決（v2.0.0追加）

```
1. ユーザー実行
   $ reqord feedback resolve req-000006 --issue 17

2. resolveFeedback()
   ├─ index.yamlからfeedbackエントリを検索
   ├─ artifact-idがlinkedTo.requirementsに含まれるか検証
   ├─ Step 1: アーティファクトからflag削除（先に実行 = 安全側）
   │  ├─ Requirement/Specification読み込み
   │  ├─ feedback-reviewフラグ（relatedIssues一致）を除去
   │  └─ 保存
   └─ Step 2: index.yamlのlinkedTo.resolvedに追加
      ├─ resolved.requirements にartifact-idを追加
      └─ 保存

3. 出力
   ✓ Resolved feedback #17 flag on req-000006
     Removed feedback-review flag from req-000006
     Added req-000006 to linkedTo.resolved
```

### 4.7 承認時flag警告（v2.0.0追加）

```
1. ユーザー実行
   $ reqord req approve req-000006

2. startApproval() 呼び出し前のチェック
   ├─ entity.flags を確認
   └─ flags.length > 0 の場合:
      ⚠ Warning: req-000006 has 1 unresolved feedback flag(s):
        - feedback-review: Feedback from issue #17 (medium)
      Proceeding with approval...

3. 承認処理は通常通り続行（警告のみ、ブロックしない）
```

**変更ファイル**:
- `packages/cli/src/commands/req/approve.ts`
- `packages/cli/src/commands/spec/approve.ts`

**実装**:
```typescript
import chalk from "chalk";

// startApproval() 呼び出し前に追加
if (entity.flags && entity.flags.length > 0) {
  console.log(
    chalk.yellow(
      `⚠ Warning: ${entity.id} has ${entity.flags.length} unresolved feedback flag(s):`
    )
  );
  for (const flag of entity.flags) {
    console.log(
      chalk.yellow(
        `  - ${flag.type}: ${flag.reason} (${flag.severity})`
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
- linkToRequirement(): 重複チェック、flagが既に存在する場合
- linkWithNewRequirement(): ID採番、origin記録
- closeFeedback(): summary生成
- v2.0.0: resolveFeedback(): フラグ削除 + linkedTo.resolved追加
  - req-プレフィックスのアーティファクト解決
  - spec-プレフィックスのアーティファクト解決
  - linkedToに含まれないartifact-idの場合エラー
  - 既にresolvedに含まれている場合の重複防止
  - 操作順序: flag削除 → resolved追加（部分的障害時の安全性）

**commands/feedback/*.test.ts**
- オプション解析
- エラーハンドリング
- JSON出力モード
- v2.0.0: resolve.ts: --issueオプション必須、artifact-idバリデーション

**commands/req/approve.test.ts / commands/spec/approve.test.ts**（v2.0.0追加）
- flags配列が空でない場合に警告が表示される
- flags配列が空の場合は警告なし
- 警告後も承認処理は続行される（ブロックしない）

### 5.2 統合テスト

**E2Eシナリオ**:
1. `reqord feedback sync` でGitHub Issueを同期
2. `reqord feedback list` で一覧表示
3. `reqord feedback show <issue>` で詳細確認
4. `reqord feedback link <issue> --req <id>` で紐付け
5. Requirement YAMLにflagが追加されることを確認
6. `reqord feedback close <issue>` でクローズ
7. GitHub Issue上でcloseされていることを確認
8. v2.0.0: `reqord feedback resolve <artifact-id> --issue <number>` でflag解決
9. v2.0.0: アーティファクトからfeedback-reviewフラグが除去されることを確認
10. v2.0.0: index.yamlのlinkedTo.resolvedに記録されることを確認
11. v2.0.0: flags付きアーティファクトの承認時に警告が表示されることを確認

## 6. 技術的決定事項

### 6.1 index.yaml未存在時の挙動

**決定**: index.yamlにない場合でもlinkコマンドで新規エントリを作成

**理由**:
- `reqord feedback sync`実行を強制しない柔軟性
- GitHub Issueが先に作成され、後からreqordで管理開始するケースに対応

**実装**:
- linkコマンド実行時、index.yamlにissueNumberがなければ新規FeedbackEntryを作成
- syncコマンド実行で既存エントリとマージ

### 6.2 新Requirement作成時のタイトル形式

**決定**: `[Feedback #N] <GitHub Issueタイトル>`

**理由**:
- Feedbackからの派生であることを明示
- GitHub Issueとの対応が一目瞭然

**代替案（不採用）**:
- GitHub Issueタイトルそのまま: 起源が不明確
- ユーザー入力: 自動化の利点が減る

### 6.3 フラグの重複防止

**決定**: 同じIssue番号のfeedback-reviewフラグが既存の場合は追加しない

**理由**:
- 複数回linkコマンド実行時の冗長データ回避
- flagsの整合性維持

**実装**:
```typescript
const flagExists = requirement.flags?.some(
  (f) => f.type === "feedback-review" && f.relatedIssues?.includes(issueNumber)
);
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

### 6.5 close時のflag除去しない方針

**決定**: Feedbackクローズ時にRequirementのflagsは残す

**理由**:
- Feedbackのクローズは「影響範囲の確定」であり、「対応完了」ではない
- flagの除去はRequirement改訂完了時に`reqord feedback resolve`で明示的に行う

**影響範囲サマリー**:
- closeコマンドでGitHub Issueにコメント追加
- flagsが残っているRequirementを明記
- human-in-the-loopを維持

### 6.6 resolve操作順序（v2.0.0）

**決定**: アーティファクトのflag削除 → index.yamlのresolved追加 の順序

**理由**:
- 部分的障害対策として、先にflagを消す方が安全
- flag残存 + resolved記録なし の状態は、flagが永久に残る問題がある
- flag削除済み + resolved記録なし の状態は、resolveを再実行すれば回復可能

**エラーケース**:
| 障害発生タイミング | 状態 | 回復方法 |
|-------------------|------|---------|
| flag削除後、resolved追加前 | flagなし + resolved未記録 | resolveを再実行 |
| resolved追加後 | 正常完了 | - |

### 6.7 承認時の警告方針（v2.0.0）

**決定**: flags付きアーティファクトの承認時は警告のみ（ブロックしない）

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
- resolve: 個々のアーティファクトのflagを解決した時点で実行
- 1つのFeedbackが複数のアーティファクトにリンクされている場合、各アーティファクトは個別にresolveされる
- closeとresolveの実行順序に制約はない（closeしてからresolveも可能）
