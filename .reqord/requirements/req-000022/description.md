# Web UI拡張 (Dashboard・依存グラフ・Gantt Chart)

## 概要

ローカルUI基本機能（req-000007）を拡張し、ダッシュボード、依存関係グラフ可視化、Gantt Chart、Specification詳細画面を追加する。

## ユーザーストーリー

プロジェクトマネージャーとして、要件・仕様・進捗を視覚的に把握したい。
なぜなら、テキストベースでは見えない全体像と問題点を素早く発見できるから。

## 画面構成

### Dashboard

- **Project Health**: Requirements/Specifications/Issues の進捗バー
- **クリティカルパス残時間**: 全Specの並列分析に基づく
- **サマリーカード**: Requirements, Specs, Issues それぞれの状態別集計
- **警告表示**: Gap未実行、Validation失敗、ブロック中Issue
- **依存関係グラフ**: インタラクティブなグラフ表示

### Specification詳細画面

タブ構成:
- **Research**: research.md のMarkdownレンダリング
- **Design**: design.md のMarkdownレンダリング + コード例表示
- **Coverage**: 要件カバレッジテーブル
- **Issues**: Issue一覧 + Gantt Chart + 進捗表示
- **History**: バージョン履歴タイムライン

### Gantt Chart

- 並列グループ（P0/P1/P2）に基づくタスク配置
- クリティカルパスのハイライト
- Issue状態に応じた色分け（完了/進行中/ブロック/未着手）
- 見積もり時間に基づくバー幅

### 依存関係グラフ

- Requirement間の依存関係をDAGで表示
- Requirement → Specification → Issue の追跡パスを表示
- ノードクリックで詳細画面に遷移
- ステータスに応じたノード色

## 技術的制約

- ローカルファイルシステムからのデータ読み取りのみ（バックエンドレス）
- req-000007（基本UI）の既存コンポーネントを拡張
- Specification CRUD（req-000013）のデータ構造に依存
