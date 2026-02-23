# ステータス表示コマンド

## 概要

プロジェクト全体および個別のRequirement/Specificationの進捗状況を俯瞰的に表示するコマンド。ステータス整合性チェックにより、Req/Spec間の不整合を警告する。

> **Feedback #16対応**: Req/Specステータス整合性チェック・警告表示。整合性ルールは@reqord/shared `checkConsistency`で定義済み。CLIの`detectWarnings`が`checkConsistency`を呼び出し、全ルールを統合する必要あり。自動ステータス変更は行わず、警告表示でhuman-in-the-loopを維持。

## ユーザーストーリー

プロジェクトマネージャーとして、プロジェクト全体の要件・仕様・実装の進捗を一覧で把握したい。
なぜなら、プロジェクトの健全性とステータス不整合を素早く判断できるから。

## CLIコマンド仕様

### reqord status

プロジェクト全体のダッシュボード表示:

```
Reqord Status - MyProject
  Requirements: 8/10 Approved
  Specifications: 6/10 Approved
  Issues: 12/15 Completed

  Warnings:
    - req-000005: 全関連Specが implemented だがReqが approved のまま
    - req-000008: deprecated だが関連Spec(spec-012)が draft のまま
    - req-000006: 未解決feedback紐付けあり (#17)
```

### reqord status \<req-id\>

Requirement個別の詳細ステータス:

- 基本情報（title, status, priority, version）
- 依存関係サマリー
- 関連Specificationの状態
- 未解決feedbackの一覧（feedbacks.yaml経由）
- **整合性チェック結果**

### reqord status \<spec-id\>

Specification個別の詳細ステータス:

- 基本情報（title, status, requirementId）
- 親Requirementとの整合性チェック
- Issue進捗（完了/進行中/ブロック）

## ステータス整合性チェック（Feedback #16）

@reqord/shared `checkConsistency` で定義されたルールに基づき、以下の不整合を検出・警告する。CLIの`status-service.ts` `detectWarnings`から`checkConsistency`を呼び出して統合する:

| 条件                                                | 警告レベル | メッセージ                       |
| --------------------------------------------------- | ---------- | -------------------------------- |
| 全関連Specが `implemented` だがReqが `approved`     | warning    | Reqを `implemented` に更新を検討 |
| Reqが `deprecated` だが関連Specが active            | warning    | 関連Specの廃止を検討             |
| Reqに未解決feedback紐付けあり（feedbacks.yaml経由） | info       | Feedback対応の確認               |

**自動ステータス変更は行わない。** 警告表示のみでユーザーの判断に委ねる（human-in-the-loop）。

## オプション

- `--json` : 機械読み取り可能な構造化出力
- `--quiet` : 警告のみ表示（CI向け）
- `--check` : 整合性チェックのみ実行（終了コード: 0=問題なし, 1=警告あり）

## 技術的制約

- Specification/Issue データが存在しない場合はRequirement情報のみ表示
- GitHub Issue状態は `.reqord/issues/tasks.yaml` の最終sync結果を使用（リアルタイム取得しない）
- 整合性ルールは@reqord/shared `checkConsistency` から参照（冒頭注記参照）
