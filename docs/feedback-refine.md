# Plan: ラベル方式廃止 → HTMLコメントタグ方式への移行

## Context

フィードバックの要件・仕様紐付けに `req:NNNNNN` / `spec:NNNNNN` 形式のGitHubラベルを使用しているが、要件が増えるたびにラベルも無限に増え、管理が破綻する。

**根本原因**: `docs/feedback-control.md` ではHTMLコメントタグ方式 (`<!-- reqord:feedback {...} -->`) を設計していたが、spec-000027 (設計書 3.4節) と spec-000028 (設計書 3.1節) がラベル方式で記述され、実装がそれに従った。仕様と設計文書の不一致。

## Step 0: Issue作成 + データ修正

### GitHub Issue作成

Featureテンプレートに従い、本変更のissueを作成。

### データ修正

- Issue #23: PR #31で解決済み (Zodスキーマ実装済) → `npx reqord feedback close 23`
- Issue #30: req-000023(feedback管理) → req-000016(GitHub Issue生成・管理) に紐付け変更
- 不要ラベル削除: `req:000001`, `req:000022`, `req:000023`, `improvement`, `spec-mismatch`, `requirement-gap`

## Step 1: Specification修正

### spec-000027/design.md

- 3.4節「FeedbackSyncService」: ラベル解析/構築 → HTMLコメント解析/構築に書き換え
  - `parseGitHubIssue()`: ラベル → `body` のHTMLコメントからメタデータ抽出
  - `syncToGitHub()`: ラベル追加 → Issue body にHTMLコメント挿入/更新
  - `parseTypeFromLabels()`, `parseLinkedToFromLabels()`, `buildLabelsFromFeedback()` → 削除
- 3.3節「GitHubClient」: `listFeedbackIssues()` のJSONフィールドに `body` を追加
- 4.1/4.2節「データフロー」: ラベル記述 → HTMLコメント記述に更新

### spec-000028/design.md

- 3.1節「FeedbackService」: `linkToRequirement()`, `linkWithNewRequirement()`, `linkToSpecification()` から `addLabelsToIssue` 呼び出し → HTMLコメント挿入/更新に変更
- 4.3/4.4節「データフロー」: ラベル追加の記述 → HTMLコメント挿入に更新

## Step 2: 実装

### 2.1 新規: HTMLコメントタグパーサー

**`packages/cli/src/services/reqord-comment.ts`** + テスト

```typescript
export interface ReqordFeedbackComment {
  type?: FeedbackType;
  severity?: FeedbackSeverity;
  linkedTo: {
    requirements: string[];
    createdRequirements: string[];
    specifications: string[];
  };
}

export function parseReqordComment(body: string): ReqordFeedbackComment | null;
export function buildReqordComment(metadata: ReqordFeedbackComment): string;
export function upsertReqordComment(
  body: string,
  metadata: ReqordFeedbackComment,
): string;
```

### 2.2 github-client.ts

- `updateIssueBody(issueNumber, newBody)` を追加
- `listFeedbackIssues()` に `body` フィールドを追加

### 2.3 feedback-service.ts

- `linkToRequirement()` 等: `addLabelsToIssue` → `getIssue()` + `upsertReqordComment()` + `updateIssueBody()`

### 2.4 feedback-sync-service.ts

- `parseGitHubIssue()`: ラベル解析 → `parseReqordComment(issue.body)` に変更
- `syncToGitHub()`: ラベル追加 → HTMLコメント挿入/更新
- `buildLabelsFromFeedback()`, `parseTypeFromLabels()`, `parseLinkedToFromLabels()` → 削除

### 2.5 テスト更新

- feedback-service.test.ts: `addLabelsToIssue` アサーション → `updateIssueBody` アサーションに変更
- feedback-sync-service.test.ts: ラベル系テスト → HTMLコメント系テストに書き換え
- github-client.test.ts: `updateIssueBody` テスト追加
- reqord-comment.test.ts: 新規

## Step 3: ドキュメント更新

### docs/feedback-control.md

- 141-145行目「Labels追加」セクション削除
- ラベル方式への言及を全削除
- HTMLコメントタグが唯一のメタデータ伝達方式であることを明記

## 検証方法

```bash
npm test -w packages/cli -w packages/shared   # テスト通過
npm run lint                                    # lint通過
npx reqord feedback sync                        # HTMLコメントから抽出
npx reqord feedback link 19 --req req-000001 --type improvement
gh issue view 19 --json body | jq '.body'       # <!-- reqord:feedback --> 確認
```
