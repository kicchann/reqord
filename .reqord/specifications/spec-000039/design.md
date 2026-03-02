# フィードバックバリデーション設定 - 技術設計書

## 1. 設計概要

未解決フィードバック存在時の承認動作を `setting.yaml` の `feedbackValidation` セクションで制御可能にする。現在は警告のみで承認が進むが、設定によりブロック（エラー）に昇格でき、severity閾値でブロック対象を制御できるようにする。

前提: spec-000035（設定スキーマ定義とロード基盤）が実装済みであること。

## 2. アーキテクチャ

```
packages/cli/src/
  ├── services/
  │   └── feedback-validation.ts       (新規: shouldBlockApproval関数)
  └── commands/
      ├── req/
      │   └── approve.ts               (既存: フィードバックチェックを設定対応)
      └── spec/
          └── approve.ts               (既存: フィードバックチェックを設定対応)
```

### 設定項目と動作

| 設定項目 | デフォルト | 説明 |
|---------|-----------|------|
| `feedbackValidation.blockOnUnresolved` | `false` | `true` の場合、閾値以上のfeedbackで承認をブロック |
| `feedbackValidation.severityThreshold` | `"critical"` | ブロック対象の最低severity |

### severity の順序

`critical` > `high` > `medium` > `low`

例: `severityThreshold: "high"` の場合、`critical` と `high` のfeedbackがブロック対象。

## 3. コンポーネント設計

### 3.1 フィードバックチェックロジック

```typescript
// packages/cli/src/services/feedback-validation.ts (新規)

const SEVERITY_ORDER = ["low", "medium", "high", "critical"] as const;

function shouldBlockApproval(
  feedbacks: FeedbackEntry[],
  settings: ProjectSettings,
): { blocked: boolean; blockingFeedbacks: FeedbackEntry[] } {
  if (!settings.feedbackValidation.blockOnUnresolved) {
    return { blocked: false, blockingFeedbacks: [] };
  }

  const thresholdIndex = SEVERITY_ORDER.indexOf(settings.feedbackValidation.severityThreshold);
  const blockingFeedbacks = feedbacks.filter(f => {
    const severityIndex = SEVERITY_ORDER.indexOf(f.severity ?? "low");
    return severityIndex >= thresholdIndex;
  });

  return {
    blocked: blockingFeedbacks.length > 0,
    blockingFeedbacks,
  };
}
```

### 3.2 approve コマンドの修正

```typescript
// packages/cli/src/commands/req/approve.ts (同様に spec/approve.ts)

const unresolvedFeedbacks = await findUnresolvedByArtifactId(cwd, id);
if (unresolvedFeedbacks.length > 0) {
  const { blocked, blockingFeedbacks } = shouldBlockApproval(unresolvedFeedbacks, settings);

  if (blocked) {
    // エラー表示: severity閾値以上の未解決feedbackがあるため承認不可
    // blockingFeedbacksの一覧を表示
    throw new AppError(VALIDATION_ERROR, "...");
  } else {
    // 既存の警告表示（変更なし）
  }
}
```

## 4. テスト方針

### 単体テスト

- **blockOnUnresolved: false（デフォルト）**
  - 未解決feedbackがあっても警告のみで承認可能（既存動作）

- **blockOnUnresolved: true, severityThreshold: "critical"**
  - critical feedbackがある場合 → ブロック
  - high feedbackのみの場合 → 警告のみ（ブロックしない）

- **blockOnUnresolved: true, severityThreshold: "high"**
  - critical または high feedbackがある場合 → ブロック
  - medium feedbackのみの場合 → 警告のみ

- **severity未設定のfeedback**
  - デフォルトの "low" として扱う

## 5. 実装順序

1. severity比較ヘルパー関数を実装
2. `shouldBlockApproval` 関数を実装
3. `req approve` / `spec approve` コマンドに統合
4. テスト作成・実行
