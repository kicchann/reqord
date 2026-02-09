# FeedbackIndex管理 + 同期 - 技術設計書

## 1. 設計概要

GitHub Issueと`.reqord/feedback/index.json`の双方向同期機構を提供する。本specは以下の責務を担う:

- **Zod スキーマ定義**: `@reqord/shared`パッケージにFeedbackIndex型を定義
- **同期ロジック**: GitHub Issue (gh CLI) ↔ index.json の双方向同期
- **Repository層**: index.jsonのCRUD操作

本機能は**未実装**であり、本設計書に基づき新規実装する。

## 2. アーキテクチャ

```
┌─────────────────────┐
│ CLI Command         │ reqord feedback sync
│ (packages/cli)      │ reqord feedback sync --from-local
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ FeedbackSyncService │ GitHub → index.json (default)
│ (packages/cli)      │ index.json → GitHub (--from-local)
└──────────┬──────────┘
           │
           ├─────────────────────┐
           ▼                     ▼
┌─────────────────────┐   ┌─────────────────────┐
│ GitHubClient        │   │ FeedbackRepository  │
│ (packages/cli)      │   │ (packages/cli)      │
│ - gh CLI実行        │   │ - index.json読み書き│
│ - Issue取得/更新    │   │ - Zod検証           │
└─────────────────────┘   └──────────┬──────────┘
                                     │
                                     ▼
                          ┌─────────────────────┐
                          │ FeedbackIndexSchema │
                          │ (@reqord/shared)    │
                          │ - Zod定義           │
                          │ - TypeScript型推論  │
                          └─────────────────────┘
```

## 3. コンポーネント設計

### 3.1 Zodスキーマ定義 (@reqord/shared)

**ファイルパス**: `packages/shared/src/schemas/feedback.ts`

**責務**: FeedbackIndexのスキーマ定義とバリデーション

**インターフェース**:

```typescript
import { z } from "zod";

// Feedbackの種別
export const FeedbackTypeSchema = z.enum([
  "bug",
  "improvement",
  "requirement-gap",
  "spec-mismatch",
  "security",
]);

// Feedbackの深刻度
export const FeedbackSeveritySchema = z.enum([
  "critical",
  "high",
  "medium",
  "low",
]);

// Feedbackのステータス
export const FeedbackStatusSchema = z.enum(["open", "closed"]);

// linkedTo構造
const FeedbackLinkedToSchema = z.object({
  requirements: z.array(z.string()),
  createdRequirements: z.array(z.string()),
  specifications: z.array(z.string()),
});

// Feedbackエントリ
export const FeedbackEntrySchema = z.object({
  githubIssue: z.number(),
  type: FeedbackTypeSchema.optional(),
  severity: FeedbackSeveritySchema.optional(),
  linkedTo: FeedbackLinkedToSchema,
  syncedAt: z.string().datetime(),
  status: FeedbackStatusSchema,
});

// FeedbackIndex全体
export const FeedbackIndexSchema = z.object({
  feedbacks: z.array(FeedbackEntrySchema),
});

// TypeScript型推論
export type FeedbackType = z.infer<typeof FeedbackTypeSchema>;
export type FeedbackSeverity = z.infer<typeof FeedbackSeveritySchema>;
export type FeedbackStatus = z.infer<typeof FeedbackStatusSchema>;
export type FeedbackEntry = z.infer<typeof FeedbackEntrySchema>;
export type FeedbackIndex = z.infer<typeof FeedbackIndexSchema>;
```

**エクスポート**: `packages/shared/src/schemas/index.ts`に追加

```typescript
export * from "./feedback";
```

### 3.2 FeedbackRepository (packages/cli)

**ファイルパス**: `packages/cli/src/repositories/feedback.ts`

**責務**: index.jsonの読み書き、Zod検証

**インターフェース**:

```typescript
import type {
  FeedbackIndex,
  FeedbackEntry,
} from "@reqord/shared";
import { FeedbackIndexSchema } from "@reqord/shared";
import { readJSON, writeJSON } from "./file-system";
import path from "node:path";

const FEEDBACK_INDEX_PATH = ".reqord/feedback/index.json";

export async function loadIndex(cwd: string): Promise<FeedbackIndex> {
  const indexPath = path.join(cwd, FEEDBACK_INDEX_PATH);
  try {
    const data = await readJSON(indexPath);
    return FeedbackIndexSchema.parse(data);
  } catch (error) {
    // ファイルが存在しない場合は空のindexを返す
    return { feedbacks: [] };
  }
}

export async function saveIndex(
  cwd: string,
  index: FeedbackIndex
): Promise<void> {
  const indexPath = path.join(cwd, FEEDBACK_INDEX_PATH);
  const validated = FeedbackIndexSchema.parse(index);
  await writeJSON(indexPath, validated);
}

export async function findFeedbackByIssue(
  cwd: string,
  issueNumber: number
): Promise<FeedbackEntry | undefined> {
  const index = await loadIndex(cwd);
  return index.feedbacks.find((f) => f.githubIssue === issueNumber);
}

export async function upsertFeedback(
  cwd: string,
  feedback: FeedbackEntry
): Promise<void> {
  const index = await loadIndex(cwd);
  const existingIndex = index.feedbacks.findIndex(
    (f) => f.githubIssue === feedback.githubIssue
  );
  if (existingIndex >= 0) {
    index.feedbacks[existingIndex] = feedback;
  } else {
    index.feedbacks.push(feedback);
  }
  await saveIndex(cwd, index);
}
```

### 3.3 GitHubClient (packages/cli)

**ファイルパス**: `packages/cli/src/services/github-client.ts`

**責務**: gh CLI呼び出しでGitHub Issue操作

**インターフェース**:

```typescript
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export interface GitHubIssue {
  number: number;
  title: string;
  state: "open" | "closed";
  labels: string[];
  createdAt: string;
  body?: string;
}

export async function listFeedbackIssues(): Promise<GitHubIssue[]> {
  const { stdout } = await execAsync(
    'gh issue list --label feedback --json number,title,state,labels,createdAt,body --limit 1000'
  );
  return JSON.parse(stdout);
}

export async function getIssue(issueNumber: number): Promise<GitHubIssue> {
  const { stdout } = await execAsync(
    `gh issue view ${issueNumber} --json number,title,state,labels,createdAt,body`
  );
  return JSON.parse(stdout);
}

export async function updateIssueBody(
  issueNumber: number,
  newBody: string
): Promise<void> {
  await execAsync(`gh issue edit ${issueNumber} --body-file -`, { input: newBody });
}

export async function closeIssue(
  issueNumber: number,
  comment?: string
): Promise<void> {
  let cmd = `gh issue close ${issueNumber}`;
  if (comment) {
    cmd += ` --comment "${comment.replace(/"/g, '\\"')}"`;
  }
  await execAsync(cmd);
}
```

### 3.4 FeedbackSyncService (packages/cli)

**ファイルパス**: `packages/cli/src/services/feedback-sync-service.ts`

**責務**: 同期ロジックの実装

**依存**: `reqord-comment.ts` のHTMLコメントパーサーを使用

**インターフェース**:

```typescript
import type { FeedbackEntry } from "@reqord/shared";
import { listFeedbackIssues, getIssue, updateIssueBody, type GitHubIssue } from "./github-client";
import { loadIndex, upsertFeedback } from "../repositories/feedback";
import { parseReqordComment, buildReqordComment, upsertReqordComment } from "./reqord-comment";

// GitHub → index.json 同期
export async function syncFromGitHub(cwd: string): Promise<number> {
  const issues = await listFeedbackIssues();
  let updatedCount = 0;

  for (const issue of issues) {
    const feedback = parseGitHubIssue(issue);
    await upsertFeedback(cwd, feedback);
    updatedCount++;
  }

  return updatedCount;
}

// index.json → GitHub 同期（HTMLコメントをIssue bodyに挿入/更新）
export async function syncToGitHub(cwd: string): Promise<number> {
  const index = await loadIndex(cwd);
  let updatedCount = 0;

  for (const feedback of index.feedbacks) {
    const issue = await getIssue(feedback.githubIssue);
    const metadata = {
      type: feedback.type,
      severity: feedback.severity,
      linkedTo: feedback.linkedTo,
    };
    const newBody = upsertReqordComment(issue.body ?? "", metadata);
    if (newBody !== issue.body) {
      await updateIssueBody(feedback.githubIssue, newBody);
      updatedCount++;
    }
  }

  return updatedCount;
}

// Issue bodyのHTMLコメントからFeedbackEntryを構築
export function parseGitHubIssue(issue: GitHubIssue): FeedbackEntry {
  const comment = parseReqordComment(issue.body ?? "");

  return {
    githubIssue: issue.number,
    type: comment?.type,
    severity: comment?.severity,
    linkedTo: comment?.linkedTo ?? {
      requirements: [],
      createdRequirements: [],
      specifications: [],
    },
    syncedAt: new Date().toISOString(),
    status: issue.state === "closed" ? "closed" : "open",
  };
}
```

### 3.5 CLIコマンド (packages/cli)

**ファイルパス**: `packages/cli/src/commands/feedback/sync.ts`

**責務**: コマンドエントリーポイント

**インターフェース**:

```typescript
import { Command } from "commander";
import chalk from "chalk";
import { syncFromGitHub, syncToGitHub } from "../../services/feedback-sync-service";

export const syncCommand = new Command("sync")
  .description("Sync GitHub Issues with feedback label to index.json")
  .option("--from-local", "Sync from index.json to GitHub")
  .option("--json", "Output as JSON")
  .action(async (options) => {
    try {
      const cwd = process.cwd();

      const count = options.fromLocal
        ? await syncToGitHub(cwd)
        : await syncFromGitHub(cwd);

      if (options.json) {
        console.log(JSON.stringify({ synced: count }));
      } else {
        const direction = options.fromLocal
          ? "index.json → GitHub"
          : "GitHub → index.json";
        console.log(chalk.green(`✓ Synced ${count} feedbacks (${direction})`));
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });
```

## 4. データフロー

### 4.1 GitHub → index.json 同期 (デフォルト)

```
1. ユーザー実行
   $ reqord feedback sync

2. syncFromGitHub()
   ├─ gh issue list --label feedback でGitHub Issueを取得（bodyフィールド含む）
   ├─ 各Issue bodyのHTMLコメントからFeedbackEntryを構築
   │  ├─ <!-- reqord:feedback {...} --> をパース
   │  ├─ type, severity を抽出
   │  └─ linkedTo (requirements, specifications) を抽出
   └─ upsertFeedback() でindex.jsonに保存/更新

3. 結果表示
   ✓ Synced 3 feedbacks (GitHub → index.json)
```

### 4.2 index.json → GitHub 同期 (--from-local)

```
1. ユーザー実行
   $ reqord feedback sync --from-local

2. syncToGitHub()
   ├─ loadIndex() でindex.jsonを読み込み
   ├─ 各feedbackのGitHub Issue bodyを取得
   ├─ FeedbackEntryからHTMLコメントを構築
   │  └─ <!-- reqord:feedback {"type":"...","linkedTo":{...}} -->
   ├─ upsertReqordComment() でbodyに挿入/更新
   └─ gh issue edit --body-file でIssue body更新

3. 結果表示
   ✓ Synced 3 feedbacks (index.json → GitHub)
```

## 5. テスト方針

### 5.1 ユニットテスト

**packages/shared/src/schemas/feedback.test.ts**
- FeedbackIndexSchemaのバリデーション
- 不正なtype/severityの検出
- optional フィールドの挙動

**packages/cli/src/repositories/feedback.test.ts**
- loadIndex(): 存在しないファイルの場合空配列を返す
- saveIndex(): Zod検証エラーの捕捉
- upsertFeedback(): 既存エントリの更新/新規追加

**packages/cli/src/services/feedback-sync-service.test.ts**
- parseGitHubIssue(): HTMLコメントからメタデータ抽出
- syncFromGitHub(): GitHubClientのモック化
- syncToGitHub(): HTMLコメント挿入/更新の検証

**packages/cli/src/services/reqord-comment.test.ts**
- parseReqordComment(): HTMLコメントからメタデータ抽出
- buildReqordComment(): メタデータからHTMLコメント構築
- upsertReqordComment(): Issue bodyへの挿入/更新

### 5.2 統合テスト

**E2Eシナリオ**:
1. 空のプロジェクトで`reqord feedback sync`実行
2. index.jsonが生成され、feedbackラベル付きIssueが同期されることを確認
3. index.json手動編集後、`reqord feedback sync --from-local`実行
4. GitHub Issue上のラベルが更新されることを確認

## 6. 技術的決定事項

### 6.1 gh CLI の直接呼び出し

**決定**: `child_process.exec()` でgh CLIを直接呼び出す

**理由**:
- GitHub APIのトークン管理がgh CLIで完結（Octokitだと認証設定が必要）
- gh CLIは既にrequirementで前提とされている（docs/feedback-control.md参照）
- JSON出力オプション（`--json`）が充実

**代替案（不採用）**:
- Octokit: 認証設定の複雑さ、依存関係増加
- @actions/github: GitHub Actions専用、ローカル実行に不向き

### 6.2 index.jsonの最小限設計

**決定**: index.jsonにはGitHub Issue参照情報のみを保持

**理由**:
- GitHub IssueがSSoT（Single Source of Truth）
- 重複データ保持によるズレのリスク回避
- ファイルサイズの最小化

**含むデータ**:
- githubIssue番号（必須）
- type, severity（オプション、link時に設定）
- linkedTo（紐付け情報）
- title, body は含まない（GitHub Issueから取得）

### 6.3 双方向同期の競合解決

**決定**: 同期方向を明示的に指定（デフォルトはGitHub → index.json）

**理由**:
- 自動マージによるデータ破損リスク回避
- ユーザーが意図を明示することでhuman-in-the-loop維持

**運用**:
- GitHub Issueでラベル変更 → `reqord feedback sync` で取り込み
- index.json手動編集 → `reqord feedback sync --from-local` で反映

### 6.4 APIレート制限への配慮

**決定**: `--limit 1000` でバッチ取得、個別Issue取得は最小限に

**理由**:
- GitHub APIのレート制限（認証済み: 5000 req/hour）
- feedbackラベル付きIssueは通常100件以下と想定

**実装**:
- syncコマンドは`gh issue list`を1回のみ実行
- show/linkコマンドは必要時のみ`gh issue view`実行
