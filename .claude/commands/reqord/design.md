---
description: Specification設計書作成コマンド
argument-hint: <spec-id...|req-id...|--all> (スペース区切りで複数指定可)
model: opus
---

# Specification設計書作成コマンド

対象: $ARGUMENTS

Requirementの内容・ProjectContext・既存コード実装状況を基に、Specificationのdesign.md（技術設計書）を生成する。必要に応じてSpecificationの分割（1要件→複数spec）も行う。

---

## Step 1: 対象Specificationの特定

### $ARGUMENTSが空の場合

1. `node packages/cli/dist/index.js spec list` を実行してspecification一覧を取得
2. 各specのdesign.mdを読み取り、デフォルトテンプレートのままかどうかを判定
   - 判定基準: design.mdに「Phase 3で実装予定」または「Specification Design Template」のみが含まれている場合は「未記述」
3. 一覧をテーブル形式で表示:

```
| Spec ID | Req ID | タイトル | design.md |
|---------|--------|----------|-----------|
| spec-000001 | req-000001 | CLI初期化コマンド | 記述済み (73行) |
| spec-000005 | req-000005 | バージョン管理 | 未記述 |
```

4. AskUserQuestionで対象を選択してもらう（複数選択可、「未記述のみ全件」オプションも提示）

### $ARGUMENTSが `--all` の場合

- design.mdが未記述の全specを対象とする

### $ARGUMENTSが `spec-NNNNNN` の場合

- 指定specを対象とする（存在確認を行い、存在しないIDはスキップ）

### $ARGUMENTSが `req-NNNNNN` の場合

- 該当requirementに紐づく全specを対象とする
- 紐づくspecがない場合はStep 3の分割判断へ進む

---

## Step 2: 情報収集

以下を**並列で実行**して情報を収集する:

**グループA（並列実行）:**

- 対象specの紐づくrequirement情報:
  - `.reqord/requirements/<req-id>.json` をReadツールで読み取り
  - `.reqord/requirements/<req-id>/description.md` をReadツールで読み取り
- ProjectContext情報:
  - `.reqord/context/product.json` をReadツールで読み取り
  - `.reqord/context/technical.json` をReadツールで読み取り
  - `.reqord/context/structure.json` をReadツールで読み取り
- 仕様書全体:
  - `docs/main.md` をReadツールで読み取り

**グループB（グループA完了後）:**

- 全requirements一覧（依存関係の全体像把握）:
  - `.reqord/requirements/req-NNNNNN.json` を全件Readツールで読み取り

---

## Step 3: 分割判断

対象requirementごとに、Specificationの分割が必要かを判断する。

### 分割ガイドライン

以下のいずれかに該当する場合、1要件を複数specに分割する:

1. **独立したUIフレームワーク/ライブラリ**: 同一要件内で異なるUIライブラリ（React Flow、Recharts、Mermaid.js等）を使用する独立した画面がある
2. **読み取り/書き込みの方向が異なる**: 同一要件内で「データ生成（書き込み）」と「データ同期（読み取り）」が独立して設計可能
3. **完全に独立したコンポーネント群**: 共有する状態やインターフェースが少なく、別々に実装・テスト可能

### 分割ルール

- 1要件 = 1〜3 spec（最大3件）
- 分割する場合は各specのスコープ（何を含み、何を含まないか）を明確に定義する
- 分割が必要な場合: `node packages/cli/dist/index.js spec create <req-id>` で追加specを作成

### 判断結果の提示

分割判断をテーブルで提示し、ユーザーの承認を得る:

```
| Req ID | 分割数 | Spec IDs | スコープ |
|--------|--------|----------|----------|
| req-000007 | 2 | spec-000007, spec-000023 | 要件管理画面 / 依存グラフ |
| req-000016 | 2 | spec-000016, spec-000024 | Issue生成 / Issue同期 |
| req-000022 | 3 | spec-000022, spec-000025, spec-000026 | ダッシュボード / Gantt / グラフ拡張 |
| req-000009 | 1 | spec-000009 | エラーハンドリング統一 |
```

既に適切なspecが存在する場合はこのステップをスキップする。

---

## Step 4: 既存コード調査

**Exploreエージェント**を起動し、対象要件に関連する既存コードの実装状況を調査する。

### 調査対象

- `packages/cli/src/` — コマンド・サービス・リポジトリの実装
- `packages/shared/src/` — スキーマ・型定義・バリデーション
- `packages/web/src/` — Web UIコンポーネント・ページ・サーバーアクション

### 調査観点

- 対象要件の機能がすでに実装されているか（全部/一部/未着手）
- 関連するスキーマ・型定義の現状
- 関連するコマンド・サービス・リポジトリの実装ファイルと構造
- 実装済みの場合: 使用しているデザインパターン、レイヤー構成、インターフェース定義

### エージェントプロンプト

> "対象要件 [タイトル一覧] に関連する既存コードを調査してください。
> packages/cli/src/、packages/shared/src/、packages/web/src/ を中心に、
> コマンド・サービス・リポジトリ・スキーマ・UIコンポーネントの実装状況を報告してください。
> 実装済みの場合はファイルパス・主要インターフェース・処理パターンを具体的に記載してください。
> コードは書かず、調査結果のみ報告してください。"

### 実装状況の分類

各specを以下に分類する（Step 5での書き分けに使用）:

| 分類 | 判定基準 | design.mdの書き方 |
|------|----------|-------------------|
| **実装済み** | コマンド・サービス・リポジトリが揃っている | 既存コードを参照して文書化 |
| **一部実装** | スキーマは定義済みだがコマンド未実装等 | 既存部分を文書化 + 未実装部分を設計 |
| **未実装** | 関連コードがない | docs/main.mdとrequirementから設計を導出 |

---

## Step 5: design.md生成

### 出力構造（6セクション）

各specのdesign.mdは以下の統一構造に従う:

```markdown
# [タイトル] - 技術設計書

## 1. 設計概要
要件の技術的なアプローチの概要。実装済みの場合は「本機能は実装済みであり〜」と明記。

## 2. アーキテクチャ
コンポーネント構成図（テキストベース）。レイヤー配置:
Command → Service → Repository → File System

## 3. コンポーネント設計
主要モジュールごとに:
- ファイルパス
- 責務
- インターフェース（TypeScript型定義）
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
|-------------|----------------|-----------------|
| small | 60〜120行 | 1, 3, 5を中心に簡潔に |
| medium | 120〜250行 | 全セクション標準的な深さ |
| large（分割済み） | 200〜400行 | 各specのスコープに集中して全セクション詳細に |

### 記述の入力情報

| 入力 | 用途 |
|------|------|
| requirement.json | successCriteria, format, dependencies, complexity |
| description.md | 詳細要件、ユースケース、技術的制約 |
| docs/main.md | アーキテクチャ全体像、データ構造定義、技術スタック |
| ProjectContext | 技術スタック、設計パターン、命名規則 |
| 既存コード（Step 4） | 実装済み部分の実際の構造・パターン |

### 書き方の注意

- **日本語**で記述する
- **実装済みの要件**: 既存コードの実際の構造・インターフェースに忠実に文書化する。推測ではなくコードから読み取った事実を書く
- **未実装の要件**: 既存の実装パターン（Command → Service → Repository）に従って設計を導出する
- **分割specの場合**: 各specのスコープ境界を冒頭で明記し、他specとの関係を記載する
- **TypeScript型定義**: 主要インターフェースはTypeScript形式で記載する

### 生成の並列化

対象specが複数ある場合、**Taskエージェントを並列起動**して効率的に生成する。
1バッチあたり5〜8 spec程度を1エージェントに委譲し、各エージェントには以下を渡す:

- 対象specの一覧
- 対応するrequirement情報（JSON + description.md）
- 既存コード調査結果（該当部分のみ）
- 記述ガイドライン（本Step 5の内容）

---

## Step 6: ユーザーレビュー・適用

### 6.1 生成結果のサマリー提示

全specのdesign.md生成完了後、サマリーテーブルを表示する:

```
| Spec ID | Req ID | タイトル | 行数 | 実装状況 |
|---------|--------|----------|------|----------|
| spec-000001 | req-000001 | CLI初期化コマンド | 73 | 実装済み |
| spec-000005 | req-000005 | バージョン管理 | 149 | 未実装 |
| spec-000016 | req-000016 | Issue生成 | 345 | 未実装 |
```

### 6.2 ユーザー承認

AskUserQuestionで承認を求める:

- 「全件適用」
- 「個別に確認してから適用」（各specのdesign.mdを表示して承認/修正）
- 「中止」

### 6.3 ファイル書き込み

承認後、各specのdesign.mdをWriteツールで直接書き込む:

- パス: `.reqord/specifications/<spec-id>/design.md`
- 書き込み前にReadツールで既存内容を読み取ること（Writeツールの前提条件）

---

## Step 7: 検証

### 7.1 CLIで確認

```bash
# 一覧確認
node packages/cli/dist/index.js spec list

# 各specの内容確認（代表的なものをいくつか）
node packages/cli/dist/index.js spec show <spec-id>
```

### 7.2 検証結果テーブル

```
| Spec ID | design.md | 行数 | テンプレートでないこと |
|---------|-----------|------|----------------------|
| spec-000001 | ✅ 記述済み | 73 | ✅ |
| spec-000005 | ✅ 記述済み | 149 | ✅ |
```

### 7.3 残作業の報告

- design.mdが未記述のspecが残っている場合はリスト表示
- 分割が必要だが未実施のrequirementがある場合は報告
