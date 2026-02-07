# GitHub Issue生成・管理

## 概要

承認済みSpecificationをGitHub Issueに分解し、並列実行分析・進捗追跡を行う機能。AI（Claude API）によるタスク分解と、GitHub Issue Templateの適用を含む。

## ユーザーストーリー

開発者として、仕様書からGitHub Issueを自動生成し進捗を追跡したい。
なぜなら、仕様から実装への追跡可能性を維持しつつ効率的にタスク管理できるから。

## CLIコマンド仕様

### reqord issue create \<spec-id\>

1. 対象Specificationが `approved` 状態であることを検証
2. AI（Anthropic SDK）でSpecificationを実装タスクに分解:
   - design.md + research.md + examples/ を入力
   - 分解戦略を適用
3. 並列分析:
   - タスク間の依存関係を検出
   - 並列グループ（P0, P1, P2, ...）に分類
   - クリティカルパスを計算
   - 直列/並列の所要時間を比較
4. GitHub Issue作成:
   - Issue Templateを適用
   - ラベル: `reqord-generated`, `spec:<id>`, `req:<id>`, `P<n>`
   - Reqordメタデータをコメントに埋め込み
5. Specification JSONの `implementation` フィールドを更新

オプション:
- `--strategy by-layer` : レイヤー別分解（デフォルト）
- `--strategy by-feature` : 機能別分解
- `--strategy by-requirement` : 要件別分解
- `--strategy custom` : カスタム分解
- `--dry-run` : Issue作成せずプレビュー

### reqord issue sync \<spec-id\>

- GitHub APIで各Issueの最新状態を取得
- Specification JSONの `implementation.issues[].state` を更新
- `implementation.progress` を再計算

### reqord issue sync-all

- 全Specificationに対して `sync` を実行
- `--quiet` で変更があったもののみ表示

### reqord issue validate \<spec-id\>

- メタデータ整合性チェック:
  - 全Issueが実在するか（GitHub API照合）
  - ラベル・メタデータの不整合検出
  - 依存関係の循環検出

## GitHub Issue Template

`reqord init` 時に `.github/ISSUE_TEMPLATE/reqord-implementation.yml` 等を生成。
テンプレートには Specification ID, Requirement IDs, Parallel Group, Critical Path, Estimated Hours, Description, Acceptance Criteria のフィールドを含む。

## 技術的制約

- Anthropic SDK（Claude API）を使用（ユーザー提供APIキー）
- GitHub CLI (`gh`) を使用してIssue操作
- APIレート制限への配慮（バッチ処理・遅延）
