# Feedback操作CLI - 技術設計書

## 1. 設計概要

Feedback一覧表示・詳細表示・紐付け・クローズの4つのCLIコマンドを提供する。本specは以下の責務を担う:

- **list**: index.jsonからFeedback一覧を表示（フィルタリング対応）
- **show**: GitHub Issue + index.jsonマージデータの詳細表示
- **link**: Requirement/Specificationへの紐付け + フラグ管理 + 新Requirement作成
- **close**: Feedbackクローズ + GitHub Issueクローズ

**依存関係**: spec-000027（FeedbackIndex管理）のZodスキーマ・Repository層を前提とする。

本機能は**未実装**であり、本設計書に基づき新規実装する。

## 2. アーキテクチャ

```
┌─────────────────────────────────────────────────────────┐
│ CLI Commands (packages/cli/src/commands/feedback/)     │
│ ├─ list.ts    - reqord feedback list                   │
│ ├─ show.ts    - reqord feedback show <issue-number>    │
│ ├─ link.ts    - reqord feedback link <issue-number>    │
│ └─ close.ts   - reqord feedback close <issue-number>   │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ FeedbackService (packages/cli/src/services/)           │
│ - Feedback操作のビジネスロジック                        │
│ - Requirement/Specificationとの紐付け                   │
│ - フラグ管理                                            │
└────────────┬──────────────────┬────────────────────────┘
             │                  │
             ▼                  ▼
┌────────────────────┐   ┌────────────────────┐
│ FeedbackRepository │   │ GitHubClient       │
│ (spec-000027)      │   │ (spec-000027)      │
│ - index.json       │   │ - gh CLI           │
└────────────────────┘   └────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────┐
│ RequirementService / SpecificationService      │
│ (既存実装)                                      │
│ - Requirement CRUD                             │
│ - フラグ追加/削除                               │
└────────────────────────────────────────────────┘
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

// Feedback詳細取得（GitHub Issue + index.json マージ）
export async function showFeedback(
  cwd: string,
  issueNumber: number
): Promise<ShowFeedbackResult> {
  const index = await loadIndex(cwd);
  const feedback = index.feedbacks.find((f) => f.githubIssue === issueNumber);

  if (!feedback) {
    throw new Error(`Feedback for issue #${issueNumber} not found in index.json. Run 'reqord feedback sync' first.`);
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
    // index.jsonにない場合は新規作成
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

  // index.json保存
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

  // index.json更新
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

  // index.jsonステータス更新
  feedback.status = "closed";
  await saveIndex(cwd, index);

  // 影響範囲サマリー生成
  const summary = buildImpactSummary(feedback);

  // GitHub Issueクローズ
  await closeIssue(issueNumber, summary);
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

  lines.push("", "Flags remain on linked requirements. Use `reqord req unflag` to remove when resolved.");

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
  .description("List feedback issues from index.json")
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
  .description("Show feedback details (GitHub Issue + index.json)")
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
  .description("Close feedback (updates index.json and closes GitHub Issue)")
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

### 3.3 コマンドグループ登録

**ファイルパス**: `packages/cli/src/commands/feedback/index.ts`

```typescript
import { Command } from "commander";
import { syncCommand } from "./sync"; // spec-000027
import { listCommand } from "./list";
import { showCommand } from "./show";
import { linkCommand } from "./link";
import { closeCommand } from "./close";

export const feedbackCommand = new Command("feedback")
  .description("Manage feedback (GitHub Issue integration)")
  .addCommand(syncCommand)
  .addCommand(listCommand)
  .addCommand(showCommand)
  .addCommand(linkCommand)
  .addCommand(closeCommand);
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
   ├─ loadIndex() でindex.jsonを読み込み
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
   ├─ loadIndex() でindex.jsonから取得
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
   ├─ index.json更新
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
   ├─ index.json更新（linkedTo.createdRequirements）
   └─ Issue bodyにHTMLコメント挿入/更新

3. 出力
   ✓ Created req-000024 from Feedback #13
```

### 4.5 Feedbackクローズ

```
1. ユーザー実行
   $ reqord feedback close 17

2. closeFeedback()
   ├─ index.jsonのstatus更新（closed）
   ├─ 影響範囲サマリー生成
   └─ gh issue close --comment でクローズ

3. 出力
   ✓ Closed Feedback #17
     Flags remain on linked requirements
```

## 5. テスト方針

### 5.1 ユニットテスト

**feedback-service.test.ts**
- listFeedbacks(): フィルタリングロジック
- linkToRequirement(): 重複チェック、flagが既に存在する場合
- linkWithNewRequirement(): ID採番、origin記録
- closeFeedback(): summary生成

**commands/feedback/*.test.ts**
- オプション解析
- エラーハンドリング
- JSON出力モード

### 5.2 統合テスト

**E2Eシナリオ**:
1. `reqord feedback sync` でGitHub Issueを同期
2. `reqord feedback list` で一覧表示
3. `reqord feedback show <issue>` で詳細確認
4. `reqord feedback link <issue> --req <id>` で紐付け
5. Requirement JSONにflagが追加されることを確認
6. `reqord feedback close <issue>` でクローズ
7. GitHub Issue上でcloseされていることを確認

## 6. 技術的決定事項

### 6.1 index.json未存在時の挙動

**決定**: index.jsonにない場合でもlinkコマンドで新規エントリを作成

**理由**:
- `reqord feedback sync`実行を強制しない柔軟性
- GitHub Issueが先に作成され、後からreqordで管理開始するケースに対応

**実装**:
- linkコマンド実行時、index.jsonにissueNumberがなければ新規FeedbackEntryを作成
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
- flagの除去はRequirement改訂完了時に`reqord req unflag`で明示的に行う

**影響範囲サマリー**:
- closeコマンドでGitHub Issueにコメント追加
- flagsが残っているRequirementを明記
- human-in-the-loopを維持
