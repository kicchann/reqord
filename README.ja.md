# Reqord

**ソフトウェア開発のための要件管理システム -- Git-native, AI-ready, Local-first**

[English](README.md)

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-675%20passing-brightgreen.svg)]()
[![Version](https://img.shields.io/badge/version-0.1.0-orange.svg)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)]()

---

要件をコードと同じリポジトリで構造化し、作成から承認、実装追跡、フィードバックまでのライフサイクル全体を管理します。YAML + Markdown のハイブリッド形式で保存されるため、人間にもAIにも扱いやすく、`git clone` だけでプロジェクトの全コンテキストが手に入ります。

<!-- スクリーンショット: CLIでの要件作成・バリデーション、Web UIのダッシュボード・依存グラフのスクリーンショットを並べて配置 -->
<!-- TODO: スクリーンショットを追加 -->

---

## なぜ Reqord か？

ソフトウェア開発の現場では、「何を作るか」の情報管理に根深い課題があります。

| 課題                         | 起きること                                                                               |
| ---------------------------- | ---------------------------------------------------------------------------------------- |
| **要件の散在**               | チャット、メモ、Issue コメントに要件が散らばり、同じ議論を何度も繰り返す                 |
| **コンテキストの消失**       | プロジェクトの背景や設計判断が引き継がれず、新メンバーやAIが毎回ゼロから理解し直す       |
| **仕様の劣化（Spec Drift）** | 実装後に仕様がメンテナンスされず、半年後には「この仕様は今も正しいのか」が分からなくなる |
| **トレーサビリティの断絶**   | 要件から仕様、仕様からコードへの紐付けが不明で、変更の影響範囲が見えない                 |

Reqord はこれらの課題を、Gitリポジトリ内の構造化データとして解決します。

---

## 仕組み

Reqord は **3層トレーサビリティモデル** で要件のライフサイクルを管理します。

```
Requirement（何を作るか） --> Specification（どう作るか） --> GitHub Issue（実装タスク）
       ^                                                           |
       |                                                           |
       +---------------------- Feedback Loop ----------------------+
```

| 層                | 役割                | 例                                       |
| ----------------- | ------------------- | ---------------------------------------- |
| **Requirement**   | What -- 何を作るか  | 「ユーザーがメールでログインできる」     |
| **Specification** | How -- どう作るか   | 「OAuth2 + JWT、セッション管理は Redis」 |
| **GitHub Issue**  | Tasks -- 実装タスク | 「POST /auth/login エンドポイント実装」  |

実装後のフィードバックが要件・仕様の更新に還流する循環構造により、要件は「生きたドキュメント」として維持されます。

### ライフサイクル

```
draft --> pending_approval --> approved --> implemented --> deprecated
```

各ステータス遷移はPRベースの承認フロー（CODEOWNERS レビュー）で管理され、変更履歴はGitのコミット履歴として完全に追跡可能です。

---

## クイックスタート

### 前提条件

- Node.js 20 以上
- pnpm 10 以上
- Git

### インストール

```bash
git clone https://github.com/kicchann/reqord.git
cd reqord
pnpm install
pnpm build
```

### プロジェクトの初期化

```bash
# .reqord/ ディレクトリ構造を作成
reqord init

# プロジェクトコンテキストを設定（名前・言語など）
reqord context init
```

`reqord init` を実行すると、プロジェクトルートに以下の構造が生成されます。

```
.reqord/
├── context/          # プロジェクトコンテキスト
│   ├── context.yaml
│   ├── product.yaml
│   ├── technical.yaml
│   └── domain/
├── requirements/     # 要件データ
├── specifications/   # 仕様データ
└── settings/         # テンプレート・ルール
```

### 最初の要件を作成

```bash
# 対話形式で要件を作成（EARS / User Story / Free-form 形式を選択可能）
reqord req create

# 作成した要件を一覧表示
reqord req list

# 要件の詳細を確認
reqord req show req-000001

# SMART基準で要件の品質をスコアリング
reqord req validate req-000001
```

### 仕様を作成

```bash
# 要件に紐づく仕様を作成
reqord spec create req-000001

# 設計ドキュメントを確認
reqord spec design spec-000001
```

---

## 主要機能

### ハイブリッドストレージ（YAML + Markdown）

要件データを **YAML（メタデータ）** と **Markdown（コンテンツ）** に分離して保存します。YAML はステータス、優先度、依存関係、バージョン履歴などの機械処理に適した部分を担い、Markdown は説明文、成功基準、背景などの人間が読み書きする部分を担います。Zod スキーマが型安全性を保証し、CLI と Web UI で同一のバリデーションを共有します。

### SMART バリデーション

要件の品質を SMART 基準（Specific, Measurable, Achievable, Relevant, Time-bound）で客観的にスコアリングします。曖昧な要件を検出し、改善のガイダンスを提示します。

### PR ベース承認フロー

要件・仕様の承認に、コードレビューと同じ GitHub の PR ワークフローを活用します。CODEOWNERS によるレビュー、マージで承認確定というフローにより、既存の開発習慣をそのまま要件管理に適用できます。

### 依存グラフと Web ダッシュボード

`@reqord/web`（Next.js 15 + React 19）が提供する Web UI で、要件間の依存関係をインタラクティブなグラフとして可視化します。プロジェクトヘルスメトリクス、Gantt Chart、仕様詳細ビューなどのダッシュボード機能を備えています。

### AI 連携（ProjectContext）

`.reqord/context/` に格納される ProjectContext（product.yaml, technical.yaml, domain/\*.md）が、AIセッションに一貫した文脈を提供します。構造化された要件データは Claude Code, Cursor, Codex などのAIツールが直接解析できる形式であり、「毎回プロジェクトの説明からやり直す」問題を解消します。

### フィードバックループ

GitHub Issue からのフィードバックを要件・仕様に還流させる仕組みです。`feedback` ラベル付き Issue との双方向同期により、実装後の知見が構造化された要件に反映されます。

### 要件フォーマット

EARS（Easy Approach to Requirements Syntax）と User Story 形式をサポートしています。EARS 形式はトリガー、条件、アクションが明示的に記述されるため、AIによる解釈精度が高く、テストケースへの変換も容易です。

---

## 比較

| 観点                                     | Reqord       | Jira       | Linear | Notion | GitHub Projects |
| ---------------------------------------- | ------------ | ---------- | ------ | ------ | --------------- |
| Git-native（リポジトリ内管理）           | **対応**     | --         | --     | --     | 部分的          |
| オフライン動作                           | **対応**     | --         | --     | --     | --              |
| AI 対応（構造化データ）                  | **対応**     | --         | --     | --     | --              |
| トレーサビリティ（Req -> Spec -> Issue） | **組み込み** | プラグイン | --     | 手動   | --              |
| PR ベース承認フロー                      | **組み込み** | --         | --     | --     | --              |
| バージョン管理（差分・履歴）             | **Git 統合** | 独自       | 独自   | 独自   | --              |
| セルフホスト / SaaS 不要                 | **対応**     | --         | --     | --     | SaaS            |
| SMART バリデーション                     | **対応**     | --         | --     | --     | --              |

Reqord は Jira や Linear の代替ではなく、要件ライフサイクル管理という領域に特化したツールです。既存のプロジェクト管理ツールと併用する設計になっています。

---

## 5つの設計原則

### 1. Structure First -- 構造化第一

要件をプレーンテキストではなく、YAML + Markdown のハイブリッド形式で構造化して管理します。機械処理に適したメタデータと、人間が読み書きしやすいコンテンツを分離することで、両方の利点を得ます。

### 2. Local-First -- ローカル完結

Git リポジトリがシングルソースオブトゥルースです。SaaS やバックエンドサーバーは不要で、オフラインで完全に動作します。`git clone` だけでプロジェクトの全コンテキストを再現できます。

### 3. Machine-Readable -- 機械可読性

構造化データは、人間だけでなくツールや AI にとっても扱いやすい形式です。CLI が構造を保証するため、外部ツールとの連携に一貫したインターフェースを提供します。

### 4. Human-in-the-loop -- 人間の判断を介在

自動化と人間の判断を適切に分離します。AI が構造化や詳細化を担い、人間が優先度、スコープ、承認の最終判断を行います。特にセキュリティ関連の設計判断は常に人間によるレビューが必須です。

### 5. Living Documentation -- 生きたドキュメント

要件は使い捨てではなく、バージョン管理・ステータスライフサイクル・フィードバックループを通じて継続的に更新される「生きたドキュメント」です。

---

## アーキテクチャ

### モノレポ構成

```
reqord/
├── packages/
│   ├── shared/     @reqord/shared   -- Zod スキーマ、型定義、共通ロジック
│   ├── cli/        @reqord/cli      -- CLI ツール（Commander.js）
│   └── web/        @reqord/web      -- Web UI（Next.js 15 + React 19）
├── docs/                            -- ドキュメント
└── vitest.config.ts                 -- テスト設定（675 テスト）
```

### 技術スタック

| レイヤー       | 技術                                             |
| -------------- | ------------------------------------------------ |
| 言語           | TypeScript 5.x（ESM）                            |
| パッケージ管理 | pnpm workspaces                                  |
| スキーマ / 型  | Zod（CLI と Web で共有）                         |
| CLI            | Commander.js, chalk, cli-table3                  |
| Web UI         | Next.js 15, React 19, Tailwind CSS 4, React Flow |
| テスト         | Vitest, Testing Library                          |
| 品質           | ESLint 9, TypeScript strict mode                 |

### データフロー

```
@reqord/shared (Zod スキーマ -- Single Source of Truth)
       |
       +---> @reqord/cli (要件 CRUD, バリデーション, GitHub 連携)
       |
       +---> @reqord/web (ダッシュボード, 依存グラフ, Gantt)
```

---

## ドキュメント

Reqord の設計思想、理論的背景、実践ガイドは `docs/about/` にまとめられています。

| ドキュメント                                      | 内容                                                      |
| ------------------------------------------------- | --------------------------------------------------------- |
| [Philosophy](docs/about/01-philosophy.md)         | なぜ Reqord が存在するのか -- 設計原則と解決する課題      |
| [Purpose](docs/about/02-purpose.md)               | 何を達成するのか -- 機能概要とターゲットユーザー          |
| [Theory](docs/about/03-theory.md)                 | 採用した手法 -- EARS, SMART, トレーサビリティの理論的背景 |
| [Best Practices](docs/about/04-best-practices.md) | 効果的な使い方のパターン                                  |
| [Don'ts](docs/about/05-donts.md)                  | やってはいけないこと -- 典型的な失敗パターン              |
| [AI Integration](docs/about/06-ai-integration.md) | AI 駆動開発での活用 -- ツール別の実践パターン             |

その他:

- [CLI コマンド一覧](docs/reqord-cli-commands.md) -- 実装済み・未実装コマンドの全リスト
- [要件の書き方ガイド](docs/guide-requirements.md) -- EARS / User Story の書き方と改善例
- [フィードバック管理](docs/feedback-control.md) -- フィードバックループの設計詳細

---

## ロードマップ

Reqord は現在 v0.1.0（プレリリース）です。要件 CRUD、SMART バリデーション、仕様管理、フィードバック同期、Web UI の基本機能が動作します。

今後の方向性:

- **承認フロー自動化** -- `reqord req approve` / `reqord spec approve` による PR ベースの承認コマンド
- **GitHub Issue 生成** -- 仕様からの実装タスク自動生成
- **影響範囲分析** -- 要件変更時の依存関係を自動分析
- **ステータスダッシュボード** -- `reqord status` によるプロジェクト全体の進捗表示
- **コンテキスト統合出力** -- 外部ツール向けの `reqord context export`

詳細は [CLI コマンド一覧](docs/reqord-cli-commands.md) の未実装コマンドを参照してください。

---

## コントリビュート

Reqord への貢献を歓迎します。バグ報告、機能提案、コードの改善など、あらゆる形の貢献をお待ちしています。

詳しくは [CONTRIBUTING.md](CONTRIBUTING.md)（[日本語版](CONTRIBUTING.ja.md)）を参照してください。

プルリクエストを提出する際には [CLA](CLA.md)（[日本語版](CLA.ja.md)）への同意が必要です。

---

## ライセンス

[AGPL-3.0](LICENSE)

- 個人・商用・企業規模を問わず自由に利用できます
- 自由に改変・セルフホストできます
- Reqord をサービスとして提供する場合は、ソースコードの公開が必要です
