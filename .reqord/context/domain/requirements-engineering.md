# Requirements Engineering - ドメイン知識

## EARS形式（Easy Approach to Requirements Syntax）

要件記述の標準形式として5つのパターンを採用する。

### 1. Ubiquitous（普遍的）

常に成り立つべき要件。

```
The system shall [action].
```

例: `The system shall store all data in JSON + Markdown format.`

### 2. Event-driven（イベント駆動）

特定のイベントがトリガーとなる要件。

```
When [trigger], the system shall [action].
```

例: `When a user creates a requirement, the system shall generate a unique ID in req-NNNNNN format.`

### 3. State-driven（状態駆動）

特定の状態が続く間の要件。

```
While [state], the system shall [action].
```

例: `While a requirement is in "pending_approval" status, the system shall prevent direct edits.`

### 4. Optional（オプション）

特定の機能が有効な場合の要件。

```
Where [feature enabled], the system shall [action].
```

例: `Where AI enhancement is enabled, the system shall suggest success criteria for new requirements.`

### 5. Unwanted（望ましくない状態）

異常系・エラー処理の要件。

```
If [condition], then the system shall [action].
```

例: `If a circular dependency is detected, then the system shall reject the requirement update with an error message.`

## User Story形式

EARS形式が適さない場合の代替形式。

```
As a [role], I want [action], so that [benefit].
```

例: `As a developer, I want to enhance requirements with AI, so that I can create detailed specs faster.`

## Free-form形式

上記のいずれにも当てはまらない場合の自由記述。ただし、成功基準は必ず構造化する。

## SMART品質基準

すべての要件は以下の基準を満たすこと。

| 基準 | 説明 | 例 |
|------|------|-----|
| **S**pecific | 具体的で明確 | "レスポンス時間3秒以内" (良) vs "速く" (悪) |
| **M**easurable | 測定可能な成功基準 | "カバレッジ80%以上" (良) vs "十分なテスト" (悪) |
| **A**chievable | 技術的に達成可能 | 現在のスタックで実装可能か |
| **R**elevant | プロダクトビジョンに合致 | product.json の vision/coreFeatures に関連 |
| **T**ime-bound | 見積もり可能 | estimatedComplexity + estimatedHours を設定 |

## 避けるべき曖昧表現

以下の表現は要件に含めない。自動バリデーションで検出する。

- "なるべく", "できるだけ", "可能な限り"
- "適切に", "正しく", "うまく"
- "ユーザーフレンドリー", "使いやすい"
- "高速", "高性能", "スケーラブル"
- "必要に応じて", "場合によっては"
- "等", "など", "その他"

## 要件粒度ルール

- 1要件 = 1つの検証可能な機能単位
- 見積もり: 1〜40時間の範囲
- 成功基準: 3〜7個
- 40時間を超える場合は分割を検討
- 1時間未満の場合は他の要件への統合を検討

## 依存関係ルール

- `blockedBy`: この要件の実装前に完了が必要な要件
- `blocks`: この要件の完了を待っている要件
- `relatedTo`: 関連はあるが依存はない要件
- **循環依存は禁止** - バリデーションで自動検出
- 依存チェーンの深さは最大5階層まで

## バージョン管理フロー

1. **draft** - 作成・編集中
2. **pending_approval** - レビュー依頼中（PR作成済み）
3. **approved** - 承認済み（PRマージ済み）
4. **deprecated** - 非推奨（新バージョンで置き換え済み）

バージョン変更時は影響範囲分析（impact analysis）を必ず実施する。

## 複雑度見積もり

| 複雑度 | 目安時間 | 説明 |
|--------|----------|------|
| small | 1-8時間 | 単一コンポーネントの変更、明確な実装パス |
| medium | 8-24時間 | 複数コンポーネントにまたがる変更、設計判断を含む |
| large | 24-40時間 | アーキテクチャへの影響あり、複数の技術的判断を含む |
| xlarge | 40時間超 | 分割推奨。大規模リファクタリングや新規サブシステム |
