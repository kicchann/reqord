# Requirement Show/Update/Delete - 技術設計書

## 1. 設計概要

要件の詳細表示（show）、フィールド更新（update）、削除（delete）の3コマンドを提供する。spec-000002で定義されたCRUD操作のうち、読み取り以降の操作に特化した設計書であり、各コマンドの入出力仕様、更新時のバリデーション戦略、削除時の安全性確保を詳細化する。既存の `requirement-service.ts` と `requirement.ts` リポジトリを活用する。

## 2. アーキテクチャ

```
Command Layer:
  commands/req/show.ts     → showRequirement()
  commands/req/update.ts   → updateRequirement()
  commands/req/delete.ts   → deleteRequirement()
      ↓
Service Layer:
  services/requirement-service.ts
    ├── showRequirement(cwd, id) → ShowResult
    ├── updateRequirement(cwd, id, options) → UpdateResult
    └── deleteRequirement(cwd, id) → void
      ↓
Repository Layer:
  repositories/requirement.ts
    ├── findById(cwd, id) → Requirement | null
    ├── save(cwd, requirement) → void
    ├── loadDescription(cwd, id) → string | null
    ├── saveDescription(cwd, id, content) → void
    └── deleteById(cwd, id) → void
      ↓
File System:
  .reqord/requirements/req-NNNNNN.yaml
  .reqord/requirements/req-NNNNNN/description.md
```

## 3. コンポーネント設計

### 3.1 showコマンド (`commands/req/show.ts`)

**責務:** 指定IDの要件メタデータ全フィールドとdescription.mdの内容を表示。

**入力:**
- `<id>`: 必須引数（例: `req-000001`）
- `--json`: オプション。JSON出力（description含む）

**出力（通常モード）:**
```
Requirement: req-000001

  Title:      認証機能の実装
  Status:     draft
  Priority:   high
  Format:     user-story
  Version:    1.0.0
  Created:    2025-01-01T00:00:00.000Z
  Updated:    2025-01-01T00:00:00.000Z
  Criteria:   基準1, 基準2

Description:
  [description.mdの内容]
```

**出力（--json）:**
```json
{
  "id": "req-000001",
  "title": "...",
  "description": "..."
}
```

### 3.2 updateコマンド (`commands/req/update.ts`)

**責務:** 指定IDの要件フィールドを更新。

**入力:**
- `<id>`: 必須引数
- `-t, --title <title>`: タイトル更新
- `-s, --status <status>`: ステータス更新（draft/pending_approval/approved/deprecated）
- `-p, --priority <priority>`: 優先度更新（low/medium/high）
- `--patch-file <path>`: JSONファイルによる一括更新
- `--description-file <path>`: Markdownファイルによるdescription.md更新
- `--json`: 更新後のRequirementをJSON出力

**オプション必須チェック:** いずれのオプションも指定されない場合はエラー。

**マージ戦略:**
1. 既存データを取得（before）
2. `--patch-file` の内容をシャローマージ（許可フィールドのみ）
3. 個別フラグ（--title, --status, --priority）で上書き
4. immutableフィールド保持: id, createdAt, files
5. updatedAtを現在時刻に更新
6. RequirementSchema.safeParseで全体バリデーション
7. 保存

**出力:** 変更されたフィールドのbefore → after差分表示。

### 3.3 deleteコマンド (`commands/req/delete.ts`)

**責務:** 指定IDの要件を削除（YAMLファイル + 説明文ディレクトリ）。

**入力:**
- `<id>`: 必須引数
- `-f, --force`: 確認プロンプトスキップ

**確認フロー:**
```
--force未指定:
  "Are you sure you want to delete req-000001? (y/N) "
  → y: 削除実行
  → N/その他: "Cancelled." で終了

--force指定:
  → 即座に削除実行
```

**削除対象:**
- `.reqord/requirements/req-NNNNNN.yaml`
- `.reqord/requirements/req-NNNNNN/` ディレクトリ全体（description.md含む）

**エラー処理:** 指定IDが存在しない場合は `Requirement {id} not found.` エラー。

## 4. データフロー

### Show

```
ユーザー → reqord req show req-000001
  → showCommand.action(id, { json: false })
    → showRequirement(cwd, "req-000001")
      → reqRepo.findById(cwd, "req-000001")
        → .reqord/requirements/req-000001.yaml読み込み
        → RequirementSchema.safeParse → Requirement
      → reqRepo.loadDescription(cwd, "req-000001")
        → .reqord/requirements/req-000001/description.md読み込み
    → ShowResult { requirement, description }
  → フォーマット済み出力
```

### Update（複合オプション）

```
ユーザー → reqord req update req-000001 -t "新タイトル" --patch-file patch.json --description-file desc.md
  → updateCommand.action(id, options)
    → fs.readText("patch.json") → patchData
    → fs.readText("desc.md") → descriptionContent
    → updateRequirement(cwd, id, { title: "新タイトル", patchData, descriptionContent })
      → findById → before: { title: "旧タイトル", status: "draft", ... }
      → merge: { ...before, ...patchData } → { title: "patch内タイトル", ... }
      → override: title = "新タイトル"（個別フラグ優先）
      → updatedAt = now()
      → RequirementSchema.safeParse(merged) → after
      → reqRepo.save(cwd, after)
      → reqRepo.saveDescription(cwd, id, descriptionContent)
    → UpdateResult { before, after, descriptionUpdated: true }
  → 差分表示:
    title: 旧タイトル → 新タイトル
    description.md: updated
```

### Delete

```
ユーザー → reqord req delete req-000001
  → deleteCommand.action(id, { force: false })
    → confirm("Are you sure you want to delete req-000001?")
      → "y"
    → deleteRequirement(cwd, "req-000001")
      → reqRepo.findById → 存在確認
      → reqRepo.deleteById(cwd, "req-000001")
        → fs.remove("req-000001.yaml")
        → fs.remove("req-000001/")
  → "Deleted requirement: req-000001"
```

## 5. テスト方針

### ユニットテスト

- **show**: 存在するID→正常表示、存在しないID→エラー、description.mdなし→descriptionがnull
- **update**: 各フィールド個別更新、patch-file適用、個別フラグとpatch-fileの優先順位、immutableフィールドの保持、Zodバリデーション失敗
- **delete**: 存在するID→正常削除、存在しないID→エラー

### 統合テスト

- create → show → update → show（更新反映確認） → delete → show（404確認）
- --json出力がJSON.parseableであること
- --force での非対話的削除

## 6. 技術的決定事項

### 確認プロンプトの実装

**決定:** `node:readline/promises` の `createInterface` を使用
**理由:** 外部ライブラリ不要。Node.js標準APIのみで対話的プロンプトを実現。`--force` オプションでスキップ可能にすることで、スクリプト/AIエージェントからの利用も対応。

### 更新時のZod再検証

**決定:** マージ後のデータ全体をRequirementSchema.safeParseで再検証
**理由:** patch-fileの内容が不正な場合（型不一致、必須フィールド欠落等）を確実に検出。個別フィールドの型チェックだけでは、discriminatedUnion（format）やネストされたオブジェクト（dependencies）の整合性を保証できない。

### 変更差分の表示

**決定:** before/afterの各フィールドを比較し、変更があったフィールドのみ表示
**理由:** 全フィールドを表示すると冗長。ユーザーが「何が変わったか」を即座に確認できることが重要。
