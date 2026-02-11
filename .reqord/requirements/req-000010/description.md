# Zodバリデーションエラー詳細表示

## 概要

現在、Zodバリデーションエラー時のメッセージが `Invalid requirement req-000001: ...` のように曖昧で、
どのフィールドに問題があるか分かりにくい。Zodのエラー情報を整形して、
フィールドパスと期待値を分かりやすく表示する。

## ユーザーストーリー

開発者として、バリデーションエラー時にどのフィールドが不正かを即座に把握したい。
なぜなら、手動でJSONを修正する際に原因特定に時間をかけたくないから。

## 詳細要件

### 現状のエラー表示

```
Error: Invalid requirement req-000001: Validation error
```

### 改善後のエラー表示

```
Error: req-000001.yaml のバリデーションに失敗しました:
  - status: 不正な値 "unknown"（期待値: draft, approved, implemented, deprecated）
  - priority: 必須フィールドが未設定
```

### 実装方針

- `ZodError` の `issues` 配列からフィールドパスとメッセージを抽出
- ネストしたフィールド（例: `dependencies.blockedBy`）もパスを正しく表示
- 共通のフォーマット関数を `packages/shared` または `packages/cli/src/utils/` に配置

## 技術的制約

- Zodの `ZodError.issues` 構造に依存するため、Zodバージョンアップ時に注意
- フォーマット関数は @reqord/shared と @reqord/cli 両方で使える場所に配置

## エッジケース

- 複数フィールドに同時にエラーがある場合の全件表示
- ネストが深いフィールド（3階層以上）のパス表示
- カスタムバリデーションエラー（refine/transform）のメッセージ表示
