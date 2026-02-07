# AIエージェント向けCLI最適化

## 概要

Claude Codeのようなagentic AIが、reqord CLIをツールとして利用し、要件の詳細化を行えるようにする。reqord自体にはAI機能を組み込まず、構造化された入出力とバリデーション機能を提供することで、任意のAIエージェントとの連携を可能にする。

## ユーザーストーリー

AIエージェント（Claude Code等）を利用する開発者として、AIエージェントがreqord CLIを使って要件を詳細化できるようにしたい。
なぜなら、reqordにAI機能を組み込まずに、任意のAIエージェントで要件品質を向上できるから。

## 設計方針

### 従来の設計（採用しない）

```
reqord req refine <id>
  → reqord内部でClaude APIを呼ぶ
  → reqordがプロンプト管理、トークン最適化を行う
```

### 新しい設計（採用）

```
AIエージェント（Claude Code等）
  → reqord req show <id> --json で要件を読み取り
  → reqord context show --json でプロジェクトコンテキストを読み取り
  → reqord req list --json で全要件取得（依存関係分析用）
  → reqord req validate <id> --json で品質チェック
  → パッチJSON作成 → reqord req update <id> --patch-file /tmp/patch.json --json で更新
  → エージェント自身のhuman-in-the-loopで承認
```

### この設計の利点

- **責務の分離**: reqordはデータ管理とバリデーションに専念。AI処理はエージェント側の責務
- **ツール非依存**: Claude Code、Cursor、Copilot等、任意のAIエージェントで利用可能
- **低複雑度**: Anthropic SDK、APIキー管理、プロンプト管理、トークン最適化が不要
- **進化に追従**: AIモデルの進化に合わせてreqord自体を変更する必要がない

## 機能仕様

### 1. 構造化JSON出力（--json）

既存コマンドに `--json` オプションを追加し、AIエージェントが解析しやすい形式で出力する。

```bash
# 要件データの構造化出力
reqord req show req-000001 --json
# → { "id": "req-000001", "title": "...", ... }

# 要件一覧の構造化出力
reqord req list --json
# → [{ "id": "req-000001", ... }, { "id": "req-000002", ... }]

# ProjectContextの構造化出力（実データ含む）
reqord context show --json
# → { "context": {...}, "product": {...}, "technical": {...}, "structure": {...}, "domainFiles": [...] }
```

デフォルト出力（人間向けテーブル表示）は変更しない。

### 2. 品質バリデーションコマンド

要件の品質基準チェックを行い、結果を構造化データで返す。AIが呼んでも、人間がコマンドで呼んでもよい。

```bash
reqord req validate req-000001 --json
# → {
#     "id": "req-000001",
#     "valid": true/false,
#     "issues": [
#       { "type": "ambiguous", "severity": "warning", "field": "description", "message": "...", "suggestion": "..." }
#     ],
#     "smartScore": { "specific": 0.6, "measurable": 0.4, "achievable": 1.0, "relevant": 1.0, "timeBound": 0.8, "overall": 0.76 },
#     "metadata": { "criteriaCount": 2, "hasDescription": true, "hasDependencyIssues": false, "validatedAt": "..." }
#   }
```

チェック項目:
- 曖昧な表現の検出（「適切に」「なるべく」「等」など）
- SMART基準の充足度スコア
- 成功基準の数チェック（0件=エラー、3未満/7超=警告）
- 依存関係の整合性（存在しないIDの参照検出）
- 循環依存検出
- 複雑度と見積もり時間の整合性チェック

終了コード: valid=0, invalid=1（AIエージェントが結果を判定可能）

### 3. 全フィールド一括更新（--patch-file）

AIエージェントが分析結果を効率的に反映できるよう、`--patch-file` オプションで一括更新をサポートする。

```bash
# パッチJSONの作成
cat > /tmp/patch.json <<'EOF'
{
  "title": "改善されたタイトル",
  "successCriteria": ["基準1", "基準2", "基準3"],
  "format": {
    "type": "ears",
    "ears": { "type": "event-driven", "trigger": "ユーザーがボタンをクリック", "action": "処理を実行する" }
  },
  "dependencies": {
    "blockedBy": ["req-000001"],
    "blocks": [],
    "relatedTo": ["req-000003"]
  },
  "estimatedComplexity": "medium",
  "estimatedHours": 16
}
EOF

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

### 4. Claude Code用スラッシュコマンド

`.claude/commands/reqord/refine.md` として、要件詳細化ワークフローを定義する。

このコマンドはClaude Codeのコンテキストで実行され、以下を行う:
1. `reqord req show <id> --json` で対象要件を読み取り
2. `reqord context show --json` でProjectContextを読み取り
3. `reqord req list --json` で他要件一覧を読み取り（依存関係分析用）
4. `reqord req validate <id> --json` で品質チェック
5. domain/requirements-engineering.mdの品質基準を参照して分析
6. 詳細化案を生成し、ユーザーに提示
7. 承認後、パッチJSON作成 → `reqord req update --patch-file` で反映
8. 必要に応じて `--description-file` でdescription.md更新
9. 再バリデーションで改善確認

## 技術的制約

- reqord自体にはAI SDK依存を追加しない
- `--json` の出力はstdoutに出力し、パイプやリダイレクトで使えること
- エラー出力はstderrに出力すること（stdout/stderrの分離）
- 終了コードで成否を判別可能にすること（0: 成功、1: エラー）
- バリデーションコマンドはオフライン（AI不要）で動作すること
