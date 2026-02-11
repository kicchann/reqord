# Requirement CRUD

## 概要

要件（Requirement）の作成・読取・更新・削除機能。GUIが日常操作の主役、CLIは自動化・スクリプト用途。

## ユーザーストーリー

開発者として、要件のCRUD操作をしたい。
なぜなら、要件を効率的に追加・閲覧・更新・削除できるから。

## 編集手段の使い分け

| 手段 | 用途 | 備考 |
|------|------|------|
| **GUI（ローカルUI）** | 日常的なCRUD操作全般 | スキーマバリデーション付きで安全 |
| **CLI** | スクリプト・CI連携、一括操作 | プログラマティックな更新手段 |
| ~~IDE直接編集~~ | ~~非推奨~~ | スキーマエラーのリスク。description.mdもGUIのreact-markdownエディタで編集 |

## CLIコマンド仕様

> CLIはGUI未起動時やスクリプトからの自動化に使用する。
> 日常的な操作にはGUI（req-000007）を推奨。

### reqord req create \<title\>

- `requirements/req-NNNNNN.yaml` を生成（6桁ゼロ埋め自動採番）
- `requirements/req-NNNNNN/description.md` をテンプレートから生成
- `--priority`, `--format` オプション対応
- 作成後にファイルパスを表示
- スキーマバリデーション済みのYAMLのみ書き込み

### reqord req list

- 要件一覧をテーブル表示（ID, Title, Status, Priority）
- `--status`, `--priority` でフィルタ可能
- `--json` で機械読み取り可能な出力

### reqord req show \<id\>

- YAML + description.md の内容を整形表示
- 依存関係グラフを表示

### reqord req update \<id\>

- 指定フィールドを更新（スキーマバリデーション付き）
- `updatedAt` を自動更新
- `--title`, `--status`, `--priority` オプション
- 主な用途: スクリプトからのステータス一括変更、CI連携

### reqord req delete \<id\>

- 確認プロンプト表示後に削除
- YAML + description.md ディレクトリを削除
- 依存関係にある他要件の参照を警告

## 技術的制約

- **すべての書き込みパスでスキーマバリデーション必須**（GUI・CLI共通）
- description.md テンプレートは `settings/templates/requirement-description.md` を使用
- ファイルシステム操作のアトミック性（部分書き込み防止）
- GUI・CLIともに @reqord/shared のZodスキーマを使用して整合性を保証
