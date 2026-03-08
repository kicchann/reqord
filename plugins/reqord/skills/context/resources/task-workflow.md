# Taskワークフロー

Specificationに紐づくGitHub Issueベースのタスク管理。design.mdの実装計画をタスクに分解し、GitHub Issueとして発行・追跡する。

> **Note**: タスク分解は専用スキルを設けず、CLIコマンドを直接使用する。プロジェクトごとにタスク粒度・分解戦略が大きく異なるため、スキルで型にはめない方針。

---

## タスク定義ファイル形式

`reqord task create` に渡すYAMLファイルの形式:

```yaml
tasks:
  - title: "スキーマ定義の追加"
    description: "Zodスキーマに新しいフィールドを追加する"
    priority: "P1"          # P0(緊急) / P1(高) / P2(中・デフォルト) / P3(低)
    estimatedHours: 4        # 正の数
    dependencies: []         # 他タスクのtitleを参照（デフォルト: []）

  - title: "コマンド実装"
    description: "CLIコマンドを実装する"
    priority: "P2"
    estimatedHours: 8
    dependencies: ["スキーマ定義の追加"]
```

### フィールド

| フィールド | 必須 | 型 | 説明 |
|-----------|------|-----|------|
| `title` | 必須 | string（非空） | タスクタイトル |
| `description` | 必須 | string（非空） | タスク説明 |
| `priority` | 任意 | P0/P1/P2/P3 | デフォルト: P2 |
| `estimatedHours` | 必須 | number（正） | 見積もり時間 |
| `dependencies` | 任意 | string[] | 依存タスクのtitle |

---

## HTMLコメントタグ

`reqord task create` で生成されたGitHub Issueには、メタデータタグが埋め込まれる:

```html
<!-- reqord:specification {"specificationId":"spec-000016","priority":"P1","estimatedHours":8} -->
```

このタグにより `reqord task fetch` がIssueとSpecificationの紐づきを追跡する。手動でIssueを作成する場合もこのタグを付与すれば追跡対象になる。

---

## CLIコマンド

```bash
# タスク定義からGitHub Issue生成
reqord task create <spec-id> --tasks-file <path> [--dry-run] [--max-issues <n>]

# GitHub上のタグ付きIssueをローカルに取り込み
reqord task fetch [spec-id]

# ステータス（open/closed）をGitHubから同期
reqord task sync <spec-id>
reqord task sync-all

# メタデータ整合性チェック
reqord task validate [spec-id] [--all]
```

---

## ローカルデータ

タスク情報は `.reqord/issues/tasks.yaml` に保存される:

```yaml
title: "GitHub Issue Tasks"
tasks:
  - number: 101
    title: "スキーマ定義の追加"
    url: "https://github.com/owner/repo/issues/101"
    linkedTo:
      specifications: ["spec-000016"]
    priority: "P1"
    status: "open"
    estimatedHours: 4
    syncedAt: "2026-03-08T10:00:00Z"
```
