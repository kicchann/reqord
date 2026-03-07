# reqordプラグイン L2/L3責務見直し — 修正方針と進捗

## 背景

統合分析レポート（`20260307_scaffold-reqord-integration-analysis.md`）セクション9の3層モデル分析で、reqordプラグインにレイヤー違反が検出された。重複と責務の混在を段階的に解消する。

## 修正方針

### 原則

1. **reqordプラグインはL2（プロジェクト固有知識）に集中する** — L1（汎用知識）やL3（オーケストレーション）の責務を持たない
2. **reqordはOSS** — wf等のプライベートプラグインへの直接参照（`/wf:xxx`）を含めない
3. **Scope (Do/Don'ts) を冒頭に配置** — エージェント・スキルが少ないコンテキストで責務境界を判断できるようにする
4. **Don'tsの外部参照は汎用的に** — 「プロジェクトに導入されている〇〇エージェントや関連スキルを併用すること」
5. **descriptionはバイリンガル重複しない** — 日本語1文に統一（毎回トークンに影響）
6. **prescriptiveな推奨を排除** — 事実の表示に徹し、判断はユーザーに委ねる

### スキル固有の方針

- **contextスキル**: 毎回注入されるため最小化が重要。「データモデル」と「CLIルール」に絞り、CLIリファレンスやプロセス指示は `resources/` に移動
- **statusスキル**: データの集計・表示に限定。着手順序の推奨やワークフロー案内を含めない
- **designスキル**: design.mdの生成に集中。コード調査のエージェント委譲指示（L3）はScopeのDon'tsで代替
- **setupスキル**: 環境の事実確認と証憑記録に限定。「次のステップ」推奨を含めない

## 完了済み

### Phase 1: ナレッジスキル削除

| 削除対象 | 行数 |
|---------|------|
| `skills/architecture-principles/` (SKILL.md + 3 resources) | ~626行 |
| `skills/tdd-principles/` (SKILL.md + 4 resources) | ~442行 |
| `skills/review-standards/` (SKILL.md + 2 resources) | ~384行 |

### Phase 2: エージェントスリム化

| エージェント | Before | After | 変更内容 |
|------------|--------|-------|---------|
| `architect.md` | 92行 | 56行 | Scope追加、Clean Architecture詳細をDon'tsに |
| `explorer.md` | 71行 | 44行 | Scope追加、汎用分析プロセスを削除 |
| `implementer.md` | 118行 | 削除 | 実装は汎用tdd-implementerに委譲 |
| `reviewer.md` | 113行 | 64行 | Scope追加、汎用レビュー基準をDon'tsに |

### Phase 3: スキルのL3分離

| スキル | Before | After | 変更内容 |
|--------|--------|-------|---------|
| `context/SKILL.md` | 350行 | 132行 | CLI集→resources移動、トレーサビリティ→git既存、環境要件→setup既存、ワークフロー→スキル一覧に |
| `design/SKILL.md` | 292行 | 139行 | Scope追加、エージェント委譲指示削除、レビュー・検証簡略化 |
| `status/SKILL.md` | 163行 | 117行 | Scope追加、推奨アクション→準備状況サマリー、コマンド一覧削除 |
| `setup/SKILL.md` | 279行 | 261行 | description統一、スキル一覧・次のステップ削除 |

### その他

- `dev/SKILL.md`, `dev/implement-phase.md`: reqord-implementer参照を汎用化
- `README.md`: エージェント一覧からimplementer削除
- `resources/cli-reference.md`: 新規作成（context本文から移動）

## 未着手

### スキルのレビュー（残り5件）

- `dev/SKILL.md` — issueベースのフロー再設計が必要（別課題）
- `git/SKILL.md` — descriptionバイリンガル重複の修正
- `feedback/SKILL.md` — descriptionバイリンガル重複の修正
- `refine/SKILL.md` — descriptionバイリンガル重複の修正
- `verify/SKILL.md` — descriptionバイリンガル重複の修正

### devスキルのフロー再設計

現状: `spec-id → design.md → 実装` のspec起点フロー
課題: 実際の開発ではissueが作業単位。`issue → spec/design.mdをコンテキストとして参照 → 実装` が自然
方針: 別課題として対応
