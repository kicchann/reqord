# Requirementバージョン管理 - 技術設計書

## 1. 設計概要

要件のライフサイクル管理として、セマンティックバージョニング（major/minor/patch）による変更追跡と状態遷移（draft → pending_approval → approved → deprecated）を実装する。要件更新時にversionHistoryへ自動的に履歴エントリを追加し、`reqord req history <id>` コマンドで変更履歴を表示する。本機能は未実装であり、既存のRequirementスキーマに定義済みの `version` / `versionHistory` フィールドを活用する。

## 2. アーキテクチャ

```
Command Layer:  commands/req/history.ts  (新規)
                commands/req/update.ts   (既存拡張)
                    ↓
Service Layer:  services/requirement-service.ts (既存拡張)
                services/version-service.ts     (新規)
                    ↓
Repository:     repositories/requirement.ts     (既存)
                    ↓
Shared:         @reqord/shared
                  schemas/common.ts             (VersionHistoryEntrySchema既存)
                  schemas/requirement.ts        (version, versionHistory既存)
```

既存のスキーマ定義（VersionHistoryEntrySchema）とフィールド（versionHistory配列）はすでに存在するため、新規コードは主にサービス層のバージョン管理ロジックとhistoryコマンドの追加となる。

## 3. コンポーネント設計

### 3.1 historyコマンド (`commands/req/history.ts` - 新規)

**責務:** 指定要件のバージョン履歴を表示。

```
reqord req history <id> [--json]
```

- テーブル形式: version, status, gitCommit(短縮), approvedAt, approvedBy
- `--json`: ValidationResult同様のJSON出力

### 3.2 VersionService (`services/version-service.ts` - 新規)

**責務:** バージョン管理ロジックの提供。

- `determineNextVersion(before, after)`: 変更内容に基づくバージョン番号決定
  - **major**: status変更（draft → approved等の状態遷移）
  - **minor**: title, format, dependencies, successCriteria等の構造変更
  - **patch**: description.mdのみの変更、priority変更
- `createHistoryEntry(requirement, gitCommit?)`: VersionHistoryEntryの生成
- `getStateTransitions()`: 許可される状態遷移マップの提供

### 3.3 RequirementService 拡張

**変更点:** updateRequirement内でのバージョン自動インクリメント。

```typescript
// draft状態ではバージョンインクリメントしない
if (before.status !== "draft" || after.status !== "draft") {
  const nextVersion = determineNextVersion(before, after);
  after.version = nextVersion;
  after.versionHistory.push(createHistoryEntry(after, gitCommit));
}
```

### 3.4 状態遷移ルール

```
draft ──→ pending_approval ──→ approved ──→ deprecated
  ↑            │
  └────────────┘ (差し戻し)
```

許可される遷移:
- `draft` → `pending_approval`
- `pending_approval` → `approved`
- `pending_approval` → `draft`（差し戻し）
- `approved` → `deprecated`

禁止される遷移:
- `approved` → `draft`（承認済みを直接ドラフトに戻すことは不可）
- `deprecated` → いずれの状態にも戻せない

### 3.5 VersionHistoryEntry（既存スキーマ）

```typescript
{
  version: string,      // "1.2.3"
  status: Status,       // 記録時点の状態
  gitCommit: string,    // Gitコミットハッシュ（空文字列許容）
  approvedAt: string,   // ISO 8601タイムスタンプ
  approvedBy: string[], // 承認者リスト
}
```

## 4. データフロー

### 更新時の自動バージョニング

```
ユーザー → reqord req update req-000001 --status approved
  → updateRequirement(cwd, id, { status: "approved" })
    → before取得（status: "pending_approval", version: "1.0.0"）
    → 状態遷移チェック: pending_approval → approved（許可）
    → determineNextVersion(before, after) → "2.0.0"（status変更=major）
    → createHistoryEntry(after, gitCommit)
    → versionHistory.push(entry)
    → reqRepo.save(cwd, after)
```

### 履歴表示

```
ユーザー → reqord req history req-000001
  → showRequirement(cwd, id)
    → requirement.versionHistory取得
  → テーブル表示:
    | Version | Status           | Commit  | Date       |
    | 1.0.0   | draft            | abc1234 | 2025-01-01 |
    | 1.1.0   | pending_approval | def5678 | 2025-01-05 |
    | 2.0.0   | approved         | ghi9012 | 2025-01-10 |
```

## 5. テスト方針

### ユニットテスト

- **version-service**: バージョン番号決定ロジック（major/minor/patch各ケース）
- **状態遷移**: 許可/禁止される遷移パターンの網羅テスト
- **createHistoryEntry**: エントリ生成の各フィールド検証
- **draft状態での更新**: バージョンインクリメントされないことの確認

### 統合テスト

- create → update(title変更) → update(status変更) → history表示の一連フロー
- 不正な状態遷移（approved → draft）のエラーハンドリング

## 6. 技術的決定事項

### セマンティックバージョニングの粒度

**決定:** major=状態遷移、minor=構造変更、patch=軽微な変更
**理由:** npmのsemverとは異なるが、要件管理の文脈では「状態が変わった」が最も重要な変更。構造的な内容変更はminor、文書的な修正はpatchとすることで、変更の重要度が直感的に分かる。

### draft状態でのバージョンスキップ

**決定:** draft状態での更新ではバージョンをインクリメントしない
**理由:** draft段階は試行錯誤のフェーズであり、すべての編集を履歴に残すとノイズが大きい。pending_approval以降の変更のみを正式な履歴として記録する。

### Gitコミットハッシュの取得

**決定:** 環境変数またはgitコマンド実行で現在のHEADコミットを取得。取得失敗時は空文字列
**理由:** Git管理下でない環境でも動作する必要がある。コミットハッシュは参考情報であり、必須ではない。
