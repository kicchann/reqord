# doneサブコマンド詳細

validate specを実行し、全項目が合格であればステータスを更新する。

---

## Step 1: validate spec実行

`resources/validate.md` を読み込み、「validate spec」セクションの全ステップ（Step 1〜Step 7）を実行すること。検証レポートの出力まで完了してから Step 2 に進む。

## Step 2: Flag残存チェック

specまたは紐づくreqにfeedback-review flagが残存していないか確認する:

```bash
reqord spec show <spec-id> --json
reqord req show <req-id> --json
```

flagが残存している場合、`.reqord/settings/setting.yaml` の `feedbackValidation` 設定に従って動作を決定する:

- **`blockOnUnresolved: true`** かつ flag の severity が `severityThreshold` 以上の場合 → **ブロック**:
  ```
  ❌ 以下のfeedback-review flagが残存しており、完了処理をブロックしています:
  - spec-NNNNNN: feedback-review (from #208) - severity: medium

  flag解消は `reqord feedback resolve <artifact-id> --issue <issue-number>` で実行してください。
  ```

- **上記以外**（`blockOnUnresolved: false`、または severity が閾値未満）→ **警告のみ**で続行:
  ```
  ⚠ 以下のfeedback-review flagが残存しています:
  - spec-NNNNNN: feedback-review (from #208) - severity: medium
  - req-NNNNNN: feedback-review (from #209) - severity: low

  flagが残存したまま完了処理を続行します。
  flag解消は `reqord feedback resolve <artifact-id> --issue <issue-number>` で実行してください。
  ```

## Step 3: 結果判定

**全項目 ✅ の場合**:

```bash
reqord spec implement <spec-id>
```

```
✅ <spec-id> を「implemented」に更新しました。
```

**⚠ または ❌ がある場合**:

```
以下の項目が未達です:

⚠ <criterion-2>: <理由>
❌ <criterion-3>: <理由>

修正が必要です。コンテキスト確認: `/reqord:brief <spec-id>`
```

ステータス更新は行わない。

## Step 4: Requirement完了確認（全項目 ✅ の場合のみ）

紐づくrequirementの全specのステータスを確認:

```bash
reqord spec list --requirement <req-id> --json
```

全specが `implemented` の場合、AskUserQuestionで確認:

```
<req-id> に紐づく全specが実装済みです。
requirementも「implemented」に更新しますか？

Specifications:
  - spec-NNNNNN: <title> (implemented)
  - spec-NNNNNN: <title> (implemented)
```

承認された場合:

```bash
reqord req implement <req-id>
```

```
✅ <req-id> を「implemented」に更新しました。
```

## Step 5: Time to Learning

ステータス更新が完了した場合（Step 3で✅）、specificationの作成日から完了までの経過日数を表示する。

```bash
reqord spec show <spec-id> --json
```

`createdAt`フィールドと現在日時から経過日数を算出:

```
### Time to Learning

| 項目 | 値 |
|------|-----|
| 作成日 | 2026-02-20 |
| 完了日 | 2026-03-08 |
| 経過日数 | 16日 |
```

紐づくrequirementも完了した場合は、requirementのcreatedAtからの経過日数も表示する。

## Step 6: 振り返りメモ（オプション）

ステータス更新が完了した場合（Step 3で✅）、AskUserQuestionで振り返りを提案する:

```
実装の振り返りメモを残しますか？（スキップも可）

記録する場合は以下を簡潔にお答えください:
- うまくいったこと
- 改善したいこと
```

ユーザーが回答した場合、検証レポートの末尾に振り返りセクションを追加して表示する:

```
### 振り返りメモ

- **うまくいったこと**: <ユーザー回答>
- **改善したいこと**: <ユーザー回答>
```

このメモは表示のみで、ファイルへの保存は行わない。ユーザーが必要に応じてコピーして記録する。

## Step 7: バージョン管理の確認

ステータス変更（`spec implement`, `req implement`）はCLIが自動で処理する。ただし、完了処理に伴いdescription.md/design.mdに変更を加えた場合は、バージョンバンプが必要:

```bash
reqord version <id> --patch --summary "<変更概要>"
```

**重要**: `.reqord/` 配下のYAMLファイルのversion/versionHistory/flagsを直接編集してはならない。`reqord version`, `reqord feedback resolve` 等のCLIコマンドを使用すること。
