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

### セマンティックバージョニング

- **Major** (x.0.0): 要件/仕様の根本的な変更（スコープ変更）
- **Minor** (0.x.0): 要件/仕様の追加・拡張（成功基準追加等）
- **Patch** (0.0.x): 記述の修正（誤字、明確化）

### バージョン変更のトリガー

| 変更内容 | バージョン変更 | 備考 |
|---------|--------------|------|
| title, successCriteria, format, dependencies, priority等 | する | 内容変更 = バージョンアップ |
| status変更（draft → approved → implemented等） | **しない** | ワークフロー進行はバージョンと無関係 |
| flagの追加・削除 | **しない** | メタ情報の変更 |

### 状態遷移

```
draft ──approve──→ approved ──implement──→ implemented
  ↑                    │
  └── draft (flag解決) ←┘
```

> 注: `approved`は廃止方針（#208）。PRマージ自体が承認行為となる。

## コマンド仕様

### reqord req history \<id\> / reqord spec history \<id\>

- バージョン履歴をタイムライン表示
- 各バージョンのステータス、承認者、Gitコミットを表示

### 自動バージョニング

- `reqord req update` / `reqord spec update` 時に内容変更を検知して自動インクリメント
- ステータス変更のみの場合はバージョンを変更しない
- `--major`, `--minor`, `--patch` で明示的に指定可能

### determineNextVersion の改修方針

現在の実装はステータス変更をメジャーバンプとして扱っている。以下の方針で改修する:

```typescript
// 改修前: ステータス変更 → メジャーバンプ
if (before.status !== after.status) {
  return formatVersion(major + 1, 0, 0);
}

// 改修後: ステータス変更のみではバージョンを変えない
// 内容フィールド(title, successCriteria, format, dependencies, priority等)の
// 差分を検出し、変更がある場合のみバンプ
```

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
