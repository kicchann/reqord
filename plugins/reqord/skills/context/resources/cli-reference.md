# CLIコマンドリファレンス

reqord CLIの全コマンドと、reqordデータの読み込み手順をまとめる。

---

## CLIコマンドパターン集

### 要件操作

```bash
reqord req list [--status <status>] [--json]     # 要件一覧
reqord req show <req-id> [--json]                 # 要件詳細
reqord req validate <req-id> [--json]             # SMARTバリデーション
reqord req create <title>                         # 要件作成
reqord req update <req-id> --patch-file <file>    # パッチ更新
reqord req approve <req-id>                       # 承認
reqord req implement <req-id>                     # 実装済みマーク
reqord req draft <req-id>                         # ドラフトに戻す
```

### 仕様操作

```bash
reqord spec list [--requirement <req-id>] [--json]  # 仕様一覧
reqord spec show <spec-id> [--json]                  # 仕様詳細
reqord spec create <req-id>                          # 仕様作成
reqord spec implement <spec-id>                      # 実装済みマーク
reqord spec approve <spec-id>                        # 承認
reqord spec draft <spec-id>                          # ドラフトに戻す
```

### フィードバック操作

```bash
reqord feedback sync                                                              # GitHub Issue同期
reqord feedback list [--state open|closed] [--json]                               # 一覧
reqord feedback show <issue-number> [--json]                                      # 詳細
reqord feedback link <issue-number> --type <type> --severity <severity> --spec <spec-id>    # specにリンク
reqord feedback link <issue-number> --type <type> --severity <severity> --req <req-id>      # reqにリンク
reqord feedback link <issue-number> --type <type> --severity <severity> --created-req       # 新規req作成してリンク
reqord feedback unlink <issue-number> --spec <spec-id>                            # specからリンク解除
reqord feedback unlink <issue-number> --req <req-id>                              # reqからリンク解除
reqord feedback close <issue-number>                                              # クローズ
reqord feedback resolve <artifact-id> --issue <issue-number>                      # フラグ解消
```

### コンテキスト操作

```bash
reqord context show [--json]       # コンテキスト表示
reqord context init                # コンテキスト初期化
reqord context update              # コンテキスト更新
```

### 影響分析

```bash
reqord impact analyze <req-id|spec-id> [--json]  # 依存関係・影響範囲分析
```

### Task操作

```bash
reqord task create <spec-id>            # GitHub Issue生成（タスク分解）
reqord task fetch [spec-id]             # GitHub Issue情報取得
reqord task sync <spec-id>              # GitHub Issue同期・進捗計算
reqord task sync-all                    # 全Specificationの同期
reqord task validate [spec-id] [--all]  # メタデータ整合性チェック
```

### バージョン操作

```bash
reqord version <req-id|spec-id> --patch --summary "<変更概要>"   # パッチバージョンアップ（X.Y+1）
reqord version <req-id|spec-id> --major --summary "<変更概要>"   # メジャーバージョンアップ（X+1.0）
```

**重要**: req/specの内容を変更したら必ず `reqord version` を実行すること。`--summary` で変更概要をversionHistoryに記録する。

---

## コンテキスト読み込み手順

reqordデータを読み込む際の手順:

### Step 1: context.yaml読み取り

```bash
reqord context show --json
```

または直接Readツールで `.reqord/context/context.yaml` を読み取り、`files`フィールドから参照先を特定する。

### Step 2: 参照ファイルの読み取り

context.yamlの`files`フィールドが参照するファイルをReadツールで読み取る:

- `files.product.path` → product.yaml
- `files.technical.structured` → technical.yaml
- `files.technical.narrative` → technical-narrative.md
- `files.structure.structured` → structure.yaml
- `files.structure.narrative` → structure-diagram.md
- `files.domain` → 配列内の各ファイル

パスはすべて `.reqord/` ディレクトリからの相対パス。

### Step 3: 対象req/specの読み取り

- requirement: `.reqord/requirements/<req-id>.yaml` + `<req-id>/description.md`
- specification: `.reqord/specifications/<spec-id>.yaml` + `design.md`

### 読み込み優先順位（トークン節約時）

コンテキストウィンドウの制約がある場合、以下の優先順位で読み込む:

1. **対象req/spec**（必須）- YAML + description.md/design.md
2. **design.md** - 技術設計書（実装時は必須）
3. **technical.yaml** - 技術スタック・アーキテクチャ
4. **structure.yaml** - コード構造・命名規則
5. **product.yaml** - プロダクトビジョン（設計判断時に参照）
6. **domain/\*.md** - ドメイン知識（関連する場合のみ）
