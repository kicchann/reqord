---
対象読者: 開発者、テックリード、AIエージェント
前提知識: ソフトウェア開発の基本的な理解
関連文書: docs/guide-requirements.md, .reqord/context/domain/requirements-engineering.md
---

> **この文書のまとめ**: Reqordが採用した要件工学の手法とその選定理由。各トピックの概念を紹介し、「なぜReqordはこれを選んだか」を説明する。

# Theory — 採用した手法と選定理由

> [English](./03-theory.md)

各トピックは「概念 → なぜReqordはこれを選んだか → 詳細参照」の構造で説明する。

## 要件と仕様の分離

### 概念

- **要件（Requirement）**: 何を作るか（What） — ユーザーやビジネスの視点
- **仕様（Specification）**: どう作るか（How） — 技術的な設計と実装方針

### なぜReqordはこれを選んだか

要件と仕様を明示的に分離することで:

- **役割の明確化**: PO/ビジネス側は要件に集中、エンジニアは仕様に集中
- **変更の局所化**: 技術スタックが変わっても要件は変わらない。逆に、ビジネス要件の変更は仕様の再設計を促す
- **レビューの効率化**: 要件レビュー（What の妥当性）と仕様レビュー（How の妥当性）を分けて行える

Reqordではさらに **GitHub Issue**（実装タスク）を第3層として加え、3層モデルを構成:

```
Requirement（What） → Specification（How） → GitHub Issue（タスク）
     req-NNNNNN            spec-NNNNNN           #123, #124, #125
```

各層はIDで紐付けられ、トレーサビリティを実現する。

## EARS形式

### 概念

EARS（Easy Approach to Requirements Syntax）は、自然言語の要件記述に構造を持たせる5つのパターン:

| パターン | テンプレート | 用途 |
|---------|------------|------|
| **Ubiquitous** | The system shall [action] | 常に成り立つ振る舞い |
| **Event-driven** | When [trigger], the system shall [action] | イベント起因の振る舞い |
| **State-driven** | While [state], the system shall [action] | 状態依存の振る舞い |
| **Optional** | Where [feature enabled], the system shall [action] | オプション機能 |
| **Unwanted** | If [condition], then the system shall [action] | 異常系・エラー処理 |

### なぜReqordはこれを選んだか

- **曖昧性の排除**: パターンに沿って書くことで「いつ」「何が」「どうなるか」が明確になる
- **学習コストの低さ**: 5パターンだけで大半のシステム要件をカバーできる
- **機械可読性**: 構造化されたフォーマットはツールやAIによる解析にも適している

**注**: Reqordのスキーマでは `ears.type` を自由文字列で受け付ける設計としている。5パターンは推奨だが、プロジェクト固有のパターンも許容する柔軟性を持たせている。

> 詳細: [.reqord/context/domain/requirements-engineering.md](../../.reqord/context/domain/requirements-engineering.md)

## User Story形式

### 概念

```
As [role], I want [action], so that [benefit]
```

ユーザー視点で機能を記述する形式。3つの要素で「誰が」「何を」「なぜ」を明確にする。

### EARS形式との使い分け

| 観点 | User Story | EARS |
|------|-----------|------|
| 視点 | ユーザー | システム |
| 適する要件 | ユーザー向け機能 | システム振る舞い・非機能要件 |
| 例 | ログイン、検索、購入 | バリデーション、エラー処理、パフォーマンス |

迷ったら:
- ユーザーが直接操作する機能 → **User Story**
- システム内部の振る舞い・制約 → **EARS**
- 調査・技術検証 → **Free-form**

## SMART基準

### 概念

要件の品質を5つの観点で評価する基準:

| 基準 | 意味 | 良い例 | 悪い例 |
|------|------|-------|-------|
| **S**pecific | 具体的・明確 | 「レスポンスタイム3秒以内」 | 「高速に」 |
| **M**easurable | 測定・検証可能 | 「カバレッジ80%以上」 | 「十分にテスト」 |
| **A**chievable | 技術的に実現可能 | 現在のスタックで対応可能 | 非現実的な要求 |
| **R**elevant | プロダクトビジョンと整合 | コア機能に関連 | スコープ外 |
| **T**ime-bound | 工数見積もり可能 | complexity: medium, 8-24h | 見積もりなし |

### なぜReqordはこれを選んだか

- **ルールベース（AI不要）**: オフラインで即座に評価可能
- **客観的評価**: 人によるばらつきを最小化
- **段階的改善**: スコアが低い部分を特定し、ピンポイントで改善できる

スコアリングの仕組み: タイトルの充実度、description の長さ、成功基準の具体性と数、曖昧表現の少なさ、工数見積もりの有無等を総合的に評価する。

> 詳細: [packages/shared/src/validation/smart-scoring.ts](../../packages/shared/src/validation/smart-scoring.ts)

## トレーサビリティ

### 概念

ある成果物から、関連する他の成果物への追跡可能性。

### Reqordにおけるトレーサビリティチェーン

```
Requirement (req-NNNNNN)
    ↓ requirementId
Specification (spec-NNNNNN)
    ↓ linkedIssues
GitHub Issue (#NNN)
    ↓ commit/PR
Code
```

- 上流（なぜ作ったか）: Issue → Spec → Requirement で「この機能はどの要件から来たか」を追跡
- 下流（何に影響するか）: Requirement → Spec → Issue で「この要件を変えたら何に影響するか」を把握

変更影響分析の基盤となる。

## 承認ワークフロー

### 概念

要件の品質と合意を担保するためのレビュープロセス。

### Reqordのステータスライフサイクル

```
draft → pending_approval → approved → implemented → deprecated
```

| ステータス | 意味 | トリガー |
|-----------|------|---------|
| draft | 作成・編集中 | 初期状態 |
| pending_approval | レビュー待ち | `reqord req approve` でPR作成 |
| approved | 承認済み・実装可能 | PRマージ |
| implemented | 実装完了 | 実装終了時 |
| deprecated | 廃止 | 要件が不要になった時 |

### なぜPRベースなのか

- **既存の習慣を活用**: コードレビューと同じワークフローを要件レビューに適用
- **CODEOWNERS**: レビュー担当者を自動割り当て
- **変更差分の可視化**: JSON/Markdown の diff が見える
- **承認の記録**: PRのマージ履歴が承認の証跡になる

## 依存関係モデル

### 概念

要件間の関係性を明示的に定義する。

### Reqordの2種類の依存関係

| 種類 | 意味 | 例 |
|------|------|---|
| **blockedBy / blocks** | 順序制約（実装順序に影響） | 「認証」が完了しないと「ユーザープロフィール」を実装できない |
| **relatedTo** | 論理グルーピング（実装順序は自由） | 「検索機能」と「フィルター機能」は関連するが独立して実装可能 |

### 設計方針

- **循環依存は禁止**: A→B→C→A のようなループは設計上避けるべき
- **依存チェーンは浅く保つ**: 深いチェーンは並列実装を阻害する
- **双方向リンク**: blockedBy を設定したら、相手側の blocks も設定する

> 詳細: [docs/guide-requirements.md](../guide-requirements.ja.md)

---

**次へ**: [04-best-practices.md](./04-best-practices.ja.md) — 効果的な使い方のパターン
