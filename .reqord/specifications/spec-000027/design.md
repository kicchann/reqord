# FeedbackIndex管理 + 同期 - 技術設計書

## 1. 設計概要

GitHub Issueと`.reqord/issues/feedbacks.yaml`の双方向同期機構を提供する。本specは以下の責務を担う:

- **Zod スキーマ定義**: `@reqord/shared`パッケージにFeedbackIndex型を定義
- **同期ロジック**: GitHub Issue (gh CLI) ↔ feedbacks.yaml の双方向同期
- **Repository層**: feedbacks.yamlのCRUD操作

### v2.0.0 追加スコープ

- **linkedTo.resolved スキーマ**: feedback解決状態のアーティファクト単位追跡（SC-11対応）
- **linkedTo.createdSpecifications**: feedbackから作成されたspecの記録
- **syncマージ更新**: sync時の手動メタデータ保持（SC-12対応）
- **パフォーマンス改善**: Issue毎のファイルI/O → 一括load/save

### v3.0.0 追加スコープ

- **GitHubClient.createIssue()**: feedbackラベル付きGitHub Issue作成（spec-000028 v3.0.0のcreateコマンドが依存）

## 2. アーキテクチャ

```
┌─────────────────────┐
│ CLI Command         │ reqord feedback sync
│ (packages/cli)      │ reqord feedback sync --from-local
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ FeedbackSyncService │ GitHub → feedbacks.yaml (default)
│ (packages/cli)      │ feedbacks.yaml → GitHub (--from-local)
└──────────┬──────────┘
           │
           ├─────────────────────┐
           ▼                     ▼
┌─────────────────────┐   ┌─────────────────────┐
│ GitHubClient        │   │ FeedbackRepository  │
│ (packages/cli)      │   │ (packages/cli)      │
│ - gh CLI実行        │   │ - feedbacks.yaml読み書き│
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

// linkedTo.resolved構造（v2.0.0追加）
// feedback解決済みのアーティファクトを追跡
// 各配列はlinkedTo.requirements/specificationsのサブセット
const FeedbackResolvedSchema = z.object({
  requirements: z.array(z.string()),
  specifications: z.array(z.string()),
}).optional();

// linkedTo構造
const FeedbackLinkedToSchema = z.object({
  requirements: z.array(z.string()),
  createdRequirements: z.array(z.string()),
  specifications: z.array(z.string()),
  createdSpecifications: z.array(z.string()).default([]),  // v2.0.0追加
  resolved: FeedbackResolvedSchema,                        // v2.0.0追加
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
export type FeedbackLinkedTo = z.infer<typeof FeedbackLinkedToSchema>;  // v2.0.0追加
export type FeedbackResolved = z.infer<typeof FeedbackResolvedSchema>; // v2.0.0追加
export type FeedbackIndex = z.infer<typeof FeedbackIndexSchema>;
```

**エクスポート**: `packages/shared/src/schemas/index.ts`に追加

```typescript
export * from "./feedback";
```

### 3.2 FeedbackRepository (packages/cli)

**ファイルパス**: `packages/cli/src/repositories/feedback.ts`

**責務**: feedbacks.yamlの読み書き、Zod検証

**インターフェース**:

```typescript
import type {
  FeedbackIndex,
  FeedbackEntry,
} from "@reqord/shared";
import { FeedbackIndexSchema } from "@reqord/shared";
import { readYAML, writeYAML } from "./file-system";
import path from "node:path";

const FEEDBACK_INDEX_PATH = ".reqord/issues/feedbacks.yaml";

export async function loadIndex(cwd: string): Promise<FeedbackIndex> {
  const indexPath = path.join(cwd, FEEDBACK_INDEX_PATH);
  try {
    const data = await readYAML(indexPath);
    return FeedbackIndexSchema.parse(data);
  } catch (error) {
    // ファイルが存在しない場合のみ空のindexを返す
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { feedbacks: [] };
    }
    throw error;
  }
}

export async function saveIndex(
  cwd: string,
  index: FeedbackIndex
): Promise<void> {
  const indexPath = path.join(cwd, FEEDBACK_INDEX_PATH);
  const validated = FeedbackIndexSchema.parse(index);
  await writeYAML(indexPath, validated);
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
import { spawn } from "node:child_process";

export interface GitHubIssue {
  number: number;
  title: string;
  state: "open" | "closed";
  labels: string[];
  createdAt: string;
  body?: string;
}

export async function listFeedbackIssues(): Promise<GitHubIssue[]> {
  return new Promise((resolve, reject) => {
    const proc = spawn("gh", [
      "issue", "list", "--label", "feedback",
      "--json", "number,title,state,labels,createdAt,body",
      "--limit", "1000",
    ], { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    proc.stdout.on("data", (data) => { stdout += data; });
    proc.on("close", (code) => {
      if (code === 0) resolve(JSON.parse(stdout));
      else reject(new Error(`gh issue list failed with exit code ${code}`));
    });
  });
}

export async function getIssue(issueNumber: number): Promise<GitHubIssue> {
  return new Promise((resolve, reject) => {
    const proc = spawn("gh", [
      "issue", "view", String(issueNumber),
      "--json", "number,title,state,labels,createdAt,body",
    ], { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    proc.stdout.on("data", (data) => { stdout += data; });
    proc.on("close", (code) => {
      if (code === 0) resolve(JSON.parse(stdout));
      else reject(new Error(`gh issue view failed with exit code ${code}`));
    });
  });
}

export async function updateIssueBody(
  issueNumber: number,
  newBody: string
): Promise<void> {
  // spawn で --body-file - に stdin 経由で渡す（argv サイズ制限回避）
  return new Promise<void>((resolve, reject) => {
    const proc = spawn("gh", ["issue", "edit", String(issueNumber), "--body-file", "-"], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stderr = "";
    proc.stderr.on("data", (data) => { stderr += data; });
    proc.stdin.write(newBody);
    proc.stdin.end();
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`gh issue edit failed: ${stderr}`));
    });
  });
}

export async function closeIssue(
  issueNumber: number,
  comment?: string
): Promise<void> {
  const args = ["issue", "close", String(issueNumber)];
  if (comment) {
    args.push("--comment", comment);
  }
  await new Promise<void>((resolve, reject) => {
    const proc = spawn("gh", args, { stdio: ["ignore", "pipe", "pipe"] });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`gh issue close failed with exit code ${code}`));
    });
  });
}

// v3.0.0追加: GitHub Issue作成
export interface CreateIssueOptions {
  title: string;
  body?: string;
  labels?: string[];
}

export async function createIssue(
  options: CreateIssueOptions
): Promise<number> {
  const args = ["issue", "create", "--title", options.title];
  if (options.labels && options.labels.length > 0) {
    args.push("--label", options.labels.join(","));
  }
  if (options.body) {
    args.push("--body-file", "-");
  }
  args.push("--json", "number");

  return new Promise<number>((resolve, reject) => {
    const proc = spawn("gh", args, { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (data) => { stdout += data; });
    proc.stderr.on("data", (data) => { stderr += data; });
    if (options.body) {
      proc.stdin.write(options.body);
      proc.stdin.end();
    }
    proc.on("close", (code) => {
      if (code === 0) {
        const result = JSON.parse(stdout);
        resolve(result.number);
      } else {
        reject(new Error(`gh issue create failed: ${stderr}`));
      }
    });
  });
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
import { loadIndex, saveIndex } from "../repositories/feedback";
import { parseReqordComment, buildReqordComment, upsertReqordComment } from "./reqord-comment";

// GitHub → feedbacks.yaml 同期（v2.0.0: マージ更新 + 一括I/O）
export async function syncFromGitHub(cwd: string): Promise<number> {
  const issues = await listFeedbackIssues();
  const index = await loadIndex(cwd);  // 1回のload
  let updatedCount = 0;

  for (const issue of issues) {
    const fromGitHub = parseGitHubIssue(issue);
    const existing = index.feedbacks.find(
      (f) => f.githubIssue === issue.number
    );

    if (existing) {
      // マージ更新: 手動メタデータを保持
      const merged = mergeFeedback(existing, fromGitHub);
      const idx = index.feedbacks.indexOf(existing);
      index.feedbacks[idx] = merged;
    } else {
      index.feedbacks.push(fromGitHub);
    }
    updatedCount++;
  }

  await saveIndex(cwd, index);  // 1回のsave
  return updatedCount;
}

// v2.0.0: マージ更新ロジック
// 手動設定メタデータ（type, severity, linkedTo）はexistingを保持
// GitHub Issue状態（status, syncedAt）はGitHubから更新
export function mergeFeedback(
  existing: FeedbackEntry,
  fromGitHub: FeedbackEntry
): FeedbackEntry {
  return {
    githubIssue: existing.githubIssue,
    type: existing.type ?? fromGitHub.type,           // existing優先
    severity: existing.severity ?? fromGitHub.severity, // existing優先
    linkedTo: existing.linkedTo,                       // 常にexistingを保持（resolved含む）
    syncedAt: fromGitHub.syncedAt,                     // 常にGitHubから更新
    status: fromGitHub.status,                         // 常にGitHubから更新（Issue状態のみ）
  };
}

// feedbacks.yaml → GitHub 同期（HTMLコメントをIssue bodyに挿入/更新）
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
      createdSpecifications: [],  // v2.0.0追加
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
  .description("Sync GitHub Issues with feedback label to feedbacks.yaml")
  .option("--from-local", "Sync from feedbacks.yaml to GitHub")
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
          ? "feedbacks.yaml → GitHub"
          : "GitHub → feedbacks.yaml";
        console.log(chalk.green(`✓ Synced ${count} feedbacks (${direction})`));
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });
```

## 4. データフロー

### 4.1 GitHub → feedbacks.yaml 同期 (デフォルト)

```
1. ユーザー実行
   $ reqord feedback sync

2. syncFromGitHub()（v2.0.0: マージ更新 + 一括I/O）
   ├─ loadIndex() で既存feedbacks.yamlを一括読み込み
   ├─ gh issue list --label feedback でGitHub Issueを取得（bodyフィールド含む）
   ├─ 各Issueについて:
   │  ├─ Issue bodyのHTMLコメントからFeedbackEntryを構築
   │  │  ├─ <!-- reqord:feedback {...} --> をパース
   │  │  ├─ type, severity を抽出
   │  │  └─ linkedTo (requirements, specifications) を抽出
   │  ├─ 既存エントリがある場合: mergeFeedback()でマージ
   │  │  ├─ type, severity → existing優先
   │  │  ├─ linkedTo（resolved含む） → 常にexisting保持
   │  │  └─ status, syncedAt → GitHubから更新
   │  └─ 既存エントリがない場合: 新規追加
   └─ saveIndex() でfeedbacks.yamlに一括保存

3. 結果表示
   ✓ Synced 3 feedbacks (GitHub → feedbacks.yaml)
```

### 4.2 feedbacks.yaml → GitHub 同期 (--from-local)

```
1. ユーザー実行
   $ reqord feedback sync --from-local

2. syncToGitHub()
   ├─ loadIndex() でfeedbacks.yamlを読み込み
   ├─ 各feedbackのGitHub Issue bodyを取得
   ├─ FeedbackEntryからHTMLコメントを構築
   │  └─ <!-- reqord:feedback {"type":"...","linkedTo":{...}} -->
   ├─ upsertReqordComment() でbodyに挿入/更新
   └─ gh issue edit --body-file でIssue body更新

3. 結果表示
   ✓ Synced 3 feedbacks (feedbacks.yaml → GitHub)
```

## 5. テスト方針

### 5.1 ユニットテスト

**packages/shared/src/schemas/feedback.test.ts**
- FeedbackIndexSchemaのバリデーション
- 不正なtype/severityの検出
- optional フィールドの挙動
- v2.0.0: `resolved`がoptionalで後方互換性を維持
- v2.0.0: `createdSpecifications`がdefault `[]`で後方互換性を維持
- v2.0.0: `resolved.requirements`/`resolved.specifications`のバリデーション

**packages/cli/src/repositories/feedback.test.ts**
- loadIndex(): 存在しないファイルの場合空配列を返す
- saveIndex(): Zod検証エラーの捕捉
- upsertFeedback(): 既存エントリの更新/新規追加

**packages/cli/src/services/feedback-sync-service.test.ts**
- parseGitHubIssue(): HTMLコメントからメタデータ抽出
- syncFromGitHub(): GitHubClientのモック化
- syncToGitHub(): HTMLコメント挿入/更新の検証
- v2.0.0: mergeFeedback(): 手動メタデータ保持の検証
  - type/severityがexisting優先
  - linkedTo（resolved含む）が常にexisting保持
  - status/syncedAtが常にGitHubから更新
- v2.0.0: syncFromGitHub(): 一括load/save（ファイルI/O回数の検証）
- v2.0.0: syncFromGitHub(): 既存エントリのマージ更新

**packages/cli/src/services/reqord-comment.test.ts**
- parseReqordComment(): HTMLコメントからメタデータ抽出
- buildReqordComment(): メタデータからHTMLコメント構築
- upsertReqordComment(): Issue bodyへの挿入/更新

### 5.2 統合テスト

**E2Eシナリオ**:
1. 空のプロジェクトで`reqord feedback sync`実行
2. feedbacks.yamlが生成され、feedbackラベル付きIssueが同期されることを確認
3. feedbacks.yaml手動編集後、`reqord feedback sync --from-local`実行
4. GitHub Issue上のラベルが更新されることを確認

## 6. 技術的決定事項

### 6.1 gh CLI の直接呼び出し

**決定**: `child_process.exec()` でgh CLIを直接呼び出す

**理由**:
- GitHub APIのトークン管理がgh CLIで完結（Octokitだと認証設定が必要）
- gh CLIは既にrequirementで前提とされている（docs/guide-feedback.md参照）
- JSON出力オプション（`--json`）が充実

**代替案（不採用）**:
- Octokit: 認証設定の複雑さ、依存関係増加
- @actions/github: GitHub Actions専用、ローカル実行に不向き

### 6.2 feedbacks.yamlの最小限設計

**決定**: feedbacks.yamlにはGitHub Issue参照情報のみを保持

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

**決定**: 同期方向を明示的に指定（デフォルトはGitHub → feedbacks.yaml）

**理由**:
- 自動マージによるデータ破損リスク回避
- ユーザーが意図を明示することでhuman-in-the-loop維持

**運用**:
- GitHub Issueでラベル変更 → `reqord feedback sync` で取り込み
- feedbacks.yaml手動編集 → `reqord feedback sync --from-local` で反映

### 6.4 APIレート制限への配慮

**決定**: `--limit 1000` でバッチ取得、個別Issue取得は最小限に

**理由**:
- GitHub APIのレート制限（認証済み: 5000 req/hour）
- feedbackラベル付きIssueは通常100件以下と想定

**実装**:
- syncコマンドは`gh issue list`を1回のみ実行
- show/linkコマンドは必要時のみ`gh issue view`実行

### 6.5 resolved追跡の構造（v2.0.0）

**決定**: `status`はGitHub Issue状態に限定し、解決追跡は`linkedTo.resolved`で行う

**理由**:
- `status`（open/closed）はGitHub Issueの状態を忠実に反映する責務
- resolvedはリンク先アーティファクト単位の概念（1つのfeedbackが複数req/specにリンクされ、個別に解決される）
- linkedToの構造を対称的に拡張し、元のstring[]を維持

**構造**:
```yaml
linkedTo:
  requirements: ["req-000006", "req-000020"]
  createdRequirements: ["req-000023"]
  specifications: ["spec-000005"]
  createdSpecifications: []              # v2.0.0追加
  resolved:                              # v2.0.0追加
    requirements: ["req-000006"]         # feedback解決済みのreq
    specifications: []                   # feedback解決済みのspec
```

- `resolved`はoptional（既存データとの後方互換性）
- `createdSpecifications`は`default([])`（既存データとの後方互換性）
- `resolved`の各配列は`linkedTo.requirements`/`specifications`のサブセット
- `createdRequirements`/`createdSpecifications`はfeedback解決追跡の対象外のため`resolved`不要

### 6.6 syncのマージ更新方針（v2.0.0）

**決定**: `syncFromGitHub`時に手動メタデータを保持するマージ更新

**理由**:
- v1.0.0ではGitHubからの完全上書き（`upsertFeedback`）だった
- `type`, `severity`, `linkedTo`はlinkコマンドで手動設定されるため、sync時に消えてはならない
- `status`はGitHub Issue状態のみを表すため、常にGitHubから更新

**マージルール**:
| フィールド | 方針 | 理由 |
|-----------|------|------|
| `type` | existing優先 | linkで手動設定 |
| `severity` | existing優先 | linkで手動設定 |
| `linkedTo` | 常にexistingを保持 | ローカルでのみ管理（resolved含む） |
| `syncedAt` | 常にGitHubから更新 | 同期タイムスタンプ |
| `status` | 常にGitHubから更新 | GitHub Issue状態のみ表す |

### 6.7 パフォーマンス改善（v2.0.0）

**決定**: Issue毎のファイルI/Oから一括load/saveに変更

**理由**:
- v1.0.0: Issue毎に`loadIndex` + `saveIndex`（N回のファイルI/O）
- v2.0.0: 1回の`loadIndex` → メモリ上でマージ → 1回の`saveIndex`
- feedbackが増えるほどI/O回数削減効果が大きい

### 6.8 既存データのマイグレーション（v2.0.0）

**決定**: `status: resolved`の既存エントリは手動修正またはsync再実行で対応

**理由**:
- `status`はGitHub Issue状態のみを表すため、`resolved`は不正な値
- `syncFromGitHub`再実行でGitHub Issueの実際のstate（open/closed）が反映される
- `linkedTo.resolved`への変換は手動で行う（解決済みアーティファクトの判断が必要）

**手順**:
1. `status: resolved` → GitHub Issueの実際のstate（open/closed）に修正
2. 解決済みアーティファクトがあれば`linkedTo.resolved`に追記
3. `reqord feedback sync`実行でstatus/syncedAtをGitHubから再取得
