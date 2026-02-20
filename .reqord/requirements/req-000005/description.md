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
- 1.0 → 2.0: `reqord version req-000001 --major`でメジャーバージョンアップ
- 1.0 → 1.1: `reqord version req-000001 --patch`で軽微な修正
- 1.1 → 1.2: `reqord version req-000001 --patch`でさらに軽微な修正
- 1.2 → 2.0: `reqord version req-000001 --major`でメジャーバージョンアップ

**重要**:
- 基本は `X.0` 形式を使い、`.Y` は例外的にのみ使用すること
- バージョニングは`reqord version`コマンドで、明示的に実行する
- ステータス遷移（`reqord req draft/approve/implemented`）ではバージョンを変更しない

### バージョン変更のトリガー

| 操作 | バージョン変更 | 新バージョン例 | 備考 |
|------|--------------|--------------|------|
| `reqord version --major` | **する（X.0）** | 1.0 → 2.0 | 任意のステータスで実行可能 |
| `reqord version --patch` | **する（.Y）** | 1.0 → 1.1 | 任意のステータスで実行可能 |
| `reqord req draft` | **しない** | 変更なし | ステータス遷移のみ |
| `reqord req approve`（draft → approved） | **しない** | 1.0 (draft) → 1.0 (approved) | ステータス遷移のみ |
| `reqord req implemented`（approved → implemented） | **しない** | 1.0 (approved) → 1.0 (implemented) | ステータス遷移のみ |
| flagの追加・削除 | **しない** | 変更なし | メタ情報の変更 |

### 状態遷移

```
draft ──approve──→ approved ──implement──→ implemented
  ↑                    │                       │
  ├── draft (flag解決) ←┘                       │
  └── draft (flag解決) ←───────────────────────┘
```

> 注: `approved`は廃止方針（#208）。PRマージ自体が承認行為となる。

## コマンド仕様

### reqord version \<id\> [--major | --patch] [--summary \<text\>]

任意のステータスでバージョンを明示的にインクリメントする。

**オプション:**
- `--major`: X.0形式でインクリメント（1.0 → 2.0）
- `--patch`: .Y形式でインクリメント（1.0 → 1.1）
- `--summary <text>`: バージョン履歴に記録する変更概要（省略時は自動生成）

**動作:**
- バージョン履歴に自動記録
- ステータスは変更しない
- RequirementとSpecificationの両方に対応

**使用例:**
```bash
# 自動生成されたsummaryでメジャーバージョンアップ
reqord version req-000001 --major

# カスタムsummaryでメジャーバージョンアップ
reqord version req-000001 --major --summary "Refactor success criteria for clarity"

# Specificationのパッチバージョンアップ
reqord version spec-000001 --patch --summary "Fix typo in design document"
```

### reqord req history \<id\> / reqord spec history \<id\>

- バージョン履歴をタイムライン表示
- 各バージョンのステータス、承認者、Gitコミットを表示

### バージョニングのタイミング

- `reqord version` コマンドでのみバージョンをインクリメント
- `reqord req draft` / `reqord req approve` / `reqord req implemented` ではバージョンを変更しない（ステータス遷移のみ）
- バージョン変更とステータス遷移を完全に分離

## 適用対象

- Requirement (`req-NNNNNN`)
- Specification (`spec-NNNNNN`)

両方に同じバージョニングルールを適用する。`version-service.ts`は共通ロジックとして実装済み。

## 技術的制約

- Gitコミットハッシュとの紐付けはGit操作と連携
- `versionHistory` 配列は追記のみ（履歴改変不可）

## コマンドインターフェースの移行計画（v4.0）

### 廃止されるコマンドオプション

v4.0では、以下のコマンドオプションが廃止されます:
- `reqord req draft <id> --major` (削除)
- `reqord req draft <id> --patch` (削除)
- `reqord spec draft <id> --major` (削除)
- `reqord spec draft <id> --patch` (削除)

### 新しいコマンド

代わりに、専用の`reqord version`コマンドを使用します:
```bash
# 旧: reqord req draft req-000001 --major
# 新: reqord version req-000001 --major && reqord req draft req-000001

# 旧: reqord req draft req-000001 --patch
# 新: reqord version req-000001 --patch && reqord req draft req-000001
```

### 移行スケジュール

**Phase 1 (即時)**: ドキュメント更新とコマンド追加
- req-000005 v4.0、spec-000005 v3.0のドキュメント承認
- `reqord version`コマンドの実装

**Phase 2 (v4.0実装後)**: Deprecation警告の追加
- `reqord req draft --major/--patch`実行時に警告メッセージを表示
- 警告メッセージ例: "Warning: --major/--patch options are deprecated. Use 'reqord version <id> --major/--patch' instead."

**Phase 3 (v5.0以降)**: オプション削除
- `--major`/`--patch`オプションを完全に削除
- エラーメッセージで新しいコマンドを案内

### 移行ガイド

ユーザー向けの移行ガイドは以下に記載:
- CHANGELOG.md: v4.0のBreaking Changesセクション
- README.md: Versioning Workflowセクションの更新
- CLIヘルプ: `reqord req draft --help`にdeprecation noticeを追加

## フィードバック反映履歴

| Issue | 反映内容 |
|-------|---------|
| #109 | ステータス変更ではバージョンをインクリメントしない方針に変更 |
| #208 | approved廃止に伴い状態遷移図を更新 |
| #209 | draft化時のバージョン指定（--major/--minor/--patch）を明記。Specificationも対象に拡大 |
| #247 | セマンティックバージョニングから整数+小数点形式（X.Y）に簡素化（v3.0） |
| #263 | reqord versionコマンドを追加し、バージョニングとステータス遷移を完全分離（v4.0、後方互換性なし） |

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
