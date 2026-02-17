# トレーサビリティ・依存関係・フラグシステム

## 三層トレーサビリティモデル

```
Requirement (req-NNNNNN)  ← What: ユーザーやビジネスの視点
    ↓ requirementId
Specification (spec-NNNNNN)  ← How: 技術的な設計と実装方針
    ↓ linkedIssues
GitHub Issue (#NNN)  ← タスク: 実装単位
    ↓ commit/PR
Code
```

- **上流追跡**（なぜ作ったか）: Code → Issue → Spec → Requirement
- **下流追跡**（何に影響するか）: Requirement → Spec → Issue → Code

各層はIDで紐付けられ、変更影響分析の基盤となる。

### 要件と仕様の分離

| 層 | 責務 | 変更の独立性 |
|----|------|------------|
| **要件（Requirement）** | 何を作るか（What） | ビジネス要件変更時に更新 |
| **仕様（Specification）** | どう作るか（How） | 技術スタック変更時に更新 |

分離により: 役割の明確化（PO→要件、エンジニア→仕様）、変更の局所化、レビューの効率化を実現。

## 依存関係セマンティクス

### 2種類の依存関係

| 種類 | 意味 | 例 |
|------|------|---|
| **blockedBy / blocks** | 順序制約（実装順序に影響） | 「認証」が完了しないと「ユーザープロフィール」を実装できない |
| **relatedTo** | 論理グルーピング（実装順序は自由） | 「検索機能」と「フィルター機能」は関連するが独立して実装可能 |

### 運用ルール

- **双方向リンク必須**: blockedByを設定したら、相手側のblocksも必ず設定。relatedToも同様
- **循環依存は禁止**: A→B→C→A のようなループはバリデーションで自動検出
- **依存チェーンは浅く保つ**: 深さ上限5階層。3段以上のチェーンは設計の見直しを検討

### blockedBy vs relatedTo の判断基準

- 「先にこれが実装されていないと**技術的に不可能**」→ `blockedBy`
- 「同時に考えた方が**設計が良くなる**」→ `relatedTo`

### relatedToを見た人が取るべきアクション

- **Specification作成時**: 関連要件のSpecを参照し、設計の整合性を確認
- **レビュー時**: 関連要件への影響がないか確認
- **変更時**: 関連要件のSpecにも変更が必要か検討

## フラグシステム

「approved but flagged」パターン — ステータスは本来の状態を保持しつつ、一時的な注意事項をフラグで管理する。

### フラグ種別

| type | 用途 | 例 |
|------|------|---|
| `feedback-review` | フィードバックを受けて再検討が必要 | Token refresh mechanism missing |
| `security-review` | セキュリティ観点での追加レビューが必要 | 認証フロー変更 |
| `breaking-change` | 破壊的変更を含む | API互換性なし |
| `tech-debt` | 技術的負債の記録 | パフォーマンス改善が必要 |

### フラグの構造

```yaml
flags:
  - type: feedback-review
    reason: "Token refresh mechanism missing (requirement gap)"
    createdAt: "2026-02-07T15:00:00Z"
    relatedIssues: [123]
    severity: high
```

### 独立した解消フロー

- フラグはstatusとは独立して追加・解消される
- 解決したら配列から削除（履歴はGit履歴に残る）
- `reqord feedback resolve <artifact-id> --issue <issue-number>` で解消

### Flags vs Status の使い分け

- **status**: ライフサイクルの本質的な状態（draft → approved → implemented → deprecated）
- **flags**: 一時的な注意事項、複数の並行した懸念事項、解決可能な問題のマーカー

## 承認ワークフロー

### ステータスライフサイクル

```
draft → approved → implemented → deprecated
```

| ステータス | 意味 | トリガー |
|-----------|------|---------|
| draft | 作成・編集中 | 初期状態 |
| approved | 承認済み・実装可能 | `reqord req approve` でPR作成 → PRマージで遷移 |
| implemented | 実装完了 | 実装終了時 |
| deprecated | 廃止 | 要件が不要になった時 |

> `pending_approval` は廃止済み。`reqord req|spec approve` でPRを作成し、マージで `approved` に遷移する。

### なぜPRベースなのか

- **既存の習慣を活用**: コードレビューと同じワークフローを要件レビューに適用
- **CODEOWNERS**: レビュー担当者を自動割り当て
- **変更差分の可視化**: YAML/Markdown の diff が見える
- **承認の記録**: PRのマージ履歴が承認の証跡になる

### バージョン管理

- approved要件の変更は新バージョンとして扱う
- 変更内容をPRで提出し、再承認を受ける
- versionHistoryで変更履歴を追跡
- バージョン変更時は影響範囲分析（impact analysis）を必ず実施
