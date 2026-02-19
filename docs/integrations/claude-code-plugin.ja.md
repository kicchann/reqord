# Claude Code Plugin

> [English](./claude-code-plugin.md)

ReqordはClaude Code向けのプラグインを提供しています。要件から仕様、実装、検証までのトレーサビリティを維持しながら、設計・TDD実装・コードレビュー・Git操作を一貫して行えます。

## インストール

```bash
claude plugin install kicchann/reqord
```

ローカルで直接読み込む場合:

```bash
claude --plugin-dir ./plugins/reqord
```

## スキル（スラッシュコマンド）

| コマンド | 説明 |
|---------|------|
| `/reqord:setup` | 環境セットアップ・前提条件チェック |
| `/reqord:status` | 要件・仕様の実装進捗ダッシュボード |
| `/reqord:design` | Specification設計書（design.md）作成 |
| `/reqord:dev` | design.mdに基づくTDD機能開発 |
| `/reqord:git` | spec-idベースのGit操作（ブランチ・コミット・PR） |
| `/reqord:verify` | 実装検証・トレーサビリティ確認・完了処理 |
| `/reqord:feedback` | フィードバック運用（同期・分類・リンク・クローズ） |
| `/reqord:refine` | 要件詳細化（SMART品質スコア向上） |

### 典型的なワークフロー

```
/reqord:setup              # 初回: 環境チェック
/reqord:status             # 進捗確認・次のタスク特定
/reqord:design <spec-id>   # 設計書作成
/reqord:dev <spec-id>      # TDD実装
/reqord:git commit <spec-id>  # コミット（トレーサビリティ付き）
/reqord:verify validate <spec-id>  # 実装検証
```

## エージェント

プラグインは4つの専門エージェントを提供します。スキルから自動的に呼び出されるほか、Task toolで直接利用することもできます。

| エージェント | 役割 | 主な用途 |
|------------|------|---------|
| `reqord-explorer` | コード調査 | design.mdとコードの照合、実装状況分析 |
| `reqord-architect` | 設計 | ProjectContextと要件に基づく設計判断 |
| `reqord-implementer` | TDD実装 | design.mdのテスト方針に沿った実装 |
| `reqord-reviewer` | コードレビュー | success criteriaの網羅性とdesign.mdとの一致チェック |

## サポートスキル（知識ベース）

エージェントが自動参照するドメイン知識です。直接呼び出すことはありません。

- `context` -- Reqordデータモデル・CLIパターン・開発ワークフローの共通知識
- `architecture-principles` -- Clean Architecture、依存性逆転、レイヤー分離
- `tdd-principles` -- Four Pillars of Good Tests、Classical vs London school
- `review-standards` -- テスト品質検証、アーキテクチャ遵守チェックリスト

## 前提条件

- プロジェクトに `.reqord/` ディレクトリが初期化済みであること（`reqord init`）
- GitHub CLI (`gh`) が認証済みであること（feedback/approve/issue系コマンド用）

詳細は [plugins/reqord/README.md](../../plugins/reqord/README.md) を参照。
