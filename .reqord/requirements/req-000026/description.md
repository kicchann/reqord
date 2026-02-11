# PRテンプレート・状態遷移ワークフロー整備

## 概要

手動PR作成時のテンプレート（.github/PULL_REQUEST_TEMPLATE.md）の整備と、reqord approve系コマンドで自動生成されるPR本文（buildPrBody）の改善を行う。

## ユーザーストーリー

開発者・レビュアーとして、手動PRと承認PRの両方で統一されたフォーマットでPR情報を記載したい。
なぜなら、PR内容がばらつかず、レビュー時に必要な情報が漏れなく記載されるから。

## 背景

Issue #110 より:
- `.github/PULL_REQUEST_TEMPLATE.md` が存在しない
- Issue テンプレート（`.github/ISSUE_TEMPLATE/`）は整備されているが、PRテンプレートがない
- `reqord req approve` / `reqord spec approve` で自動生成されるPRは `buildPrBody()` で本文生成しているが、レビュアー向けの情報が不足している

## 機能要件

### 1. 手動PRテンプレート（.github/PULL_REQUEST_TEMPLATE.md）

対象: 機能開発、バグ修正、リファクタリングの手動PR

テンプレート構成:
- Summary（変更概要）
- Related Issues（関連Issue）
- Test plan（テスト方法）
- Checklist（セルフレビューチェックリスト）

### 2. 承認PR本文の改善（buildPrBody）

対象: `reqord req approve` / `reqord spec approve` で自動生成されるPR

#### 要件承認PR（requirement-approval-handler.ts）

現状:
- ID、タイトル、バージョン、ステータス変更のみ

改善後に含める情報:
- 成功基準（successCriteria）一覧
- 依存関係（blockedBy/blocks/relatedTo）
- 変更されたファイルのパス
- バリデーション結果（SMARTスコア）

#### 仕様承認PR（specification-approval-handler.ts）

現状:
- specId、reqId、バージョン、設計概要のみ

改善後に含める情報:
- 対象要件の成功基準
- コンポーネント・インターフェース一覧
- テスト方針
- 設計の主要な技術的決定

## 技術的制約

- PULL_REQUEST_TEMPLATE.md はGitHub PRテンプレートの仕様に従う（Markdown形式）
- `buildPrBody()` の変更は既存テストに影響するため、テストの更新が必要
- テンプレート内で使用できるMarkdown構文はGitHub Flavored Markdownに限定

## エッジケース

- PRテンプレートが複数存在する場合（.github/PULL_REQUEST_TEMPLATE/ ディレクトリ形式）は使用しない（単一ファイル形式のみ対応）
- 成功基準や依存関係が空の場合のPR本文表示（"なし" と表示）
