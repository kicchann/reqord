# traceサブコマンド詳細

req-idまたはspec-idを起点にトレーサビリティチェーンを可視化する。

---

## Step 1: 起点特定

引数が `req-NNNNNN` の場合 → req-idとして扱う
引数が `spec-NNNNNN` の場合 → spec-idとして扱い、requirementIdからreq-idも取得

```bash
reqord req show <req-id> --json
```

## Step 2+3: 関連データ取得（並列実行）

以下を**並列で実行**する:

```bash
reqord spec list --requirement <req-id> --json   # 関連Specification一覧
reqord impact analyze <id> --json                 # 依存関係（blockedBy, blocks, relatedTo）
reqord feedback list --json                       # フィードバック一覧
```

## Step 4+5: コード内参照 & Git履歴検索（並列実行）

以下を**並列で実行**する:

**コード内参照検索:**

各spec-id, req-idについて、Grepツールで検索する:

- パターン: `spec-NNNNNN` / `req-NNNNNN`
- 対象: `*.ts`, `*.md` ファイル
- 出力モード: `files_with_matches`

**Git履歴・PR検索:**

```bash
git log --oneline --grep "spec-NNNNNN"
git log --oneline --grep "req-NNNNNN"
gh pr list --search "spec-NNNNNN" --json number,title,state --limit 10
gh pr list --search "req-NNNNNN" --json number,title,state --limit 10
```

## Step 6: トレーサビリティマップ表示

```
## Traceability Map

req-NNNNNN: <req-title> (<req-status>)
├── spec-NNNNNN: <spec-title> (implemented)
│   ├── commits: abc1234, def5678
│   ├── PRs: #42 (merged), #45 (open)
│   └── code: packages/cli/src/commands/xxx.ts
│              packages/shared/src/schemas/yyy.ts
├── spec-NNNNNN: <spec-title> (approved)
│   └── (未実装)
├── spec-NNNNNN: <spec-title> (draft)
│   └── (未実装)
├── dependencies:
│   ├── blockedBy: req-NNNNNN
│   └── blocks: req-NNNNNN
└── feedback:
    ├── #208: <title> (bug, closed)
    └── #215: <title> (improvement, open)
```
