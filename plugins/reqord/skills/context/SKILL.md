---
name: context
description: Reqordのデータモデル（Requirement, Specification, ProjectContext, Feedback）とCLI操作ルールの共通知識ベース。
user-invokable: false
---

# Reqord共通知識ベース

このスキルは全reqord系スキル・エージェントの共通基盤。データモデルとCLIルールを定義する。

---

## 1. データモデル

### Requirement（要件）

- **ID形式**: `req-NNNNNN`（6桁ゼロ埋め）
- **ステータスライフサイクル**: `draft` → `approved` → `implemented` → `deprecated`
- **主要フィールド**:
  - `title`: 要件タイトル
  - `status`: 現在のステータス
  - `priority`: high / medium / low
  - `successCriteria`: 成功基準のリスト（検証可能な条件）
  - `format`: user-story（as/iWant/soThat）または EARS
  - `dependencies`: blockedBy / blocks / relatedTo
  - `estimatedComplexity`: small / medium / large
  - `version`: セマンティックバージョン（X.Y形式）
  - `versionHistory`: バージョン履歴配列（version, status, gitCommit, approvedAt, approvedBy）
  - `flags`: feedback-review 等のフラグ配列
- **ファイル構成**:
  - `.reqord/requirements/<req-id>.yaml` - メタデータ
  - `.reqord/requirements/<req-id>/description.md` - 詳細記述

### Specification（仕様）

- **ID形式**: `spec-NNNNNN`（6桁ゼロ埋め）
- **ステータスライフサイクル**: `draft` → `approved` → `implemented`
- **主要フィールド**:
  - `requirementId`: 紐づくreq-id
  - `title`: 仕様タイトル
  - `status`: 現在のステータス
  - `version`: セマンティックバージョン（X.Y形式）
  - `versionHistory`: バージョン履歴配列
  - `flags`: フラグ配列
- **ファイル構成**:
  - `.reqord/specifications/<spec-id>.yaml` - メタデータ
  - `.reqord/specifications/<spec-id>/design.md` - 技術設計書

### ProjectContext（プロジェクトコンテキスト）

- **構成ファイル**:
  - `.reqord/context/context.yaml` - メイン設定（files参照を含む）
  - `product.yaml` - プロダクトビジョン・スコープ
  - `technical.yaml` - 技術スタック・アーキテクチャ
  - `structure.yaml` - コード構造・命名規則
  - `domain/*.md` - ドメイン固有知識

### Feedback（フィードバック）

- **ファイル**: `.reqord/issues/feedbacks.yaml`
- GitHub Issueと同期。type（bug/improvement/requirement-gap/spec-mismatch/security）、severity、linkedTo で分類
- `reqord feedback sync` でGitHub Issueから取り込み

### Tasks（タスク）

- **ファイル**: `.reqord/issues/tasks.yaml`
- Specificationに紐づくGitHub Issueのタスク管理
- `reqord task sync` でGitHub Issueから同期

---

## 2. YAML直接編集禁止ルール

**`.reqord/` 配下のYAMLファイルは原則として直接編集してはならない。必ず `reqord` CLIコマンドを経由すること。**

CLIコマンドはバリデーション・バージョン管理・監査証跡を自動で処理する。直接編集はこれらを迂回し、データ不整合の原因となる。

### 操作→CLIコマンド対応表

| 操作 | CLIコマンド | 直接編集 |
|------|-----------|---------|
| ステータス変更 | `reqord req approve/draft/implement` | 禁止 |
| バージョンバンプ | `reqord version <id> --patch\|--major` | 禁止 |
| フィールド更新（SC等） | `reqord req update --patch-file` | 禁止 |
| description.md更新 | `reqord req update --description-file` | 禁止 |
| フラグ除去 | `reqord feedback resolve <id> --issue <N>` | 禁止 |
| フィードバック操作 | `reqord feedback link/unlink/close/resolve` | 禁止 |
| Issue同期 | `reqord task sync/sync-all` | 禁止 |
| design.md書き込み | Writeツールで直接書き込み | 許可（CLIコマンドなし） |
| コンテキスト更新 | `reqord context update` | 禁止 |

### バージョン管理ルール

**内容を変更したらバージョンを上げる。**

- **`--patch`（X.Y+1）**: 内容の修正・改善・追記
- **`--major`（X+1.0）**: 破壊的変更・大幅な構造変更
- コマンド: `reqord version <id> --patch --summary "<変更概要>"`

---

## 3. 提供スキル一覧

| スキル | 用途 |
|--------|------|
| `/reqord:setup` | 環境セットアップ・前提条件チェック |
| `/reqord:status` | 要件・仕様の実装進捗ダッシュボード |
| `/reqord:refine` | 要件の品質改善（SMARTスコア向上） |
| `/reqord:design` | 仕様の技術設計書（design.md）作成 |
| `/reqord:dev` | design.mdに基づくTDD実装 |
| `/reqord:git` | spec参照付きGit操作（ブランチ・コミット・PR） |
| `/reqord:verify` | 実装検証・ステータス更新 |
| `/reqord:feedback` | フィードバック・バグ報告の処理 |
| `/reqord:context` | このスキル。データモデル・CLI・共通知識 |

プロジェクトのプロセスに応じて、これらを自由に組み合わせて使用する。

---

## 4. リファレンス（resources/）

詳細な知見は `resources/` ディレクトリを参照。必要に応じて読み込むこと。

| ファイル | 内容 | 読むタイミング |
|---------|------|--------------|
| `resources/cli-reference.md` | CLIコマンド全集・データ読み込み手順 | CLIコマンドの引数やオプションを確認する時 |
| `resources/philosophy.md` | 設計思想・5原則 | 設計判断時、ツールの位置づけを説明する時 |
| `resources/quality-framework.md` | SMART + EARS + 粒度ルール | 要件作成・詳細化・バリデーション時 |
| `resources/traceability.md` | 三層モデル・依存関係・フラグ | 影響分析、依存関係設定、フラグ運用時 |
| `resources/feedback-workflow.md` | フィードバック3段階進化 | フィードバック処理・リンク時 |
| `resources/ai-phases.md` | AI支援4フェーズ・HitL境界 | AI詳細化・設計生成・タスク分解時 |
| `resources/anti-patterns.md` | アンチパターン・チェックリスト | レビュー時、品質確認時 |
