# Reqord CLI コマンド一覧

reqord CLIが提供する（または提供予定の）コマンドの一覧です。

> 🔴 **未実装** = まだコードが存在しないコマンド

## init

```bash
reqord init
```

`.reqord/` ディレクトリ構造を初期化します。`context/`, `requirements/`, `specifications/`, `settings/templates/` を作成します。

## context（プロジェクトコンテキスト）

| コマンド | 説明 | 状態 |
|---------|------|------|
| `reqord context init` | プロジェクトコンテキストを初期化（名前・言語設定） | 実装済み |
| `reqord context show` | プロジェクトコンテキストのサマリーを表示 | 実装済み |
| `reqord context update` | コンテキストメタデータを更新（name, version, JSON patch） | 実装済み |
| `reqord context export <req-id>` | 要件に関連するコンテキストを統合出力（markdown/JSON） | 🔴 未実装 |

- 保存先: `.reqord/context/`
- 管理対象: product.json, technical.json, structure.json

### context export（未実装）

**出典**: req-000020「コンテキスト統合出力」(approved)

ProjectContext + Requirement + Specificationを結合し、外部ツール向けに統合出力する。

- `--full` / `--compact` で出力量を制御
- `--format markdown` / `--format json` で出力形式を選択
- パイプで外部ツールに渡す用途を想定

## req（要件管理）

| コマンド | 説明 | 状態 |
|---------|------|------|
| `reqord req create` | 新規要件を作成（user-story / ears / free-form形式） | 実装済み |
| `reqord req list` | 要件一覧を表示（priority・statusフィルタ対応） | 実装済み |
| `reqord req show <id>` | 要件の詳細を表示（JSON出力対応） | 実装済み |
| `reqord req update <id>` | 要件メタデータを更新（title, status, priority, --major/--minor/--patch） | 実装済み |
| `reqord req delete <id>` | 要件を削除（確認プロンプト付き） | 実装済み |
| `reqord req validate <id>` | 要件の品質をSMARTスコアリングで検証 | 実装済み |
| `reqord req history <id>` | 要件のバージョン履歴を表示 | 実装済み |
| `reqord req approve <id>` | 要件の承認PRを作成（GitHub PR連携） | 🔴 未実装 |

- 要件ID形式: `req-NNNNNN`（6桁ゼロ埋め）
- 保存先: `.reqord/requirements/`

### req history

**出典**: req-000005「Requirementバージョン管理」(approved)

要件のバージョン履歴をテーブル形式で表示する。バージョン番号、ステータス、日時、サマリーを確認できる。

- `--json` フラグでJSON出力に対応
- `reqord req update` で `--major` / `--minor` / `--patch` フラグによるバージョン上書きに対応

### req approve（未実装）

**出典**: req-000011「Requirement承認フロー (GitHub PR連携)」(draft)

要件の承認用GitHub PRを作成する。

- ステータスを `pending_approval` に変更し、マージで `approved` に遷移
- `reqord/req-<id>-approve-v<version>` ブランチを作成
- CODEOWNERSからレビュアーを自動アサイン
- 承認メタデータ（version, phase, prNumber, approvedBy, approvedAt）を記録

## spec（仕様管理）

| コマンド | 説明 | 状態 |
|---------|------|------|
| `reqord spec create <req-id>` | 指定要件に対する仕様を新規作成 | 実装済み |
| `reqord spec list` | 仕様一覧を表示（status・要件IDフィルタ対応） | 実装済み |
| `reqord spec show <id>` | 仕様の詳細を表示（JSON出力対応） | 実装済み |
| `reqord spec design <id>` | 仕様の設計ドキュメントを表示・更新 | 実装済み |
| `reqord spec validate <id>` | 仕様の設計検証（アーキテクチャ整合性、命名規則） | 🔴 未実装 |
| `reqord spec coverage <id>` | 要件カバレッジ状況を表示 | 🔴 未実装 |
| `reqord spec approve <id>` | 仕様の承認PRを作成（GitHub PR連携） | 🔴 未実装 |

- 保存先: `.reqord/specifications/`

### spec validate（未実装）

**出典**: req-000014「設計検証・要件カバレッジ」(draft)

仕様のアーキテクチャ整合性と命名規則を検証する。

- 検証結果を `designValidation` としてSpecification JSONに保存
- `--json` 出力対応

### spec coverage（未実装）

**出典**: req-000014「設計検証・要件カバレッジ」(draft)

要件の各成功基準がSpecificationのどのセクションでカバーされているかを表示する。

### spec approve（未実装）

**出典**: req-000015「Specification承認フロー」(draft)

仕様の承認用GitHub PRを作成する。

- 親Requirementが `approved` であることを事前検証
- `reqord/spec-<id>-approve-v<version>` ブランチを作成
- CODEOWNERSからレビュアーを自動アサイン

## feedback（フィードバック管理）

| コマンド | 説明 | 状態 |
|---------|------|------|
| `reqord feedback list` | フィードバック一覧を表示（state・typeフィルタ対応） | 実装済み |
| `reqord feedback show <id>` | フィードバック詳細を表示（GitHub issue + index.json） | 実装済み |
| `reqord feedback close <id>` | フィードバックをクローズ（GitHub issue連動） | 実装済み |
| `reqord feedback link <id>` | フィードバックを要件・仕様にリンク（type・severity指定） | 実装済み |
| `reqord feedback sync` | GitHub issuesとindex.jsonの双方向同期 | 実装済み |

- 保存先: `.reqord/feedback/index.json`
- GitHub連携: `feedback` ラベル付きissueと同期

## impact（影響範囲分析）🔴 未実装

**出典**: req-000012「影響範囲分析」(draft)

| コマンド | 説明 | 状態 |
|---------|------|------|
| `reqord impact analyze <id>` | 要件変更時の影響範囲を表示（Specification, Issue, Requirement） | 🔴 未実装 |
| `reqord impact notify <id>` | 影響範囲のステークホルダーに通知（Issue/PRコメント） | 🔴 未実装 |

- 要件更新時に `impact` フィールドを自動計算
- `--dry-run` / `--json` オプション対応

## issue（GitHub Issue生成・管理）🔴 未実装

**出典**: req-000016「GitHub Issue生成・管理」(draft)

| コマンド | 説明 | 状態 |
|---------|------|------|
| `reqord issue create <spec-id>` | 構造化タスクファイルからGitHub Issueを一括生成 | 🔴 未実装 |
| `reqord issue sync <spec-id>` | Issue状態をSpecification JSONに同期 | 🔴 未実装 |
| `reqord issue sync-all` | 全SpecificationのIssue状態を同期 | 🔴 未実装 |
| `reqord issue validate <spec-id>` | Issueメタデータの整合性チェック | 🔴 未実装 |

- `--tasks-file <path>` でタスク定義JSONを指定
- Reqordメタデータをラベル・コメントとして埋め込み
- `--dry-run` / `--json` オプション対応

## validate（実装検証）🔴 未実装

**出典**: req-000018「実装検証」(draft)

| コマンド | 説明 | 状態 |
|---------|------|------|
| `reqord validate impl <spec-id>` | 仕様に対する実装完了度を検証 | 🔴 未実装 |

- Issue完了状況のチェック
- コンポーネントファイルの存在確認
- テストカバレッジの検証
- `--json` / `--strict` オプション対応

## status（ステータス表示）🔴 未実装

**出典**: req-000019「ステータス表示コマンド」(approved)

| コマンド | 説明 | 状態 |
|---------|------|------|
| `reqord status` | プロジェクト全体のダッシュボード表示 | 🔴 未実装 |
| `reqord status <req-id>` | Requirement単位のステータス表示 | 🔴 未実装 |
| `reqord status <spec-id>` | Specification単位のステータス表示 | 🔴 未実装 |

- プログレスバーとメトリクス表示
- Req/Spec間のステータス不整合を警告
- `--json` / `--quiet` / `--check` オプション対応

## preview（Web UI）🔴 未実装

**出典**: req-000022「Web UI拡張 (Dashboard・依存グラフ・Gantt Chart)」(approved)

| コマンド | 説明 | 状態 |
|---------|------|------|
| `reqord preview` | Web UIの開発サーバーを起動（localhost:3000） | 🔴 未実装 |

- ダッシュボード（プロジェクトヘルスメトリクス）
- インタラクティブ依存グラフ（Mermaid.js）
- Gantt Chart（Recharts）
- Specification詳細ビュー（Research/Design/Coverage/Issues/Historyタブ）
