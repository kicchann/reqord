# データ形式のYAML移行

## 概要

要件・仕様・ProjectContextのデータ形式をJSONからYAMLに移行する。

## ユーザーストーリー

開発者・プロダクトオーナーとして、要件・仕様・コンテキストをYAML形式で管理したい。
なぜなら、JSONに比べて可読性が高く、コメント記述も可能で、人間による直接編集がしやすくなるから。

## 背景

Issue #159 より:
- 人間の可読性を優先して、JSON形式をYAMLに変更したい
- 対象: `req-NNNNNN.json`, `spec-NNNNNN.json`, `feedback/index.json`, `context/*.json`

## 移行対象ファイル

1. **Requirements**: `.reqord/requirements/req-NNNNNN.json` → `.reqord/requirements/req-NNNNNN.yaml`
2. **Specifications**: `.reqord/specifications/spec-NNNNNN.json` → `.reqord/specifications/spec-NNNNNN.yaml`
3. **ProjectContext**:
   - `.reqord/context/product.json` → `.reqord/context/product.yaml`
   - `.reqord/context/technical.json` → `.reqord/context/technical.yaml`
   - `.reqord/context/structure.json` → `.reqord/context/structure.yaml`
4. **Feedback**: `.reqord/feedback/index.json` → `.reqord/feedback/index.yaml` → `.reqord/issues/feedbacks.yaml`

## 技術的アプローチ

### YAML ライブラリ

- 使用: `js-yaml` (TypeScript対応、Zodと互換性あり)
- インストール: `npm install js-yaml @types/js-yaml`

### 変換レイヤー

- Zod スキーマは変更しない（JSON構造ベースを維持）
- Repository層でYAMLを読み込み、JSONオブジェクトに変換後、Zodでバリデーション
- 書き込み時はJSONオブジェクトをYAMLに変換して保存

### 移行コマンド

```bash
reqord migrate-to-yaml [--dry-run]
```

- `.reqord/` 配下のすべてのJSONファイルをYAMLに変換
- `--dry-run` で変換結果をプレビュー（実際には変換しない）
- 変換後、元のJSONファイルは `.backup/` に移動

## 技術的制約

- Markdown (.md) ファイルは変更しない（description.md, design.md）
- Zod スキーマの型定義は変更しない（JSON構造を維持）
- 後方互換性は維持しない（JSONとYAMLの混在は不可）
- Web UI は YAML を直接読み書きする（Server Actions経由）

## エッジケース

- YAML構文エラー時のエラーメッセージ表示
- 日本語文字列のエスケープ処理
- 配列・オブジェクトの空配列 `[]` / 空オブジェクト `{}` の表現統一
- 日付フォーマット（ISO 8601）の維持

## 参考資料

- [js-yaml](https://github.com/nodeca/js-yaml)
- [YAML 1.2 Specification](https://yaml.org/spec/1.2/spec.html)
