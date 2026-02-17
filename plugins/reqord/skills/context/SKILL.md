---
name: context
description: Reqordデータ（要件・仕様・コンテキスト・フィードバック）の読み方と開発ワークフローの定義。reqord系スキルやエージェントが自動参照する。Common knowledge base for Reqord data models, CLI patterns, and development workflow. Auto-referenced by all reqord skills and agents.
user-invokable: false
---

# Reqord共通知識ベース

このスキルは全reqord系スキル・エージェントの共通基盤。データモデル・CLIパターン・ワークフローを定義する。

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
  - `.reqord/specifications/<spec-id>/index.yaml` - メタデータ
  - `.reqord/specifications/<spec-id>/design.md` - 技術設計書

### ProjectContext（プロジェクトコンテキスト）

- **構成ファイル**:
  - `.reqord/context/context.yaml` - メイン設定（files参照を含む）
  - `product.yaml` - プロダクトビジョン・スコープ
  - `technical.yaml` - 技術スタック・アーキテクチャ
  - `structure.yaml` - コード構造・命名規則
  - `domain/*.md` - ドメイン固有知識

### Feedback（フィードバック）

- **ファイル**: `.reqord/feedback/index.yaml`
- GitHub Issueと同期。type（bug/improvement/requirement-gap/spec-mismatch/security）、severity、linkedTo で分類
- `reqord feedback sync` でGitHub Issueから取り込み

---

## 2. CLIコマンドパターン集

### 要件操作

```bash
reqord req list [--status <status>] [--json]     # 要件一覧
reqord req show <req-id> [--json]                 # 要件詳細
reqord req validate <req-id> [--json]             # SMARTバリデーション
reqord req create <title>                         # 要件作成
reqord req update <req-id> --patch-file <file>    # パッチ更新
reqord req approve <req-id>                       # 承認
reqord req implement <req-id>                     # 実装済みマーク
reqord req draft <req-id>                         # ドラフトに戻す
```

### 仕様操作

```bash
reqord spec list [--requirement <req-id>] [--json]  # 仕様一覧
reqord spec show <spec-id> [--json]                  # 仕様詳細
reqord spec create <req-id>                          # 仕様作成
reqord spec implement <spec-id>                      # 実装済みマーク
reqord spec approve <spec-id>                        # 承認
reqord spec draft <spec-id>                          # ドラフトに戻す
```

### フィードバック操作

```bash
reqord feedback sync                                                              # GitHub Issue同期
reqord feedback list [--state open|closed] [--json]                               # 一覧
reqord feedback show <issue-number> [--json]                                      # 詳細
reqord feedback link <issue-number> --type <type> --severity <severity> --spec <spec-id>    # specにリンク
reqord feedback link <issue-number> --type <type> --severity <severity> --req <req-id>      # reqにリンク
reqord feedback link <issue-number> --type <type> --severity <severity> --created-req       # 新規req作成してリンク
reqord feedback unlink <issue-number> --spec <spec-id>                            # specからリンク解除
reqord feedback unlink <issue-number> --req <req-id>                              # reqからリンク解除
reqord feedback close <issue-number>                                              # クローズ
reqord feedback resolve <artifact-id> --issue <issue-number>                      # フラグ解消
```

### コンテキスト操作

```bash
reqord context show [--json]       # コンテキスト表示
reqord context init                # コンテキスト初期化
reqord context update              # コンテキスト更新
```

### 影響分析

```bash
reqord impact analyze <req-id|spec-id> [--json]  # 依存関係・影響範囲分析
```

### Issue操作

```bash
reqord issue sync                       # GitHub Issue同期・進捗計算
reqord issue create <req-id>            # Issue生成
reqord issue validate <issue-number>    # Issue整合性チェック
```

### バージョン操作

```bash
reqord version <req-id|spec-id> --patch   # パッチバージョンアップ（X.Y+1）
reqord version <req-id|spec-id> --major   # メジャーバージョンアップ（X+1.0）
```

---

## 3. コンテキスト読み込み標準手順

reqordデータを読み込む際の手順:

### Step 1: context.yaml読み取り

```bash
reqord context show --json
```

または直接Readツールで `.reqord/context/context.yaml` を読み取り、`files`フィールドから参照先を特定する。

### Step 2: 参照ファイルの読み取り

context.yamlの`files`フィールドが参照するファイルをReadツールで読み取る:

- `files.product.path` → product.yaml
- `files.technical.structured` → technical.yaml
- `files.technical.narrative` → technical-narrative.md
- `files.structure.structured` → structure.yaml
- `files.structure.narrative` → structure-diagram.md
- `files.domain` → 配列内の各ファイル

パスはすべて `.reqord/` ディレクトリからの相対パス。

### Step 3: 対象req/specの読み取り

- requirement: `.reqord/requirements/<req-id>.yaml` + `<req-id>/description.md`
- specification: `.reqord/specifications/<spec-id>/index.yaml` + `design.md`

---

## 4. 読み込み優先順位（トークン節約時）

コンテキストウィンドウの制約がある場合、以下の優先順位で読み込む:

1. **対象req/spec**（必須）- YAML + description.md/design.md
2. **design.md** - 技術設計書（実装時は必須）
3. **technical.yaml** - 技術スタック・アーキテクチャ
4. **structure.yaml** - コード構造・命名規則
5. **product.yaml** - プロダクトビジョン（設計判断時に参照）
6. **domain/\*.md** - ドメイン知識（関連する場合のみ）

---

## 5. ワークフロー

```
初回: 環境セットアップ
  /reqord:setup → 環境チェック・証憑記録

Phase 0: 状況把握
  /reqord:status → 進捗確認、次に着手すべきspecを特定

Phase 1: 計画・開発
  /check-branch → /reqord:git branch <spec-id>
  → /reqord:dev <spec-id> → /test → /lint

Phase 2: コミット・PR
  /update-claude-md → /reqord:git commit <spec-id>

Phase 3: レビュー・マージ
  /review-pr → /check-merge → [Human Merge]

Phase 4: 検証・完了
  /reqord:verify done <spec-id> → /close-issue
```

---

## 6. トレーサビリティ規約

### コミットメッセージ

```
<type>(<scope>): <summary>

Implements spec-NNNNNN (req-NNNNNN: <requirement-title>)
```

### PR本文

PR本文には以下を含める:

- **Specification**: spec-id + タイトル
- **Requirement**: req-id + タイトル
- **Success Criteria チェックリスト**: 各基準を `- [ ]` 形式で列挙

### ブランチ名

```
feature/spec-NNNNNN-issues-<N>-<sanitized-title>
```

issue番号がない場合:

```
feature/spec-NNNNNN-<sanitized-title>
```

---

## 7. 環境要件

### 必須ツール

| ツール | 必須度 | フォールバック |
|--------|--------|---------------|
| `reqord` CLI | 必須 | 直接ファイル読み取り（非推奨） |
| `git` | 必須 | なし |
| `gh` CLI（認証済み） | 強く推奨 | feedback/git commit/verify trace が制限される |

### セットアップ証憑

`/reqord:setup` 実行後、`.reqord/settings/plugin-config.yaml` にセットアップ結果が記録される。各スキルは必要に応じてこのファイルを参照し、環境の可用性を確認できる。

---

## 8. エラーハンドリング

### `.reqord/` ディレクトリが存在しない場合

```
このプロジェクトはreqordで初期化されていません。
`reqord init` を実行してプロジェクトを初期化してください。
```

### reqord CLIが未インストールの場合

CLIコマンドが失敗した場合は、直接ファイル読み取りにフォールバックする:

1. `.reqord/requirements/<req-id>.yaml` をReadツールで読み取り
2. `.reqord/specifications/<spec-id>/design.md` をReadツールで読み取り
3. `.reqord/context/context.yaml` をReadツールで読み取り

### design.mdがテンプレートのままの場合

design.mdに「Specification Design Template」のみが含まれている場合は「未記述」と判定し、`/reqord:design` での設計書作成を案内する。

---

## 9. リファレンス（resources/）

詳細な知見は `resources/` ディレクトリを参照。必要に応じて読み込むこと。

| ファイル | 内容 | 読むタイミング |
|---------|------|--------------|
| `resources/philosophy.md` | 設計思想・5原則 | 設計判断時、ツールの位置づけを説明する時 |
| `resources/quality-framework.md` | SMART + EARS + 粒度ルール | 要件作成・詳細化・バリデーション時 |
| `resources/traceability.md` | 三層モデル・依存関係・フラグ | 影響分析、依存関係設定、フラグ運用時 |
| `resources/feedback-workflow.md` | フィードバック3段階進化 | フィードバック処理・リンク時 |
| `resources/ai-phases.md` | AI支援4フェーズ・HitL境界 | AI詳細化・設計生成・タスク分解時 |
| `resources/anti-patterns.md` | アンチパターン・チェックリスト | レビュー時、品質確認時 |
