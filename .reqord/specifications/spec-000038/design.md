# ブランチ命名規則のカスタマイズ - 技術設計書

## 1. 設計概要

PR作成時のブランチプレフィックスを `setting.yaml` の `branchNaming` セクションでカスタマイズ可能にする。現在ハードコードされている `reqord/` プレフィックスを変更できるようにする。

前提: spec-000035（設定スキーマ定義とロード基盤）が実装済みであること。

## 2. アーキテクチャ

```
packages/cli/src/
  └── services/
      ├── approval-service.ts          (既存: ブランチ名生成を設定対応)
      ├── draft-reversion-service.ts   (既存: ブランチ名生成を設定対応)
      └── (implement関連)              (spec-000037でPR対応する場合)
```

### 現在のブランチ命名パターン

| アクション | 現在のパターン | 設定対象 |
|-----------|---------------|---------|
| approve | `reqord/{id}-approve-v{version}` | `branchNaming.toApprovedPrefix` |
| implement | （現在PRなし） | `branchNaming.toImplementedPrefix` |
| revert to draft | `reqord/{id}-revert-to-draft` | `branchNaming.toDraftPrefix` |

### カスタマイズ後の命名パターン

| アクション | カスタマイズ後 |
|-----------|--------------|
| approve | `{toApprovedPrefix}/{id}-approve-v{version}` |
| implement | `{toImplementedPrefix}/{id}-implement-v{version}` |
| revert to draft | `{toDraftPrefix}/{id}-revert-to-draft` |

## 3. コンポーネント設計

### 3.1 ブランチ名生成の修正

```typescript
// packages/cli/src/services/approval-service.ts

function generateApprovalBranchName(
  id: string,
  version: string,
  settings: ProjectSettings,
): string {
  const prefix = settings.branchNaming.toApprovedPrefix;
  return `${prefix}/${id}-approve-v${version}`;
}
```

```typescript
// packages/cli/src/services/draft-reversion-service.ts

function generateReversionBranchName(
  id: string,
  settings: ProjectSettings,
): string {
  const prefix = settings.branchNaming.toDraftPrefix;
  return `${prefix}/${id}-revert-to-draft`;
}
```

```typescript
// implement PR用（spec-000037で追加される場合）

function generateImplementBranchName(
  id: string,
  version: string,
  settings: ProjectSettings,
): string {
  const prefix = settings.branchNaming.toImplementedPrefix;
  return `${prefix}/${id}-implement-v${version}`;
}
```

## 4. テスト方針

### 単体テスト

- **デフォルト設定**
  - 全ブランチ名が `reqord/...` になる（後方互換）

- **カスタムプレフィックス**
  - `toApprovedPrefix: "approve"` → `approve/{id}-approve-v{version}`
  - `toImplementedPrefix: "impl"` → `impl/{id}-implement-v{version}`
  - `toDraftPrefix: "revert"` → `revert/{id}-revert-to-draft`

- **空文字列やスラッシュ含むプレフィックスのバリデーション**
  - spec-000035の `BranchNamingSchema` で `z.string().min(1)` を適用し、空文字列を禁止

## 5. 実装順序

1. `approval-service` のブランチ名生成をヘルパー関数に抽出し設定対応
2. `draft-reversion-service` のブランチ名生成をヘルパー関数に抽出し設定対応
3. implement用ブランチ名生成を追加（spec-000037と連携）
4. テスト作成・実行
