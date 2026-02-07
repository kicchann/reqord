# Requirementバージョン管理

## 概要

要件の変更履歴をバージョン管理し、承認情報と紐付けて追跡可能にする。

## EARS形式要件

When a developer updates a requirement,
if the requirement status is approved,
the system shall increment the version and record history,
preserving the previous approval information.

## バージョニングルール

### セマンティックバージョニング

- **Major** (x.0.0): 要件の根本的な変更（スコープ変更）
- **Minor** (0.x.0): 要件の追加・拡張（成功基準追加等）
- **Patch** (0.0.x): 記述の修正（誤字、明確化）

### 状態遷移

```
draft → pending_approval → approved → deprecated
                ↑                |
                +--- (version up) ---+
```

## コマンド仕様

### reqord req history \<id\>

- バージョン履歴をタイムライン表示
- 各バージョンのステータス、承認者、Gitコミットを表示

### 自動バージョニング

- `reqord req update` 時にdraft以外なら自動インクリメント
- `--major`, `--minor`, `--patch` で明示的に指定可能

## 技術的制約

- Gitコミットハッシュとの紐付けはGit操作と連携
- `versionHistory` 配列は追記のみ（履歴改変不可）
- 承認ワークフローはPhase 2以降で実装
