# Zodバリデーションエラー詳細表示 - 技術設計書

## 1. 設計概要

Zodスキーマのバリデーション失敗時に、ZodError.issuesを解析して人間が読みやすい日本語エラーメッセージを生成する。現状の「Validation error」のような汎用メッセージを、フィールドパス・期待値・実際の値を含む詳細メッセージに置き換える。フォーマット関数は `@reqord/shared` に配置し、CLI・Web両方から利用可能にする。

## 2. アーキテクチャ

```
Shared:         @reqord/shared
                  utils/zod-error-formatter.ts (新規)
                    ↓ 利用
CLI:            packages/cli
                  repositories/requirement.ts   (既存修正)
                  repositories/specification.ts (既存修正)
                  services/requirement-service.ts (既存修正)
                    ↓ throw
                  utils/error-handler.ts (spec-000009で追加予定)
                    ↓
                  stderr出力

Web:            packages/web (将来利用)
```

`@reqord/shared` にフォーマッタを配置することで、CLI・Web・テストなどすべてのパッケージから利用可能にする。既存のバリデーション箇所（`safeParse` の `error.message` を使用している箇所）を一括でフォーマッタ呼び出しに置き換える。

## 3. コンポーネント設計

### 3.1 ZodErrorフォーマッタ (`@reqord/shared/utils/zod-error-formatter.ts` - 新規)

**責務:** ZodErrorオブジェクトから人間可読な日本語エラーメッセージ文字列を生成。

```typescript
import { ZodError, type ZodIssue } from "zod";

export interface FormatOptions {
  prefix?: string;   // 各行の接頭辞（デフォルト: "- "）
  separator?: string; // 行区切り（デフォルト: "\n"）
}

export function formatZodError(error: ZodError, options?: FormatOptions): string;
export function formatZodIssue(issue: ZodIssue): string;
```

**出力形式:**
```
- status: 不正な値 'unknown'（期待値: draft, approved, pending_approval, deprecated）
- dependencies.blockedBy[0]: 文字列が必要です（実際の型: number）
- title: 1文字以上の文字列が必要です
- estimatedHours: 正の数値が必要です
```

**対応するZodIssueCode:**
- `invalid_type`: 型不一致 → `"{path}: {expected}が必要です（実際の型: {received}）"`
- `invalid_enum_value`: enum不一致 → `"{path}: 不正な値 '{received}'（期待値: {options}）"`
- `too_small` / `too_big`: 範囲外 → `"{path}: {minimum/maximum}以上/以下が必要です"`
- `invalid_string`: 正規表現不一致 → `"{path}: 形式が不正です"`
- `unrecognized_keys`: 未知のキー → `"{path}: 不明なフィールド '{keys}'"`
- その他: `"{path}: {message}"` （Zodのデフォルトメッセージをフォールバック）

### 3.2 フィールドパス解決

**責務:** `ZodIssue.path` 配列をドット区切りのパス文字列に変換。

```typescript
// path: ["dependencies", "blockedBy", 0] → "dependencies.blockedBy[0]"
function formatPath(path: (string | number)[]): string;
```

- 文字列要素: ドットで結合
- 数値要素: ブラケット表記 `[N]`
- 空配列: `"(root)"` を返す

### 3.3 既存コード修正箇所

**requirement.ts リポジトリ:**
```typescript
// Before:
throw new Error(`Invalid requirement ${id}: ${result.error.message}`);

// After:
throw new Error(`要件 ${id} のバリデーションエラー:\n${formatZodError(result.error)}`);
```

**specification.ts リポジトリ:**
```typescript
// Before:
throw new Error(`Invalid specification ${id}: ${result.error.message}`);

// After:
throw new Error(`仕様 ${id} のバリデーションエラー:\n${formatZodError(result.error)}`);
```

**requirement-service.ts:**
```typescript
// Before:
throw new Error(`Validation failed: ${parseResult.error.message}`);

// After:
throw new Error(`バリデーションエラー:\n${formatZodError(parseResult.error)}`);
```

## 4. データフロー

### バリデーションエラー発生時

```
ユーザー → reqord req update req-000001 --patch-file bad.json
  → updateRequirement(cwd, id, options)
    → RequirementSchema.safeParse(merged)
      → { success: false, error: ZodError }
    → formatZodError(error) → 日本語メッセージ文字列生成
      → issues[0]: { code: "invalid_enum_value", path: ["status"], received: "unknown", options: [...] }
        → "- status: 不正な値 'unknown'（期待値: draft, approved, pending_approval, deprecated）"
      → issues[1]: { code: "too_small", path: ["title"], minimum: 1, type: "string" }
        → "- title: 1文字以上の文字列が必要です"
    → throw Error("バリデーションエラー:\n- status: ...\n- title: ...")
  → handleError(error)
    → stderr: "エラー: バリデーションエラー:\n  - status: 不正な値 'unknown'（期待値: ...）\n  - title: ..."
```

### ネストフィールドのエラー

```
不正なJSON: { "dependencies": { "blockedBy": [123] } }
  → ZodIssue: { code: "invalid_type", path: ["dependencies", "blockedBy", 0], expected: "string", received: "number" }
  → "- dependencies.blockedBy[0]: 文字列が必要です（実際の型: number）"
```

## 5. テスト方針

### ユニットテスト

- **formatZodError**: 各ZodIssueCode（invalid_type, invalid_enum_value, too_small, too_big, invalid_string, unrecognized_keys）に対する出力検証
- **formatPath**: 空配列、文字列のみ、数値混在、深いネストのパス変換
- **複数エラー同時表示**: issuesが3件以上ある場合にすべてが出力されること
- **フォーマットオプション**: prefix、separator指定時の出力変化

### 統合テスト

- RequirementSchemaに不正なデータを渡した際、フォーマット済みエラーが表示されること
- `reqord req update` で不正なpatch-fileを渡した際のエラー出力検証

## 6. 技術的決定事項

### フォーマッタの配置先

**決定:** `@reqord/shared/utils/zod-error-formatter.ts` に配置
**理由:** CLI以外のパッケージ（Web UI等）でもZodバリデーションエラーの表示が必要になる。共通パッケージに置くことでDRYを維持する。

### 全エラー同時表示

**決定:** ZodError.issues の全件をフォーマットして表示（最初の1件だけではない）
**理由:** JSONファイルの手動修正時、1つずつエラーを修正→再実行のサイクルは非効率。全エラーを一括表示することで、修正回数を最小化する。

### 日本語メッセージ

**決定:** フォーマット済みメッセージは日本語で出力
**理由:** reqordのプロジェクト全体方針として日本語を主言語としている（ProjectContextのデフォルト言語がja）。将来的にi18n対応する場合はフォーマッタにlocaleオプションを追加可能。
