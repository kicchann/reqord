# Requirement Show/Update/Deleteコマンド

## 概要

req-000002（Requirement CRUD）の残り機能として、show/update/deleteコマンドを実装する。
Phase 1で create/list は完了しているため、これらを追加することでCRUD操作を完成させる。

## ユーザーストーリー

開発者として、CLIから要件の詳細表示・更新・削除を行いたい。
なぜなら、直接編集に頼らず安全に要件を管理したいから。

## CLIコマンド仕様

### `reqord req show <id>`

- 指定IDの要件YAML全フィールドを整形表示
- description.mdの内容も合わせて表示
- 存在しないIDの場合はエラーメッセージ

### `reqord req update <id> [options]`

| オプション              | 説明                                                    |
| ----------------------- | ------------------------------------------------------- |
| `--status <status>`     | ステータス変更（draft/approved/implemented/deprecated） |
| `--priority <priority>` | 優先度変更（high/medium/low）                           |
| `--title <title>`       | タイトル変更                                            |

- updatedAtを自動更新
- 変更前後の差分を表示
- 存在しないIDの場合はエラーメッセージ

### `reqord req delete <id>`

- YAMLファイルとdescriptionディレクトリを削除
- 実行前に確認プロンプト（`--force` で省略可能）
- 削除完了メッセージを表示

## 技術的制約

- 既存の `repositories/requirement.ts` の `findById`/`save` を活用
- 既存の `services/requirement-service.ts` に show/update/delete 関数を追加
- Zodスキーマによるバリデーションを通すこと
- ESM + `.js` 拡張子ルールに従うこと

## エッジケース

- 存在しないIDを指定した場合のエラー処理
- update時に不正なstatus/priorityを指定した場合のバリデーション
- delete時に他の要件から依存（blockedBy/blocks）されている場合の警告
- description.mdが存在しない場合のshow処理
