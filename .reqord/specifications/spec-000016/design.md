# GitHub Issue生成 - 技術設計書

## 1. 設計概要

構造化されたタスク定義ファイル（JSON）からGitHub Issueを作成し、同期・検証する機能を提供する。`reqord issue create <spec-id> --tasks-file <path>` コマンドにより、事前に定義されたタスクリストをGitHub Issueとして一括作成し、`.reqord/issues/tasks.yaml` にタスクエントリとして記録する。構造化Markdownによる本文生成、HTMLコメントタグによるメタデータ（spec-id）埋め込み、`--dry-run` によるプレビューをサポートする。

**スコープ:** Issue作成（`create`）、状態同期（`sync` / `sync-all`）、メタデータ検証（`validate`）を含む。

**v1.1.0変更（Feedback #17）:** AI駆動のタスク分解（Anthropic SDK）はClaude Codeエコシステムに移管。reqordは構造化タスク定義（`--tasks-file`）からのIssue作成に集中する。タスク分解・並列グループ分析・クリティカルパス計算はClaude Code側の責務。

## 2. アーキテクチャ

```
Command Layer:  commands/issue/create.ts      (新規)
                    ↓
Service Layer:  services/issue-service.ts      (新規)
                    ↓
Repository:     repositories/specification.ts  (既存)
                repositories/github.ts         (既存 - GitHub PR作成あり)
                services/github-client.ts      (既存 - Issue取得・更新あり)
                    ↓
External:       gh CLI (Issue作成)
                    ↓
Storage:        .reqord/issues/tasks.yaml (タスクエントリ)
                GitHub Issues
```

### 既存パターンの踏襲

プロジェクトの確立されたアーキテクチャに従う:
- **Command層:** Commander.js + chalk装飾 + handleError()
- **Service層:** ビジネスロジック集約、複数リポジトリ調整
- **Repository層:** データ永続化、Zod検証必須

参考実装: `commands/req/create.ts` → `services/requirement-service.ts` → `repositories/requirement.ts`

## 3. コンポーネント設計

### 3.1 createコマンド (`commands/issue/create.ts` - 新規)

**責務:** Issue生成の実行と結果表示。

```
reqord issue create <spec-id> --tasks-file <path> [options]
```

| オプション | 説明 |
|-----------|------|
| `<spec-id>` | 対象のSpecification ID（必須） |
| `--tasks-file <path>` | タスク定義ファイルパス（必須） |
| `--dry-run` | Issue作成をせずプレビュー表示のみ |
| `--json` | 構造化JSON出力 |
| `--max-issues <n>` | 生成Issue最大数（デフォルト: 20） |

**実装パターン（既存コマンド参考）:**

```typescript
import { Command } from "commander";
import chalk from "chalk";
import { handleError } from "../../utils/error-handler.js";
import * as issueService from "../../services/issue-service.js";

export function registerCreateCommand(program: Command) {
  program
    .command("create")
    .description("構造化タスク定義からGitHub Issueを作成")
    .argument("<spec-id>", "Specification ID")
    .requiredOption("--tasks-file <path>", "タスク定義ファイルパス")
    .option("--dry-run", "プレビューのみ（Issue作成しない）")
    .option("--json", "JSON形式で出力")
    .option("--max-issues <n>", "Issue最大数", "20")
    .action(async (specId, options) => {
      try {
        const cwd = process.cwd();
        const result = await issueService.createIssuesFromSpec(cwd, {
          specId,
          tasksFile: options.tasksFile,
          dryRun: options.dryRun,
          maxIssues: parseInt(options.maxIssues, 10),
        });

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          // テーブル表示（cli-table3）
          displayIssuesTable(result, options.dryRun);
        }
      } catch (error) {
        handleError(error);
      }
    });
}
```

### 3.2 IssueService (`services/issue-service.ts` - 新規)

**責務:** タスク定義ファイルの読み込み・検証、GitHub Issue作成、tasks.yaml記録の調整。

```typescript
import * as specRepo from "../repositories/specification.js";
import * as githubClient from "./github-client.js";
import { TaskDefinitionFileSchema, type TaskDefinitionFile, type TaskDefinition } from "@reqord/shared";
import * as fs from "../utils/file-system.js";

export interface CreateIssuesOptions {
  specId: string;
  tasksFile: string;
  dryRun?: boolean;
  maxIssues?: number;
}

export interface CreateIssuesResult {
  specId: string;
  issues: CreatedIssue[];
  totalEstimatedHours: number;
}

export interface CreatedIssue {
  title: string;
  number?: number;      // dry-run時はundefined
  url?: string;         // dry-run時はundefined
  priority: string;
  estimatedHours: number;
  labels: string[];
}

export async function createIssuesFromSpec(
  cwd: string,
  options: CreateIssuesOptions,
): Promise<CreateIssuesResult> {
  // 1. Specification検証
  const spec = await specRepo.findById(cwd, options.specId);
  if (!spec) {
    throw new Error(`Specification not found: ${options.specId}`);
  }
  if (spec.status !== "approved") {
    throw new Error(
      `Specification must be approved (current: ${spec.status})`
    );
  }

  // 2. タスク定義ファイル読み込み・検証
  const tasksFile = await loadTasksFile(cwd, options.tasksFile);
  if (options.maxIssues != null && tasksFile.tasks.length > options.maxIssues) {
    throw new Error(
      `Task count (${tasksFile.tasks.length}) exceeds max (${options.maxIssues})`
    );
  }

  // 3. 各タスクをIssueとして作成
  const issues: CreatedIssue[] = [];
  for (const task of tasksFile.tasks) {
    const issueBody = buildIssueBody(options.specId, task);
    const labels = buildLabels(task);

    if (!options.dryRun) {
      const created = await githubClient.createIssue({
        title: task.title,
        body: issueBody,
        labels,
      });
      issues.push({
        title: task.title,
        number: created.number,
        url: created.url,
        priority: task.priority,
        estimatedHours: task.estimatedHours,
        labels,
      });
    } else {
      issues.push({
        title: task.title,
        priority: task.priority,
        estimatedHours: task.estimatedHours,
        labels,
      });
    }
  }

  // 5. tasks.yamlに記録（dry-run時はスキップ）
  if (!options.dryRun) {
    await writeTasksToYaml(cwd, options.specId, {
      issues: issues.map((i) => ({
        number: i.number!,
        title: i.title,
        url: i.url!,
        estimatedHours: i.estimatedHours,
        status: "open",
      })),
      createdAt: new Date().toISOString(),
    });
  }

  const totalEstimatedHours = tasksFile.tasks.reduce(
    (sum, t) => sum + t.estimatedHours,
    0
  );

  return {
    specId: options.specId,
    issues,
    totalEstimatedHours,
  };
}

function buildIssueBody(
  specId: string,
  task: TaskDefinition,
): string {
  // HTMLコメントタグ埋め込み
  const metadata = `<!-- reqord:specification {"specificationId":"${specId}"} -->\n\n`;

  // Markdown形式でIssue bodyを構築
  // NOTE: ISSUE_TEMPLATEはGitHub UI用のYAML form定義であり、
  // gh issue create --body-file - でbodyを直接渡す場合には使用しない。
  return (
    metadata +
    `## 説明\n\n${task.description}\n\n` +
    `## 見積もり\n\n${task.estimatedHours}時間\n\n` +
    `## 優先度\n\n${task.priority}\n\n` +
    (task.dependencies.length > 0
      ? `## 依存タスク\n\n${task.dependencies.map((d) => `- ${d}`).join("\n")}\n\n`
      : "")
  );
}

function buildLabels(task: TaskDefinition): string[] {
  return ["reqord-generated", task.priority];
}

async function loadTasksFile(
  cwd: string,
  filePath: string,
): Promise<TaskDefinitionFile> {
  const fullPath = fs.joinPath(cwd, filePath);
  if (!(await fs.exists(fullPath))) {
    throw new Error(`Tasks file not found: ${filePath}`);
  }
  const content = await fs.readText(fullPath);
  const raw = JSON.parse(content);
  // Zodスキーマで検証
  return TaskDefinitionFileSchema.parse(raw);
}

async function writeTasksToYaml(
  cwd: string,
  specId: string,
  data: TasksData,
): Promise<void> {
  // .reqord/issues/tasks.yaml にタスクエントリを追記
  const tasksYamlPath = fs.joinPath(cwd, ".reqord", "issues", "tasks.yaml");
  const existing = await loadTasksYaml(tasksYamlPath);
  const newEntries = data.issues.map((i) => ({
    number: i.number,
    title: i.title,
    linkedTo: { specifications: [specId] },
    url: i.url,
    estimatedHours: i.estimatedHours,
    status: i.status,
    syncedAt: new Date().toISOString(),
  }));
  existing.tasks.push(...newEntries);
  await saveTasksYaml(tasksYamlPath, existing);
}
```

### 3.3 GitHubClient拡張 (`services/github-client.ts` - 既存ファイルに追加)

**既存実装:** `listFeedbackIssues()`, `getIssue()`, `updateIssueBody()`, `closeIssue()`

**追加関数:**

```typescript
export interface CreateIssueOptions {
  title: string;
  body: string;
  labels: string[];
}

export interface CreatedIssue {
  number: number;
  url: string;
}

export async function createIssue(
  options: CreateIssueOptions,
): Promise<CreatedIssue> {
  const args = [
    "issue",
    "create",
    "--title",
    options.title,
    "--label",
    options.labels.join(","),
    "--body-file",
    "-",
  ];

  // bodyは大きくなる可能性があるためstdin経由で渡す（エスケープ問題回避）
  const proc = spawn("gh", args);
  proc.stdin.write(options.body);
  proc.stdin.end();

  const stdout = await new Promise<string>((resolve, reject) => {
    let data = "";
    let stderr = "";
    proc.stdout.on("data", (chunk) => (data += chunk));
    proc.stderr.on("data", (chunk) => (stderr += chunk));
    proc.on("close", (code) => {
      if (code === 0) resolve(data);
      else reject(new Error(`gh issue create failed (code ${code}): ${stderr}`));
    });
  });

  // stdout から Issue URLを抽出
  const match = stdout.match(/https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/(\d+)/);
  if (!match) {
    throw new Error("Failed to extract issue URL from gh output");
  }

  return {
    number: parseInt(match[1], 10),
    url: match[0],
  };
}
```

**実装パターン参考:** 既存の `repositories/github.ts` の `createPullRequest()` と同じspawn + stdin パターン。

### 3.4 TaskDefinitionスキーマ (`packages/shared/src/schemas/task.ts` - 新規)

```typescript
import { z } from "zod";

export const TaskDefinitionSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  priority: z.enum(["P0", "P1", "P2", "P3"]).default("P2"),
  estimatedHours: z.number().positive(),
  dependencies: z.array(z.string()).default([]),
});

export const TaskDefinitionFileSchema = z.object({
  tasks: z.array(TaskDefinitionSchema).min(1),
});

export type TaskDefinition = z.infer<typeof TaskDefinitionSchema>;
export type TaskDefinitionFile = z.infer<typeof TaskDefinitionFileSchema>;
```

### 3.5 GitHub Issue Template (`.github/ISSUE_TEMPLATE/reqord-implementation.yml` - 新規)

**目的:** reqordから自動生成されるIssueのフォーマット統一。

```yaml
name: reqord実装タスク
description: reqordから自動生成された実装タスク
title: "[Task] "
labels: ["reqord-generated"]

body:
  - type: markdown
    attributes:
      value: |
        このIssueはreqordから自動生成されました。

  - type: textarea
    id: description
    attributes:
      label: タスク説明
      description: このタスクの詳細
    validations:
      required: true

  - type: input
    id: estimated-hours
    attributes:
      label: 見積時間
      description: 実装にかかる推定時間（時間）
      placeholder: "4"
    validations:
      required: false

  - type: textarea
    id: dependencies
    attributes:
      label: 依存タスク
      description: このタスクが依存する他のタスク
      placeholder: |
        - タスク1
        - タスク2
    validations:
      required: false

  - type: dropdown
    id: priority
    attributes:
      label: 優先度
      options:
        - P0 (クリティカル)
        - P1 (高)
        - P2 (中)
        - P3 (低)
      default: 2
    validations:
      required: false
```

## 4. データフロー

### Issue生成フロー

```
ユーザー → reqord issue create spec-000016 --tasks-file ./tasks.json
  → createCommand.action("spec-000016", { tasksFile: "./tasks.json" })
    → issueService.createIssuesFromSpec(cwd, options)
      → specRepo.findById(cwd, "spec-000016") → Specification取得
        → status === "approved" を検証
      → loadTasksFile(cwd, "./tasks.json")
        → fs.readText() → JSON.parse() → TaskDefinitionFileSchema.parse()
        → { tasks: [{ title, description, priority, estimatedHours, dependencies }, ...] }
      → 各タスクに対して:
        → buildIssueBody(specId, task)
          → HTMLコメントタグ挿入: <!-- reqord:specification {"specificationId":"spec-000016"} -->
          → Markdown形式でbody構築（説明・見積もり・優先度・依存タスク）
        → buildLabels(task)
          → ["reqord-generated", "P0"] 等
        → githubClient.createIssue({ title, body, labels })
          → gh issue create --title "..." --label "..." (stdin経由でbody)
          → stdout から Issue# と URL を抽出
      → writeTasksToYaml(cwd, specId, data)
        → tasks.yaml に追記（issueNumber, specId, title, url, estimatedHours, status）
        → saveTasksYaml(tasksYamlPath, existing)
    → CreateIssuesResult返却
  → テーブル表示（cli-table3）:
    | # | タイトル | 優先度 | 見積 | Issue# | URL |
    | 1 | スキーマ定義 | P0 | 2h | #112 | https://... |
    | 2 | Repository実装 | P1 | 4h | #113 | https://... |
```

### dry-runフロー

```
ユーザー → reqord issue create spec-000016 --tasks-file ./tasks.json --dry-run
  → createIssuesFromSpec(..., { dryRun: true })
    → Specification検証 + タスクファイル読み込みは同じ
    → githubClient.createIssue() はスキップ
    → writeTasksToYaml() はスキップ
  → プレビューテーブル表示:
    | # | タイトル | 優先度 | 見積 | 依存 |
    | 1 | スキーマ定義 | P0 | 2h | - |
    | 2 | Repository実装 | P1 | 4h | スキーマ定義 |
```

## 5. テスト方針

### ユニットテスト

- **issue-service.createIssuesFromSpec**:
  - Specification未承認時のエラー
  - tasks-file読み込み失敗時のエラー
  - maxIssues超過時のエラー
  - dry-runモードでGitHub API呼び出しなし
  - issue生成後のtasks.yaml記録検証
- **issue-service.buildIssueBody**:
  - HTMLコメントタグ埋め込み検証
  - Markdown形式の本文生成（説明・見積もり・優先度・依存タスク）
- **issue-service.buildLabels**:
  - `reqord-generated` + 優先度ラベルの生成
- **github-client.createIssue**:
  - spawn + stdin パターンの動作（モック化）
  - Issue番号・URL抽出ロジック
- **TaskDefinitionFileSchema**:
  - 正常系: 全フィールド定義済み
  - 不正系: title欠落、estimatedHours負数、空配列

### 統合テスト

- **create コマンド（dry-run）**:
  - Specification作成 → tasks.json準備 → issue create --dry-run
  - プレビュー表示のみ、JSON未変更を確認
- **create コマンド（実行）**:
  - GitHub API呼び出しモック化
  - tasks.yaml のタスクエントリ記録検証
- **--json 出力フォーマット検証**

### E2Eテスト（手動）

- 実際のGitHubリポジトリでのIssue作成
- GitHub Issue Templateの適用確認
- HTMLコメントタグの埋め込み確認

## 6. 技術的決定事項

### AI分解機能の除外（req-000016 v1.1.0）

**決定:** Anthropic SDK（Claude API）を使用したAI駆動タスク分解を実装しない
**理由:** Feedback #17により、AI駆動タスク分解はClaude Codeエコシステムに移管された。reqordは構造化タスク定義（`--tasks-file`）からのIssue作成に集中する。並列グループ分析・分解戦略・クリティカルパス計算はClaude Code側で実施される。
**影響:** 当初設計の `DecompositionService`, `AIRepository`, `--strategy` オプションは実装しない。

### gh CLIの採用（Octokit.jsではなく）

**決定:** GitHub APIへのアクセスに `gh` CLI を使用（Octokit.jsライブラリではなく）
**理由:** `gh` CLIはユーザーの既存認証情報を利用でき、追加のトークン設定が不要。CLIツールであるreqordのユーザーは `gh` CLIをインストール済みである可能性が高い。既存実装（`github-client.ts`, `repositories/github.ts`）も `gh` CLI を使用している。
**実装パターン:** spawn + stdin経由でbody渡し（エスケープ問題回避）。

### dry-runモードの必須サポート

**決定:** `--dry-run` オプションを必須サポート
**理由:** 大量Issue生成の誤操作リスクを軽減。Human-in-the-loopの原則に基づき、生成前にプレビューを確認できる仕組みが必須。

### Issue同期の分離（spec-000024）

**決定:** Issue作成（本spec）とIssue同期・追跡（spec-000024）を分離
**理由:** 作成は一方向の書き込み操作であり、同期は双方向の状態管理が必要。責務を分離することで、それぞれの複雑さを独立して管理可能にする。

### HTMLコメントタグによるメタデータ管理

**決定:** Issue本文に `<!-- reqord:specification {"specificationId":"spec-NNNNNN"} -->` を埋め込む
**理由:** GitHub UIで非表示のメタデータとして保持できる。既存実装（`services/reqord-comment.ts` の `upsertReqordComment()`）と同じパターンを踏襲。

### ラベル戦略

**決定:** 有限集合のラベルのみを使用（`reqord-generated`, `P0`, `P1`, `P2`, `P3`）
**理由:** ラベルはGitHub UIでのフィルタに利用可能。spec-idはHTMLコメントタグ（`<!-- reqord:specification {"specificationId":"..."} -->`）に埋め込む。req-idはSpecification JSONから間接的に辿れるため、Issue本文には含めない。
