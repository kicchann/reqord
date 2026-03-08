# フィードバック新規作成（create）

`/reqord:feedback create` で呼び出されるフィードバック作成の詳細手順。

---

## Step C.1: 内容の整理

会話の文脈から以下を特定する:

- **タイトル**: フィードバックの要約（簡潔に）
- **説明**: 何が起きたか / 何に気づいたか
- **Type**: bug / improvement / requirement-gap / spec-mismatch / security
- **Severity**: critical / high / medium / low
- **関連 req/spec**: 分かっていれば（任意）

不明な項目がある場合は AskUserQuestion で確認する。

---

## Step C.2: 作成実行

```bash
reqord feedback create \
  --title "<タイトル>" \
  --description "<説明>" \
  --type <type> \
  --severity <severity> \
  [--related-req <req-id>] \
  [--related-spec <spec-id>]
```

---

## Step C.3: 結果報告

- 作成された Issue 番号と URL
- 適用された Type / Severity
- 次のアクション: 「`/reqord:feedback <issue-number>` でリンク・クローズ処理を続行できます」
