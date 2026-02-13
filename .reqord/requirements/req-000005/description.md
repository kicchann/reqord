# Requirement/Specificationバージョン管理

## 概要

RequirementおよびSpecificationの変更履歴をバージョン管理し、承認情報と紐付けて追跡可能にする。バージョンインクリメントは内容変更時のみ行い、ステータス遷移ではバージョンを変更しない。

## EARS形式要件

When a developer updates a requirement or specification content (title, successCriteria, format, dependencies, etc.),
the system shall increment the version and record history,
preserving the previous approval information.

When only the status changes (draft → approved → implemented),
the system shall NOT increment the version.

## バージョニングルール

### バージョン形式

- **X.0形式** (1.0, 2.0, 3.0...): 通常の変更（デフォルト）
- **X.Y形式** (1.1, 1.2, 1.10...): 軽微な修正（typoなど、どうしても必要な時のみ）

**例:**
- 1.0 (approved) → 2.0 (draft): `reqord req draft`でdraftに戻す（デフォルト）
- 1.0 (approved) → 1.1 (draft): `reqord req draft --patch`で軽微な修正
- 1.0 (approved) → 1.1 (approved): approved状態のまま軽微な修正を適用（draftに戻さない）
- 1.1 → 1.2: さらに軽微な修正を重ねる場合
- 1.2 (approved) → 2.0 (draft): `reqord req draft`でdraftに戻す

**重要**:
- 基本は `X.0` 形式を使い、`.Y` は例外的にのみ使用すること
- バージョニングは`reqord req draft`コマンドで、approved/implementedからdraftに戻す際に行う

### バージョン変更のトリガー

| 操作 | バージョン変更 | 新バージョン例 | 備考 |
|------|--------------|--------------|------|
| `reqord req draft`（approved/implemented → draft） | **する（X.0）** | 1.0 (approved) → 2.0 (draft) | デフォルトでメジャーバージョンアップ |
| `reqord req draft --patch`（軽微な修正の場合） | **する（.Y）** | 1.0 (approved) → 1.1 (draft) | typoなど例外的に使用 |
| approved/implementedでの軽微な修正 | **する（.Y）** | 1.0 → 1.1 | draftに戻さずマイナーバージョンのみ更新 |
| `reqord req approve`（draft → approved） | **しない** | 1.0 (draft) → 1.0 (approved) | ステータス遷移のみ |
| `reqord req implemented`（approved → implemented） | **しない** | 1.0 (approved) → 1.0 (implemented) | ステータス遷移のみ |
| flagの追加・削除 | **しない** | - | メタ情報の変更 |

### 状態遷移

```
draft ──approve──→ approved ──implement──→ implemented
  ↑                    │                       │
  ├── draft (flag解決) ←┘                       │
  └── draft (flag解決) ←───────────────────────┘
```

> 注: `approved`は廃止方針（#208）。PRマージ自体が承認行為となる。

## コマンド仕様

### reqord req history \<id\> / reqord spec history \<id\>

- バージョン履歴をタイムライン表示
- 各バージョンのステータス、承認者、Gitコミットを表示

### バージョニングのタイミング

- `reqord req draft` コマンドで、approved/implementedからdraftに戻す際にバージョンをインクリメント
- `reqord req approve` / `reqord req implemented` ではバージョンを変更しない（ステータス遷移のみ）
- approved/implementedでの軽微な修正はマイナーバージョンのみ更新（draftに戻さない）

### draftコマンドのバージョン指定オプション

```bash
# デフォルト: メジャーバージョンアップ（X.0）
reqord req draft req-000001
# 1.0 (approved) → 2.0 (draft)

# 軽微な修正: マイナーバージョンアップ（.Y）
reqord req draft req-000001 --patch
# 1.0 (approved) → 1.1 (draft)
```

### determineNextVersion の改修方針

新しいバージョニングルールでは、`reqord req draft`コマンド実行時に以下のロジックでバージョンを決定する:

```typescript
// approved/implemented → draft 遷移時のバージョニング

// オプション指定なし（デフォルト）: メジャーバージョンアップ
if (!options.patch) {
  const {major} = parseVersion(currentVersion);
  return formatVersion(major + 1, 0);  // "1.5" → "2.0"
}

// --patch 指定: マイナーバージョンアップ
if (options.patch) {
  const {major, minor} = parseVersion(currentVersion);
  return formatVersion(major, minor + 1);  // "1.5" → "1.6"
}
```

**オプション:**
- **指定なし**: デフォルトで`--major`適用（X.0インクリメント）
- **--patch**: マイナーバージョンインクリメント（.Y）
- **--major**: 明示的にメジャーバージョンインクリメント（`--major`は省略可能）

**注**: `--minor` オプションは廃止

## 適用対象

- Requirement (`req-NNNNNN`)
- Specification (`spec-NNNNNN`)

両方に同じバージョニングルールを適用する。`version-service.ts`は共通ロジックとして実装済み。

## 技術的制約

- Gitコミットハッシュとの紐付けはGit操作と連携
- `versionHistory` 配列は追記のみ（履歴改変不可）

## フィードバック反映履歴

| Issue | 反映内容 |
|-------|---------|
| #109 | ステータス変更ではバージョンをインクリメントしない方針に変更 |
| #208 | approved廃止に伴い状態遷移図を更新 |
| #209 | draft化時のバージョン指定（--major/--minor/--patch）を明記。Specificationも対象に拡大 |

## 既存データの移行

### 移行方針

既存のセマンティックバージョニング（x.y.z形式）をX.Y形式に変換する。**移行コマンドは不要**で、grepして直接編集するか、メジャーバージョンのみ残してマイナー・パッチを廃棄する。

#### 方針A: メジャーバージョンのみ残す（シンプル）

| 既存バージョン | 新バージョン | 変換ルール |
|--------------|------------|-----------|
| 1.0.0 | 1.0 | x.0.0 → X.0 |
| 1.2.3 | 1.0 | x.y.z → X.0（minor/patch廃棄） |
| 2.0.0 | 2.0 | x.0.0 → X.0 |
| 2.5.1 | 2.0 | x.y.z → X.0（minor/patch廃棄） |

**手順:**
```bash
# .reqord内の全てのYAMLファイルでバージョンを変換
grep -r "version: " .reqord/ --include="*.yaml" | grep -E "[0-9]+\.[0-9]+\.[0-9]+"

# 例: 1.2.3 → 1.0 に変換（grepで確認してから直接編集）
# version: "1.2.3" → version: "1.0"
# version: "2.5.1" → version: "2.0"
```

#### 方針B: versionHistoryも含めて完全移行（丁寧）

versionHistory配列内のバージョンも全て変換する場合は、yqを使用:

```bash
# versionとversionHistory[].versionを全て変換
# （実装コード例はPhase 2で詳細化）
```

### 後方互換性

- スキーマでは `version: string` 形式を維持（"1.0.0"も"1.0"も受け入れ可能）
- 既存のバージョン履歴（versionHistory）は保持（方針Aでは修正不要）
- 移行後は新形式（X.Y）でのみ新規バージョンを作成
