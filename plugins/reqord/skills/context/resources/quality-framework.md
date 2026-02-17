# 要件品質フレームワーク

## EARS形式（Easy Approach to Requirements Syntax）

自然言語の要件記述に構造を持たせる5つのパターン。曖昧性の排除、学習コストの低さ、機械可読性が選定理由。

| パターン | テンプレート | 用途 | 例 |
|---------|------------|------|-----|
| **Ubiquitous** | The system shall [action]. | 常に成り立つ振る舞い | The system shall store all data in YAML + Markdown format. |
| **Event-driven** | When [trigger], the system shall [action]. | イベント起因の振る舞い | When a user creates a requirement, the system shall generate a unique ID in req-NNNNNN format. |
| **State-driven** | While [state], the system shall [action]. | 状態依存の振る舞い | While a requirement is in "approved" status, the system shall prevent direct edits. |
| **Optional** | Where [feature enabled], the system shall [action]. | オプション機能 | Where AI enhancement is enabled, the system shall suggest success criteria for new requirements. |
| **Unwanted** | If [condition], then the system shall [action]. | 異常系・エラー処理 | If a circular dependency is detected, then the system shall reject the requirement update with an error message. |

> Reqordのスキーマでは `ears.type` を自由文字列で受け付ける。5パターンは推奨だが、プロジェクト固有のパターンも許容する。

## User Story形式

```
As [role], I want [action], so that [benefit].
```

ユーザー視点で「誰が・何を・なぜ」を記述する形式。

例: `As a developer, I want to enhance requirements with AI, so that I can create detailed specs faster.`

## EARS形式とUser Storyの使い分け

| 観点 | User Story | EARS |
|------|-----------|------|
| 視点 | ユーザー | システム |
| 適する要件 | ユーザー向け機能 | システム振る舞い・非機能要件 |
| 例 | ログイン、検索、購入 | バリデーション、エラー処理、パフォーマンス |

**判断基準**:
- ユーザーが直接操作する機能 → **User Story**
- システム内部の振る舞い・制約 → **EARS**
- 調査・技術検証 → **Free-form**
- 迷ったらUser Storyから始め、システム側の制約が中心ならEARSに切り替える

## SMART基準

要件の品質を5つの観点で評価する基準。ルールベース（AI不要）でオフライン即座評価可能。

| 基準 | 意味 | 良い例 | 悪い例 |
|------|------|-------|-------|
| **S**pecific | 具体的・明確 | 「レスポンスタイム3秒以内」 | 「高速に」 |
| **M**easurable | 測定・検証可能 | 「カバレッジ80%以上」 | 「十分にテスト」 |
| **A**chievable | 技術的に実現可能 | 現在のスタックで対応可能 | 非現実的な要求 |
| **R**elevant | プロダクトビジョンと整合 | コア機能に関連 | スコープ外 |
| **T**ime-bound | 工数見積もり可能 | complexity: medium, 8-24h | 見積もりなし |

スコアリング: タイトルの充実度、descriptionの長さ、成功基準の具体性と数、曖昧表現の少なさ、工数見積もりの有無等を総合的に評価。

## 避けるべき曖昧表現

以下の表現はSMARTバリデーションで自動検出される。

| カテゴリ | 表現例 |
|---------|--------|
| 程度の曖昧さ | 適切に、なるべく、できるだけ、可能な限り、必要に応じて |
| 品質の曖昧さ | 高速、効率的、柔軟、簡単、使いやすい、わかりやすい |
| 相対表現 | 多い、少ない、大きい、小さい、良い、悪い |
| 包括表現 | 等、など、その他、ある程度、十分に |

**対処法**: 数値や条件を明示する（「3秒以内に応答」「入力フィールドを3つ以下に」）

## 要件粒度ルール

**1要件 = 1機能/1振る舞い** を基本とする。

- 目安: 1要件から1〜3件の仕様が生まれる
- 判定基準: 「この要件を1文で説明できるか？」 — できなければ分割が必要

| 複雑度 | 工数目安 | 特徴 |
|-------|---------|------|
| small | 1-8h | 単一コンポーネント、明確なパス |
| medium | 8-24h | 複数コンポーネント、設計判断あり |
| large | 24-40h | アーキテクチャへの影響あり |
| xlarge | 40h+ | 分割を推奨 |

- 成功基準: **3〜7個** が適切な範囲
- 40時間を超えたら分割を検討
- 1時間未満なら他の要件への統合を検討

## 成功基準の書き方

- **数値を含める**: 「レスポンスタイム3秒以内」「カバレッジ80%以上」
- **検証可能であること**: テストで確認できる、または手動確認手順が明確
- 「〜できること」で終わる形式が書きやすい

良い例:
```
- ユーザーがメールアドレスとパスワードでログインできること
- 不正なパスワードで3回失敗するとアカウントが一時ロックされること
- ログイン成功時にJWTトークンが発行され、有効期限が24時間であること
```
