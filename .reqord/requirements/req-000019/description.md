# ステータス表示コマンド

## 概要

プロジェクト全体および個別のRequirement/Specificationの進捗状況を俯瞰的に表示するコマンド。

## ユーザーストーリー

プロジェクトマネージャーとして、プロジェクト全体の要件・仕様・実装の進捗を一覧で把握したい。
なぜなら、プロジェクトの健全性を素早く判断できるから。

## CLIコマンド仕様

### reqord status

プロジェクト全体のダッシュボード表示:

```
Reqord Status - MyProject
  Requirements: ████████░░ 8/10 Approved
  Specifications: ██████░░░░ 6/10 Approved
  Issues: ████████████░░ 12/15 Completed

  ⚠️ Warnings:
    - req-005: Gap Analysis未実行
    - spec-003: Design Validation failed
    - Issue #45: Blocked for 3 days
```

### reqord status \<req-id\>

Requirement個別の詳細ステータス:
- 基本情報（title, status, priority, version）
- 依存関係サマリー
- 関連Specificationの状態
- Gap Analysisの要約（実行済みの場合）

### reqord status \<spec-id\>

Specification個別の詳細ステータス:
- 基本情報（title, status, requirementId）
- 要件カバレッジサマリー
- Issue進捗（完了/進行中/ブロック）
- クリティカルパスの残り時間

## オプション

- `--json` : 機械読み取り可能な構造化出力
- `--quiet` : 警告のみ表示（CI向け）

## 技術的制約

- Specification/Issue データが存在しない場合はRequirement情報のみ表示
- GitHub Issue状態は最後のsync結果を使用（リアルタイム取得しない）
