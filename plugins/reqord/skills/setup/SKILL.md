---
name: setup
description: Reqordプラグインの環境セットアップと前提条件チェック。初回利用時に実行し、必要なツールの可用性を確認する。Verify environment prerequisites for the Reqord plugin - CLI tools, GitHub authentication, and project initialization. Run on first use or when troubleshooting.
argument-hint: "[--check] (省略時はフルセットアップ、--checkは確認のみ)"
---

> **ユーザー確認必須**: このスキルは環境設定の変更を伴います。自律実行時はセットアップ内容をユーザーに提示し、承認を得てから実行してください。

# Reqordプラグイン環境セットアップ

モード: $ARGUMENTS（デフォルト: フルセットアップ）

プラグインの動作に必要な環境を確認し、未セットアップの項目があればガイドする。
完了後、`.reqord/settings/plugin-config.yaml` にセットアップ証憑を記録する。

---

## 引数解析

| $ARGUMENTS | モード           | 処理                                          |
| ---------- | ---------------- | --------------------------------------------- |
| 空         | フルセットアップ | Step 1〜6を順に実行                           |
| `--check`  | 確認のみ         | Step 1〜4を実行し結果表示のみ（証憑更新なし） |

---

## Step 1: 必須ツールの可用性チェック

以下のコマンドを**並列実行**し、各ツールの可用性を確認する:

```bash
reqord --version        # Reqord CLI
gh --version            # GitHub CLI
git --version           # Git
```

### 判定基準

| ツール       | 必須度       | 用途                             | 不在時の影響                                        |
| ------------ | ------------ | -------------------------------- | --------------------------------------------------- |
| `reqord` CLI | **必須**     | 全スキルのデータ操作             | フォールバック可（直接ファイル読み取り）だが非推奨  |
| `gh` CLI     | **強く推奨** | feedback sync、issue検索、PR作成 | `/reqord:feedback`、`/reqord:git commit` が使用不可 |
| `git`        | **必須**     | ブランチ操作、コミット、履歴検索 | `/reqord:git`、`/reqord:verify trace` が使用不可    |

### 結果表示

```
## 環境チェック結果

| ツール | Status | Version |
|--------|--------|---------|
| reqord | ✅ | v0.5.0 |
| gh     | ✅ | 2.45.0 |
| git    | ✅ | 2.43.0 |
```

**reqord CLI が見つからない場合**:

```
❌ reqord CLI が見つかりません。
インストール方法: npm install -g @reqord/cli
```

**gh CLI が見つからない場合**:

```
⚠ gh CLI が見つかりません。
以下の機能が制限されます:
- /reqord:feedback（GitHub Issue同期）
- /reqord:git commit（PR作成）
- /reqord:verify trace（PR検索）

インストール: https://cli.github.com/
```

---

## Step 2: GitHub CLI 認証チェック

gh CLI が存在する場合、認証状態を確認する:

```bash
gh auth status
```

### 認証済みの場合

```
✅ GitHub認証: <username> (<hostname>)
```

### 未認証の場合

```
⚠ GitHub CLIが未認証です。
`gh auth login` を実行して認証してください。

認証なしでも以下は使用可能です:
- /reqord:status, /reqord:design, /reqord:dev, /reqord:refine, /reqord:verify validate
```

---

## Step 3: Reqordプロジェクト初期化チェック

`.reqord/` ディレクトリの存在と構造を確認する:

### 確認項目

Readツール / Globツールで以下を確認:

| パス                           | 必須度   | 用途                 |
| ------------------------------ | -------- | -------------------- |
| `.reqord/`                     | **必須** | プロジェクトルート   |
| `.reqord/context/context.yaml` | **必須** | ProjectContext       |
| `.reqord/requirements/`        | **必須** | 要件データ           |
| `.reqord/specifications/`      | **必須** | 仕様データ           |
| `.reqord/feedback/`            | 推奨     | フィードバックデータ |
| `.reqord/settings/`            | 推奨     | 設定                 |

### 未初期化の場合

```
❌ .reqord/ ディレクトリが見つかりません。
このプロジェクトはReqordで初期化されていません。

`reqord init` を実行してプロジェクトを初期化してください。
```

### 部分的に存在する場合

不足しているディレクトリ・ファイルを報告し、`reqord init` または手動作成を案内する。

---

## Step 4: ProjectContext読み込みチェック

`.reqord/context/context.yaml` が存在する場合、`files` フィールドが参照するファイルの存在を確認する:

```bash
reqord context show --json
```

または直接Readツールで `.reqord/context/context.yaml` を読み取る。

### 確認項目

| 参照先                             | 必須度       | 影響するスキル                                  |
| ---------------------------------- | ------------ | ----------------------------------------------- |
| `files.product` (product.yaml)     | 推奨         | design, refine                                  |
| `files.technical` (technical.yaml) | **強く推奨** | design, dev, verify（テストコマンド特定に使用） |
| `files.structure` (structure.yaml) | 推奨         | design, dev（命名規則・構造ルール）             |
| `files.domain` (domain/\*.md)      | 任意         | refine（ドメイン知識）                          |

### 未設定のファイルがある場合

```
⚠ ProjectContextの以下のファイルが未設定/未作成です:
- technical.yaml: 未作成（/reqord:design, /reqord:dev のテスト・ビルドコマンド特定に影響）
- domain/*.md: 未設定（任意）

`reqord context update` でProjectContextを更新できます。
```

---

## Step 5: セットアップ結果サマリー

全チェック結果を集約して表示する:

```
## Reqordプラグイン セットアップ結果

### 環境
| 項目 | Status |
|------|--------|
| reqord CLI | ✅ v0.5.0 |
| gh CLI | ✅ 2.45.0 (認証済み: username) |
| git | ✅ 2.43.0 |

### プロジェクト
| 項目 | Status |
|------|--------|
| .reqord/ | ✅ 初期化済み |
| context.yaml | ✅ |
| product.yaml | ✅ |
| technical.yaml | ✅ |
| structure.yaml | ⚠ 未作成 |
| domain/*.md | - (任意) |

### 利用可能なスキル
| スキル | Status | 備考 |
|--------|--------|------|
| /reqord:status | ✅ | |
| /reqord:design | ✅ | |
| /reqord:dev | ✅ | |
| /reqord:git | ✅ | |
| /reqord:verify | ✅ | |
| /reqord:feedback | ⚠ | gh CLI認証が必要 |
| /reqord:refine | ✅ | |
```

---

## Step 6: 証憑記録

`--check` モードでない場合、セットアップ結果を `.reqord/settings/plugin-config.yaml` に記録する。

### 記録内容

```yaml
plugin:
  name: reqord
  setupCompletedAt: "2026-02-17T10:30:00+09:00"
  setupVersion: "0.1.0"
environment:
  reqord:
    available: true
    version: "0.5.0"
  gh:
    available: true
    version: "2.45.0"
    authenticated: true
    user: "username"
  git:
    available: true
    version: "2.43.0"
project:
  initialized: true
  context:
    product: true
    technical: true
    structure: false
    domain: []
```

### 書き込み手順

1. `.reqord/settings/` ディレクトリの存在を確認（なければ報告）
2. 既存の `plugin-config.yaml` があればReadツールで読み取り
3. Writeツールで新しい内容を書き込み

### セットアップ完了メッセージ

```
✅ セットアップが完了しました。証憑を .reqord/settings/plugin-config.yaml に記録しました。

次のステップ:
- 進捗確認: /reqord:status
- 設計書作成: /reqord:design <spec-id>
- 機能開発: /reqord:dev <spec-id>

全スキル一覧: README.md を参照
```

---

## エラーハンドリング

### .reqord/settings/ ディレクトリが存在しない場合

```
⚠ .reqord/settings/ ディレクトリが存在しません。
証憑の記録をスキップします。
`reqord init` でプロジェクトを再初期化するか、手動でディレクトリを作成してください。
```

### 必須ツールが全て不在の場合

```
❌ 必須ツール（reqord CLI, git）が見つかりません。
プラグインの機能を使用するには、少なくとも以下のインストールが必要です:

1. reqord CLI: npm install -g @reqord/cli
2. git: https://git-scm.com/

セットアップを中止します。
```
