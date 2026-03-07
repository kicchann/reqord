---
name: design
description: Specificationのdesign.md（技術設計書）を生成する。Requirementの内容・ProjectContext・既存コード実装状況を基に6セクション構造の設計書を作成する。spec-idまたはreq-idを指定して使用。
argument-hint: "[spec-id...|req-id...|--all] (省略時は対話選択、複数指定可)"
---

## Scope

- **Do**: reqordのデータ（requirement, ProjectContext, 既存コード状況）からdesign.md（6セクション構造の技術設計書）を生成する
- **Don't**: 既存コードの深掘り調査や実装計画の策定。事前にコードベース調査が必要な場合はexplorerエージェントや関連スキルを、設計の詳細化が必要な場合はarchitectエージェントを併用すること

---

# Specification設計書作成

対象: $ARGUMENTS

---

## Step 1: 対象Specificationの特定

### $ARGUMENTSが空の場合

1. `reqord spec list` を実行してspecification一覧を取得
2. 各specのdesign.mdを読み取り、デフォルトテンプレートのままかどうかを判定
   - 判定基準: design.mdに「Phase 3で実装予定」または「Specification Design Template」のみが含まれている場合は「未記述」
3. 一覧をテーブル形式で表示し、AskUserQuestionで対象を選択してもらう（複数選択可）

### $ARGUMENTSが `--all` の場合

- design.mdが未記述の全specを対象とする

### $ARGUMENTSが `spec-NNNNNN` の場合

- 指定specを対象とする（存在確認を行い、存在しないIDはスキップ）

### $ARGUMENTSが `req-NNNNNN` の場合

- 該当requirementに紐づく全specを対象とする
- 紐づくspecがない場合はStep 2の分割判断へ進む

---

## Step 2: 情報収集と分割判断

### 情報収集

以下を並列で読み取る:

- 対象specの紐づくrequirement情報（YAML + description.md）
- ProjectContext（context.yaml → product.yaml, technical.yaml, structure.yaml, domain/*.md）
- 関連specのdesign.md（同じrequirementに紐づく実装済みspecがあればパターン参照）

### 分割判断

対象requirementに紐づくspecが1件のみで、以下のいずれかに該当する場合は分割を検討する:

- 独立して実装・テスト可能なコンポーネント群に分かれる
- 読み取り/書き込みの方向が異なる独立した機能がある
- 異なるフレームワークやライブラリに依存する独立した画面がある

分割ルール: 1要件 = 1〜3 spec（最大3件）。分割する場合はユーザー承認を得てから `reqord spec create <req-id>` で追加specを作成する。

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

design.mdの内容を更新した場合、対応するspecのバージョンを上げる:

```bash
reqord version <spec-id> --patch --summary "design.md更新: <変更概要>"
```
