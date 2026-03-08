# edit context: ProjectContext充実化

ProjectContextの参照ファイルを分析し、不足している情報をコードベース自動収集とヒアリングの組み合わせで充実させる。

対話設計の原則は `context/resources/dialogue-guidelines.md` を参照。

---

## Step 1: 現状確認

```bash
reqord context show --json
```

`files` フィールドの参照先ファイルをすべて**並列で**Readツールで読み込み、現状を把握する:

| 参照 | ファイル | 確認内容 |
|------|---------|---------|
| product | product.yaml | vision, scope, valueProposition の記述状況 |
| technical | technical.yaml | techStack, architecture, testCommand の記述状況 |
| structure | structure.yaml | directories, namingConventions の記述状況 |
| domain | domain/*.md | ドメイン知識ファイルの存在と充実度 |

### 充実度スコアの算出

各領域の充実度を判定する:

| 領域 | チェック項目 | 判定 |
|------|------------|------|
| product.vision | 文字列の有無と長さ | 空=不足, <50文字=薄い, >=50文字=充実 |
| product.targetUsers | 配列の要素数 | 0=不足, 1=薄い, >=2=充実 |
| product.valueProposition | 文字列の有無 | 空=不足, あり=充実 |
| product.outOfScope | 配列の要素数 | 0=不足, >=1=充実 |
| technical.testCommand | 有無 | 空=不足, あり=充実 |
| technical.designPrinciples | 有無と内容 | 空=不足, あり=充実 |
| structure | ファイル有無 | なし=不足, あり=充実 |
| domain | ファイル数 | 0=不足, >=1=充実 |

---

## Step 2: コードベースからの情報収集

**Exploreエージェント**（Agentツール）を起動し、ProjectContextに反映すべき情報を収集する:

- 使用フレームワーク・ライブラリ（package.json, go.mod等）
- ディレクトリ構造と命名規則
- テストコマンドとビルドコマンド
- アーキテクチャパターン（レイヤー構成、依存方向）

収集結果をサマリーとして表示:

```
コードベースから以下の情報を自動検出しました:
- 技術スタック: TypeScript, Next.js, pnpm ...
- テストコマンド: pnpm test
- ディレクトリ構造: N ディレクトリ検出
```

---

## Step 3: ヒアリング（ビジネス情報の収集）

コードからは読み取れないビジネス面の情報を対話で収集する。Step 1の充実度スコアに基づき、**不足している領域だけ**を質問に含める。全領域が充実している場合はこのStepをスキップしてStep 4へ。

### ギャップレポートの提示

```
ProjectContextの充実度:

  product.yaml
    ✅ vision (充実)
    ⚠️ targetUsers (1件のみ → ペルソナの深掘り推奨)
    ⚠️ valueProposition (未設定)

  technical.yaml
    ✅ techStack (コードベースと一致)
    ⚠️ testCommand (未設定 → 自動検出値あり)

  domain/
    ⚠️ ドメイン用語集が未整備

⚠️ の項目を充実させられます。どの領域を改善しますか？
  1. ビジネス情報（targetUsers, valueProposition, ドメイン用語）
  2. 技術情報（testCommand, designPrinciples）
  3. すべて
  4. 今回はスキップ
```

AskUserQuestionで選択してもらう。選択に応じて以下のPhaseを実行する。

### Phase A: ビジネス情報ヒアリング（1〜2問）

不足項目から質問を動的に組み立てる。不足項目が複数ある場合は1問にまとめる。

**質問テンプレート**（不足項目のみを含める）:

```
ビジネス面の情報を教えてください。わかる範囲で大丈夫です。（1/2）

[targetUsersが不足の場合]
■ ユーザーペルソナ
  このプロダクトを使うのは主にどんな人ですか？それぞれの主な目的は？
  （例: 「中小企業の経理担当者。月次の請求書作成を効率化したい」）

[valuePropositionが未設定の場合]
■ 価値提案
  類似サービスと比べて、どこが違いますか？
  （例: 「freeeより請求書作成が速い」）

[outOfScopeが未設定の場合]
■ スコープ外
  「これはやらない」と決めていることはありますか？

（スキップ → Enter）
```

| 回答の抽出対象 | 変換先 |
|--------------|--------|
| ユーザーペルソナ | product.yaml `targetUsers[]` |
| 価値提案 | product.yaml `valueProposition` |
| スコープ外 | product.yaml `outOfScope[]` |

**ドメイン知識の質問**（domain/*.mdが不足の場合のみ）:

```
このプロジェクトに新しく参加する人が最初に理解すべき
「このプロジェクト特有の概念やルール」はありますか？（2/2）

（用語の定義、業界特有のルール、プロジェクト固有の慣習など）
（例: 「要件にはdraft→approved→implementedのライフサイクルがある」
      「req-idは6桁ゼロ埋め」）

（スキップ → Enter）
```

| 回答の抽出対象 | 変換先 |
|--------------|--------|
| 用語定義 | domain/glossary.md |
| 業界ルール | domain/ に新規MDファイル |
| プロジェクト慣習 | structure.yaml または domain/conventions.md |

### Phase B: 技術情報ヒアリング（1問）

技術情報はコードベースから大部分を自動収集済み。質問は**確認と暗黙知の引き出し**が中心。

```
コードベースから以下を検出しました。修正・追加があれば教えてください。

■ テストコマンド: <検出値 or "未検出">
■ ビルドコマンド: <検出値 or "未検出">
■ アーキテクチャパターン: <検出値 or "未検出">

追加で:
- 技術選定で「あえてこれを選んだ」理由がある技術は？
- 「これだけは守りたい」技術原則やルールはありますか？

（例: 「Zodを選んだのはio-tsより学習コストが低いから」
      「外部APIへの依存は最小限に」）

（修正なければ Enter）
```

| 回答の抽出対象 | 変換先 |
|--------------|--------|
| テストコマンド | technical.yaml `testCommand` |
| ビルドコマンド | technical.yaml `buildCommand` |
| アーキテクチャパターン | technical.yaml `architecture.patterns[]` |
| 技術選定理由 | technical.yaml `designPrinciples[]` に rationale 追記 |
| 技術原則 | technical.yaml `designPrinciples[]` に追加 |

---

## Step 4: 改善案の提示

コードベース自動収集（Step 2）とヒアリング結果（Step 3）を統合し、ファイルごとに改善案を提示する:

```
以下の変更を適用します:

■ 自動検出（技術情報）:
  <検出結果サマリー>

■ ヒアリング結果（ビジネス情報）:
  <構造化した回答サマリー。スキップ項目は「未設定」と表示>

■ 変更されるファイル:
  | ファイル | 変更内容 |
  |---------|---------|
  | product.yaml | targetUsers 2件追加、valueProposition更新 |
  | domain/glossary.md | 新規作成（5用語） |
  | technical.yaml | testCommand追加、designPrinciples追加 |
  | structure.yaml | 新規作成 |

反映してよいですか？（修正があれば教えてください）
```

**重要**: すべての改善案を提示した後、ユーザーの承認を得てから次のステップに進む。

---

## Step 5: 適用

ユーザー承認後:

- 既存ファイルの更新: `reqord context update` を使用
- 未作成ファイル: Writeツールで作成後、context.yamlのfiles参照に追加

```bash
reqord context update
```

---

## Step 6: 確認

更新後にProjectContextの内容を再表示し、変更点をサマリーで報告する:

```
### 更新サマリー

| ファイル | 変更内容 |
|---------|---------|
| product.yaml | targetUsers追加、valueProposition追加 |
| technical.yaml | testCommand, designPrinciples追加 |
| domain/glossary.md | 新規作成 |
| structure.yaml | 新規作成 |

次のステップ:
- 要件を定義: /reqord:new req
- 整合性確認: /reqord:verify validate context
```
