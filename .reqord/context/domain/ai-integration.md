# AI Integration - ドメイン知識

## AI連携ポイント

Reqordの構造化データを活用して、AIツール（プラグイン等）が以下の4フェーズを支援する。

### 1. 要件詳細化（Requirement Enhancement）

CLIがSMARTバリデーション・構造化テンプレートを提供し、プラグイン（`plugins/reqord/`）がAI支援による詳細化を担当する。

- EARS形式への変換
- 成功基準（Success Criteria）の定義
- 複雑度の見積もり
- 依存関係の推定

### 2. Gap Analysis

既存コードベースと新要件の差分を分析する。

- 既存実装のカバレッジ評価（full / partial / no coverage）
- 不足機能の特定
- コンフリクト検出（API変更、データモデル不整合等）

### 3. 設計生成（Specification Design）

要件とProjectContextから技術設計書を生成する。CLIが構造化テンプレート・バリデーションを提供し、プラグインがAI支援による設計生成を担当する。

- アーキテクチャ図（Mermaid形式）
- コンポーネント設計とインターフェース定義
- コード例の生成
- 技術的決定の文書化（Rationale、Alternatives、Tradeoffs）

### 4. タスク分解（Task Decomposition）

仕様から実装タスクに分解する。プラグインがAI支援によるタスク分解を担当する。

- レイヤー別 / 機能別 / 要件別の分解戦略
- 並列実行分析（Parallel Group: P0, P1, P2）
- クリティカルパスの特定
- GitHub Issue タスクテンプレートの適用

## コンテキスト構成の優先順位

AIへのコンテキスト提供は以下の優先順位で行う。

1. **context.yaml** - プロジェクトメタデータ（必須）
2. **product.yaml** - プロダクトビジョン・スコープ（必須）
3. **technical.yaml** - 技術スタック・設計原則（必須）
4. **structure.yaml** - 命名規則・アーキテクチャルール（タスクに応じて）
5. **domain/*.md** - ドメイン知識（関連するもののみ）
6. **対象の要件/仕様** - 処理対象のデータ（必須）

トークン予算に応じて、優先度の低い情報は省略または要約する。

## APIキー管理

ReqordのCLI自体はAI APIを直接呼び出さない。AI連携はプラグイン（`plugins/reqord/`）やClaude Code等の外部AIツールが担当する。APIキーの管理は各ツール側の責務である。

## トークン最適化

- ProjectContextの段階的読み込み（必要な部分のみ）
- YAML形式による構造化データの効率的なトークン消費
- 大きなMarkdownコンテンツは要約してからAIに渡す
- キャッシュ戦略：同一コンテキストでの連続呼び出しを最適化

## Claude Code連携

Reqordは Claude Code のプラグインエコシステムと統合済みである。

- **Skills**: `plugins/reqord/skills/` に配置し、AI出力品質を向上させるドメイン知識を提供（context, design, feedback, refine, status, dev, git, verify）
- **Agents**: `plugins/reqord/agents/` に配置し、専門エージェントとして要件調査・設計・TDD実装・レビューを実行（explorer, architect, implementer, reviewer）
- **Plugin設定**: `plugins/reqord/.claude-plugin/` にプラグインメタデータを格納

プラグインは `claude --plugin-dir ./plugins/reqord` で読み込み、他プロジェクトへの導入も容易。
