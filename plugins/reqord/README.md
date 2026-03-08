# reqord プラグイン

Git-native要件管理ツール[Reqord](https://github.com/kicchann/reqord)の開発支援プラグイン。

要件(Requirement)から仕様(Specification)、実装、検証までのトレーサビリティを維持しながら、設計・TDD実装・コードレビュー・Git操作を一貫して行います。

## インストール

```bash
claude plugin install kicchann/reqord
```

または、ローカルで直接読み込む場合:

```bash
claude --plugin-dir ./plugins/reqord
```

## クイックスタート

```bash
/reqord:setup    # 初回は必ず実行（環境チェック・証憑記録）
/reqord:status   # 進捗確認、次に着手すべきspecを特定
```

## スキル

| コマンド | 説明 |
|---------|------|
| `/reqord:setup` | 環境セットアップ・前提条件チェック |
| `/reqord:status` | 要件・仕様の実装進捗ダッシュボード |
| `/reqord:new` | req/specの新規作成 |
| `/reqord:edit` | req/spec/contextの編集・改善 |
| `/reqord:brief` | spec/req/issueの包括的コンテキスト表示 |
| `/reqord:verify` | データ検証・実装確認・トレーサビリティ・完了処理 |
| `/reqord:feedback` | フィードバック運用（同期・分類・リンク・クローズ） |

## エージェント

| エージェント | 説明 |
|------------|------|
| `reqord-explorer` | 要件・仕様を踏まえたコード調査 |
| `reqord-architect` | 要件・仕様に基づく設計 |
| `reqord-reviewer` | 要件・仕様に基づくコードレビュー |

## 前提条件

- プロジェクトルートに `.reqord/` ディレクトリが存在すること
- 要件データがYAML + Markdown形式で管理されていること

## ライセンス

MIT
