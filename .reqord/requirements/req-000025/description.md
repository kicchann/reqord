# reqord ui CLIコマンド

## 概要

`reqord ui` コマンドを追加し、Web UIのローカルサーバーをCLIからワンコマンドで起動できるようにする。

## ユーザーストーリー

開発者として、CLIからワンコマンドでWeb UIを起動したい。
なぜなら、手動でNext.js開発サーバーを起動する手間なく、要件・仕様の閲覧・編集ができるから。

## 機能要件

### reqord ui

- `.reqord/` ディレクトリをデータソースとしてWeb UIサーバーを起動する
- デフォルトポート（3000）で起動し、ブラウザで閲覧可能にする
- 起動後、アクセスURLをターミナルに表示する

### オプション

- `--port <number>`: ポート番号を指定（デフォルト: 3000）
- `--open`: 起動後に自動的にブラウザを開く

### エラーハンドリング

- `.reqord/` ディレクトリが存在しない → "Run 'reqord init' first" エラー
- ポートが既に使用中 → "Port 3000 is already in use. Try another port with --port" エラー

## 背景

req-000022（Web UI拡張）で実装されたDashboard・依存グラフ・Gantt Chart・Specification詳細画面を、CLIから起動するためのコマンド。元々 req-000022 の一部として計画されていたが、独立した要件として切り出した。
