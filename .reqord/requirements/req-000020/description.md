# LLMコンテキスト出力

## 概要

Requirementに関連する全情報（ProjectContext、Requirement詳細、Specification、Gap Analysis結果）を統合し、LLMツール（Claude Code等）に渡せる構造化テキストとして出力する機能。

## ユーザーストーリー

AI駆動開発者として、要件に関連する全情報をLLMに渡せる形式で出力したい。
なぜなら、AIツールに正確なコンテキストを提供して高品質な出力を得られるから。

## CLIコマンド仕様

### reqord context \<req-id\>

指定Requirementに関連する全コンテキストを統合出力:

1. **ProjectContext** (product.md, technical.md, structure.md の要約)
2. **Requirement詳細** (JSON + description.md)
3. **Gap Analysis結果** (存在する場合)
4. **関連Specification** (存在する場合、design.md含む)
5. **依存Requirement** (blockedBy, blocks の概要)

出力形式:
```
# Project Context
[product.mdの要約]
[technical.mdの要約]

# Requirement: req-001 - IFCエクスポート機能
[description.mdの全文]

## Success Criteria
- IFC4形式で出力される
- ...

## Gap Analysis
[gapAnalysis結果のサマリー]

# Related Specification: spec-001
[design.mdの要約]
```

使用例:
```bash
reqord context req-001 | claude code
reqord context req-001 | pbcopy  # クリップボードにコピー
```

## オプション

- `--full` : 全情報を省略なしで出力
- `--compact` : トークン節約のため最小限の情報のみ
- `--format markdown` : Markdown形式（デフォルト）
- `--format json` : JSON形式

## 技術的制約

- 出力サイズの目安: compact=2000トークン程度、full=10000トークン程度
- Specification/Gap Analysis が未作成の場合はスキップ
- stdoutに出力（パイプ対応）
