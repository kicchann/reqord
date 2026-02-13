# Requirementバージョン管理 - 技術設計書

## 1. 設計概要

要件のライフサイクル管理として、セマンティックバージョニング（major/minor/patch）による変更追跡と状態遷移（draft → approved → implemented）を実装する。バージョンインクリメントは**内容変更時のみ**行い、ステータス遷移ではバージョンを変更しない。要件更新時にversionHistoryへ自動的に履歴エントリを追加し、`reqord req history <id>` コマンドで変更履歴を表示する。既存のRequirementスキーマに定義済みの `version` / `versionHistory` フィールドを活用する。

> **v2.0.0改訂:** フィードバック(#109, #208, #209)に基づき、バージョニングルールと状態遷移を改訂。

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

- テーブル形式: version, status, gitCommit(短縮), changedAt, summary
- `--json`: ValidationResult同様のJSON出力

### 3.2 VersionService (`services/version-service.ts` - 新規)

**責務:** バージョン管理ロジックの提供。

- `determineNextVersion(before, after)`: **内容フィールド**の変更に基づくバージョン番号決定
  - **major** (x.0.0): 要件の根本的な変更（スコープ変更、EARS format変更）
  - **minor** (0.x.0): 要件の追加・拡張（successCriteria追加、dependencies変更、title変更等）
  - **patch** (0.0.x): 記述の修正（description.mdの誤字修正、明確化、priority変更）
  - **変更なし**: ステータス変更のみ、flag変更のみの場合はバージョンを変えない
- `createHistoryEntry(requirement, gitCommit)`: VersionHistoryEntryの生成
- `getStateTransitions()`: 許可される状態遷移マップの提供
- `--major`, `--minor`, `--patch` オプションで明示的にバージョン種別を指定可能

#### バージョン変更トリガー判定

| 変更内容 | バージョン変更 | 備考 |
|---------|--------------|------|
| title, successCriteria, format, dependencies等 | する | 内容変更 = バージョンアップ |
| status変更（draft → approved → implemented等） | **しない** | ワークフロー進行はバージョンと無関係 |
| flagの追加・削除 | **しない** | メタ情報の変更 |

### 3.3 RequirementService 拡張

**変更点:** updateRequirement内でのバージョン自動インクリメント。

```typescript
// 内容フィールドに変更がある場合のみバージョンインクリメント
const contentChanged = hasContentChanges(before, after);
if (contentChanged) {
  const nextVersion = determineNextVersion(before, after);
  after.version = nextVersion;
  after.versionHistory.push(createHistoryEntry(after, gitCommit));
}
// ステータスのみの変更ではバージョンを変えない
```

### 3.4 状態遷移ルール

```
draft ──approve──→ approved ──implement──→ implemented
  ↑                    │                       │
  ├── draft (flag解決) ←┘                       │
  └── draft (flag解決) ←───────────────────────┘
```

> `pending_approval` は廃止（#208）。PRマージ自体が承認行為となる。
> すべての状態遷移はPR経由で行う。

許可される遷移:
- `draft` → `approved`
- `approved` → `implemented`
- `approved` → `draft`（flag対応による差し戻し。draftに戻る際にバージョン見直し）
- `implemented` → `draft`（flag対応による差し戻し。draftに戻る際にバージョン見直し）

状態遷移コマンド:
- `reqord req draft <id>` / `reqord spec draft <id>`
- `reqord req approve <id>` / `reqord spec approve <id>`
- `reqord req implemented <id>` / `reqord spec implemented <id>`

各コマンド実行時にversionHistoryへ履歴エントリを記録する。

### 3.5 VersionHistoryEntry（既存スキーマ）

```typescript
{
  version: string,      // "1.2.3"
  status: Status,       // 記録時点の状態
  gitCommit: string,    // Gitコミットハッシュ（必須。PR経由のため常に取得可能）
  changedAt: string,    // ISO 8601タイムスタンプ
  summary: string,      // 変更概要
}
```

## 4. データフロー

### 更新時の自動バージョニング（内容変更あり）

```
ユーザー → reqord req update req-000001 --title "新しいタイトル"
  → updateRequirement(cwd, id, { title: "新しいタイトル" })
    → before取得（title: "旧タイトル", version: "1.0.0"）
    → hasContentChanges(before, after) → true（title変更）
    → determineNextVersion(before, after) → "1.1.0"（構造変更=minor）
    → createHistoryEntry(after, gitCommit)
    → versionHistory.push(entry)
    → reqRepo.save(cwd, after)
```

### 状態遷移（バージョン据え置き、履歴は記録）

```
ユーザー → reqord req approve req-000001
  → before取得（status: "draft", version: "1.1.0"）
  → 状態遷移チェック: draft → approved（許可）
  → バージョンインクリメントなし
  → versionHistory.push({ version: "1.1.0", status: "approved", gitCommit, ... })
  → reqRepo.save(cwd, after)
```

### flag対応によるdraft差し戻し

```
ユーザー → reqord req draft req-000001
  → before取得（status: "implemented", version: "1.1.0"）
  → 状態遷移チェック: implemented → draft（許可）
  → バージョン見直し（必要に応じて内容変更時にインクリメント）
  → versionHistory.push({ version: "1.1.0", status: "draft", gitCommit, ... })
  → reqRepo.save(cwd, after)
```

### 履歴表示

```
ユーザー → reqord req history req-000001
  → showRequirement(cwd, id)
    → requirement.versionHistory取得
  → テーブル表示:
    | Version | Status    | Git Commit | Date       | Summary              |
    | 1.0.0   | draft     | abc1234    | 2025-01-01 | Initial              |
    | 1.1.0   | draft     | def5678    | 2025-01-05 | 成功基準追加          |
    | 2.0.0   | approved  | 9ab0cde    | 2025-01-10 | スコープ変更          |
```

## 5. テスト方針

### ユニットテスト

- **version-service**: バージョン番号決定ロジック（major/minor/patch各ケース）
- **hasContentChanges**: 内容フィールド変更 vs ステータスのみ変更の判定
- **状態遷移**: 許可/禁止される遷移パターンの網羅テスト
- **createHistoryEntry**: エントリ生成の各フィールド検証
- **ステータスのみ変更**: バージョンインクリメントされないことの確認
- **明示的バージョン指定**: `--major`/`--minor`/`--patch` オプションの動作

### 統合テスト

- create → update(title変更) → update(status変更) → history表示の一連フロー
- ステータス変更のみでバージョンが変わらないことの確認
- 不正な状態遷移（draft → implemented など許可されていない遷移）のエラーハンドリング

## 6. 技術的決定事項

### セマンティックバージョニングの粒度

**決定:** major=スコープの根本変更、minor=内容の追加・拡張、patch=記述の軽微な修正
**理由:** ステータス変更はワークフロー進行であり、要件の「内容」が変わったわけではない。バージョンは内容の変更度合いを示す指標とし、ワークフロー状態とは独立させる。

### ステータス変更とバージョンの分離

**決定:** ステータス変更のみではバージョンをインクリメントしない
**理由:** ステータスはワークフローの進行状態を表し、内容の変更を意味しない。バージョンは「何が書かれているか」の変更を追跡するものであり、「どの段階にあるか」とは無関係にすべき。（#109 フィードバック反映）

### pending_approvalの廃止

**決定:** `pending_approval` ステータスを廃止し、`draft → approved → implemented` の3状態とする
**理由:** PRマージ自体が承認行為であり、別途「承認待ち」状態を設ける意味がない。ワークフローの簡素化。（#208 フィードバック反映）

### Gitコミットハッシュの必須化

**決定:** すべての状態遷移・バージョン変更時にGitコミットハッシュを記録する（必須）
**理由:** すべての状態遷移はPR経由で行われるため、コミットハッシュは常に取得可能。変更の追跡性を担保するために必須とする。

## 7. 改訂履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| v1.0.0 | 2026-02-08 | 初版（Requirementバージョン管理） |
| v2.0.0 | 2026-02-13 | #109: ステータス変更でバージョンを上げない方針に変更。#208: pending_approval廃止。#209: --major/--minor/--patchオプション明記 |
