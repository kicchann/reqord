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

## スキル

| コマンド | 説明 |
|---------|------|
| `/reqord:status` | 要件・仕様の実装進捗ダッシュボード |
| `/reqord:design` | Specification設計書（design.md）作成 |
| `/reqord:dev` | design.mdに基づくTDD機能開発 |
| `/reqord:git` | spec-idベースのGit操作（ブランチ・コミット・PR） |
| `/reqord:verify` | 実装検証・トレーサビリティ確認・完了処理 |
| `/reqord:feedback` | フィードバック運用（同期・分類・リンク・クローズ） |
| `/reqord:refine` | 要件詳細化（SMART品質スコア向上） |

## エージェント

| エージェント | 説明 |
|------------|------|
| `reqord-explorer` | 要件・仕様を踏まえたコード調査 |
| `reqord-architect` | 要件・仕様に基づく設計 |
| `reqord-implementer` | 仕様に基づくTDD実装 |
| `reqord-reviewer` | 要件・仕様に基づくコードレビュー |

## 前提条件

- プロジェクトルートに `.reqord/` ディレクトリが存在すること
- 要件データがYAML + Markdown形式で管理されていること

## ライセンス

MIT
