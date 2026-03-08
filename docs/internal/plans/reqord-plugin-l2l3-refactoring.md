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
7. **SKILL.mdはルーティング+リファレンス表に絞る** — 詳細手順はresources/に分離し、必要時に読み込む
8. **CLIなしのフォールバックは行わない** — CLIが見つからない場合はインストールを案内する
9. **並列実行可能な箇所は明示する** — 「並列で実行」と記載してパフォーマンスを最適化

### スキル設計パターン

```
skills/<name>/
├── SKILL.md                # フロントマター + Scope + 引数解析 + リファレンス表 + エラーハンドリング
└── resources/
    ├── <subcommand-1>.md   # サブコマンドの詳細手順
    └── <subcommand-2>.md   # サブコマンドの詳細手順
```

### フロントマター方針

| フィールド | 使用基準 |
|-----------|---------|
| `allowed-tools` | 読み取り専用スキルで制限。オーケストレーション系は制限しない |
| `model` | データ集計・表示系は `sonnet`。高度な判断が必要なスキルは指定なし |
| `disable-model-invocation` | 環境変更を伴うスキル（setup）のみ `true` |

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

### Phase 4: verifyスキルのリファクタリング

| 変更 | 内容 |
|------|------|
| スコープ拡張 | spec実装チェック専用 → req/spec/context横断の検証スキルに |
| validate拡張 | `validate <req-id>`, `validate context`, `validate all` を追加 |
| done拡張 | Time to Learning（経過日数表示）、振り返りメモ（オプション）を追加 |
| resources分離 | SKILL.md 551行 → 77行。validate.md / trace.md / done.md / validate-criteria.md に分離 |
| description | バイリンガル重複を解消、日本語1文に統一 |
| Scope追加 | Do: 検証・可視化・完了処理 / Don't: 問題の修正や改善提案 |
| エラーハンドリング | CLI不在時のフォールバック削除 → インストール案内に変更 |

### Phase 5: フロントマター強化

| スキル | 追加フィールド |
|--------|---------------|
| `context/SKILL.md` | `allowed-tools: Read, Glob, Bash(reqord:*)`, `model: sonnet` |
| `status/SKILL.md` | `allowed-tools: Read, Glob, Bash(reqord:*)`, `model: sonnet` |
| `setup/SKILL.md` | `allowed-tools: Read, Glob, Write, Bash(reqord:*), Bash(gh --version), Bash(gh auth status), Bash(git --version)`, `disable-model-invocation: true` |

### Phase 6: refine + design → edit 統合

| 変更 | 内容 |
|------|------|
| `refine/` 削除 | `edit/resources/edit-req.md` に移行 |
| `design/` 削除 | `edit/resources/edit-spec.md` に移行 |
| `edit/` 新規作成 | SKILL.md（ルーティング）+ resources/（edit-req, edit-spec, edit-context） |
| edit-context 新規 | ProjectContext充実化（Explore→改善案→適用） |
| 参照更新 | CLAUDE.md, README.md, TODO.md, setup, dev, verify, context の旧スキル名を `/reqord:edit` に更新 |

### Phase 7: new スキル新設

| 変更 | 内容 |
|------|------|
| `new/` 新規作成 | SKILL.md + resources/（new-req, new-spec） |
| new-req | req作成→description.md記述→approve の一気通貫 |
| new-spec | spec作成→edit specへの誘導（design.md生成） |
| edit→new誘導 | IDが見つからない場合、specが紐づかない場合に `/reqord:new` を案内 |
| new→edit誘導 | 作成完了後に `/reqord:edit` を案内。spec作成後のdesign.md生成は edit を呼び出し |

### Phase 8: dev スキル → brief スキルへの置換

**方針**: devスキルのL3オーケストレーション（explorer→architect→implementer→reviewer）を削除し、L2のコンテキスト提供に特化した `brief` スキルに置き換える。

**理由**:
- devのL2固有部分はStep 0-2のコンテキスト注入のみ（全体の約20%）
- 残り80%はL1エージェントのオーケストレーション（L3の責務）
- reqordはOSS。実装方法の強制はユーザーの選択を制限する
- design.mdがあれば任意のTDDスキル/エージェントで実装可能

**briefスキルの設計**:

```
brief <spec-id>       — spec + req + design.md + SC + feedback + dependencies を一括表示
brief <issue-number>  — issueに紐づくspec/req + design.md + task状況
brief <req-id>        — req + 全spec + design.md状況 + feedback
```

- 純粋にL2。reqordデータを読み集めて全体像を提示するのみ
- 実装手段には口出ししない
- `model: sonnet` で十分（データ読み取り・整形のみ）
- `allowed-tools: Read, Glob, Grep, Bash(reqord:*), Bash(gh:*)` 程度

**reqordの価値チェーン（最終形）**:

```
new → edit → brief → [実装はL1/L3] → verify → feedback
```

### その他

- `dev/SKILL.md`, `dev/implement-phase.md`: reqord-implementer参照を汎用化
- `README.md`: エージェント一覧からimplementer削除
- `resources/cli-reference.md`: 新規作成（context本文から移動）

## 未着手

### Phase 9完了: git スキル → context/resources/git-conventions.md への退避

| 変更 | 内容 |
|------|------|
| `git/` 削除 | L3オーケストレーション（git/gh操作）を除去 |
| `context/resources/git-conventions.md` 新規 | L2固有部分（命名規則・テンプレート）のみ抽出 |
| `brief` 更新 | Spec詳細モードの出力にGit操作ガイドを追加 |

### スキル一覧（最終形）

| スキル | 責務 | レイヤー |
|--------|------|---------|
| `setup` | 環境セットアップ・前提条件チェック | L2 |
| `context` | データモデル・CLIルールの共通知識（自動注入） | L2 |
| `status` | 進捗ダッシュボード表示 | L2 |
| `new` | req/specの新規作成 | L2 |
| `edit` | req/spec/contextの編集・改善 | L2 |
| `brief` | spec/req/issueの包括的コンテキスト提供 | L2 |
| `verify` | データ検証・実装確認・完了処理 | L2 |
| `feedback` | フィードバック運用 | L2 |
