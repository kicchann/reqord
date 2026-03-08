# Flag解消（resolve）

フィードバックに起因するreq/specの修正が完了した後、feedback-review flagを解消する。

---

## 解消対象の特定

Step 7の「Flag残存の注意喚起」で報告されたflag残存リスト、またはユーザーが修正完了を報告したタイミングで実行する。

---

## 解消実行

```bash
reqord feedback resolve <artifact-id> --issue <issue-number>
```

このコマンドは以下を実行する:

1. 対象req/specからfeedback-review flagを除去
2. feedbackのlinkedTo.resolvedに対象artifact-idを記録

---

## 解消確認

```bash
reqord req show <req-id> --json    # flagsが空になっていること
reqord spec show <spec-id> --json  # flagsが空になっていること
```

---

## 全flag解消後のフロー

対象フィードバックの全リンク先でflagが解消されたら、次のアクションを案内する:

```
全flagが解消されました。

次のステップ:
- 実装検証: /reqord:verify validate <spec-id>
- 完了処理: /reqord:verify done <spec-id>
```
