# スキャフォールド x reqordプラグイン 統合分析レポート

- 日付: 2026-03-07
- 参加エージェント: スクラムエキスパート(v1,v2), プラグマティスト(v1,v2), 重複分析, Hooks設計, アーキテクチャ分析, レイヤー純粋主義者, プロダクトデザイナー, 依存関係アナリスト
- 分析対象: claude-code-scaffold, reqordプラグイン(0.1.0), wfプラグイン, feature-devプラグイン

## 背景

「エージェンティック・スクラム」の理論を「1人+Claude Code」の現実的な開発体制に落とし込むスキャフォールドが提案された。本レポートでは、このスキャフォールドとreqordプラグインの関係を多角的に分析し、統合方針を策定する。

### 分析対象のスキャフォールド構成

- **Skills**: spec-writer, plan-sprint, retro-analyze, review-pr
- **Agents**: implementer (Sonnet, TDD, acceptEdits), reviewer (Sonnet, plan mode)
- **Hooks**: pre-bash-guard, pre-edit-protect, post-edit-quality, on-session-start, on-stop-progress
- **設計思想**: 人間(Opus) -> implementer(Sonnet) -> reviewer(Sonnet) の3層

### 参照フレームワーク

- スクラムガイド 2020 (Schwaber & Sutherland)
- Scrum Guide Expansion Pack 2025 (Jocham, Coleman, Sutherland)
- scrum.org「Agile AI Agents」記事 (Stefan Wolpers)

## 前提の修正（議論中に発覚）

初回分析で2つの重大な前提誤りがあり、修正された。

1. **764コミット = ドッグフーディング実績**: reqord自体の開発コミットであり、「一般ユーザーが任意のプロジェクトで使う場合」の有効性証拠にはならない
2. **reqordプラグインのスコープ**: reqord自体の開発用ではなく、**任意のプロジェクト**でreqord CLIを使ったAI開発を支援する汎用プラグイン

---

## 1. 機能重複マッピング

| Scaffold コンポーネント | 既存の対応物 | 重複度 | 判定 |
|---|---|---|---|
| **Skills** | | | |
| spec-writer | reqord:`design` + reqord:`refine` | 高 | 既存を使う（設計思想が根本的に異なる） |
| plan-sprint | reqord:`dev plan` + `task create` | 高 | 既存でカバー済み |
| retro | wf:`docs/retro` (部分) | 低 | verify拡張として軽量導入 |
| review-pr | wf:`review/pr` + reqord:`review-standards` | 高 | 既存を使う |
| **Agents** | | | |
| implementer | reqord:`reqord-implementer` | 完全一致 | 既存を使う |
| reviewer | reqord:`reqord-reviewer` | 完全一致 | 既存を使う |
| **Hooks** | | | |
| pre-bash-guard | settings.json deny リスト | 中 | settings.json + CLIバリデーションで対応済み |
| pre-edit-protect | CLIバリデーション | 中 | CLIバリデーション + settings.json denyで対応 |
| post-edit-quality | wf:`format-code` (部分) | 中 | reqord責務外。wfまたはプロジェクト設定 |
| on-session-start | なし | 新規 | reqordプラグインのhookとして価値あり |
| on-stop-progress | なし | 新規 | 不要。CLAUDE.md指示で十分 |

## 2. スクラムイベントとの対応分析

| スクラムイベント | reqordでの対応 | カバレッジ |
|---|---|---|
| Sprint | タイムボックスの仕組みは不在。spec単位のフロー型 | 未カバー |
| Sprint Planning | `/reqord:status` + `/reqord:edit` + `/reqord:brief` | 部分カバー（Howはあり、Whatの選択が弱い） |
| Daily Scrum | 1人体制では不要 | N/A |
| Sprint Review | `/reqord:verify` + `/reqord:status` | 部分カバー（外部フィードバック導線が弱い） |
| Sprint Retrospective | wf:`docs/retro` のみ | 部分カバー |

### アーティファクト充足度

| アーティファクト | reqordでの実現 | 充足度 |
|---|---|---|
| Product Backlog / Product Goal | `.reqord/context/product.yaml` + `.reqord/requirements/` | 十分 |
| Sprint Backlog / Sprint Goal | 明示的なSprintの概念が不在 | ギャップあり |
| Increment / DoD | spec単位のSuccess Criteria + テスト + レビュー | 十分 |
| DoOD (EP2025) | 未実装 | ギャップあり |

## 3. Expansion Pack 2025 との照合

### 「1人+AI」体制は「スクラムではない」

スクラムガイド2020は3-9人のチームを前提としており、1人体制はこの前提を満たさない。ただし、経験主義・インクリメンタル開発・透明性は1人でも有効。この体制は **「カンバン + スクラムの検査・適応メカニズム」のハイブリッド** として捉えるのが正確。

### EP2025概念の適用方針

| EP2025概念 | 適用方法 | スキーマ変更 |
|---|---|---|
| AI as Product Developer | **既に実現**。4エージェント + Human-in-the-loop | 不要 |
| Product Strategy | `product.yaml` の vision/valueProposition | 不要 |
| Sprint Goal as Hypothesis | designスキルに「検証したい仮説」の推奨を追加 | 不要 |
| DoOD | successCriteriaのレベル分けガイド(技術的/機能的/成果的) | 不要 |
| Dual-Track | statusスキルの表示を「設計待ち/実装待ち」に分離 | 不要 |
| Time to Learning | verify doneでcreatedAt -> implementedの日数を表示 | 不要 |
| Supporters | N/A（1人体制） | — |

**重要原則**: すべてスキーマ変更なし・ガイドライン拡張で実現。スクラム用語はユーザーに見せず、平易な言葉に置き換える。

## 4. プラグインの責務境界

### reqordプラグインが「知っているべきこと」

- reqordのデータモデル・CLI操作パターン
- 要件ライフサイクルのワークフロー
- Success Criteriaの検証方法
- セッション間のコンテキスト引き継ぎ方

### reqordプラグインが「知る必要がないこと」

- プロジェクト固有のlint/format設定
- Sprintの期間やタイムボックス（opt-inとして将来検討）
- チームのScrum運用ルール
- IDE固有の設定

### 結論

- **reqordプラグインの責務**: 要件ライフサイクル管理 + AIセッション間のコンテキスト継続性
- **wfプラグイン/プロジェクト設定に任せるべき**: post-edit-quality, pre-bash-guard, ファイル保護
- **CLIの機能拡張として将来検討**: iterationオプション

## 5. エージェント間の対立点と調停

### retro スキル

- **スクラムE**: 新スキルとして実装すべき
- **プラグマティスト**: 学習曲線に見合わない
- **調停**: verify doneの拡張として軽量導入。独立スキルにせず、完了時にオプション振り返りレポートを出力。学習コストゼロ。データが溜まれば将来独立化

### Sprint タイムボックス

- **スクラムE**: ProjectSettingsのopt-inオプション + iteration.md
- **プラグマティスト**: philosophy.mdに反する
- **調停**: opt-inアプローチは筋が良いが今ではない。TODO.md High Priority課題（ブートストラップ、セッション継続性）を先に解決

### Dual-Track 表示

- **スクラムE**: statusスキルにDiscovery/Delivery 2セクション表示
- **プラグマティスト**: 既存で十分
- **調停**: 採用するが「Dual-Track」とは呼ばない。「設計待ち/実装待ち」として表示

### on-session-start hook

- **スクラムE**: CLIの既存機能で対応
- **プラグマティスト**: reqordプラグインに含める価値あり
- **調停**: プラグマティストが正しい。reqord固有データの読み取りが必要なため、reqordプラグインのhookとして実装

## 6. 「ドッグフーディングの罠」への対策

ツール作者だから回避できていた問題が、一般ユーザーでは顕在化する箇所:

| 作者が暗黙に知っていること | 一般ユーザーが直面する問題 | 対策 |
|---|---|---|
| CLIコマンドの正しい順序 | `reqord req create` の前に `reqord init` が必要 | setupスキルにワークフロー導線追加 |
| description.md の書き方 | 何をどの程度書けばいいかわからない | refineスキルにテンプレート生成追加 |
| YAML直接編集が禁止であること | つい直接編集してしまう | contextスキルの冒頭警告 + setupの初回案内 |
| セッション間の文脈引き継ぎ | 新セッションで「何をしていたか」がわからない | on-session-start hookで自動注入 |

## 7. 最終実装計画

### Phase 1: スキルMarkdown変更のみ（スキーマ変更なし）

| # | 施策 | 実装箇所 | 工数 |
|---|---|---|---|
| 1 | refine resources に successCriteria レベル分けガイド追加 | `refine/resources/quality-framework.md` | 小 |
| 2 | status スキルの表示を「設計待ち / 実装待ち」2セクションに | `status/SKILL.md` | 小 |
| 3 | verify done に Time to Learning (日数) 表示を追加 | `verify/SKILL.md` | 小 |
| 4 | verify done にオプション振り返りレポート出力を追加 | `verify/SKILL.md` | 小 |
| 5 | design スキルに「検証したい仮説」の推奨を追加 | `design/SKILL.md` | 小 |

### Phase 2: reqordプラグインのhook追加

| # | 施策 | 実装箇所 | 工数 |
|---|---|---|---|
| 6 | on-session-start hook: 作業中spec, 未解決feedback数, git branch | `hooks/` + `hooks.json` | 中 |

### Phase 3: TODO.md High Priority解決後

| # | 施策 | 実装箇所 | 工数 |
|---|---|---|---|
| 7 | iteration.md ベースの軽量サイクル管理（opt-in） | ProjectSettings + context | 中 |
| 8 | retro スキルの独立化（verify拡張から昇格） | `skills/retro/SKILL.md` | 中 |

### やらないもの

| 施策 | 理由 |
|---|---|
| scaffold独立プラグイン化 | reqordと機能重複。汎用ツールとして吸収 |
| implementer/reviewer エージェント重複定義 | reqord版が特化済み |
| plan-sprint スキル新設 | `dev plan` + `task create` でカバー済み |
| post-edit-quality hook | reqord責務外 |
| pre-bash-guard / pre-edit-protect hook | settings.json deny + CLIバリデーションで対応 |
| Zodスキーマへの outcomeCriteria / iteration 追加 | ガイドライン拡張で十分。スキーマの簡潔さ維持 |
| Sprint Review 外部化 | Local-First原則に反する |
| トークン予算概算 | 精度が出ない |

## 8. 設計原則のまとめ

1. **reqordは要件管理に集中する** -- Sprint管理はJira/Asanaの領域（philosophy.md）
2. **スクラム用語を使わない** -- 「Sprint Goal」ではなく「今回の目標」、「DoOD」ではなく「成功基準のレベル」
3. **すべての追加はopt-in** -- デフォルトは現在の振る舞いと同一
4. **スキーマ変更は最後の手段** -- ガイドライン拡張 > スキル表示変更 > スキーマ変更
5. **ドッグフーディングの罠に注意** -- 一般ユーザーの体験を常に想定する

---

## 9. 3層モデルとL2/L3責務分析（追加分析）

議論の過程で、プラグイン間の関心事を整理する3層モデルが導出された。

### 3層モデルの定義

```
依存方向: L3 -> L2 -> L1（逆方向は禁止）

L1 (wf): 汎用ワークフロー
  - 任意のプロジェクトで使える道具箱
  - git操作、PRレビュー、lint/test、コード品質
  - Clean Architecture / TDD / レビュー原則などの汎用ナレッジ
  - 前提条件なし

L2 (reqord): 要件管理
  - 「何を作るか」を構造化管理
  - reqord CLIを前提に、要件のライフサイクルを回す
  - L1を参照できるがL3を知らない

L3 (プロセス): 開発サイクル管理
  - 「どう回すか」を決める（Sprint、Retro、仮説設定等）
  - 最もopinionated。チーム/個人の方法論に依存
  - L2, L1を参照できる
```

### L2 (reqord) のレイヤー違反検出

3名のエキスパート（レイヤー純粋主義者、プロダクトデザイナー、依存関係アナリスト）が全員一致で検出した違反:

#### 違反1: L1ナレッジスキルの完全コピー（全員一致: 明確な誤配置）

| reqord (L2) | wf (L1) | 実際の差分 |
|---|---|---|
| `architecture-principles` | `clean-architecture` | 矢印文字のみ (`->` vs `→`) |
| `tdd-principles` | `good-test-principles` | 同上 |
| `review-standards` | `code-review-guideline` | 相互参照先の名前のみ |

- resources/配下の約15ファイルも実質同一
- reqordのデータモデルを一切参照していない
- "language-agnostic"と自ら宣言
- **コピーされた理由（推定）**: エージェントの `skills:` 参照がプラグイン内部完結を求められるため

**問題**: reqordを使うためにClean ArchitectureやKhorikhovのテスト理論を「押し付けられる」ように見える。要件管理ツールがテスト哲学を強制する正当性がない。また、L1+L2を同時に使うユーザーは同一内容が二重にコンテキストウィンドウを消費する。

#### 違反2: エージェントの75-85%がwfのコピー

| reqord固有の追加分（15-25%） | wfエージェントと同一の部分（75-85%） |
|---|---|
| design.md入力 | Core Process / TDD Process / Review Responsibilities |
| ProjectContext参照 | Implementation Guidelines |
| Success Criteria対応 | Confidence Scoring 等 |

#### 違反3: L3的な判断の混在

| コンポーネント | L3的な部分 | 理由 |
|---|---|---|
| `status` Step 6 | 着手推奨specの選定、アクション提案 | 「次に何をやるか」はプロセス判断 |
| `dev` Step 3-6 | explorer->architect->implementer->reviewerのオーケストレーション順序 | 「どう回すか」の定義 |
| `dev` Step 7 | 次ステップ案内 | プロセス判断 |
| `context` Section 6 | Phase 0-4の開発ワークフロー定義 | L3の責務 |

ただし `dev` Step 3-6 については、L2コンテキスト（design.md, SC）の注入が各ステップに深く埋め込まれており、分離するとコスト対効果が低い。**全員が現状維持を推奨**。

### L2 が持つべき責務（適正と判定されたもの）

| 責務 | コンポーネント |
|---|---|
| reqordデータモデル・CLIパターン | context, setup |
| 要件品質管理 (SMART, EARS) | refine |
| 技術設計書生成 (design.md) | design |
| 実装のreqordコンテキスト注入 | dev (Step 0-2, 7) |
| 実装検証・トレーサビリティ | verify |
| フィードバック運用 | feedback |
| spec連携Git操作（命名規則, SCチェックリスト） | git |
| 進捗データ集計・表示 | status (Step 1-5) |
| L1エージェントのreqordラッパー（差分のみ） | 4エージェント |

### L2 が持つべきでない責務

| 責務 | 現在の場所 | あるべき場所 | 理由 |
|---|---|---|---|
| Clean Architecture原則 | architecture-principles | L1 (wf) | reqord非依存。wfと完全同一 |
| TDDテスト理論 | tdd-principles | L1 (wf) | 同上 |
| コードレビュー基準 | review-standards | L1 (wf) | 同上 |
| 着手推奨・アクション提案 | status Step 6 | L3 | プロセス判断 |
| 開発ワークフロー定義 | context Section 6 | L2/L3境界 | 要検討 |

### L3 が持つべき責務（将来のプロセスプラグイン候補）

| 責務 | 由来 |
|---|---|
| 着手推奨・優先順位判断 | status Step 6から分離 |
| Sprint/イテレーション管理 | scaffoldのplan-sprint |
| 振り返り・プロセス改善 | scaffoldのretro |
| 開発ワークフロー定義（部分） | context Section 6から分離 |
| 仮説設定・DoODチェック | Expansion Pack 2025 |

### 解消に向けた実装計画

#### Phase 0: クロスプラグイン参照の技術検証（最優先・未着手）

現在のClaude Codeプラグインシステムで `skills: [wf:clean-architecture]` のようなクロスプラグイン参照が可能かを検証する。この結果がPhase 1以降の設計を決定する。

- **可能な場合**: reqordからL1スキルを削除し、wfを参照に変更
- **不可能な場合**: 現状維持 + upstream-tracking（同期管理メカニズム）を追加

#### Phase 1: ナレッジスキルの統合（低リスク・高効果）

クロスプラグイン参照が可能な場合:
- reqordから `architecture-principles`, `tdd-principles`, `review-standards` を削除（3スキル、約15ファイル）
- エージェントの `skills:` 参照をwfのスキルに変更
- plugin.jsonに依存関係を明示

#### Phase 2: エージェントのスリム化（中リスク・中効果）

wfエージェントと同一の部分（75-85%）を削除し、reqord固有の追加指示（15-25%）のみ残す「Thin Wrapper」方式に変更。

#### Phase 3: status Step 6の分離

L3プラグイン設計時に実施。statusは「データ表示」に限定し、「推奨アクション」はL3に移動。

### 重複の定量的規模

| 重複カテゴリ | 概算行数 |
|---|---|
| ナレッジスキル (SKILL.md x 3 + resources約12ファイル) | 約650行 |
| エージェント本文のwf共通部分 (4エージェント) | 約300行 |
| **合計** | **約950行** |

## 10. 次のアクション（コンテキスト枯渇のため次セッションへ）

本セッションでコンテキストが枯渇したため、以下を次セッションで継続する:

1. **Phase 0の実行**: クロスプラグインスキル参照の技術検証
   - エージェントの `skills:` フロントマターで `wf:clean-architecture` のような形式が動作するか
   - 動作しない場合、エージェント本文中の自然言語参照（`> **Reference skill**: /clean-architecture`）で代替可能か
   - plugin.json の `dependencies` フィールドの有無
2. **Phase 0の結果に基づくPhase 1の設計決定**
3. **L3プラグインの要否判断**: status Step 6とcontext Section 6の分離が本当に必要か、それともL2内にオプショナルな機能として残すべきか
