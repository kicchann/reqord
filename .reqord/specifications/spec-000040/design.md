# 整合性チェック設定 - 技術設計書

## 1. 設計概要

`req implement` 実行時の整合性チェック（spec未実装チェック）の厳格さを `setting.yaml` の `consistencyCheck` セクションで制御可能にする。現在は警告のみだが、設定によりエラーに昇格させて実装完了をブロックできるようにする。

前提: spec-000035（設定スキーマ定義とロード基盤）が実装済みであること。

## 2. アーキテクチャ

```
packages/cli/src/
  ├── services/
  │   └── impl-validation-service.ts   (既存: チェック結果の扱いを設定対応)
  └── commands/
      └── req/
          └── implement.ts             (既存: 設定に応じてエラーに昇格)
```

### 設定項目と動作

| 設定項目 | デフォルト | 説明 |
|---------|-----------|------|
| `consistencyCheck.specNotImplementedLevel` | `"warning"` | `"error"` の場合、spec未実装時に `req implement` をブロック |

## 3. コンポーネント設計

### 3.1 checkImplementConsistency の修正

既存の `ImplementConsistencyWarning` / `ImplementConsistencyResult` 型をそのまま活用する（新規型定義は不要）。

```typescript
// packages/cli/src/services/impl-validation-service.ts

// 既存の型定義（変更なし）
export interface ImplementConsistencyWarning {
  type: "spec-not-implemented" | "issue-not-closed";
  message: string;
  details: {
    id: string;
    currentStatus: string;
  };
}

export interface ImplementConsistencyResult {
  warnings: ImplementConsistencyWarning[];
}

// 既存の関数シグネチャ（変更なし）
export async function checkImplementConsistency(
  cwd: string,
  reqId: string,
): Promise<ImplementConsistencyResult> {
  // 既存ロジック: 関連specの実装状況とissueの状態をチェック
  // 戻り値は既に構造化されているため変更不要
}
```

### 3.2 implement コマンドの修正

```typescript
// packages/cli/src/commands/req/implement.ts

const settings = await loadProjectSettings(cwd);
const result = await checkImplementConsistency(cwd, id);

if (result.warnings.length > 0) {
  const specWarnings = result.warnings.filter(w => w.type === "spec-not-implemented");

  if (settings.consistencyCheck.specNotImplementedLevel === "error" && specWarnings.length > 0) {
    // エラーとして表示し、処理を中断
    throw new AppError(VALIDATION_ERROR, "未実装のspecificationがあります");
  } else {
    // 既存の警告表示
  }
}
```

## 4. テスト方針

### 単体テスト

- **specNotImplementedLevel: "warning"（デフォルト）**
  - spec未実装でも警告表示のみで `req implement` が成功（既存動作）

- **specNotImplementedLevel: "error"**
  - spec未実装の場合 → エラーで処理中断
  - 全specが実装済みの場合 → 正常に処理完了

- **specが存在しないrequirement**
  - specが0件の場合 → 警告もエラーもなく正常処理

- **issue-not-closedの扱い**
  - issue未クローズは `specNotImplementedLevel` の影響を受けず常に警告（将来的に別設定で制御可能にする余地を残す）

**スコープ外**: req-000029 description.mdの「依存先ステータスチェック」はSuccess Criteriaに含まれないため、本specのスコープ外とする。将来必要に応じて `consistencyCheck.dependencyStatusLevel` を追加する。

## 5. 実装順序

1. `checkImplementConsistency` の戻り値を構造化（警告リスト化）
2. `implement` コマンドで設定をロードし、警告レベルに応じた分岐を追加
3. テスト作成・実行
