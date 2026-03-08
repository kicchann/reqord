# validate-criteria: Success Criteria検証基準

validateサブコマンドが各success criterionの実装状況を判定する際のロジックを定義する。

---

## 1. Success Criterionの判定フロー

各criterionに対して以下の順序で判定する:

### 1.1 キーワード抽出

criterionのテキストからアクション・対象を抽出する:

- 「〜を表示する」「〜が表示される」→ UI/出力に関連するコード検索
- 「〜を保存する」「〜が保存される」→ ファイル書き込み/DB操作のコード検索
- 「〜を検証する」「〜がバリデーションされる」→ バリデーションロジック検索
- 「〜コマンドで〜できる」→ CLI コマンドハンドラ検索
- 「〜エラーが返される」→ エラーハンドリングコード検索

対象エンティティ（requirement, specification, feedback等）も抽出し、検索キーワードに含める。

### 1.2 コード内検索

Grepツールで関連コードを検索:

```
パターン例:
- 関数名・メソッド名（キャメルケース変換: 「表示する」→ show, display, render）
- エンティティ名（requirement, spec, feedback）
- ファイルパス（design.mdの期待パスを優先検索）
```

検索対象ディレクトリ:
- `packages/shared/src/` - スキーマ・型定義
- `packages/cli/src/` - CLIコマンド
- `packages/web/src/` - Webダッシュボード
- テストファイル: `**/*.test.ts`, `**/*.spec.ts`

### 1.3 テスト存在確認

対応するテストファイルを検索:

```
対象ファイル: packages/<pkg>/src/<path>.ts
テストファイル候補:
  - packages/<pkg>/src/__tests__/<path>.test.ts
  - packages/<pkg>/src/<path>.test.ts
  - packages/<pkg>/tests/<path>.test.ts
```

テストファイル内でcriterionに関連するテストケース（describe/it/test）を検索する。

---

## 2. 判定基準

### ✅ 実装済み

以下のすべてを満たす:
- criterionに対応するコードが存在する
- 対応するテストファイルが存在する
- テストがpassingである

### ⚠ 一部実装

以下のいずれかに該当:
- コードは存在するがテストがない
- コードは存在するがcriterionの一部のみ実装
- テストは存在するがfailingまたはskipped

### ❌ 未実装

以下に該当:
- criterionに関連するコードが見つからない
- design.mdの期待パスにファイルが存在しない

---

## 3. コンポーネント存在確認パターン

### 3.1 ファイルパス抽出

design.mdから以下のパターンでファイルパスを抽出する:

- `packages/` で始まるパス
- コードブロック内のファイルパス指定
- 「ファイル構成」「ディレクトリ構造」セクション内のパス

### 3.2 存在確認

Globツールで実在確認:

```
パターン: <extracted-path>
```

ファイルが存在しない場合、類似パスを検索して「移動された可能性」を報告する。

### 3.3 インターフェース確認

design.mdで定義されたインターフェース・クラス名をGrepで検索:

```
パターン: (interface|class|type|const)\s+<Name>
対象: packages/**/*.ts
```

---

## 4. テストカバレッジ閾値

### 必須条件

- 対象の実装ファイルに対応するテストファイルが存在すること
- テストがすべてpassingであること（failingテストがあれば ⚠）

### 確認方法

ProjectContextの`technical.yaml`に定義されたテストコマンドを実行する。

テスト結果の出力からpass/fail/skipの件数を解析する。
対象specに関連するテストファイルのみをフィルタして報告する。
