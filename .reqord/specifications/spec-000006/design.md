# 構造化出力・バッチ更新 - 技術設計書

## 1. 設計概要

reqord CLIをAIエージェント（Claude Code等）がツールとして利用しやすくするための最適化を行う。構造化出力（`--json`）、一括入力（`--patch-file`, `--description-file`）、品質バリデーション（`reqord req validate`）、およびClaude Codeスラッシュコマンド（`.claude/commands/reqord/refine.md`）を提供する。reqord自体にはAI SDKを含めず、外部エージェントがCLIをプロセスとして呼び出す設計とする。

## 2. アーキテクチャ

```
AI Agent (Claude Code等)
    ↓ subprocess呼び出し
reqord CLI
    ├── --json 出力       → stdout: JSON
    ├── --patch-file 入力 → ファイル経由の一括更新
    ├── --description-file → Markdown更新
    ├── req validate      → 品質チェック結果
    └── exit code         → 0: 成功 / 1: エラー

Claude Code統合:
    .claude/commands/reqord/refine.md
        → reqord req show → validate → update のサイクル

バリデーションスタック:
    commands/req/validate.ts
        ↓
    services/validation-service.ts
        ↓
    @reqord/shared
        ├── validation/smart-scoring.ts
        └── validation/ambiguous-phrases.ts
```

エージェントとreqordの間のインターフェースはCLIのstdin/stdout/stderr + exit codeのみ。バイナリプロトコルやAPIサーバーは持たない。

## 3. コンポーネント設計

### 3.1 --json 出力オプション（既存・部分実装済み）

**対象コマンド:** list, show, update, context show, context update, validate

**責務:** 構造化データのstdout出力。

- 人間向け出力をスキップし、`JSON.stringify(data, null, 2)` をstdoutに出力
- エラー時はstderrにメッセージ出力 + exit code 1
- エージェントは `JSON.parse(stdout)` でパース可能

### 3.2 --patch-file オプション（実装済み）

**責務:** JSONファイルによる一括更新。

```bash
# AIエージェントが一時ファイルを生成してCLI呼び出し
reqord req update req-000001 --patch-file /tmp/patch.json
```

- 許可フィールド: title, status, priority, successCriteria, format, dependencies, estimatedComplexity, estimatedHours
- immutableフィールド（id, createdAt, files）は上書き不可
- 個別フラグ（--title等）が--patch-fileより優先

### 3.3 --description-file オプション（実装済み）

**責務:** Markdownファイルによるdescription.md更新。

```bash
reqord req update req-000001 --description-file /tmp/desc.md
```

### 3.4 validateコマンド (`commands/req/validate.ts` - 実装済み)

**責務:** 要件の品質チェックと構造化結果出力。

| チェック項目 | 種別 | 説明 |
|-------------|------|------|
| 曖昧表現検出 | warning | 日本語42表現のマッチング |
| 成功基準チェック | error/warning | 0件→error、1-2件→warning、8件以上→warning |
| 依存関係整合性 | error | 存在しないIDへの参照 |
| 循環依存検出 | error | DFSによる循環検出 |
| 複雑度・時間整合性 | warning | small(1-8h), medium(4-40h)等の範囲チェック |
| SMARTスコア | info | Specific/Measurable/Achievable/Relevant/TimeBound |

**出力形式:**
- 人間向け: 色付きバー表示 + issue一覧
- `--json`: ValidationResult構造体（id, valid, issues[], smartScore, metadata）

### 3.5 Claude Codeスラッシュコマンド (`.claude/commands/reqord/refine.md`)

**責務:** Claude Codeからの要件改善ワークフローガイド。

- `reqord req show <id> --json` で現状取得
- `reqord req validate <id> --json` で品質チェック
- issueに基づき改善案を生成
- `reqord req update <id> --patch-file` で更新適用

## 4. データフロー

### エージェントによる要件改善フロー

```
Claude Code
  → reqord req show req-000001 --json
    → stdout: { id, title, status, ... , description }
  → reqord req validate req-000001 --json
    → stdout: { valid: false, issues: [...], smartScore: {...} }
  → 改善案生成（エージェント内部処理）
  → /tmp/patch.json 生成
  → reqord req update req-000001 --patch-file /tmp/patch.json --description-file /tmp/desc.md
    → stdout: { ...updatedRequirement }
  → reqord req validate req-000001 --json
    → stdout: { valid: true, smartScore: { overall: 0.85 } }
```

### バリデーション内部フロー

```
validateCommand.action(id)
  → validateRequirement(cwd, id)
    → reqRepo.findById(cwd, id) → requirement
    → reqRepo.loadDescription(cwd, id) → description
    → reqRepo.findAll(cwd) → allRequirements（依存関係チェック用）
    → checkAmbiguousPhrases(requirement, description, language, issues)
    → checkSuccessCriteria(requirement, issues)
    → checkDependencies(requirement, allRequirements, issues)
    → checkCircularDependencies(requirement, allRequirements, issues)
    → checkComplexityHoursConsistency(requirement, issues)
    → calculateSmartScore({ requirement, description, language })
  → ValidationResult構築 → 出力
```

## 5. テスト方針

### ユニットテスト

- **validation-service**: 各チェック関数の個別テスト（曖昧表現、成功基準、依存関係、循環依存、複雑度整合性）
- **smart-scoring**: SMARTスコア算出の境界値テスト（0%/50%/100%スコア）
- **--json出力**: JSON.parseが成功すること、必要なフィールドが含まれること

### 統合テスト

- 要件作成 → validate → 不合格 → 改善 → validate → 合格 の一連フロー
- 循環依存の検出（A→B→C→Aパターン）
- --patch-file + --description-file の同時指定

### エージェント互換性テスト

- exit code: valid=true→0、valid=false→1
- stdoutがJSON.parseableであること
- stderrにのみエラーメッセージが出力されること

## 6. 技術的決定事項

### AI SDKを含めない設計

**決定:** reqord自体にはAI SDKを含めず、CLIインターフェースのみ提供
**理由:** AI SDKのバージョン管理やAPI Key管理の複雑さを回避。エージェントごとに異なるLLMを使用可能。reqordは「ツール」として純粋な要件管理機能のみに集中する。

### CLIプロセス呼び出しによる統合

**決定:** エージェントはreqordをサブプロセスとして呼び出す
**理由:** 言語・フレームワーク非依存。stdin/stdout/stderrという普遍的なインターフェースにより、どのAIエージェントからも利用可能。HTTPサーバー等の起動が不要。

### スコアリングのルールベース実装

**決定:** SMARTスコアリングをAIではなくルールベースで実装
**理由:** オフライン動作、決定論的な結果、API制限なし。AIによる高度な評価は外部エージェント側の責務とする。
