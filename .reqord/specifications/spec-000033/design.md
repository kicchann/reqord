# Specificationバージョン管理 - 技術設計書

## 1. 設計概要

仕様（Specification）のライフサイクル管理として、セマンティックバージョニング（major/minor/patch）による変更追跡と状態遷移（draft → approved → implemented）を実装する。バージョンインクリメントは**内容変更時のみ**行い、ステータス遷移ではバージョンを変更しない。仕様更新時にversionHistoryへ自動的に履歴エントリを追加し、`reqord spec history <id>` コマンドで変更履歴を表示する。既存のSpecificationスキーマに定義済みの `version` / `versionHistory` フィールドを活用する。

**実装状況:** PARTIALLY IMPLEMENTED
- ✅ スキーマ（version, versionHistory）定義済み
- ✅ `updateSpecificationStatus()` による状態遷移時のバージョニング（ただしspec-000005要件に不整合あり）
- ❌ `updateSpecification()` メソッド未実装
- ❌ `spec update` コマンド未実装
- ❌ `spec history` コマンド未実装
- ❌ `spec draft` / `spec implemented` コマンド未実装
- ❌ Version Service のspec対応不足（`determineNextVersion()` は requirement 専用）

**設計方針:** req-000005（spec-000005でRequirement側実装済み）と同一のバージョニングルールを適用し、RequirementとSpecificationで一貫した履歴管理を実現する。実装パターンは `req update` / `req history` を踏襲し、コード重複を最小化する。

## 2. アーキテクチャ

```
Command Layer:  commands/spec/history.ts      (新規)
                commands/spec/update.ts       (新規)
                commands/spec/draft.ts        (新規)
                commands/spec/implemented.ts  (新規)
                commands/spec/approve.ts      (既存)
                    ↓
Service Layer:  services/specification-service.ts (拡張)
                  - updateSpecification() 新規追加
                  - updateSpecificationStatus() 修正（バージョニングルール改善）
                services/version-service.ts     (拡張)
                  - determineNextVersionForSpec() 新規追加
                  - generateSpecChangeSummary() 新規追加
                    ↓
Repository:     repositories/specification.ts     (既存)
                    ↓
Shared:         @reqord/shared
                  schemas/common.ts             (VersionHistoryEntrySchema既存)
                  schemas/specification.ts      (version, versionHistory既存)
```

既存のスキーマ定義（VersionHistoryEntrySchema）とフィールド（versionHistory配列）はすでに存在するため、新規コードは主にサービス層のバージョン管理ロジックとコマンドの追加となる。

## 3. コンポーネント設計

### 3.1 historyコマンド (`commands/spec/history.ts` - 新規)

**責務:** 指定仕様のバージョン履歴を表示。

```
reqord spec history <id> [--json]
```

- テーブル形式: version, status, gitCommit(短縮), changedAt, summary
- `--json`: ValidationResult同様のJSON出力

**実装パターン:** `commands/req/history.ts` を直接適用可能。以下の置換のみ:
- `showRequirement()` → `showSpecification()`
- エラーメッセージの "requirement" → "specification"

**ファイルパス:** `packages/cli/src/commands/spec/history.ts`

**インターフェース:**
```typescript
import { Command } from "commander";
import * as specService from "../../services/specification-service.js";
import Table from "cli-table3";

export const specHistoryCommand = new Command("history")
  .description("Show version history of a specification")
  .argument("<id>", "Specification ID (e.g. spec-000001)")
  .option("--json", "Output in JSON format")
  .action(async (id: string, options: { json?: boolean }) => {
    const result = await specService.showSpecification(process.cwd(), id);
    // Display version history table or JSON
  });
```

### 3.2 updateコマンド (`commands/spec/update.ts` - 新規)

**責務:** 仕様のメタデータ・ファイル更新、明示的なバージョン指定。ステータス変更は専用コマンド（3.3参照）に委譲し、updateコマンドでは扱わない。

```
reqord spec update <id> [options]
  --patch-file <path>            YAMLパッチファイル適用
  --design-file <path>           design.md更新
  --major/--minor/--patch        明示的バージョン指定
```

**実装パターン:** `commands/req/update.ts` から適用。削除する requirement 専用オプション:
- `--title` (Specificationにtitleフィールドなし)
- `--priority` (Specificationにpriorityフィールドなし)
- `--format` (Specificationにformatフィールドなし)
- `--status` (専用コマンドに委譲)

保持するオプション:
- `--patch-file` - YAML直接編集
- `--design-file` - design.md更新（既存 `--content-file` の別名として提供）
- `--major/--minor/--patch` - 明示的バージョン指定

**ファイルパス:** `packages/cli/src/commands/spec/update.ts`

**インターフェース:**
```typescript
export const specUpdateCommand = new Command("update")
  .description("Update a specification")
  .argument("<id>", "Specification ID (e.g. spec-000001)")
  .option("--patch-file <path>", "YAML patch file to merge into specification")
  .option("--design-file <path>", "Path to design.md content file")
  .option("--major", "Force major version bump (x.0.0)")
  .option("--minor", "Force minor version bump (0.x.0)")
  .option("--patch", "Force patch version bump (0.0.x)")
  .action(async (id: string, options: UpdateCommandOptions) => {
    const result = await specService.updateSpecification(process.cwd(), id, {
      patchData: options.patchFile ? loadYamlFile(options.patchFile) : undefined,
      designContent: options.designFile ? readFile(options.designFile) : undefined,
      versionBump: options.major ? "major" : options.minor ? "minor" : options.patch ? "patch" : undefined,
    });
    console.log(`Updated specification: ${result.id} (v${result.version})`);
  });
```

### 3.3 状態遷移コマンド（専用コマンド）

spec-000005と同様に、状態遷移は専用コマンドで提供する。各コマンドは `updateSpecificationStatus()` を呼び出す。

状態遷移コマンド:
- `reqord spec draft <id>` — approved/implemented → draft（flag対応による差し戻し。draftに戻る際にバージョン見直し）
- `reqord spec approve <id>` — draft → approved（既存コマンド拡張）
- `reqord spec implemented <id>` — approved → implemented

#### 3.3.1 draftコマンド (`commands/spec/draft.ts` - 新規)

**責務:** flag対応等によるdraft差し戻し。

```
reqord spec draft <id> [--major/--minor/--patch]
```

- 差し戻し時にバージョン見直しが必要な場合、`--major/--minor/--patch` で明示指定可能
- 差し戻し前にflag状況を表示

**ファイルパス:** `packages/cli/src/commands/spec/draft.ts`

#### 3.3.2 approveコマンド (`commands/spec/approve.ts` - 既存拡張)

**責務:** draft → approved への遷移。既存のPRベースの承認フロー。

既存実装を活用。`updateSpecificationStatus()` の修正（バージョニングルール改善）が反映される。

#### 3.3.3 implementedコマンド (`commands/spec/implemented.ts` - 新規)

**責務:** approved → implemented への遷移。

```
reqord spec implemented <id>
```

- 関連Issue（implementation.issues）の完了状況を事前チェック
- 全Issueが完了していない場合は警告を表示

**ファイルパス:** `packages/cli/src/commands/spec/implemented.ts`

### 3.4 VersionService 拡張

**ファイルパス:** `packages/cli/src/services/version-service.ts`

#### 3.4.1 `determineNextVersionForSpec()` (新規)

**責務:** Specificationの内容変更に基づくバージョン番号決定。

Requirementの `determineNextVersion()` はYAMLメタデータフィールド（title, successCriteria, format, dependencies, priority）の変更を検出する。Specificationでも同じ原則を適用し、**YAMLメタデータの変更**でバージョンを判定する。

> **注: コンテンツファイル（design.md）と自動バージョニングの関係**
>
> Requirementの `determineNextVersion()` も、description.md のファイル内容変更は自動検出の対象外である（YAMLメタデータフィールドのみ監視）。Specificationでも同様に、design.md のファイル内容変更は自動バージョニングの対象外とする。
>
> ただし、req-000005の要件（"specification content の変更で version を increment する"）との整合性を担保するため、design.md の大幅改訂時にはユーザーが `--major/--minor/--patch` で明示的にバージョンを上げる運用とする。これはRequirementの description.md 改訂時と同じ運用ルールである。

```typescript
export function determineNextVersionForSpec(
  before: Specification,
  after: Specification,
): string {
  const { major, minor, patch } = parseVersion(before.version);

  // ステータス変更のみではバージョンを変えない（spec-000005要件）
  if (before.status !== after.status) {
    const beforeNoStatus = { ...before, status: before.status };
    const afterNoStatus = { ...after, status: before.status };
    if (JSON.stringify(beforeNoStatus) === JSON.stringify(afterNoStatus)) {
      return before.version; // ステータス以外に変更なし → バージョン据え置き
    }
  }

  // 内容フィールドの変更判定
  const designChanged = before.files.design !== after.files.design; // ファイルパス変更（稀）
  const supplementaryChanged = JSON.stringify(before.files.supplementary) !== JSON.stringify(after.files.supplementary);
  const flagsChanged = JSON.stringify(before.flags) !== JSON.stringify(after.flags);

  // Major bump: supplementaryファイルの大幅変更（追加/削除が3ファイル以上）
  if (supplementaryChanged) {
    const beforeCount = before.files.supplementary.length;
    const afterCount = after.files.supplementary.length;
    if (Math.abs(beforeCount - afterCount) >= 3) {
      return formatVersion(major + 1, 0, 0);
    }
  }

  // Minor bump: supplementaryファイルの追加/削除（1〜2ファイル）
  if (supplementaryChanged) {
    return formatVersion(major, minor + 1, 0);
  }

  // Patch bump: designファイルパス変更（リネーム等）
  if (designChanged) {
    return formatVersion(major, minor, patch + 1);
  }

  // Flags変更のみ → バージョン据え置き
  if (flagsChanged) {
    return before.version;
  }

  // 変更なし
  return before.version;
}
```

**バージョン変更トリガー判定:**

| 変更内容 | バージョン変更 | 備考 |
|---------|--------------|------|
| supplementary 3ファイル以上追加/削除 | major | 設計の大幅な変更 |
| supplementary 1〜2ファイル追加/削除 | minor | 補足資料の追加 |
| design.md ファイルパス変更 | patch | リネーム等の軽微な変更 |
| design.md **内容**変更 | `--major/--minor/--patch` で明示指定 | Gitで差分管理。大幅改訂時はユーザーが手動でバージョンアップ |
| status変更のみ | **しない** | ワークフロー進行はバージョンと無関係 |
| flagの追加・削除 | **しない** | メタ情報の変更 |

> **Requirementとの対称性:** Requirementのdescription.md内容変更も `determineNextVersion()` の自動検出対象外であり、同じ運用ルール（明示指定）が適用される。

#### 3.4.2 `generateSpecChangeSummary()` (新規)

**責務:** Specification変更の人間可読なサマリー生成。

```typescript
export function generateSpecChangeSummary(
  before: Specification,
  after: Specification,
): string {
  const changes: string[] = [];

  if (before.status !== after.status) {
    changes.push(`ステータス変更: ${before.status} → ${after.status}`);
  }

  if (before.files.design !== after.files.design) {
    changes.push(`設計ファイルパス変更: ${before.files.design} → ${after.files.design}`);
  }

  const beforeSupp = before.files.supplementary;
  const afterSupp = after.files.supplementary;
  if (JSON.stringify(beforeSupp) !== JSON.stringify(afterSupp)) {
    const added = afterSupp.filter((f) => !beforeSupp.includes(f));
    const removed = beforeSupp.filter((f) => !afterSupp.includes(f));
    if (added.length > 0) {
      changes.push(`補足資料追加: ${added.join(", ")}`);
    }
    if (removed.length > 0) {
      changes.push(`補足資料削除: ${removed.join(", ")}`);
    }
  }

  if (before.flags.length !== after.flags.length) {
    changes.push(`フラグ変更（${before.flags.length} → ${after.flags.length}件）`);
  }

  return changes.length > 0 ? changes.join("; ") : "変更なし";
}
```

### 3.5 SpecificationService 拡張

**ファイルパス:** `packages/cli/src/services/specification-service.ts`

#### 3.5.1 `UpdateSpecOptions` インターフェース (新規)

```typescript
export interface UpdateSpecOptions {
  status?: Status;
  patchData?: Record<string, unknown>;
  designContent?: string;
  versionBump?: "major" | "minor" | "patch";
}

export interface UpdateSpecResult {
  id: string;
  version: string;
  previousVersion: string;
  status: Status;
  previousStatus: Status;
  updatedAt: string;
}
```

#### 3.5.2 `updateSpecification()` メソッド (新規)

**責務:** 仕様の更新、自動バージョニング、履歴記録。

```typescript
export async function updateSpecification(
  cwd: string,
  id: string,
  options: UpdateSpecOptions,
): Promise<UpdateSpecResult> {
  const before = await specRepo.findById(cwd, id);
  if (!before) {
    throw new AppError(`Specification ${id} not found`, ErrorCode.NOT_FOUND);
  }

  // 1. パッチデータのマージ
  let after = { ...before };
  if (options.patchData) {
    after = { ...after, ...options.patchData };
  }

  // 2. ステータス更新（個別指定時）
  if (options.status) {
    if (!versionService.isValidTransition(before.status, options.status)) {
      throw new AppError(
        `Invalid status transition: ${before.status} → ${options.status}`,
        ErrorCode.VALIDATION_ERROR,
      );
    }
    after.status = options.status;
  }

  // 3. 内容変更の検出
  const contentChanged = hasSpecContentChanges(before, after);
  const statusOnlyChange = before.status !== after.status && !contentChanged;

  // 4. バージョン決定
  let nextVersion: string;
  if (options.versionBump) {
    // 明示的指定
    const { major, minor, patch } = versionService.parseVersion(before.version);
    nextVersion =
      options.versionBump === "major" ? versionService.formatVersion(major + 1, 0, 0) :
      options.versionBump === "minor" ? versionService.formatVersion(major, minor + 1, 0) :
      versionService.formatVersion(major, minor, patch + 1);
  } else if (statusOnlyChange) {
    // ステータスのみ変更 → バージョン据え置き
    nextVersion = before.version;
  } else if (contentChanged) {
    // 内容変更 → 自動判定
    nextVersion = versionService.determineNextVersionForSpec(before, after);
  } else {
    // 変更なし
    nextVersion = before.version;
  }

  after.version = nextVersion;
  after.updatedAt = new Date().toISOString();

  // 5. バージョン履歴エントリ作成（バージョン変更時またはステータス変更時）
  if (nextVersion !== before.version || before.status !== after.status) {
    const summary = versionService.generateSpecChangeSummary(before, after);
    const historyEntry: VersionHistoryEntry = {
      version: nextVersion,
      status: after.status,
      gitCommit: versionService.getCurrentGitCommit(),
      changedAt: after.updatedAt,
      summary,
    };
    // approvedAt/approvedBy はapproveコマンドで別途設定
    after.versionHistory = [...after.versionHistory, historyEntry];
  }

  // 6. Zodバリデーション
  const validated = SpecificationSchema.parse(after);

  // 7. 保存
  await specRepo.save(cwd, validated);

  // 8. design.md更新（指定時）
  if (options.designContent) {
    await specRepo.saveFile(cwd, id, "design.md", options.designContent);
  }

  return {
    id: validated.id,
    version: validated.version,
    previousVersion: before.version,
    status: validated.status,
    previousStatus: before.status,
    updatedAt: validated.updatedAt,
  };
}

function hasSpecContentChanges(before: Specification, after: Specification): boolean {
  // ステータス、updatedAt、versionHistory、flags を除外して比較
  // flags変更はバージョニング対象外（メタ情報）
  const normalize = (spec: Specification) => ({
    ...spec,
    status: "normalized",
    updatedAt: "normalized",
    versionHistory: [],
    flags: [],
    currentApproval: undefined,
    implementation: undefined,
  });
  return JSON.stringify(normalize(before)) !== JSON.stringify(normalize(after));
}
```

**実装パターン:** `updateRequirement()` から90%再利用。以下の違い:
- `shouldRevertToPendingApproval()` チェックを削除（Specification独自の差し戻しルールは未定義）
- `determineNextVersionForSpec()` を使用
- `generateSpecChangeSummary()` を使用

#### 3.5.3 `updateSpecificationStatus()` 修正

**現状の問題:** 常にmajorバンプしている（spec-000005要件違反）

**修正案:**
```typescript
export async function updateSpecificationStatus(
  cwd: string,
  id: string,
  newStatus: Status,
): Promise<UpdateSpecStatusResult> {
  // 既存ロジックを updateSpecification() に移譲
  const result = await updateSpecification(cwd, id, {
    status: newStatus,
  });
  return {
    id: result.id,
    previousStatus: result.previousStatus,
    newStatus: result.status,
    version: result.version,
  };
}
```

**設計判断:** `updateSpecificationStatus()` は `updateSpecification()` のラッパーに変更し、バージョニングロジックを一元化する。

### 3.6 状態遷移ルール

```
draft ──approve──→ approved ──implement──→ implemented
  ↑                    │                       │
  ├── draft (flag解決) ←┘                       │
  └── draft (flag解決) ←───────────────────────┘
```

> `approved` は廃止（#208）。PRマージ自体が承認行為となる。
> すべての状態遷移はPR経由で行う。

許可される遷移（既存の `getStateTransitions()` で定義済み）:
- `draft` → `approved`
- `approved` → `implemented`
- `approved` → `draft`（flag対応による差し戻し。draftに戻る際にバージョン見直し）
- `implemented` → `draft`（flag対応による差し戻し。draftに戻る際にバージョン見直し）

状態遷移コマンド（spec-000005と対称）:
- `reqord spec draft <id>` — draftへ差し戻し
- `reqord spec approve <id>` — 承認（既存コマンド）
- `reqord spec implemented <id>` — 実装完了

各コマンド実行時にversionHistoryへ履歴エントリを記録する。

### 3.7 VersionHistoryEntry（既存スキーマ）

spec-000005と共通のスキーマ（`@reqord/shared` の `VersionHistoryEntrySchema`）:

```typescript
{
  version: string,      // "1.2.3"
  status: Status,       // 記録時点の状態
  gitCommit: string,    // Gitコミットハッシュ（必須。PR経由のため常に取得可能）
  changedAt: string,    // ISO 8601タイムスタンプ
  summary: string,      // 変更概要
}
```

> **注:** 実際のスキーマ定義（`VersionHistoryEntrySchema`）には `approvedAt?: string` と `approvedBy?: string[]` のオプショナルフィールドも存在する。これらは `spec approve` コマンド実行時のみ設定される。spec-000005の設計書ではこれらを省略しているが、実装は共通スキーマに従う。

**RequirementとSpecificationで共通のスキーマを使用**。データ形式の統一により、汎用的な履歴表示・分析ツールの実装が可能。

## 4. データフロー

### 更新時の自動バージョニング（内容変更あり）

```
ユーザー → reqord spec update spec-000001 --design-file design.md
  → updateSpecification(cwd, id, { designContent: "..." })
    → before取得（version: "1.0.0"）
    → hasSpecContentChanges(before, after) → false（design.md内容変更はメタデータ外）
    → バージョン据え置き（1.0.0）
    → updatedAt更新のみ
    → specRepo.save(cwd, after)
    → specRepo.saveFile(cwd, id, "design.md", designContent)
```

```
ユーザー → reqord spec update spec-000001 --design-file design.md --major
  → updateSpecification(cwd, id, { designContent: "...", versionBump: "major" })
    → 明示的指定により強制的にmajorバンプ
    → "1.0.0" → "2.0.0"
    → versionHistory.push({ version: "2.0.0", status: "draft", ... })
    → specRepo.saveFile(cwd, id, "design.md", designContent)
```

```
ユーザー → reqord spec update spec-000001 --patch-file patch.yaml
  # patch.yaml: { files: { supplementary: ["diagrams/architecture.mmd"] } }
  → updateSpecification(cwd, id, { patchData: { files: { supplementary: [...] } } })
    → before取得（supplementary: []）
    → hasSpecContentChanges(before, after) → true（supplementary配列変更）
    → determineNextVersionForSpec(before, after) → "1.1.0"（minor: 1ファイル追加）
    → versionHistory.push(entry)
    → specRepo.save(cwd, after)
```

### 状態遷移（バージョン据え置き、履歴は記録）

```
ユーザー → reqord spec approve spec-000001
  → updateSpecificationStatus(cwd, id, "approved")
    → updateSpecification(cwd, id, { status: "approved" })
      → before取得（status: "draft", version: "1.1.0"）
      → 状態遷移チェック: draft → approved（許可）
      → バージョンインクリメントなし（ステータスのみ変更）
      → versionHistory.push({ version: "1.1.0", status: "approved", gitCommit, ... })
      → specRepo.save(cwd, after)
```

### flag対応によるdraft差し戻し

```
ユーザー → reqord spec draft spec-000001
  → updateSpecificationStatus(cwd, id, "draft")
    → updateSpecification(cwd, id, { status: "draft" })
      → before取得（status: "implemented", version: "1.1.0"）
      → 状態遷移チェック: implemented → draft（許可）
      → バージョン見直し（必要に応じて内容変更時にインクリメント）
      → versionHistory.push({ version: "1.1.0", status: "draft", gitCommit, ... })
      → specRepo.save(cwd, after)
```

```
ユーザー → reqord spec draft spec-000001 --minor
  → 差し戻しと同時にminorバージョンアップ
    → "1.1.0" → "1.2.0"
    → versionHistory.push({ version: "1.2.0", status: "draft", ... })
```

### 履歴表示

```
ユーザー → reqord spec history spec-000001
  → showSpecification(cwd, id)
    → specification.versionHistory取得
  → テーブル表示:
    | Version | Status    | Git Commit | Date       | Summary                       |
    | 1.0.0   | draft     | abc1234    | 2025-01-01 | Initial                       |
    | 1.1.0   | draft     | def5678    | 2025-01-05 | 補足資料追加: diagrams/...     |
    | 1.1.0   | approved  | 9ab0cde    | 2025-01-10 | ステータス変更: draft → approved |
```

## 5. テスト方針

### ユニットテスト

**version-service.test.ts への追加:**

- **`determineNextVersionForSpec()`**
  - supplementary 3ファイル以上追加 → major bump
  - supplementary 1〜2ファイル追加 → minor bump
  - supplementary削除 → minor bump
  - design.mdファイルパス変更 → patch bump
  - ステータスのみ変更 → バージョン据え置き
  - flags変更のみ → バージョン据え置き

- **`generateSpecChangeSummary()`**
  - ステータス変更のサマリー生成
  - supplementary追加のサマリー生成
  - 複数変更の組み合わせサマリー生成

**specification-service.test.ts への追加:**

- **`updateSpecification()`**
  - パッチファイルマージの正常動作
  - 不正な状態遷移のエラー
  - 明示的バージョン指定（--major/--minor/--patch）の動作
  - ステータスのみ変更時のバージョン据え置き
  - 内容変更時の自動バージョンインクリメント
  - design.md更新時のファイル保存（バージョン据え置き確認）

- **`hasSpecContentChanges()`**
  - supplementary変更検出
  - ステータスのみ変更時の false 判定
  - flags変更時の false 判定（メタ情報は除外）
  - currentApproval/implementation変更時の false 判定

### 統合テスト

- create → update(supplementary追加) → approve → implemented → history表示の一連フロー
- ステータス変更のみでバージョンが変わらないことの確認
- 不正な状態遷移（draft → implemented など許可されていない遷移）のエラーハンドリング
- 明示的バージョン指定オプションの統合動作
- design.mdファイル更新とメタデータ更新の整合性
- draft差し戻し時のバージョン見直し動作

### コマンドテスト

**spec-history.test.ts** (新規):
- historyコマンドのテーブル表示
- --json オプションのJSON出力
- 存在しないspecのエラーハンドリング

**spec-update.test.ts** (新規):
- 各オプション（--patch-file, --design-file, --major/--minor/--patch）の動作
- オプション組み合わせ時の優先順位
- バリデーションエラーの表示

**spec-draft.test.ts / spec-implemented.test.ts** (新規):
- 正常な状態遷移の動作
- 不正な遷移のエラーハンドリング
- draft差し戻し時の --major/--minor/--patch オプション動作

## 6. 技術的決定事項

### セマンティックバージョニングの粒度

**決定:** major=supplementary大幅変更、minor=supplementary追加・削除、patch=ファイルパス変更。design.md内容変更は自動バージョニング対象外（明示的指定で対応）

**理由:**
- Specificationの「構造」変化を追跡することに特化
- design.md内容変更はGitコミットログで詳細追跡できるため、YAMLメタデータのバージョンからは除外
- 補足資料（supplementary）の増減は設計の拡張度合いを示す重要な指標
- RequirementとSpecificationでバージョニング対象が異なるが、「ステータス変更のみではバージョンを変えない」原則は共通
- Requirementのdescription.md内容変更も `determineNextVersion()` の自動検出対象外であり、**Requirement側と対称的な設計**

### ステータス変更とバージョンの分離

**決定:** ステータス変更のみではバージョンをインクリメントしない

**理由:** spec-000005（Requirementバージョン管理）と同一の設計原則を適用。ステータスはワークフローの進行状態を表し、内容の変更を意味しない。バージョンは「何が書かれているか」の変更を追跡するものであり、「どの段階にあるか」とは無関係にすべき。（#109 フィードバック反映）

### コンテンツファイル内容変更とバージョンの関係

**決定:** design.md内容変更ではバージョンを自動インクリメントしない。大幅改訂時は `--major/--minor/--patch` で明示指定する運用

**理由:**
- design.mdはGit管理下にあり、詳細な変更履歴はGitコミットログで追跡可能
- 軽微な誤字修正や表現改善でバージョン番号が頻繁に増えることを防ぐ
- Requirementのdescription.mdも同じ扱い（自動検出対象外）であり、両者で一貫した運用ルール
- req-000005の要件（"specification contentの変更でversionをincrement"）は `--major/--minor/--patch` オプションによる明示指定で担保
- これにより、Gitの細かい変更履歴とYAMLメタデータの粗い変更履歴の二重管理を実現

### approvedの廃止

**決定:** `approved` ステータスを廃止し、`draft → approved → implemented` の3状態とする

**理由:** PRマージ自体が承認行為であり、別途「承認待ち」状態を設ける意味がない。ワークフローの簡素化。（#208 フィードバック反映、spec-000005と共通）

### Gitコミットハッシュの必須化

**決定:** すべての状態遷移・バージョン変更時にGitコミットハッシュを記録する（必須）

**理由:** すべての状態遷移はPR経由で行われるため、コミットハッシュは常に取得可能。変更の追跡性を担保するために必須とする。（spec-000005と共通）

### RequirementとSpecificationのバージョニングルールの違い

**決定:** 同じ version-service.ts 内に別関数として実装（`determineNextVersion()` vs `determineNextVersionForSpec()`）

**理由:**
- RequirementとSpecificationで監視すべきフィールドが異なる
  - Requirement: title, successCriteria, format, dependencies, priority (YAML内フィールド)
  - Specification: supplementary配列 (YAMLメタデータ内の配列)
- 共通ロジック（parseVersion, formatVersion, createHistoryEntry等）は最大限再利用
- 将来的に他のエンティティ（例: ProjectContext）にバージョニングを追加する際の拡張性を考慮

### 状態遷移コマンドのインターフェース

**決定:** 専用コマンド（`spec draft` / `spec approve` / `spec implemented`）を提供。`spec update` コマンドでは `--status` オプションを持たない

**理由:**
- spec-000005で定義された `reqord spec draft/approve/implemented` コマンドとの一貫性
- 既存の `spec approve` コマンドとの統一感
- 各状態遷移に固有の前提条件チェック（flag確認、issue完了確認等）を自然に組み込める
- CLIの発見可能性が高い（`reqord spec --help` で遷移コマンドが一覧表示される）
- 有効なステータス値を覚える必要がなく、typoのリスクがない

### updateSpecification() vs updateSpecificationStatus() の統合

**決定:** `updateSpecificationStatus()` を `updateSpecification()` のラッパーとして再実装

**理由:**
- バージョニングロジックを一元化し、保守性を向上
- ステータス更新も汎用的な更新処理の一部として扱う
- DRY原則の遵守

## 7. 改訂履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| v1.0.0 | 2026-02-13 | 初版（Specificationバージョン管理）。spec-000005のRequirementバージョン管理に対応する設計 |
| v1.1.0 | 2026-02-13 | spec-000005との整合性修正: (1) 状態遷移を専用コマンド化 (2) approved除去 (3) VersionHistoryEntry定義統一 (4) draft差し戻し時のバージョン見直し記載追加 (5) コンテンツファイルと自動バージョニングの関係を明確化 |
