# GitHub Issue同期・進捗追跡 - 技術設計書

## 1. 設計概要

GitHub Issueの状態をローカルのSpecification JSONに同期し、実装進捗を追跡する機能を提供する。spec-000016で作成されたIssueの最新状態をGitHub APIから取得し、`implementation.issues[].state` および `implementation.progress` フィールドを更新する。`gh` CLIを通じたGitHub API呼び出しにより、追加の認証設定なしでIssue情報を取得する。メタデータの整合性検証（Issue存在確認、HTMLコメントタグ一致、循環依存チェック）も提供する。

## 2. アーキテクチャ

```
packages/cli/src/
  ├── commands/
  │   └── issue/
  │       ├── sync.ts                     (新規: syncコマンド)
  │       └── validate.ts                 (新規: validateコマンド)
  ├── services/
  │   └── issue-sync-service.ts           (新規: 同期ビジネスロジック)
  ├── repositories/
  │   ├── specification.ts                (既存: Specification永続化)
  │   └── github.ts                       (新規または既存: GitHub API呼び出し)
  └── utils/
      └── progress-calculator.ts          (新規: 進捗率計算)

packages/shared/src/
  └── schemas/
      └── specification.ts                (既存: SpecificationSchemaの拡張)
```

### レイヤー構成

```
Command Layer:  commands/issue/sync.ts, commands/issue/validate.ts
                    ↓
Service Layer:  services/issue-sync-service.ts
                    ↓
Repository:     repositories/specification.ts (既存)
                repositories/github.ts        (GitHub API)
                    ↓
External:       gh CLI → GitHub API
                    ↓
Storage:        .reqord/specifications/spec-NNNNNN.yaml
```

## 3. コンポーネント設計

### 3.1 syncコマンド (`commands/issue/sync.ts` - 新規)

**責務:** 単一/全SpecificationのIssue状態同期を実行し、結果を表示する。

```
reqord issue sync <spec-id>       # 個別Specificationの同期
reqord issue sync-all             # 全Specificationの一括同期
```

| オプション | 説明 |
|-----------|------|
| `<spec-id>` | 対象のSpecification ID |
| `--json` | 構造化JSON出力 |
| `--verbose` | 変更されたフィールドの詳細表示 |

**出力例（テーブル形式）:**

```
Syncing spec-000016...
  Issue #42: "スキーマ定義"     open → closed  ✓
  Issue #43: "Repository実装"   open → open    -
  Issue #44: "Service実装"      open → open    -

Progress: 1/3 (33%) completed
```

### 3.2 validateコマンド (`commands/issue/validate.ts` - 新規)

**責務:** SpecificationとGitHub Issue間のメタデータ整合性を検証する。

```
reqord issue validate <spec-id>
reqord issue validate --all
```

| オプション | 説明 |
|-----------|------|
| `<spec-id>` | 対象のSpecification ID |
| `--all` | 全Specificationの一括検証 |
| `--json` | 構造化JSON出力 |
| `--fix` | 自動修正可能な問題を修正 |

**検証項目:**

| チェック | 説明 | 深刻度 |
|---------|------|--------|
| Issue存在確認 | 記録されたIssue番号がGitHub上に存在するか | error |
| ラベル一致 | `reqord-generated` ラベルが付与されているか | warning |
| specificationコメント一致 | Issue本文に `<!-- reqord:specification {"specificationId":"<spec-id>"} -->` が存在するか | warning |
| 循環依存 | Issue間の依存関係に循環がないか | error |
| 重複Issue | 同一タスクに対する重複Issueがないか | warning |
| Issueオープン状態 | 全Issueクローズ済みならprogress=100%か | info |

### 3.3 IssueSyncService (`services/issue-sync-service.ts` - 新規)

**責務:** Issue同期のビジネスロジック。

```typescript
export interface SyncResult {
  specId: string;
  synced: SyncedIssue[];
  progress: ProgressInfo;
  errors: SyncError[];
}

export interface SyncedIssue {
  number: number;
  title: string;
  previousState: string;
  currentState: string;
  changed: boolean;
}

export interface ProgressInfo {
  total: number;
  completed: number;
  inProgress: number;
  percentage: number;
}

export interface SyncError {
  issueNumber: number;
  message: string;
  type: "not_found" | "api_error" | "parse_error";
}

// 個別Specificationの同期
export async function syncSpecification(
  cwd: string,
  specId: string,
): Promise<SyncResult>;

// 全Specificationの一括同期
export async function syncAll(
  cwd: string,
): Promise<SyncResult[]>;
```

**同期ロジック:**

```typescript
async function syncSpecification(cwd: string, specId: string): Promise<SyncResult> {
  // 1. Specification JSONを読み込み
  const spec = await specRepo.findById(cwd, specId);
  if (!spec?.implementation?.issues) {
    throw new Error(`No issues found for ${specId}`);
  }

  // 2. 各IssueのGitHub状態を取得
  const synced: SyncedIssue[] = [];
  for (const issue of spec.implementation.issues) {
    const ghIssue = await githubRepo.getIssue(cwd, issue.number);
    synced.push({
      number: issue.number,
      title: issue.title,
      previousState: issue.status,
      currentState: mapGitHubState(ghIssue.state),
      changed: issue.status !== mapGitHubState(ghIssue.state),
    });
  }

  // 3. 進捗率を計算
  const progress = calculateProgress(synced);

  // 4. Specification JSONを更新
  await updateSpecificationProgress(cwd, specId, synced, progress);

  return { specId, synced, progress, errors: [] };
}
```

### 3.4 GitHubRepository (`repositories/github.ts` - 新規または拡張)

**責務:** `gh` CLI経由でのGitHub API呼び出し。

```typescript
export interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  state: "open" | "closed";
  labels: string[];
  assignees: string[];
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

// 個別Issue取得
export async function getIssue(
  cwd: string,
  issueNumber: number,
): Promise<GitHubIssue>;

// 複数Issue一括取得（ラベルフィルタ）
export async function listIssues(
  cwd: string,
  options: { labels?: string[]; state?: "open" | "closed" | "all" },
): Promise<GitHubIssue[]>;
```

**gh CLI呼び出し:**

```typescript
import { execFile } from "node:child_process";

async function getIssue(cwd: string, issueNumber: number): Promise<GitHubIssue> {
  const result = await execGh(cwd, [
    "issue", "view", String(issueNumber),
    "--json", "number,title,body,state,labels,assignees,createdAt,updatedAt,closedAt",
  ]);
  return parseGitHubIssue(JSON.parse(result));
}

async function listIssues(cwd: string, options: ListOptions): Promise<GitHubIssue[]> {
  const args = ["issue", "list", "--json", "number,title,body,state,labels,assignees,createdAt,updatedAt,closedAt"];
  if (options.labels?.length) {
    args.push("--label", options.labels.join(","));
  }
  if (options.state) {
    args.push("--state", options.state);
  }
  const result = await execGh(cwd, args);
  return JSON.parse(result).map(parseGitHubIssue);
}
```

### 3.5 ProgressCalculator (`utils/progress-calculator.ts` - 新規)

**責務:** Issue状態からの進捗率計算。

```typescript
export function calculateProgress(issues: SyncedIssue[]): ProgressInfo {
  const total = issues.length;
  const completed = issues.filter(i => i.currentState === "closed").length;
  const inProgress = issues.filter(i =>
    i.currentState === "open" &&
    // assigneesが設定されている場合をin_progressとみなす
    // （GitHub APIから取得した追加情報で判定）
    false  // 基本実装ではopen/closedのみで判定
  ).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { total, completed, inProgress, percentage };
}
```

### 3.6 SpecificationSchema拡張

spec-000016で追加される `implementation` フィールドに対し、本specで以下のフィールドを利用・更新する:

```typescript
// spec-000016で定義済みのフィールド（本specが更新対象とする）
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
  // 本specで追加するフィールド
  progress: z.object({
    total: z.number(),
    completed: z.number(),
    percentage: z.number(),
    lastSyncedAt: z.string(),
  }).optional(),
}).optional(),
```

### 3.7 GitHub状態のマッピング

```typescript
function mapGitHubState(ghState: "open" | "closed"): "open" | "in_progress" | "closed" {
  // GitHub APIではopen/closedの2状態のみ
  // in_progressはGitHub Projectsのカスタムフィールドに依存するため、
  // 基本実装ではopen/closedのみを使用
  switch (ghState) {
    case "open": return "open";
    case "closed": return "closed";
  }
}
```

## 4. データフロー

### 個別同期フロー

```
ユーザー → reqord issue sync spec-000016
  → syncCommand.action("spec-000016")
    → issueSyncService.syncSpecification(cwd, "spec-000016")
      → specRepo.findById(cwd, "spec-000016") → Specification取得
        → implementation.issues = [#42, #43, #44]
      → 各Issueについて:
        → githubRepo.getIssue(cwd, 42)
          → gh issue view 42 --json ... → GitHubIssue
        → previousState vs currentState 比較
      → calculateProgress(synced)
        → { total: 3, completed: 1, percentage: 33 }
      → specRepo.save(cwd, updatedSpec)
        → implementation.issues[0].status = "closed"
        → implementation.progress = { total: 3, completed: 1, percentage: 33, lastSyncedAt: "..." }
    → SyncResult返却
  → テーブル表示
```

### 一括同期フロー

```
ユーザー → reqord issue sync-all
  → syncAllCommand.action()
    → specRepo.findAll(cwd) → 全Specification取得
    → implementationフィールドを持つspecをフィルタ
    → 各specに対して syncSpecification() を順次実行
    → 全SyncResult[] を集約
  → サマリーテーブル表示:
    | Spec ID      | Issues | Completed | Progress |
    | spec-000016  | 3      | 1         | 33%      |
    | spec-000017  | 5      | 5         | 100%     |
```

### 検証フロー

```
ユーザー → reqord issue validate spec-000016
  → validateCommand.action("spec-000016")
    → issueSyncService.validateSpecification(cwd, "spec-000016")
      → specRepo.findById(cwd, "spec-000016") → Specification取得
      → 各Issueについて:
        → githubRepo.getIssue(cwd, issue.number) → Issue存在確認
        → ラベル確認: "reqord-generated" が存在するか
        → HTMLコメントタグ確認: <!-- reqord:specification {"specificationId":"spec-000016"} --> がbodyに存在するか
      → 循環依存チェック:
        → Issue間のblockedBy関係をグラフとして構築
        → トポロジカルソートで循環検出
      → 重複チェック:
        → 同一タイトルのIssueがないか
    → ValidationResult返却
  → 検証結果表示:
    ✓ Issue #42 exists
    ✓ Issue #43 exists
    ⚠ Issue #43 missing specification comment tag
    ✓ No circular dependencies
```

## 5. テスト方針

### ユニットテスト

- **issueSyncService.syncSpecification**:
  - 正常系: 3件のIssueのうち1件がclosed → progress 33%
  - 全件closed: progress 100%
  - 全件open: progress 0%
  - implementationフィールドなし: エラーメッセージ
  - GitHub API応答エラー: SyncErrorとして記録
- **issueSyncService.validateSpecification**:
  - 全チェック正常: ValidationResult.errors = []
  - Issue不存在: error severity
  - ラベル不一致（reqord-generated欠落）: warning severity
  - HTMLコメントタグ不一致（specificationコメント欠落）: warning severity
  - 循環依存検出: error severity
- **calculateProgress**:
  - 0件: percentage = 0
  - 全件closed: percentage = 100
  - 部分的closed: 正しいパーセンテージ計算
- **mapGitHubState**:
  - open → "open"
  - closed → "closed"

### 統合テスト

- **GitHubRepository（モック）**:
  - `gh` CLI呼び出しのモック化
  - JSON応答のパース検証
  - エラーハンドリング（Issue不存在、権限エラー）
- **sync → save フロー**:
  - 同期結果がSpecification JSONに正しく書き込まれること
  - progressフィールドの更新値検証
  - lastSyncedAtのタイムスタンプ更新

### E2Eテスト（手動）

- 実際のGitHubリポジトリでのsync動作確認
- GitHub Issueの状態変更 → sync → JSON更新の一連フロー

## 6. 技術的決定事項

### gh CLIの採用（Octokit.jsではなく）

**決定:** GitHub APIへのアクセスに `gh` CLI を使用（Octokit.jsライブラリではなく）
**理由:** `gh` CLIはユーザーの既存認証情報を利用でき、追加のトークン設定が不要。CLIツールであるreqordのユーザーは `gh` CLIをインストール済みである可能性が高い。Octokit.jsの場合、個人アクセストークンの管理が必要となり、セキュリティリスクと設定の手間が増える。`gh` の `--json` オプションにより構造化された出力を取得可能。

### 同期の単方向性

**決定:** 同期はGitHub → ローカルの一方向のみ
**理由:** ローカルのSpecification JSONはGitHub Issueの「キャッシュ」としての役割を持つ。ローカルでのステータス変更をGitHubに反映する逆方向の同期は、意図しないIssueの状態変更リスクがある。Human-in-the-loopの原則に基づき、GitHub Issueの操作はGitHub UI上で人間が直接行うべき。

### in_progress状態の簡易実装

**決定:** 初期実装では `open` / `closed` の2状態のみを使用し、`in_progress` はGitHub Projectsとの統合として将来対応
**理由:** GitHub REST APIではIssueの状態は `open` / `closed` のみ。`in_progress` の判定にはGitHub Projectsの `Status` カスタムフィールドへのアクセスが必要で、GraphQL APIの使用が前提となる。初期実装ではシンプルにopen/closedの同期に集中し、Projects統合は将来のspecで扱う。

### progressフィールドの追加

**決定:** `implementation.progress` オブジェクトを追加し、集計済みの進捗情報をJSON内に保持
**理由:** ダッシュボード（spec-000022）やガントチャート（spec-000025）など複数のコンシューマーが進捗情報を参照する。毎回全Issueのstateをカウントするのではなく、同期時に計算済みの進捗を保持することで、読み取り側の実装がシンプルになる。`lastSyncedAt` によりデータの鮮度も確認可能。
