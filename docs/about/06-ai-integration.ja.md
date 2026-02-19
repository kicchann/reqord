---
対象読者: AI駆動開発を行うチーム（開発者、テックリード）
前提知識: Reqordの基本概念（02-purpose.md を推奨）
関連文書: .reqord/context/domain/ai-integration.md, docs/integrations/claude-code-plugin.md
---

> **この文書のまとめ**: AI駆動開発においてReqordをどう活かすか。「なぜ構造化データがAIに効くのか」と、ツール別の実践パターン。

# AI Integration — AI駆動開発での活用

> [English](./06-ai-integration.md)

## なぜReqordとAIの組み合わせが有効か

Reqordの本質はAI無しでも成立する（[01-philosophy.md](./01-philosophy.ja.md) 〜 [05-donts.md](./05-donts.ja.md) 参照）。
構造化・承認フロー・トレーサビリティは、人間のチームだけでも価値がある。

AI時代には、これらに**追加で**以下の価値が生まれる:

1. **構造化データ → AIへの明確な入力**
   - 曖昧な自然言語ではなく、型付きのYAML + Markdownを渡せる
   - EARS形式の要件はAIが解釈しやすい（トリガー・条件・アクションが明示的）

2. **ProjectContext → セッション間の一貫性**
   - AIセッションが切れても、product.yaml / technical.yaml / domain/\*.md で文脈を再現できる
   - 「毎回プロジェクトの説明からやり直す」問題を解消

3. **可視化 → 人間の状況把握**
   - AIがコードを高速に生成する環境では、「何を作っているか」を見失いやすい
   - Reqordのダッシュボード・依存グラフが、人間の把握を支える

**核心**: コード実装だけが先行するのを防ぎ、人間がReqordを通じて「何が決まり、何が実装され、何が残っているか」を常に把握し続ける。

## ReqordのAI支援フェーズ

Reqordは4つのフェーズでAIを活用する（詳細: [.reqord/context/domain/ai-integration.md](../../.reqord/context/domain/ai-integration.md)）。

### 1. 要件詳細化（Enhancement）

ユーザーの簡単なタイトル・説明から、AIが詳細な要件定義を生成する。

- EARS形式 / User Story形式への変換
- 成功基準（Success Criteria）の定義
- 複雑度の見積もり、依存関係の推定
- SMARTバリデーションによる品質スコアの改善

### 2. Gap Analysis

既存コードベースと新要件の差分をAIが分析する。

- 既存実装のカバレッジ評価（full / partial / no coverage）
- 不足機能の特定
- コンフリクト検出（API変更、データモデル不整合等）

### 3. 仕様設計（Specification Design）

要件とProjectContextから、AIが技術設計書を生成する。

- アーキテクチャ図（Mermaid形式）
- コンポーネント設計とインターフェース定義
- 技術的決定の文書化（Rationale、Alternatives、Tradeoffs）

### 4. タスク分解（Task Decomposition）

仕様からAIが実装タスクに分解する。

- レイヤー別 / 機能別 / 要件別の分解戦略
- 並列実行分析（Parallel Group: P0, P1, P2）
- クリティカルパスの特定
- GitHub Issueテンプレートの適用

## ProjectContext: AIへの入力品質を決める鍵

AIの出力品質は入力の質に直結する。Reqordでは **ProjectContext** がその入力品質を決める。

### 構成ファイルと優先順位

| 優先度      | ファイル         | 役割                                             |
| ----------- | ---------------- | ------------------------------------------------ |
| 1（必須）   | `context.json`   | プロジェクトメタデータ（名前、バージョン等）     |
| 2（必須）   | `product.yaml`   | ビジョン、課題、ターゲットユーザー               |
| 3（必須）   | `technical.yaml` | 技術スタック、設計原則、アーキテクチャ           |
| 4（推奨）   | `structure.yaml` | 命名規則、ディレクトリ構造、アーキテクチャルール |
| 5（必要時） | `domain/*.md`    | ドメイン固有の知識（AI連携、承認フロー等）       |

### 「ProjectContextが貧弱 → AI出力も貧弱」の原則

- **context無し**: AIは汎用的で的外れな出力をする（ドメイン用語を間違える、技術スタックに合わない提案をする）
- **最低限（product.yaml + technical.yaml）**: 出力品質が大幅に向上する
- **充実（全ファイル + domain/\*.md）**: プロジェクト固有の正確な出力が得られる

ProjectContextの整備はAI無しでも価値がある（チームの知識共有、オンボーディング）。AI活用はその延長線上にある。

## ツール別の活用パターン

### Claude Code

Reqordとの親和性が最も高い。CLI同士の統合により、シームレスな連携が可能。

**仕様設計の生成フロー（`/reqord:design`）:**

1. 対象の要件を選択
2. ProjectContextを自動読み込み
3. AIが技術設計書（design.md）を生成
4. 人間がレビュー・修正 → 承認

**要件品質の改善フロー（`/reqord:refine`）:**

1. SMARTスコアが低い要件を選択
2. AIが具体化・改善案を提示
3. 曖昧な表現を検出し、数値・条件に置き換え

**ProjectContextの自動活用:**

- Claude Codeのセッション開始時に `.reqord/context/` が文脈として提供される
- domain/\*.md がRulesのように機能し、AIの出力を制約する

### Cursor / Windsurf（IDE統合型）

`.reqord/` をワークスペースに含めることで、IDEのAI機能が要件・仕様を参照できる。

**実装時の参照パターン:**

- 「この要件（req-000042）の仕様に基づいて実装して」と指示
- AIが `.reqord/requirements/req-000042/` の内容を参照して実装
- 成功基準をテストケースに変換

**ProjectContextの活用:**

- `domain/*.md` をCursorのRules / WindsurfのRulesに設定
- 技術スタック・命名規則がAIの実装に反映される

### Codex / その他CLIエージェント

CLIの出力をパイプで渡すことで、任意のAIエージェントと連携できる。

```bash
# 要件の内容をAIに渡す
reqord req show req-000042 | codex "この要件の実装方針を提案して"

# 仕様を参照してタスク分解
reqord spec show req-000042 | codex "この仕様をGitHub Issueに分解して"
```

タスク分解結果をGitHub Issueとして登録し、Issue駆動で実装を進めるフローが構築できる。

## Human-in-the-loop: AIに任せる境界

### AIに任せてよいこと

- **構造化**: 自然言語 → EARS/User Story形式への変換
- **詳細化**: タイトル+概要 → 成功基準・複雑度見積もりの生成
- **一貫性チェック**: 要件間の矛盾検出、依存関係の推定
- **タスク分解**: 仕様 → GitHub Issue への変換

### 人間が判断すべきこと

- **優先度**: ビジネス判断に基づく優先順位付け
- **スコープ**: 何を含め、何を含めないかの決定
- **承認**: 要件・仕様の最終承認（PRマージ）
- **セキュリティ**: 認証・決済・個人情報に関する設計判断

ReqordのPRベース承認フローが、AI出力の品質ゲートとして機能する。AIが生成した要件・仕様も、人間のレビュー → 承認を経てはじめて確定する。

## 段階的な導入

すべてを一度に導入する必要はない。

### Step 1: ProjectContextの整備

AI無しでも価値がある。チームの知識を構造化し、共有する。

```bash
reqord init
# product.yaml, technical.yaml を記述
```

### Step 2: enhance / refine でAI詳細化を試す

既存の要件をAIで改善し、効果を実感する。

```bash
reqord req create  # まず骨格を書く
reqord req enhance req-000001  # AIが詳細化
```

### Step 3: 仕様設計・タスク分解にAIを活用

要件が充実したら、仕様設計とIssue生成をAIに支援させる。

### Step 4: フルフロー

要件作成 → AI詳細化 → 仕様設計 → タスク分解 → Issue生成 → 実装 → フィードバック。
人間は各フェーズで判断・承認を行い、AIが構造化・詳細化を担う。

---

**最初に戻る**: [index.md](./index.ja.md) — ドキュメント一覧とナビゲーション
