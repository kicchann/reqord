# ステータス遷移のPR要否設定 - 技術設計書

## 1. 設計概要

ステータス変更時のPR作成要否を `setting.yaml` の `statusTransitionPr` セクションで制御可能にする。現在 `req approve` / `spec approve` / `req draft` / `spec draft` ではPR作成が必須だが、設定によりPRなしで直接ステータス変更できるようにする。

前提: spec-000035（設定スキーマ定義とロード基盤）が実装済みであること。

## 2. アーキテクチャ

```
packages/cli/src/
  ├── services/
  │   ├── approval-service.ts          (既存: PR作成を条件分岐)
  │   └── draft-reversion-service.ts   (既存: PR作成を条件分岐)
  ├── commands/
  │   ├── req/
  │   │   ├── approve.ts               (既存: 設定ロード追加)
  │   │   ├── implement.ts             (既存: 設定ロード追加)
  │   │   └── draft.ts                 (既存: 設定ロード追加)
  │   └── spec/
  │       ├── approve.ts               (既存: 設定ロード追加)
  │       ├── implement.ts             (既存: 設定ロード追加)
  │       └── draft.ts                 (既存: 設定ロード追加)
```

### 設定項目と影響範囲

| 設定項目 | デフォルト | 影響するコマンド |
|---------|-----------|----------------|
| `statusTransitionPr.draftToApproved` | `true` | `req approve`, `spec approve` |
| `statusTransitionPr.approvedToImplemented` | `false` | `req implement`, `spec implement` |
| `statusTransitionPr.toDraft` | `true` | `req draft`, `spec draft` |

## 3. コンポーネント設計

### 3.1 approval-service の修正

既存シグネチャ `(cwd, target: ApprovalTarget, handler: ApprovalHandler, options?: ApprovalOptions): Promise<ApprovalResult>` に設定参照を追加する。

```typescript
// packages/cli/src/services/approval-service.ts

export async function startApproval(
  cwd: string,
  target: ApprovalTarget,
  handler: ApprovalHandler,
  options?: ApprovalOptions,
): Promise<ApprovalResult> {
  const settings = await loadProjectSettings(cwd);

  if (settings.statusTransitionPr.draftToApproved) {
    // 既存フロー: ブランチ作成 → ステータス更新 → コミット → プッシュ → PR作成
  } else {
    // 直接更新フロー:
    // 1. handler.revalidate() で事前チェック
    // 2. handler.updateStatus() でYAML更新
    // 3. git add + git commit（現在のブランチ上で直接コミット）
    // ※ブランチ作成・プッシュ・PR作成はスキップ
  }
}
```

### 3.2 draft-reversion-service の修正

```typescript
// packages/cli/src/services/draft-reversion-service.ts

export async function revertToDraft(
  cwd: string,
  entityType: "requirement" | "specification",
  id: string,
  options: RevertOptions,
): Promise<RevertResult> {
  const settings = await loadProjectSettings(cwd);

  if (settings.statusTransitionPr.toDraft) {
    // 既存フロー: ブランチ作成 → ステータス更新 → コミット → プッシュ → PR作成
  } else {
    // 直接更新フロー（approvalと同様）
  }
}
```

### 3.3 implement コマンドのPR対応

現在 `req implement` / `spec implement` はPRなしで直接更新している。`approvedToImplemented: true` の場合にPR作成フローを追加する。

```typescript
// approval-service のロジックを再利用可能な形に抽出し、
// implement コマンドからも利用できるようにする
```

## 4. テスト方針

### 単体テスト

- **draftToApproved: false の場合**
  - PR作成されず、現在のブランチ上で直接コミットされる
  - ステータスが approved に更新される

- **draftToApproved: true の場合（デフォルト）**
  - 既存の動作と同じ（ブランチ作成 → PR）

- **toDraft: false の場合**
  - PR作成されず、直接コミットされる

- **approvedToImplemented: true の場合**
  - implement 時にPR作成フローが実行される

- **approvedToImplemented: false の場合（デフォルト）**
  - 既存の動作と同じ（直接更新）

## 5. 実装順序

1. `approval-service` にPRスキップロジックを追加（直接コミットフロー）
2. `draft-reversion-service` にPRスキップロジックを追加
3. `implement` コマンドにPR作成フローを追加（オプション）
4. 各コマンドで設定をロードして渡す
5. テスト作成・実行
