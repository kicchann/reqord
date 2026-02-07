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
├── plans/           # ワークスペース横断的な実装計画（apps/配下以外）
└── apps/         # 各アプリケーション固有のコードベース
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
- **GitHub操作前のリポジトリ確認**: `gh issue`/`gh pr` 実行前に `git remote -v`
  で対象リポジトリを確認する（プロジェクト内に独立した複数のリポジトリを持つ場合を想定）
- **CLIツール使用時**: `rules/structured-cli-tools-usage.md` に従う

## About This Workspace

**このセクションは実際の利用状況に応じて、ユーザーに更新を提案すること**

このモノレポワークスペースには3つの独立したアプリケーションがあります

### Important

- 各アプリは独自のGitリポジトリを持つ
- 横断的な作業時はルートから実行
- 個別アプリ作業時は各ディレクトリへ移動してから`claude`を起動
- 既存コードの設計や命名規則を尊重すること
- 変更は常に最小差分で行うこと
- 勝手にアーキテクチャを変更しないこと

### ワークスペース構成

- `apps/frontend/` - React + TypeScript UI（独立リポジトリ）
- `apps/backend/` - FastAPI + SQLAlchemy（独立リポジトリ）
- `apps/backend-billing/` - 課金サービス（独立リポジトリ）

### 横断的なコマンド

- Docker Compose全体起動: `docker compose -f apps/backend/docker-compose.yml up`
- 全アプリのテスト: 各ディレクトリで個別実行が必要

### ドキュメント

- アーキテクチャ全体: `.claude/rules/`
- 各アプリの詳細: 各`apps/*/.claude/` `apps/*/CLAUDE.md`を参照

**作業開始前に適切なディレクトリへ移動して、各`apps/*/.claude/` `apps/*/CLAUDE.md`を使用してください。**
