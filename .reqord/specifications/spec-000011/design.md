# Requirement承認フロー (GitHub PR連携) - 技術設計書

## 1. 設計概要

要件の承認プロセスをGitHub PR（Pull Request）ベースで管理する。`reqord req approve <id>` コマンドにより、Gitブランチ作成・要件ステータス変更・PR自動生成を一括実行する。CODEOWNERSファイルと連携してレビュアーを自動アサインし、PRマージをトリガーとしてステータスをapprovedに更新する。承認情報はcurrentApproval・versionHistoryフィールドに記録する。

## 2. アーキテクチャ

```
Command Layer:  commands/req/approve.ts     (新規)
                    ↓
Service Layer:  services/approval-service.ts (新規 - 共通承認サービス)
                services/requirement-service.ts (既存拡張)
                    ↓
Repository:     repositories/requirement.ts  (既存)
                repositories/git.ts          (新規 - Git操作)
                repositories/github.ts       (新規 - GitHub CLI操作)
                    ↓
External:       git CLI / gh CLI
                    ↓
Storage:        .reqord/requirements/req-NNNNNN.yaml
                GitHub PR
```

承認フローは後続のSpecification承認（spec-000015）でも同一パターンを使用するため、共通のapproval-serviceとして設計する。Git/GitHub操作はリポジトリ層に隔離し、テスト時にモック可能にする。

## 3. コンポーネント設計

### 3.1 approveコマンド (`commands/req/approve.ts` - 新規)

**責務:** CLIエントリポイント。承認対象のID受け取り、サービスへの委譲。

```
reqord req approve <id> [--dry-run]
```

| オプション | 説明 |
|-----------|------|
| `<id>` | 承認対象の要件ID（req-NNNNNN） |
| `--dry-run` | 実際のGit/GitHub操作を行わず、実行予定の内容を表示 |

### 3.2 ApprovalService (`services/approval-service.ts` - 新規)

**責務:** 承認フローの共通ロジック。Requirement/Specificationの両方で利用。

```typescript
export interface ApprovalTarget {
  type: "requirement" | "specification";
  id: string;
  version: string;
  status: Status;
  title: string;
  files: string[];  // PRに含めるファイルパス
}

export interface ApprovalResult {
  branchName: string;
  prNumber: number;
  prUrl: string;
}

export interface ApprovalOptions {
  dryRun?: boolean;
}

export async function startApproval(
  cwd: string,
  target: ApprovalTarget,
  options?: ApprovalOptions,
): Promise<ApprovalResult>;
```

**処理フロー:**
1. 前提条件チェック（status === "draft"）
2. ステータスをapprovedに更新
3. Gitブランチ作成（命名規則に従う）
4. 変更をコミット
5. ブランチをプッシュ
6. gh CLI でPR作成
7. 結果を返却

### 3.3 ブランチ命名規則

```
reqord/req-<id>-approve-v<version>
例: reqord/req-000011-approve-v1.0.0
```

### 3.4 GitRepository (`repositories/git.ts` - 新規)

**責務:** Git CLI操作の抽象化。

```typescript
export async function createBranch(name: string): Promise<void>;
export async function checkout(branchName: string): Promise<void>;
export async function add(files: string[]): Promise<void>;
export async function commit(message: string): Promise<void>;
export async function push(branchName: string): Promise<void>;
export async function getCurrentBranch(): Promise<string>;
export async function getCurrentCommitHash(): Promise<string>;
```

内部では `child_process.execFile` を使用してgitコマンドを実行する。

### 3.5 GitHubRepository (`repositories/github.ts` - 新規)

**責務:** gh CLI操作の抽象化。

```typescript
export interface CreatePrOptions {
  title: string;
  body: string;
  base?: string;    // デフォルト: main
  head: string;
  draft?: boolean;
}

export interface PrInfo {
  number: number;
  url: string;
}

export async function createPullRequest(options: CreatePrOptions): Promise<PrInfo>;
export async function getPullRequest(number: number): Promise<PrInfo>;
```

### 3.6 RequirementSchema拡張 (`@reqord/shared/schemas/requirement.ts`)

**追加フィールド:**

```typescript
currentApproval: z.object({
  version: z.string(),
  phase: z.enum(["requirement", "specification"]),
  prNumber: z.number(),
  prUrl: z.string(),
  approvedBy: z.array(z.string()),
  approvedAt: z.string().optional(),
}).optional(),
```

### 3.7 PR本文テンプレート

```markdown
## 要件承認依頼

| フィールド | 値 |
|-----------|------|
| ID | {id} |
| タイトル | {title} |
| バージョン | {version} |
| 優先度 | {priority} |

### 成功基準
{successCriteria}

### 変更内容
status: draft → approved

> このPRをマージすると、要件のステータスが `approved` に更新されます。
```

## 4. データフロー

### 承認開始フロー

```
ユーザー → reqord req approve req-000011
  → approveCommand.action("req-000011")
    → requirementService.showRequirement(cwd, "req-000011")
      → 存在確認 + 現在のstatus確認
    → 前提条件チェック: status === "draft" → OK
    → ApprovalTarget構築
    → approvalService.startApproval(cwd, target)
      → requirementService.updateRequirement(cwd, id, { status: "approved" })
      → gitRepo.createBranch("reqord/req-000011-approve-v1.0.0")
      → gitRepo.checkout("reqord/req-000011-approve-v1.0.0")
      → gitRepo.add([".reqord/requirements/req-000011.yaml"])
      → gitRepo.commit("chore(reqord): request approval for req-000011")
      → gitRepo.push("reqord/req-000011-approve-v1.0.0")
      → githubRepo.createPullRequest({ title, body, head })
        → gh pr create --title "..." --body "..." --head "..."
      → return { branchName, prNumber, prUrl }
  → 成功メッセージ表示（PR URL含む）
```

### PRマージ後のステータス更新

PRマージ後のステータス更新は、以下のいずれかの方法で実行する:

1. **手動更新（Phase 1）:** `reqord req update <id> --status approved`
2. **GitHub Actions連携（Phase 2）:** PRマージイベントをトリガーにワークフローで自動更新

Phase 1では手動更新を前提とし、Phase 2でGitHub Actionsによる自動化を追加する。

## 5. テスト方針

### ユニットテスト

- **approval-service**: 前提条件チェック（draft以外のステータスでエラー）、ブランチ名生成、PR本文生成
- **git repository**: 各Git操作のコマンド引数検証（execFileのモック）
- **github repository**: gh CLIのコマンド引数検証（execFileのモック）
- **dry-runモード**: 実際のGit/GitHub操作が呼ばれないこと

### 統合テスト

- Gitリポジトリ内での一連フロー: approve → ブランチ作成 → コミット確認
- Git未初期化環境でのエラーハンドリング
- gh CLI未インストール時のエラーハンドリング

## 6. 技術的決定事項

### 共通承認サービスの設計

**決定:** approval-serviceをRequirement/Specification共通の抽象的なサービスとして設計
**理由:** spec-000015（Specification承認フロー）で同一パターンを使用する。ApprovalTargetインターフェースにより、承認対象の種類を意識せずに同一フローを実行可能。

### Git/GitHub操作のリポジトリ層隔離

**決定:** git/gh CLIの操作をリポジトリ層に隔離し、child_process.execFileで実行
**理由:** テスト時のモック化が容易。また、将来的にOctokit.jsへの移行が必要になった場合も、リポジトリ層の差し替えのみで対応可能。

### PRマージ後の手動更新（Phase 1）

**決定:** Phase 1ではPRマージ後のステータス更新を手動で行い、GitHub Actions連携はPhase 2で対応
**理由:** GitHub Actionsワークフローの設計・テストには追加の複雑さがある。まずCLI単体で完結するフローを確立し、自動化は段階的に導入する。

### gh CLI依存

**決定:** GitHub操作にはgh CLIを使用（Octokit.jsではなく）
**理由:** reqordの設計方針としてgh CLIを主要なGitHubインテグレーション手段としている。認証管理がgh CLI側で完結し、追加のトークン管理が不要。

## 7. draftコマンド設計

### 7.1 draftコマンド (`commands/req/draft.ts`)

**責務:** approved/implementedのreqをdraft状態に差し戻す。ステータス変更のみ行い、バージョンはインクリメントしない。

```
reqord req draft <id> [--dry-run]
```

| オプション | 説明 |
|-----------|------|
| `<id>` | 差し戻し対象の要件ID（req-NNNNNN） |
| `--dry-run` | 実際の操作を行わず、実行予定の内容を表示 |

### 7.2 DraftReversionService (`services/draft-reversion-service.ts`)

**責務:** draft差し戻しフローのロジック。approved/implementedからの差し戻し時にPRを作成し、影響範囲をレビュー可能にする。

```typescript
export interface DraftReversionResult {
  previousStatus: string;
  impactedRequirements: string[];  // blocksで依存する要件ID
  prNumber?: number;
  prUrl?: string;
}

export async function revertToDraft(
  cwd: string,
  id: string,
  options?: { dryRun?: boolean },
): Promise<DraftReversionResult>;
```

**処理フロー:**

1. 前提条件チェック（statusが `draft` 以外）
2. `impact-service.analyzeImpact()` で影響範囲を分析（`blocks`で依存する要件を取得）
3. 影響範囲をコンソールに表示
4. Gitブランチ作成: `reqord/req-<id>-revert-to-draft`
5. `status` を `draft` に更新（**バージョンはインクリメントしない**）
6. `versionHistory` にエントリを追加
7. 変更をコミット・プッシュ
8. PRを作成（影響範囲をPR本文に記載）

**既存サービスの再利用:**

- `packages/cli/src/services/impact-service.ts` — `analyzeImpact()` で影響範囲分析
- `packages/cli/src/services/approval-service.ts` — PR作成パターンの参考
- `packages/cli/src/repositories/github.ts` — GitHub CLI操作
- `packages/cli/src/repositories/git.ts` — Git操作

### 7.3 PR本文テンプレート（差し戻し用）

```markdown
## 要件差し戻し

| フィールド | 値 |
|-----------|------|
| ID | {id} |
| タイトル | {title} |
| バージョン | {version} |
| 変更前ステータス | {previousStatus} |

### 影響範囲

以下の要件がこの要件に依存しています:

{impactedRequirements}

### 変更内容
status: {previousStatus} → draft

> このPRをマージすると、要件のステータスが `draft` に差し戻されます。
```

## 8. implementコマンド設計

### 8.1 implementコマンド (`commands/req/implement.ts`)

**責務:** approvedのreqをimplemented状態に遷移させる。ステータス変更のみ行い、バージョンはインクリメントしない。

```
reqord req implement <id>
```

| オプション | 説明 |
|-----------|------|
| `<id>` | 対象の要件ID（req-NNNNNN） |

### 8.2 処理フロー

1. 前提条件チェック: `status === "approved"`
2. `status` を `implemented` に更新（**バージョンはインクリメントしない**）
3. `versionHistory` にエントリを追加

> バージョン変更は `reqord version` コマンドで明示的に行う（req-000005参照）。
