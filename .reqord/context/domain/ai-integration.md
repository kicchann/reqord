# AI Integration - ドメイン知識

## AI連携ポイント

Reqordは以下の4つのフェーズでAIを活用する。

### 1. 要件詳細化（Requirement Enhancement）

ユーザーの簡単なタイトル・説明から、AIが詳細な要件定義を生成する。

- EARS形式への変換
- 成功基準（Success Criteria）の定義
- 複雑度の見積もり
- 依存関係の推定

### 2. Gap Analysis

既存コードベースと新要件の差分をAIが分析する。

- 既存実装のカバレッジ評価（full / partial / no coverage）
- 不足機能の特定
- コンフリクト検出（API変更、データモデル不整合等）

### 3. 設計生成（Specification Design）

要件とProjectContextから、AIが技術設計書を生成する。

- アーキテクチャ図（Mermaid形式）
- コンポーネント設計とインターフェース定義
- コード例の生成
- 技術的決定の文書化（Rationale、Alternatives、Tradeoffs）

### 4. タスク分解（Task Decomposition）

仕様からAIが実装タスクに分解する。

- レイヤー別 / 機能別 / 要件別の分解戦略
- 並列実行分析（Parallel Group: P0, P1, P2）
- クリティカルパスの特定
- GitHub Issue テンプレートの適用

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

- ユーザー提供のAPIキーを使用（Reqord側でキーを保持しない）
- 環境変数 `ANTHROPIC_API_KEY` または `reqord config set api-key` で設定
- キーは `.reqord/` には保存しない（`.env` またはOS keychain）

## トークン最適化

- ProjectContextの段階的読み込み（必要な部分のみ）
- YAML形式による構造化データの効率的なトークン消費
- 大きなMarkdownコンテンツは要約してからAIに渡す
- キャッシュ戦略：同一コンテキストでの連続呼び出しを最適化

## Claude Code連携

Reqordは Claude Code のツールエコシステムとの統合を前提とする。

- **Commands**: `.claude/commands/reqord/` に配置し、Claude Code のスラッシュコマンドとして利用可能
- **Skills**: `.reqord/skills/` に配置し、AI出力品質を向上させるドメイン知識を提供
- **Subagents**: `.reqord/subagents/` に配置し、専門エージェントとして要件詳細化・設計生成等を実行
- **Rules**: `.reqord/settings/rules/` に配置し、品質基準を自動適用

将来的にはこれらをpluginとしてパッケージ化し、他プロジェクトへの導入を容易にする。
