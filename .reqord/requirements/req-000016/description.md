# GitHub Issue生成・管理

## 概要

構造化されたタスク定義からGitHub Issueを作成し、Specificationとの追跡可能性を維持しつつ進捗管理を行う機能。

> **v1.1.0変更点**: AI駆動のタスク分解（Anthropic SDK）をClaude Codeエコシステムに移管。reqordは構造化タスク定義（`--tasks-file`）からのIssue作成・同期・検証に集中。並列グループ分析・分解戦略はClaude Code側の責務。Feedback #17 参照。

## ユーザーストーリー

開発者として、構造化されたタスク定義からGitHub Issueを作成し進捗を追跡したい。
なぜなら、仕様から実装への追跡可能性を維持しつつ効率的にタスク管理できるから。

## CLIコマンド仕様

### reqord issue create \<spec-id\> --tasks-file \<path\>

1. 対象Specificationが `approved` 状態であることを検証
2. タスク定義ファイル（JSON）を読み込み:
   - タイトル、説明、推定時間、依存関係等
   - Zodスキーマでバリデーション
3. GitHub Issue作成:
   - 構造化Markdownで本文を生成
   - HTMLコメントタグでspec-idをメタデータとして埋め込み（`<!-- reqord:specification {"specificationId":"..."} -->`）
   - ラベル: `reqord-generated`, `<priority>`（P0/P1/P2/P3）
4. Specification JSONの `implementation` フィールドを更新

タスク定義ファイル形式:
```json
{
  "tasks": [
    {
      "title": "データモデル実装",
      "description": "...",
      "estimatedHours": 4,
      "dependencies": []
    },
    {
      "title": "API実装",
      "description": "...",
      "estimatedHours": 8,
      "dependencies": ["データモデル実装"]
    }
  ]
}
```

オプション:
- `--dry-run` : Issue作成せずプレビュー
- `--json` : 作成結果を構造化出力

### reqord issue sync \<spec-id\>

- GitHub APIで各Issueの最新状態を取得
- Specification JSONの `implementation.issues[].state` を更新
- `implementation.progress` を再計算

### reqord issue sync-all

- 全Specificationに対して `sync` を実行
- `--quiet` で変更があったもののみ表示

### reqord issue validate \<spec-id\>

- メタデータ整合性チェック:
  - 全Issueが実在するか（GitHub API照合）
  - ラベル・メタデータの不整合検出

## 責務分離

| 責務 | 担当 |
|------|------|
| 構造化タスク定義からのIssue作成 | reqord CLI（本要件） |
| Issue同期・進捗追跡 | reqord CLI（本要件） |
| メタデータ整合性検証 | reqord CLI（本要件） |
| AI駆動のタスク分解 | Claude Code エコシステム |
| 並列グループ分析・クリティカルパス計算 | Claude Code エコシステム |
| 分解戦略の選択・適用 | Claude Code エコシステム |

## Issue本文テンプレート

`buildIssueBody()` により構造化Markdownで本文を生成。先頭にHTMLコメントタグでspec-idを埋め込み、タイトル・説明・見積時間・依存タスクを記載する。

## 技術的制約

- reqord自体にはAI SDK依存を追加しない
- GitHub CLI (`gh`) を使用してIssue操作
- APIレート制限への配慮（バッチ処理・遅延）
