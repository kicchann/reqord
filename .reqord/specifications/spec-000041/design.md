# 自動draft戻し制御 - 技術設計書

## 1. 設計概要

approved/implemented状態のRequirementで内容変更が行われた際の自動draft戻しの挙動を `setting.yaml` の `autoRevert.onContentChange` で制御可能にする。現在は常にdraftに戻るが、patchレベルの修正（typo等）ではステータスを維持したいユースケースに対応する。

前提: spec-000035（設定スキーマ定義とロード基盤）が実装済みであること。

## 2. アーキテクチャ

```
packages/cli/src/
  ├── services/
  │   ├── requirement-service.ts       (既存: shouldRevertToDraft呼び出し箇所を設定対応)
  │   └── version-service.ts           (既存: shouldRevertToDraft関数を拡張)
  └── commands/
      └── req/
          └── (version関連コマンド)     (既存: bumpType伝搬)
```

### 設定項目と動作

| 設定値 | 動作 |
|--------|------|
| `always` | 内容変更時に常にdraftに戻す（現在の動作、デフォルト） |
| `major-only` | majorバージョンバンプ時のみdraftに戻す（patch変更ではステータス維持） |
| `never` | 自動draft戻しを無効化 |

## 3. コンポーネント設計

### 3.1 shouldRevertToDraft の拡張

```typescript
// packages/cli/src/services/version-service.ts

export function shouldRevertToDraft(
  currentStatus: Status,
  hasContentChanges: boolean,
  autoRevertMode: "always" | "major-only" | "never" = "always",
  bumpType?: "patch" | "major",
): boolean {
  if (currentStatus !== "approved" && currentStatus !== "implemented") {
    return false;
  }
  if (!hasContentChanges) {
    return false;
  }

  switch (autoRevertMode) {
    case "always":
      return true;
    case "major-only":
      return bumpType === "major";
    case "never":
      return false;
  }
}
```

### 3.2 requirement-service の修正

設定のロードはコマンド層で1回だけ行い、`updateRequirement` には引数として渡す（spec-000036, 037と同じパターン）。`UpdateOptions` に `settings?: ProjectSettings` を追加する。

```typescript
// packages/cli/src/services/requirement-service.ts
// updateRequirement 内の auto-revert 箇所

// options.settings はコマンド層からloadProjectSettings()の結果が渡される
const autoRevertMode = options.settings?.autoRevert.onContentChange ?? "always";
const shouldRevert = versionService.shouldRevertToDraft(
  before.status as Status,
  hasContentChanges,
  autoRevertMode,
  options.versionBump,  // "patch" | "major"（UpdateOptionsから取得）
);
```

### 3.3 bumpType の伝搬

`updateRequirement` の `UpdateOptions` には既に `versionBump` フィールドが存在するため、そのまま `shouldRevertToDraft` に渡す。`reqord version` コマンドから `updateRequirement` を呼ぶ際に `options.versionBump` が設定されている。

## 4. テスト方針

### 単体テスト

- **onContentChange: "always"（デフォルト）**
  - 既存の動作と同じ（内容変更で常にdraftに戻る）

- **onContentChange: "major-only"**
  - patch変更時 → ステータス維持（approved/implementedのまま）
  - major変更時 → draftに戻る

- **onContentChange: "never"**
  - どんな変更でもステータス維持

- **draft状態での変更**
  - どの設定でもrevertは発生しない（既にdraft）

## 5. 実装順序

1. `shouldRevertToDraft` に `autoRevertMode` と `bumpType` 引数を追加
2. `updateRequirement` にsettingsロードと `bumpType` 伝搬を追加
3. `reqord version` コマンドから `bumpType` を渡すよう修正
4. テスト作成・実行
