# edit spec: design.md生成・更新

Requirementの内容・ProjectContext・既存コード実装状況を基に、6セクション構造の技術設計書（design.md）を生成・更新する。

---

## Step 1: 対象Specificationの特定

### IDが指定されている場合（spec-id）

- 指定specを対象とする（存在確認を行い、存在しないIDはスキップ）

### IDが指定されている場合（req-id）

- 該当requirementに紐づく全specを対象とする
- 紐づくspecがない場合は `/reqord:new spec <req-id>` でSpecificationの作成を案内する

### `--all` の場合

- design.mdが未記述の全specを対象とする

### 未指定の場合

1. `reqord spec list` を実行してspecification一覧を取得
2. 各specのdesign.mdを読み取り、デフォルトテンプレートのままかどうかを判定
   - 判定基準: design.mdに「Phase 3で実装予定」または「Specification Design Template」のみが含まれている場合は「未記述」
3. 一覧をテーブル形式で表示し、AskUserQuestionで対象を選択してもらう（複数選択可）

---

## Step 2: 情報収集と分割判断

### 情報収集

以下を**並列で実行**する:

**データ読み取り（並列）:**

- 対象specの紐づくrequirement情報（YAML + description.md）
- ProjectContext（context.yaml → product.yaml, technical.yaml, structure.yaml, domain/*.md）
- 関連specのdesign.md（同じrequirementに紐づく実装済みspecがあればパターン参照）

**既存コード調査（上記と並列）:**

**Exploreエージェント**（Agentツール subagent_type=Explore）を起動する。以下のテンプレートの `<変数>` を埋めてエージェントに渡すこと:

```
以下のSpecificationに関連する既存コードの実装パターン・アーキテクチャを調査してください。

対象:
- spec-id: <spec-id>
- title: <spec-title>
- 紐づくrequirement: <req-id> - <req-title>

調査観点:
1. 対象specの機能に関連する既存コードの構造・パターン
2. 類似機能の実装パターン（レイヤー構成、依存注入、エラーハンドリング）
3. design.mdに反映すべきアーキテクチャ上の制約・慣習

コードは書かず、調査結果のみ報告してください。
```

### 分割判断

対象requirementに紐づくspecが1件のみで、以下のいずれかに該当する場合は分割を検討する:

- 独立して実装・テスト可能なコンポーネント群に分かれる
- 読み取り/書き込みの方向が異なる独立した機能がある
- 異なるフレームワークやライブラリに依存する独立した画面がある

分割ルール: 1要件 = 1〜3 spec（最大3件）。分割する場合はユーザー承認を得てから `/reqord:new spec <req-id>` で追加specを作成する。

---

## Step 3: design.md生成

### 出力構造（6セクション）

各specのdesign.mdは以下の統一構造に従う:

```markdown
# [タイトル] - 技術設計書

## 1. 設計概要

要件の技術的なアプローチの概要。実装済みの場合は「本機能は実装済みであり〜」と明記。

## 2. アーキテクチャ

コンポーネント構成図（テキストベース）。
ProjectContextのtechnicalファイルに記載のアーキテクチャ・設計パターンに従う。

## 3. コンポーネント設計

主要モジュールごとに:

- ファイルパス
- 責務
- インターフェース（プロジェクトの言語に応じた型定義形式）
- 実装済みの場合は実際のコードの構造を記載

## 4. データフロー

処理の流れをステップバイステップで記述。
入力→処理→出力の流れ。

## 5. テスト方針

ユニットテスト・統合テストの方針。
テスト対象のモジュールと検証観点。

## 6. 技術的決定事項

選択したアプローチとその理由。
代替案があった場合はなぜ不採用としたか。
```

### 複雑度に応じた深さの調整

| 要件の複雑度 | design.mdの目安 | セクションの深さ |
|-------------|-----------------|----------------|
| small | 60〜120行 | 1, 3, 5を中心に簡潔に |
| medium | 120〜250行 | 全セクション標準的な深さ |
| large（分割済み） | 200〜400行 | 各specのスコープに集中して全セクション詳細に |

### 記述の注意

- ProjectContextの`language`フィールドの言語で記述する（未設定の場合は日本語）
- **実装済みの要件**: 既存コードの実際の構造・インターフェースに忠実に文書化する。推測ではなくコードから読み取った事実を書く
- **未実装の要件**: 既存コードから読み取れる実装パターン・アーキテクチャに従って設計を導出する
- **分割specの場合**: 各specのスコープ境界を冒頭で明記し、他specとの関係を記載する

---

## Step 4: 適用

### ファイル書き込み

ユーザー承認後、各specのdesign.mdをWriteツールで書き込む:
- パス: `.reqord/specifications/<spec-id>/design.md`

### バージョンバンプ

design.mdを生成・更新した場合（初回生成を含む）、対応するspecのバージョンを上げる:

```bash
reqord version <spec-id> --patch --summary "design.md更新: <変更概要>"
```

### Specificationの承認

`.reqord/settings/setting.yaml` を確認し、承認提案の判断を行う:

- `approvalPrerequisites.designMdCheck` が `true` の場合、design.md が記述済みであることを前提条件とする
- `approvalPrerequisites.designMdCheck` が `false` の場合、design.md の有無にかかわらず approve を提案できる

design.mdの生成・更新が完了し、品質に問題がなければ、approveを提案する:

```
design.mdの記述が完了しました。approveしますか？
```

ユーザーが承認した場合:

```bash
reqord spec approve <spec-id>
```

`setting.yaml` の `statusTransitionPr.draftToApproved`（デフォルト: `true`）が `true` の場合、このコマンドは承認PRを作成する。PRがマージされると `approved` ステータスに遷移する。`false` の場合は直接ステータスが遷移する。

### 次のステップ

```
次の作業:
- コンテキスト確認: `/reqord:brief <spec-id>`
- 実装検証（実装後）: `/reqord:verify validate <spec-id>`
```
