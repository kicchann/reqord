---
対象読者: すべての人（開発者、テックリード、PO、AIエージェント）
前提知識: なし
関連文書: docs/advanced/specification.md, docs/guide-requirements.md
---

> **この文書のまとめ**: Reqordの30秒要約と、読者に合わせた最適な読み進め方の案内。

# Reqord について

> [English](./index.md)

## Reqord とは

**Reqord** は、プロダクトの要件・仕様・実装タスクを構造化し、
ライフサイクル全体を管理・可視化するCLIツールです。

「何を作るか」「なぜ作るか」の情報をコードと同じリポジトリで運用し、
実装との同期を保ちます。

### AI駆動開発での価値

AIがコードを高速に生成する時代、「何を作っているか」の管理はより重要になります。
Reqordの構造化データはAIへの明確な入力となり、
人間が状況を把握し続けるための基盤を提供します。

### 具体的なユースケース

1. **CLIで要件を作成** — `reqord req create` で構造化された要件を記述
2. **AIで詳細化・レビュー** — EARS形式への変換、SMARTバリデーション、仕様設計を支援
3. **PRで承認** — Gitベースの承認フロー（CODEOWNERS レビュー → マージで承認確定）
4. **GitHub Issueに分解** — 仕様から実装タスクを自動生成、依存関係も反映

## このドキュメント群の構成

| ファイル | 内容 | こんなときに読む |
|---------|------|-----------------|
| [01-philosophy.md](./01-philosophy.ja.md) | なぜReqordが存在するのか | 設計判断の背景を知りたい |
| [02-purpose.md](./02-purpose.ja.md) | 何を達成するのか、誰のためか | Reqordで何ができるか知りたい |
| [03-theory.md](./03-theory.ja.md) | 採用した手法と選定理由 | EARS・SMART等の理論的背景を知りたい |
| [04-best-practices.md](./04-best-practices.ja.md) | 効果的な使い方のパターン | 実践的なノウハウが欲しい |
| [05-donts.md](./05-donts.ja.md) | やってはいけないこと | 典型的な失敗を避けたい |
| [06-ai-integration.md](./06-ai-integration.ja.md) | AI駆動開発での活用 | AIツールとの連携方法を知りたい |

各文書は独立して読めますが、番号順に読むと体系的に理解できます。

## ペルソナ別の推奨パス

### AI駆動開発を既にやっている人
→ [philosophy](./01-philosophy.ja.md) → [purpose](./02-purpose.ja.md) → [ai-integration](./06-ai-integration.ja.md)
- spec-kit/kiro等との違い、Reqordのポジショニングが分かる
- AI活用の具体的なフローとツール別パターンを知れる

### 要件管理が初めての人
→ [purpose](./02-purpose.ja.md) → [theory](./03-theory.ja.md) → [best-practices](./04-best-practices.ja.md)
- 基礎概念から実践パターンまで段階的に学べる

### すぐに使いたい人
→ [purpose](./02-purpose.ja.md) → [best-practices](./04-best-practices.ja.md) → [donts](./05-donts.ja.md)
- 最短で効果的に使い始められる

### AIエージェント
→ [philosophy](./01-philosophy.ja.md) + [purpose](./02-purpose.ja.md) → [best-practices](./04-best-practices.ja.md) + [donts](./05-donts.ja.md) → [ai-integration](./06-ai-integration.ja.md)
- 設計意図と制約を正確に把握できる
- AI連携のフェーズとProjectContextの構成を理解できる

## 関連ドキュメント

- [docs/advanced/specification.md](../advanced/specification.ja.md) — 技術仕様・設計原則の詳細
- [docs/guide-requirements.md](../guide-requirements.ja.md) — 要件の書き方ガイド（実装詳細）
- [docs/guide-feedback.md](../guide-feedback.ja.md) — フィードバック管理の設計
- [.reqord/context/domain/](../../.reqord/context/domain/) — AIが参照するドメイン知識
