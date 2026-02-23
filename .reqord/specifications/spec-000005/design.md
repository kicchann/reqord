# Requirement/Specificationバージョン管理 - 技術設計書

## 1. 設計概要

要件（Requirement）と仕様（Specification）のライフサイクル管理として、シンプルなX.Y形式のバージョニング（1.0, 2.0, 1.1...）による変更追跡と状態遷移（draft → approved → implemented）を実装する。通常は X.0 形式を使い、typoなど軽微な修正でどうしても必要な時のみ .Y を使用する。バージョンインクリメントは**明示的な`reqord version`コマンド実行時のみ**行い、ステータス遷移ではバージョンを変更しない。更新時にversionHistoryへ自動的に履歴エントリを追加し、`reqord req history <id>` / `reqord spec history <id>` コマンドで変更履歴を表示する。既存のRequirement/Specificationスキーマに定義済みの `version` / `versionHistory` フィールドを活用する。

> **v2.0.0改訂:** フィードバック(#109, #208, #209)に基づき、バージョニングルールと状態遷移を改訂。
> **v3.0.0改訂 (Issue #247):** セマンティックバージョニングから整数+小数点形式（X.Y）に簡素化。
> **v3.0.0改訂 (Issue #263):** バージョン管理とステータス遷移を完全分離。`reqord version`コマンド追加。Requirement/Specification共通設計に統合。
> **v4.0改訂 (feedback #411):** versionHistoryからgitCommitフィールドを削除。git log -Sで導出する方針に変更。

## 2. アーキテクチャ

```
Command Layer:  commands/version/version.ts       (NEW - req/spec両対応)
                commands/req/draft.ts             (MODIFY - バージョンオプション削除)
                commands/spec/draft.ts            (MODIFY - バージョンオプション削除)
                commands/req/history.ts           (既存)
                commands/spec/history.ts          (既存)
                    ↓
Service Layer:  services/requirement-service.ts   (既存)
                services/specification-service.ts (既存)
                services/version-service.ts       (既存 - 共通ロジック)
                    ↓
Repository:     repositories/requirement.ts       (既存)
                repositories/specification.ts     (既存)
                    ↓
Shared:         @reqord/shared
                  schemas/common.ts               (VersionHistoryEntrySchema既存)
                  schemas/requirement.ts          (version, versionHistory既存)
                  schemas/specification.ts        (version, versionHistory既存)
```

既存のスキーマ定義（VersionHistoryEntrySchema）とフィールド（versionHistory配列）はすでに存在するため、新規コードは主に`commands/version/version.ts`の追加と、既存コマンドからバージョンオプションの削除となる。

## 3. コンポーネント設計

### 3.1 historyコマンド (`commands/req/history.ts` - 新規)

**責務:** 指定要件のバージョン履歴を表示。

```
reqord req history <id> [--json]
```

- テーブル形式: version, status, changedAt, summary
- gitCommitは表示しない（必要時は `git log -S` で導出）
- `--json`: ValidationResult同様のJSON出力

### 3.2 VersionService (`services/version-service.ts` - 新規)

**責務:** バージョン管理ロジックの提供。

- `determineNextVersion(currentVersion, options)`: draftコマンド実行時のバージョン番号決定
  - **X.0インクリメント** (1.5→2.0): デフォルト（`--patch`なし）
  - **.Yインクリメント** (1.5→1.6): `--patch`指定時
  - **注**: approved/implemented → draft 遷移時にのみバージョン変更
- `createHistoryEntry(requirement)`: VersionHistoryEntryの生成
- `getStateTransitions()`: 許可される状態遷移マップの提供
- `--major`, `--patch` オプションで明示的にバージョン種別を指定可能（`--minor` は廃止）
- **デフォルトは`--major`**: オプション指定なしの場合、自動的に`--major`適用

### バージョン番号フォーマット

**形式:** `X.Y` (X: 整数、Y: 0または正の整数)

**有効な例:**
- `1.0`, `2.0`, `3.0` - 標準形式（X.0）
- `1.1`, `1.2`, `2.1` - 軽微な修正（X.Y）
- `1.10`, `1.11` - Yは2桁以上も可
- `10.0`, `10.1` - Xは2桁以上も可

**無効な例:**
- `1` - .0が省略されている（必ず X.Y 形式）
- `1.0.0` - セマンティックバージョニング（旧形式、移行前のみ許可）
- `v1.0`, `ver1.0` - プレフィックス付き

**実装:**
```typescript
// バージョンのパースと検証
const parseVersion = (version: string): {major: number, minor: number} => {
  const match = version.match(/^(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Invalid version format: ${version}. Must be X.Y format (e.g., "1.0", "2.5")`);
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
  };
};

// バージョンのフォーマット
const formatVersion = (major: number, minor: number): string => {
  return `${major}.${minor}`;
};

// X.0インクリメント
const incrementMajor = (version: string): string => {
  const {major} = parseVersion(version);
  return formatVersion(major + 1, 0);  // "1.5" → "2.0"
};

// .Yインクリメント
const incrementMinor = (version: string): string => {
  const {major, minor} = parseVersion(version);
  return formatVersion(major, minor + 1);  // "1.5" → "1.6"
};
```

#### バージョン変更トリガー判定

| 操作 | バージョン変更 | 新バージョン例 | 備考 |
|------|--------------|--------------|------|
| `reqord req draft`（approved/implemented → draft） | **する（X.0）** | 1.0 (approved) → 2.0 (draft) | デフォルトでメジャーバージョンアップ |
| `reqord req draft --patch`（軽微な修正の場合） | **する（.Y）** | 1.0 (approved) → 1.1 (draft) | typoなど例外的に使用 |
| approved/implementedでの軽微な修正 | **する（.Y）** | 1.0 → 1.1 | draftに戻さずマイナーバージョンのみ更新 |
| `reqord req approve`（draft → approved） | **しない** | 1.0 (draft) → 1.0 (approved) | ステータス遷移のみ |
| `reqord req implemented`（approved → implemented） | **しない** | 1.0 (approved) → 1.0 (implemented) | ステータス遷移のみ |
| feedbacks.yamlのlinkedTo変更 | **しない** | - | メタ情報の変更 |

### 3.3 RequirementService 拡張

**変更点:** `reqord req draft`コマンド実行時のバージョンインクリメント。

> **注:** 実装の詳細はPhase 2（Issue #247実装時）で確定します。

### 3.4 状態遷移ルール

```
draft ──approve──→ approved ──implement──→ implemented
  ↑                    │                       │
  ├── draft (feedback対応) ←┘                       │
  └── draft (feedback対応) ←───────────────────────┘
```

> `approved` は廃止（#208）。PRマージ自体が承認行為となる。
> すべての状態遷移はPR経由で行う。

許可される遷移:
- `draft` → `approved`
- `approved` → `implemented`
- `approved` → `draft`（feedback対応による差し戻し。draftに戻る際にバージョン見直し）
- `implemented` → `draft`（feedback対応による差し戻し。draftに戻る際にバージョン見直し）

状態遷移コマンド:
- `reqord req draft <id>` / `reqord spec draft <id>`
- `reqord req approve <id>` / `reqord spec approve <id>`
- `reqord req implemented <id>` / `reqord spec implemented <id>`

各コマンド実行時にversionHistoryへ履歴エントリを記録する。

### 3.5 VersionHistoryEntry（既存スキーマ）

```typescript
{
  version: string,      // "1.0", "2.0" etc.
  status: Status,       // 記録時点の状態
  changedAt: string,    // ISO 8601タイムスタンプ
  summary: string,      // 変更概要
}
```

> **v4.0変更:** `gitCommit` フィールドを削除。`git log -S` で高速に導出可能（単一ファイル指定で0.02〜0.15秒）なため、YAMLに重複して保持しない。CLI実行時点ではコミット前のHEADが記録されるため不正確になる問題も解消。

## 4. データフロー

> **注:** 新しいバージョニングルール（X.Y形式）に基づくデータフローの詳細は、Phase 2（Issue #247実装時）で確定します。

### 主要フロー概要

**draft化とバージョンインクリメント:**
```
ユーザー → reqord req draft req-000001
  → approved/implemented → draft 遷移
  → デフォルト: X.0インクリメント（1.0 → 2.0）
  → --patch指定: .Yインクリメント（1.0 → 1.1）
  → versionHistory.push(entry)
```

**状態遷移（バージョン据え置き）:**
```
ユーザー → reqord req approve req-000001
  → draft → approved 遷移
  → バージョンインクリメントなし
  → versionHistory.push({ version: "1.0", status: "approved", ... })
```

**履歴表示:**
```
ユーザー → reqord req history req-000001
  → requirement.versionHistory取得
  → テーブル表示
```

## 5. テスト方針

### ユニットテスト

- **version-service**: バージョン番号決定ロジック（major/minor/patch各ケース）
- **hasContentChanges**: 内容フィールド変更 vs ステータスのみ変更の判定
- **状態遷移**: 許可/禁止される遷移パターンの網羅テスト
- **createHistoryEntry**: エントリ生成の各フィールド検証
- **ステータスのみ変更**: バージョンインクリメントされないことの確認
- **明示的バージョン指定**: `--major`/`--patch` オプションの動作

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

### approvedの廃止

**決定:** `approved` ステータスを廃止し、`draft → approved → implemented` の3状態とする
**理由:** PRマージ自体が承認行為であり、別途「承認待ち」状態を設ける意味がない。ワークフローの簡素化。（#208 フィードバック反映）

### Gitコミットハッシュの導出方式（v4.0改訂）

**決定:** versionHistoryにgitCommitフィールドを持たず、必要時に `git log -S` で導出する
**理由:** `git log -S` で高速に導出可能（単一ファイル指定で0.02〜0.15秒）。YAMLに重複保持する必要がなく、CLI実行時点ではコミット前のHEADが記録されるため不正確になる問題も解消。
**旧決定（v3.0以前）:** ~~すべての状態遷移時にGitコミットハッシュを記録する（必須）~~ → v4.0で廃止

## 7. 改訂履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| v1.0.0 | 2026-02-08 | 初版（Requirementバージョン管理） |
| v2.0.0 | 2026-02-13 | #109: ステータス変更でバージョンを上げない方針に変更。#208: approved廃止。#209: --major/--minor/--patchオプション明記 |
| v4.0 | 2026-02-21 | #411: versionHistoryからgitCommitフィールドを削除。git log -Sで導出する方針に変更 |
