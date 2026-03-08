# new req: Requirement新規作成

対話的にRequirementを作成し、description.mdの初期記述とapproveまでを行う。

---

## Step 1: ProjectContext読み込み

```bash
reqord context show --json
```

product.yaml（ビジョン・スコープ）をReadツールで読み込み、要件の文脈を把握する。

---

## Step 2: 対話的ヒアリング

段階的な対話でユーザーの要望を構造化する。「聞く」のではなく「AIが推定→ユーザーが確認・修正」するパターンを基本とする。

対話設計の原則は `context/resources/dialogue-guidelines.md` を参照。

### Phase 1: シード質問（必須・1問）

AskUserQuestionで自由記述を促す:

```
どんな要件を作りたいですか？背景や困っていることも含めて、自由に教えてください。

（例: 「開発者がCLIで要件を作成するとき、毎回同じ入力を繰り返さなければならない」
      「CSVエクスポート機能を追加したい」
      「レスポンスタイムが3秒超のAPIを改善」）
```

回答から以下を抽出・推定する:

| 抽出対象 | 手がかり |
|---------|---------|
| 課題/痛み | 「〜できない」「〜が困る」「〜が面倒」 |
| 望む状態 | 「〜したい」「〜できるようにする」 |
| ユーザー種別 | 主語や文脈から推定。product.yamlのtargetUsersと照合 |
| スコープの広さ | 文の具体性・抽象度から判定 |

### Phase 2: 補完質問（条件付き・0〜1問）

回答の具体度に応じて分岐する:

| 具体度 | 判定基準 | 対応 |
|--------|---------|------|
| HIGH | 動詞+目的語+理由/文脈がある | Phase 3へ直行（追加質問なし） |
| MID | 動詞+目的語はあるが理由/ユーザー種別が不明 | 以下のQ2を実行 |
| LOW | 名詞のみ、キーワードレベル | 以下のQ2を実行 |

```
もう少し教えてください。
- この機能を使うのは主にどんなユーザーですか？
- これが実現すると何が嬉しいですか？

（わかる範囲で大丈夫です。スキップ → Enter）
```

### Phase 3: 構造化確認（必須・1問）

Phase 1-2の回答を分析し、以下を**推定値として提示**した上で確認・修正を求める:

```
以下の内容で要件を作成します。修正があれば教えてください。

タイトル: <推定タイトル>

ユーザーストーリー:
  <推定ユーザー種別>として、
  <推定iWant>をしたい。
  それにより、<推定soThat>。

成功基準:
  1. <推定基準1>
  2. <推定基準2>
  3. <推定基準3>

優先度: <推定値>（理由: <推定根拠>）
複雑度: <推定値>（理由: <推定根拠>）

（OKなら Enter / 修正点があれば記述してください）
```

推定ロジック:

| フィールド | 推定方法 |
|-----------|---------|
| title | 回答の要約。動詞+目的語形式を優先 |
| userStory.as | 回答の主語 + product.yamlのtargetUsersとの照合 |
| userStory.iWant | 回答の「〜したい」表現、なければ望む状態から生成 |
| userStory.soThat | 回答の背景・理由、なければproduct.yamlのvisionから推定 |
| successCriteria | 回答の具体的記述から検証可能な基準を生成（3〜5個） |
| priority | 「急ぎ」「すぐ」→ high、言及なし → medium |
| complexity | 影響範囲の広さから推定（単一機能 → small、複数コンポーネント → medium） |

ユーザーが修正を指示した場合は反映して再提示する（最大2回。それ以上は作成後に `/reqord:edit` を案内）。

### Phase 4: 品質向上質問（条件付き・0〜1問）

Phase 3で確定した成功基準をSMARTの観点で先読みし、**スコアが低くなりそうな軸だけ**追加質問する。

**Measurableが弱い場合**（成功基準に数値指標がない）:

```
成功基準をより具体的にしたいです。以下のような数値目標はありますか？
- パフォーマンス（応答時間、処理件数 等）
- カバレッジ（対応パターン数 等）
- 制約（ファイルサイズ上限、最大件数 等）

（特になければ Enter でスキップ）
```

**Achievableが弱い場合**（依存関係や技術的制約が不明）:

```
この要件の実装にあたって:
- 先に完了が必要な要件や機能はありますか？
- 技術的な制約や懸念はありますか？

（わからなければ Enter でスキップ）
```

**スキップ条件**: Phase 3の回答で成功基準に数値が含まれている → Measurable質問スキップ。依存関係や制約への言及がある → Achievable質問スキップ。両方スキップ → Phase 4自体をスキップ。

**合計: 最小2問、最大4問**

---

## Step 3: Requirement作成

```bash
reqord req create --title "<タイトル>" --priority <priority> --complexity <complexity>
```

作成されたreq-idを記録する。

---

## Step 4: description.md記述

Step 2で構造化した情報とProjectContextを基に、description.mdを生成する。

ユーザーストーリー形式（デフォルト）:

```markdown
# <タイトル>

## ユーザーストーリー

As a <ユーザー種別>,
I want <実現したいこと>,
So that <得られる価値>.

## 詳細

<概要を詳細化した記述>

## 成功基準

- <検証可能な基準1>
- <検証可能な基準2>
- <検証可能な基準3>
```

Phase 3で確認済みの内容をそのまま反映する。ユーザー承認後、一時ファイルに書き出して適用:

```bash
reqord req update <req-id> --description-file <ファイル>
```

---

## Step 5: 成功基準の設定

description.mdの成功基準をYAMLのsuccessCriteriaフィールドにも反映する:

```bash
reqord req update <req-id> --patch-file <パッチファイル>
```

パッチ内容:
```json
{
  "successCriteria": ["<基準1>", "<基準2>", "<基準3>"]
}
```

---

## Step 6: バリデーション & approve

```bash
reqord req validate <req-id> --json
```

バリデーション結果を表示し、問題がなければapproveを提案:

```
バリデーション結果: SMART Score X/5
approveしますか？（品質を改善したい場合は `/reqord:edit <req-id>` を実行）
```

ユーザーが承認した場合:

```bash
reqord req approve <req-id>
```

`.reqord/settings/setting.yaml` の `statusTransitionPr.draftToApproved` が `true` の場合、このコマンドは承認PRを作成する。PRがマージされると `approved` ステータスに遷移する。`false` の場合は直接ステータスが遷移する。

---

## Step 7: 次のステップ案内

```
✅ <req-id> を作成・approveしました。

次のステップ:
- Specificationを作成: /reqord:new spec <req-id>
- 要件の品質を改善: /reqord:edit <req-id>
```
