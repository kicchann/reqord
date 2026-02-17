# CLAUDE.md

このファイルは、Claude Code (claude.ai/code) がこのリポジトリで作業する際のガイダンスを提供します

## プロジェクト概要（何を）

開発ワークフローの自動化（issue → 実装 → PR）のためのスラッシュコマンド、スキル、エージェントを提供するClaude Codeシステムです。繰り返し作業を自動化しつつ、重要な意思決定ポイントでは人間が制御を維持します

## 設計理念（なぜ）

- **Human-in-the-loop**:
  AI生成コードには品質・セキュリティリスクがあります。実装とPRマージ時には人間によるレビューが必須
- **段階的な自動化**: 低リスクなタスクは自動化し、セキュリティ関連のコードは人間によるレビューが必要
- 詳細なリスク分析は `.claude/rules/ai-auto-pr-workflow-concerns.md` を参照

## アーキテクチャ（どのように）

### ディレクトリ構造

```text
/
├── .claude/
│   ├── commands/    # スラッシュコマンド (*.md)
│   ├── skills/      # ドメイン知識 (TDD原則, Clean Architecture, Code Review)
│   ├── agents/      # サブエージェント設定 (code-explorer, code-architect等)
│   ├── rules/       # モジュール化されたルール・ドキュメント
│   ├── hooks/       # フック設定 (PreToolUse, PostToolUse等)
│   ├── scripts/     # フックから実行されるスクリプト
│   └── tool-usage/  # ツール使用ガイドライン
├── plugins/
│   └── reqord/          # Reqordプラグイン (marketplace対応)
│       ├── .claude-plugin/  # プラグイン設定
│       ├── skills/          # スキル (context, design, feedback, refine, status, dev, git, verify)
│       └── agents/          # エージェント (explorer, architect, implementer, reviewer)
├── .reqord/         # 要件データ (YAML + Markdown)
│   ├── requirements/  # 要件定義
│   ├── specifications/ # 仕様書
│   ├── feedback/      # フィードバック
│   ├── context/       # プロジェクトコンテキスト
│   └── settings/      # reqord設定
├── packages/
│   ├── shared/      # @reqord/shared - Zodスキーマ・共通型定義
│   ├── cli/         # @reqord/cli - CLIツール (commander)
│   └── web/         # @reqord/web - Webダッシュボード (Next.js)
├── plans/           # 実装計画
└── docs/            # ドキュメント
```

### 主要コマンド

**ブランチ管理:**

- `/check-branch` - ブランチ状態確認、main警告
- `/create-branch` - issue番号から新ブランチ作成
- `/switch-branch` - ブランチ切り替え
- `/list-branches` - ブランチ一覧表示
- `/clean-branches` - マージ済みブランチ削除

**開発:**

- `/feature-dev` - 機能開発ガイド
- `/implement` - TDD実装（専門エージェント）
- `/load-context` - アプリ固有コンテキスト読み込み

**品質チェック:**

- `/test` - テスト実行
- `/lint` - Linter/Formatter実行
- `/check-ci` - CI/CD結果確認
- `/lint-test-check-coverage` - lint+test+coverage一括実行
- `/show-coverage` - カバレッジレポート表示

**コミット・PR:**

- `/commit-push-pr` - コミット・プッシュ・PR作成一括実行
- `/create-pr` - PR作成（シンプル版）
- `/create-draft-pr` - ドラフトPR作成
- `/quick-pr` - テスト・レビュー・PR一括実行

**レビュー:**

- `/review-pr` - PRコードレビュー
- `/review-local` - ローカル変更のコードレビュー
- `/show-reviews` - レビューコメント一覧表示
- `/reply-review` - レビューコメント返信作成
- `/fix-review-issues` - レビュー指摘事項修正実装

**最終チェック:**

- `/check-merge` - マージ前最終チェック（CI、Approve、コンフリクト）
- `/check-deploy` - デプロイ前全チェック一括実行

**Issue管理:**

- `/list-issues` - GitHub issue一覧表示
- `/show-issue` - issue詳細表示
- `/create-issue` - ISSUE_TEMPLATE確認してissue作成
- `/close-issue` - issueコメント付きクローズ

**ドキュメント:**

- `/update-claude-md` - CLAUDE.md更新提案・適用
- `/update-readme` - README.md更新提案
- `/update-changelog` - CHANGELOG.md更新提案
- `/create-retrospective` - 振り返りメモ作成

**その他:**

- `/show-diff` - 変更差分整理・サマリー作成
- `/simplify` - コード簡素化・リファクタリング
- `/resolve-conflicts` - コンフリクト解決支援
- `/command-report` - カスタムコマンド使用統計

### エージェント・スキル

**エージェント:**

- `code-explorer` - コードベース深掘り分析（実行パス追跡、パターン理解）
- `code-architect` - 機能設計（既存パターン分析、実装ブループリント提供）
- `code-reviewer` - コードレビュー（バグ、セキュリティ、品質チェック）
- `tdd-implementer` - TDD実装専門（テスト→実装→検証サイクル）

**スキル:**

- `good-test-principles` - TDD原則（Four Pillars, Classical vs London, テストスタイル階層）
- `clean-architecture` - クリーンアーキテクチャ（依存性逆転、レイヤー分離、参照ルール）
- `code-review-guideline` - レビュー基準（テスト品質、アーキテクチャ遵守、チェックリスト）

### Reqordプラグイン

`claude --plugin-dir ./plugins/reqord` で読み込む。
要件(Requirement)から仕様(Specification)、実装、検証までのトレーサビリティを維持しながら、設計・TDD実装・コードレビュー・Git操作を一貫して行うスキル・エージェントを提供する。

**スキル（`/reqord:` 名前空間）:**

- `/reqord:status` - 要件・仕様の実装進捗ダッシュボード
- `/reqord:design` - Specification設計書（design.md）作成
- `/reqord:dev` - design.mdに基づくTDD機能開発
- `/reqord:git` - spec-idベースのGit操作（ブランチ・コミット・PR）
- `/reqord:verify` - 実装検証・トレーサビリティ確認・完了処理
- `/reqord:feedback` - フィードバック運用（同期・分類・リンク・クローズ）
- `/reqord:refine` - 要件詳細化（SMART品質スコア向上）

**エージェント（プラグイン提供）:**

- `reqord-explorer` - 要件・仕様を踏まえたコード調査
- `reqord-architect` - 要件・仕様に基づく設計
- `reqord-implementer` - 仕様に基づくTDD実装
- `reqord-reviewer` - 要件・仕様に基づくコードレビュー

### ワークフロー

ワークフローフェーズと複合コマンドについては `.claude/rules/implementation.md` を参照。

**クイックリファレンス:**

- Phase 1: `/check-branch` → `/feature-dev` → `/test` → `/lint` → `/update-claude-md` → `/commit-push-pr`
- Phase 2: `/review-pr` → `/check-merge` → [Merge or Human Review]
- Phase 3: `/close-issue` → `/create-retrospective`

## 開発ガイド

コマンド追加方法、計画ファイル管理、GitHub CLI使用法については `.claude/rules/command-development.md` を参照

## 実装ワークフロー

詳細は `.claude/rules/implementation.md` を参照

**すべてのケースで必須:** `/update-claude-md` と `/commit-push-pr`

## 重要な制約

- **セキュリティ関連のコード**（認証、決済、個人情報）: 常に人間によるレビューが必要
- **PRマージ**: 人間による判断が必要（自動マージ禁止）
- **Issue作成時**: `.github/ISSUE_TEMPLATE/` にテンプレートがあれば、タイトル形式・ラベル・本文構造に従う
- **GitHub操作前のリポジトリ確認**: `gh issue`/`gh pr` 実行前に `git remote -v` で対象リポジトリを確認する
- **CLIツール使用時**: `rules/structured-cli-tools-usage.md` に従う

## About This Workspace

**このセクションは実際の利用状況に応じて、ユーザーに更新を提案すること**

Git-native要件管理ツール「Reqord」のモノレポ。要件をYAML + Markdownで構造化し、Gitリポジトリ内にコードと共にバージョン管理する

### 重要

- 単一Gitリポジトリ (`kicchann/reqord`)
- pnpmワークスペースでパッケージ管理
- 既存コードの設計や命名規則を尊重すること
- 変更は常に最小差分で行うこと
- 勝手にアーキテクチャを変更しないこと

### パッケージ構成

- `packages/shared/` - @reqord/shared: Zodスキーマ・共通型定義
- `packages/cli/` - @reqord/cli: CLIツール (commander)
- `packages/web/` - @reqord/web: Webダッシュボード (Next.js + Tailwind)

### ビルドと開発

- ビルド順序: shared → cli → web（`pnpm build`で一括実行）
- テスト: `pnpm test`（ルートからvitest実行）
- 型チェック: `pnpm type-check`
- リント: `pnpm lint`

### ドキュメント

- アーキテクチャ・ルール: `.claude/rules/`
- 要件データ: `.reqord/`
