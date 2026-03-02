# 承認前チェック項目のカスタマイズ - 技術設計書

## 1. 設計概要

Specification/Requirementの承認時に行われるチェック項目を `setting.yaml` の `approvalPrerequisites` セクションで制御可能にする。現在ハードコードされているdesign.mdチェックをスキップ可能にし、description.mdチェックやカスタムファイルチェックを追加できるようにする。

前提: spec-000035（設定スキーマ定義とロード基盤）が実装済みであること。

## 2. アーキテクチャ

```
packages/cli/src/
  ├── services/
  │   ├── specification-service.ts     (既存: checkSpecApprovalPrerequisites を設定対応に修正)
  │   └── requirement-approval-handler.ts (既存: description.mdチェック追加)
```

### 設定項目と影響範囲

| 設定項目 | デフォルト | 影響するコマンド |
|---------|-----------|----------------|
| `approvalPrerequisites.designMdCheck` | `true` | `spec approve` |
| `approvalPrerequisites.descriptionMdCheck` | `false` | `req approve` |
| `approvalPrerequisites.customFiles` | `[]` | `spec approve`, `req approve` |

## 3. コンポーネント設計

### 3.1 checkSpecApprovalPrerequisites の修正

既存シグネチャ `(cwd: string, specId: string): Promise<PrerequisiteResult>` に `settings` 引数を追加する。

```typescript
// packages/cli/src/services/specification-service.ts

export async function checkSpecApprovalPrerequisites(
  cwd: string,
  specId: string,
  settings: ProjectSettings,  // 引数追加
): Promise<PrerequisiteResult> {
  // 1. ステータスチェック（既存: 変更なし）
  // 2. 紐づくrequirementのステータスチェック（既存: 変更なし）
  // 3. design.mdチェック（設定で制御）
  //    if (settings.approvalPrerequisites.designMdCheck) {
  //      design.md存在・内容チェック（既存ロジック）
  //    }
  // 4. カスタムファイルチェック（新規）
  //    settings.approvalPrerequisites.customFiles.forEach(file => {
  //      spec-ディレクトリ内にファイルが存在するかチェック
  //    })
}
```

### 3.2 requirement承認時のdescription.mdチェック

`revalidate()` はステータス・バージョンチェックのみの薄いハンドラのため、`checkSpecApprovalPrerequisites` と同様に専用関数を新設する。

```typescript
// packages/cli/src/services/requirement-service.ts（または専用ファイル）

export async function checkReqApprovalPrerequisites(
  cwd: string,
  reqId: string,
  settings: ProjectSettings,
): Promise<PrerequisiteResult> {
  const errors: string[] = [];

  // 1. description.mdチェック（設定で制御）
  //    if (settings.approvalPrerequisites.descriptionMdCheck) {
  //      description.mdが存在し、テンプレートのままでないか確認
  //    }
  // 2. カスタムファイルチェック（req-ディレクトリ内）
  //    settings.approvalPrerequisites.customFiles.forEach(file => ...)

  return { ok: errors.length === 0, errors };
}
```

呼び出し元: `commands/req/approve.ts` から `checkReqApprovalPrerequisites()` を呼ぶ。

## 4. テスト方針

### 単体テスト

- **spec approve - designMdCheckが無効の場合**
  - design.mdが存在しなくても承認が通る

- **spec approve - designMdCheckが有効の場合（デフォルト）**
  - 既存の動作と同じ（design.md必須）

- **req approve - descriptionMdCheckが有効の場合**
  - description.mdが空・テンプレートのままだとエラー

- **req approve - descriptionMdCheckが無効の場合（デフォルト）**
  - 既存の動作と同じ（description.mdチェックなし）

- **カスタムファイルチェック**
  - 指定ファイルが存在しない場合にエラー
  - 指定ファイルが存在する場合に通過

## 5. 実装順序

1. `checkSpecApprovalPrerequisites` にsettings引数を追加し、design.mdチェックを条件分岐
2. 呼び出し元（`spec approve`コマンド）でsettingsをロードして渡す
3. カスタムファイルチェックロジックを追加
4. `checkReqApprovalPrerequisites` を実装し、`commands/req/approve.ts` から呼び出す
5. テスト作成・実行
