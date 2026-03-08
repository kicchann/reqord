# new spec: Specification新規作成

Requirementに紐づくSpecificationを作成し、design.mdの初期生成までを行う。

---

## Step 1: 紐づけ先Requirementの確認

**req-idが指定されている場合:**

```bash
reqord req show <req-id> --json
```

存在確認とステータス確認を行う。approvedでない場合は警告:

```
⚠ <req-id> のステータスは <status> です。通常はapproved状態の要件にspecを紐づけます。
続行しますか？
```

**req-idが未指定の場合:**

```bash
reqord req list --json
```

approved状態の要件をテーブル表示し、AskUserQuestionで選択してもらう。

---

## Step 2: 既存Specification確認

```bash
reqord spec list --requirement <req-id> --json
```

既存specがある場合は一覧を表示し、追加作成の意図を確認:

```
<req-id> には以下のspecが既に存在します:
- spec-NNNNNN: <title> (<status>)

追加のSpecificationを作成しますか？
```

---

## Step 3: Specification作成

```bash
reqord spec create <req-id>
```

作成されたspec-idを記録する。

---

## Step 4: design.md生成

Specificationが作成されたら、`.reqord/settings/setting.yaml` の `approvalPrerequisites.designMdCheck` を確認する。

**`true`（デフォルト）の場合** — approve前にdesign.mdの生成を推奨:

```
spec-NNNNNN を作成しました。
design.md（技術設計書）を生成しますか？（approveにはdesign.mdが必要です）

- はい → このまま生成を開始
- あとで → `/reqord:edit <spec-id>` で生成できます
```

**`false` の場合** — design.md生成は任意として提案:

```
spec-NNNNNN を作成しました。
design.md（技術設計書）を生成しますか？（任意）

- はい → このまま生成を開始
- あとで → `/reqord:edit <spec-id>` で生成できます
```

ユーザーが「はい」の場合、`/reqord:edit <spec-id>` を呼び出してdesign.md生成を実行する。

---

## Step 5: 完了メッセージ

```
✅ <spec-id> を作成しました。

次のステップ:
- design.mdを生成・編集: /reqord:edit <spec-id>
- design.md完成後にapprove: reqord spec approve <spec-id>
- コンテキスト確認: /reqord:brief <spec-id>
```
