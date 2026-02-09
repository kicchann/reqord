# 構造化出力・バッチ更新

## 概要

reqord CLIの全操作を構造化データ（JSON）で行えるようにし、外部ツール（AIエージェント、CI、スクリプト等）からの操作を可能にする。加えて、ルールベースのバリデーション機能を提供する。

> **v1.1.0変更点**: タイトルを「AIエージェント向けCLI最適化」から変更。AI固有の機能（SMARTスコアリング、Claude Codeスラッシュコマンド）を削除し、データ管理・バリデーションに集中（Feedback #17）。

## ユーザーストーリー

外部ツール連携を行う開発者として、reqord CLIの全操作を構造化データで行えるようにしたい。
なぜなら、AIエージェント・CI・スクリプト等の外部ツールからreqordを操作できるから。

## 設計方針

### reqordの責務（本要件のスコープ）

- 構造化JSON入出力（`--json`フラグ）
- バッチ更新（`--patch-file`, `--description-file`）
- ルールベースのバリデーション（依存関係整合性、循環依存、曖昧表現検出等）

### Claude Codeエコシステムの責務（スコープ外）

- AI駆動の要件詳細化（`/reqord:refine`コマンド）
- SMARTスコアリング
- 自然言語による品質分析

## 機能仕様

### 1. 構造化JSON出力（--json）

既存コマンドに `--json` オプションを追加し、外部ツールが解析しやすい形式で出力する。

```bash
# 要件データの構造化出力
reqord req show req-000001 --json
# → { "id": "req-000001", "title": "...", ... }

# 要件一覧の構造化出力
reqord req list --json
# → [{ "id": "req-000001", ... }, { "id": "req-000002", ... }]

# ProjectContextの構造化出力（実データ含む）
reqord context show --json
# → { "context": {...}, "product": {...}, "technical": {...}, "structure": {...} }
```

デフォルト出力（人間向けテーブル表示）は変更しない。

### 2. ルールベース品質バリデーションコマンド

要件のルールベース品質チェックを行い、結果を構造化データで返す。AI不要でオフライン動作する。

```bash
reqord req validate req-000001 --json
# → {
#     "id": "req-000001",
#     "valid": true/false,
#     "issues": [
#       { "type": "ambiguous", "severity": "warning", "field": "description", "message": "...", "suggestion": "..." }
#     ],
#     "metadata": { "criteriaCount": 2, "hasDescription": true, "hasDependencyIssues": false, "validatedAt": "..." }
#   }
```

チェック項目:
- 曖昧な表現の検出（「適切に」「なるべく」「等」など）
- 成功基準の数チェック（0件=エラー、3未満/7超=警告）
- 依存関係の整合性（存在しないIDの参照検出）
- 循環依存検出
- 複雑度と見積もり時間の整合性チェック

終了コード: valid=0, invalid=1（外部ツールが結果を判定可能）

### 3. 全フィールド一括更新（--patch-file）

外部ツールが分析結果を効率的に反映できるよう、`--patch-file` オプションで一括更新をサポートする。

```bash
# パッチ適用
reqord req update req-000002 --patch-file /tmp/patch.json --json

# description.mdの更新
reqord req update req-000001 --description-file ./new-desc.md --json
```

マージルール:
- トップレベルフィールド: パッチの値で上書き
- `successCriteria`: パッチの配列で全置換
- `dependencies`: パッチの値で全置換
- `format`: パッチの値で全置換
- `--patch-file` と `--title` 等が同時指定された場合、個別フラグが優先
- Zodバリデーション通過後に保存。失敗時は構造化エラーをstderrに出力

## 技術的制約

- reqord自体にはAI SDK依存を追加しない
- `--json` の出力はstdoutに出力し、パイプやリダイレクトで使えること
- エラー出力はstderrに出力すること（stdout/stderrの分離）
- 終了コードで成否を判別可能にすること（0: 成功、1: エラー）
- バリデーションコマンドはオフライン（AI不要）で動作すること
