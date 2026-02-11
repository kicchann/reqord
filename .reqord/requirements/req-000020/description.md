# コンテキスト統合出力

## 概要

Requirementに関連する全情報（ProjectContext、Requirement詳細、Specification）を統合し、外部ツールに渡せる構造化テキストとして出力する機能。

> **v1.1.0変更点**: タイトルを「LLMコンテキスト出力」から変更。LLM特化の表現を汎用化し、トークン最適化はClaude Code側の責務に。Gap Analysis統合を削除（req-000017 deprecated）。Feedback #17 参照。

## ユーザーストーリー

開発者として、要件に関連する全情報を統合して出力したい。
なぜなら、外部ツール（AIエージェント・レビューツール等）に正確なコンテキストを提供できるから。

## CLIコマンド仕様

### reqord context export \<req-id\>

指定Requirementに関連する全コンテキストを統合出力:

1. **ProjectContext** (product.yaml, technical.yaml, structure.yaml の要約)
2. **Requirement詳細** (YAML + description.md)
3. **関連Specification** (存在する場合、design.md含む)
4. **依存Requirement** (blockedBy, blocks の概要)

出力形式:
```
# Project Context
[product.yamlの要約]
[technical.yamlの要約]

# Requirement: req-001 - タイトル
[description.mdの全文]

## Success Criteria
- 基準1
- ...

# Related Specification: spec-001
[design.mdの要約]
```

使用例:
```bash
reqord context export req-001 | pbcopy       # クリップボードにコピー
reqord context export req-001 --format json  # JSON形式で出力
```

## オプション

- `--full` : 全情報を省略なしで出力
- `--compact` : 最小限の情報のみ（デフォルト）
- `--format markdown` : Markdown形式（デフォルト）
- `--format json` : JSON形式

## 技術的制約

- Specification が未作成の場合はスキップ
- stdoutに出力（パイプ対応）
- reqord自体にはAI SDK依存を追加しない
