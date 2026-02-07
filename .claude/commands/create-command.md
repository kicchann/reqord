---
description: 新しいコマンドファイルのテンプレートを生成する
argument-hint: <command-name>
allowed-tools: Write, AskUserQuestion
model: haiku
---

# 新しいコマンドテンプレート生成

新しいコマンドファイルを正しいフォーマットで作成します。

## 引数

- `$ARGUMENTS`: コマンド名（必須、例: `my-command`）

## 実行手順

### 1. 引数チェック

コマンド名が指定されていない場合はエラーを出力して終了。

### 2. ファイル存在チェック

`.claude/commands/$ARGUMENTS.md` が既に存在する場合は警告し、上書きするか確認。

### 3. AskUserQuestionで設定を収集

以下を確認:
- コマンドの説明（description）
- 引数が必要か（argument-hint）
- 許可ツール（allowed-tools、省略可能）
- 複雑度に応じたモデル選択: haiku（単純）/ sonnet（標準）/ opus（複雑）

### 4. テンプレート生成

以下のフォーマットでファイルを作成:

```markdown
---
description: [収集した説明]
argument-hint: [引数のヒント（必要な場合のみ）]
allowed-tools: [許可ツール（指定された場合のみ）]
model: [選択されたモデル]
---

# [コマンド名]

[説明を展開]

## 実行内容

1. [ステップ1]
2. [ステップ2]
...

## 注意事項

- [必要に応じて追加]
```

**Frontmatter順序規約（厳守）**:
1. description（必須）
2. argument-hint（オプション - 不要なら省略）
3. allowed-tools（オプション - 不要なら省略）
4. model（必須）

### 5. 結果報告

作成したファイルパスと内容のサマリーを表示。

## 例

```
/create-command my-feature
```

→ `.claude/commands/my-feature.md` が作成される
