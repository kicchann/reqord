# 承認PRマージ後の自動ステータス更新 GitHub Actions ワークフロー - 技術設計書

## 1. 設計概要

`reqord spec/req approve` コマンドで作成された承認PRがマージされた際に、対象エンティティ（`req-NNNNNN` / `spec-NNNNNN`）のステータスを `approved` から `approved` に自動更新するGitHub Actionsワークフローを実装する。

### 背景

- 現在、承認PRマージ後の `approved` → `approved` 更新は手作業
- ブランチ保護があるリポジトリではオーナー以外がmainに直pushできない
- GitHub Actionsの `contents: write` 権限を使用して自動化する

### 技術スタック

- **GitHub Actions**: ワークフロー実行基盤
- **jq**: JSONファイルの更新
- **yq**: YAMLファイルの更新（GitHub Actionsランナーにプリインストール済み）
- **シェルスクリプト**: Node.js/pnpmセットアップ不要

## 2. ワークフロー設計

### 2.1 トリガー

```yaml
on:
  pull_request:
    types: [closed]
```

- ブランチ指定なし（マージ先はmainとは限らない）
- 条件: `merged == true` かつヘッドブランチ名が `reqord/*-approve-v*` パターンにマッチ

### 2.2 処理フロー

```
PR Merged (reqord/*-approve-v*)
  │
  ├─ 1. ヘッドブランチ名からエンティティIDを抽出
  │     パターン: reqord/(req|spec)-(\d{6})-approve-v(.+)
  │
  ├─ 2. マージ先ブランチをチェックアウト
  │     github.event.pull_request.base.ref
  │
  ├─ 3. エンティティファイルを特定（YAML/JSON両対応）
  │     .yaml を優先探索、なければ .json にフォールバック
  │     req-NNNNNN → .reqord/requirements/req-NNNNNN.{yaml,json}
  │     spec-NNNNNN → .reqord/specifications/spec-NNNNNN.{yaml,json}
  │
  ├─ 4. ステータス確認（冪等性チェック）
  │     approved 以外ならスキップ
  │
  ├─ 5. データ更新（jq/yq）
  │     - status → "approved"
  │     - updatedAt → ISO 8601タイムスタンプ
  │     - currentApproval.approvedAt → タイムスタンプ
  │     - currentApproval.approvedBy → PRマージユーザー名
  │     - versionHistory[] に新エントリ追加
  │
  └─ 6. コミット & プッシュ
        コミットメッセージ: chore(reqord): finalize approval for {id}
```

### 2.3 ブランチ名パターン

既存の承認ブランチ命名規則に基づく:

```
reqord/spec-000030-approve-v1.0.0
reqord/spec-000031-approve-v1.0.0
reqord/req-NNNNNN-approve-vX.Y.Z
```

正規表現: `^reqord/(req|spec)-([0-9]{6})-approve-v(.+)$`

## 3. 更新内容の詳細

### 3.1 JSONファイルの更新（jq）

```bash
jq --arg now "$NOW" \
   --arg user "$MERGED_BY" \
   --arg version "$VERSION" \
   --arg commit "$COMMIT_SHA" \
   '
   .status = "approved" |
   .updatedAt = $now |
   .currentApproval.approvedAt = $now |
   .currentApproval.approvedBy = [$user] |
   .versionHistory += [{
     version: $version,
     status: "approved",
     gitCommit: $commit,
     changedAt: $now,
     summary: "Status changed from approved to approved"
   }]
   ' "$FILE_PATH" > tmp && mv tmp "$FILE_PATH"
```

### 3.2 YAMLファイルの更新（yq）

```bash
yq -i "
  .status = \"approved\" |
  .updatedAt = \"$NOW\" |
  .currentApproval.approvedAt = \"$NOW\" |
  .currentApproval.approvedBy = [\"$MERGED_BY\"] |
  .versionHistory += [{
    \"version\": \"$VERSION\",
    \"status\": \"approved\",
    \"gitCommit\": \"$COMMIT_SHA\",
    \"changedAt\": \"$NOW\",
    \"summary\": \"Status changed from approved to approved\"
  }]
" "$FILE_PATH"
```

## 4. 権限設計

```yaml
permissions:
  contents: write
```

- `contents: write`: マージ先ブランチへのコミット&プッシュに必要
- 最小権限の原則に従い、他の権限は付与しない

### Gitコミット設定

```bash
git config user.name "github-actions[bot]"
git config user.email "github-actions[bot]@users.noreply.github.com"
```

## 5. 冪等性とエラーハンドリング

### 5.1 冪等性

- `approved` 以外のステータスの場合はスキップ（ログ出力のみ）
- ワークフローの再実行が安全に行える

### 5.2 エラーハンドリング

- ブランチ名がパターンにマッチしない場合: 早期リターン
- エンティティファイルが見つからない場合: エラーログ出力、ステップ失敗
- jq/yqコマンドの失敗: シェルの `set -euo pipefail` で検出

## 6. ファイルフォーマット対応

### YAML/JSON両対応

データファイルは現在JSONからYAMLへ移行中（req-000027）。ワークフローは両フォーマットに対応する:

1. `.yaml` ファイルを優先探索
2. `.yaml` が存在しなければ `.json` にフォールバック
3. 拡張子に応じて `yq`（YAML）または `jq`（JSON）を使い分け

## 7. テスト方針

### 手動テスト

1. draftのreq/specを用意
2. `reqord req/spec approve` でPRを作成
3. PRをマージ
4. `Finalize Approval` ジョブが実行されることを確認
5. マージ先ブランチで対象のステータスが `approved` に更新されていることを確認

### 確認項目

- ブランチ名パターンのマッチング（正常系/異常系）
- JSONファイルの更新が正しいこと
- YAMLファイルの更新が正しいこと
- 冪等性: 2回実行しても同じ結果になること
- マージ以外のPRクローズでは実行されないこと

---

**総行数**: 約150行（ワークフローYAML）
**複雑度**: Small（シェルスクリプトのみ、外部依存なし）
**見積もり工数**: 2〜3時間（実装1h、テスト1.5h、ドキュメント0.5h）
