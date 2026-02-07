---
paths: /never/match/folder/**
---

# コマンド移行ガイド

## 変更の理由

2文字や3文字の略語ベースのコマンド名を、動詞始まりの明確な命名に変更しました。これにより、コマンドの意図が即座に理解できるようになり、学習コストが大幅に削減されます。

## 命名規則

### 基本原則

1. **動詞始まり**: すべてのコマンドは動作を表す動詞で始める
2. **明確性優先**: 略語を避け、即座に理解できる名前にする
3. **ハイフン区切り**: 複数単語は `-` で接続（例: `check-branch`）
4. **一貫したパターン**: 同種の操作には同じ動詞を使用

### 動詞カテゴリ

- **check**: 状態確認・検証（`check-branch`, `check-ci`, `check-merge`）
- **show/list**: 情報表示（`show-issue`, `list-issues`, `show-reviews`）
- **create**: 新規作成（`create-branch`, `create-pr`, `create-command`）
- **run**: 実行（`run-lint`, `run-tests`, `run-self-review`）
- **update**: 更新（`update-claude-md`, `update-changelog`, `update-readme`）
- **その他**: close, switch, clean, resolve, fix, reply等

## 完全な移行マップ

### 高頻度コマンド

| 旧名称 | 新名称 | 変更内容 |
|--------|--------|----------|
| `/bc` | `/check-branch` | branch check の略語を廃止 |
| `/suc` | `/update-claude-md` | suggest updating CLAUDE.md → 動詞始まりに |

### GitHub統合コマンド

| 旧名称 | 新名称 | 変更内容 |
|--------|--------|----------|
| `/il` | `/list-issues` | issue list の略語を廃止 |
| `/id` | `/show-issue` | issue detail → show 動詞に統一 |
| `/pr` | `/create-pr` | 動詞を追加 |
| `/prd` | `/create-draft-pr` | ドラフトを明示 |
| `/mg` | `/check-merge` | merge check の略語を廃止 |
| `/rv` | `/show-reviews` | review → 複数形 + 動詞 |
| `/close` | `/close-issue` | 対象を明示 |

### ブランチ管理コマンド

| 旧名称 | 新名称 | 変更内容 |
|--------|--------|----------|
| `/bl` | `/list-branches` | branch list の略語を廃止 |
| `/bn` | `/create-branch` | branch new → 動詞始まりに |
| `/bs` | `/switch-branch` | branch switch の略語を廃止 |
| `/clean` | `/clean-branches` | 対象を明示 |

### CI/CDとドキュメント

| 旧名称 | 新名称 | 変更内容 |
|--------|--------|----------|
| `/ci` | `/check-ci` | 動詞を追加 |
| `/cov` | `/show-coverage` | coverage の略語を廃止 |
| `/suc` | `/update-claude-md` | 非常に分かりやすく |
| `/sucl` | `/update-changelog` | ターゲットファイルを明示 |
| `/sur` | `/update-readme` | ターゲットファイルを明示 |

### レビューとマージ

| 旧名称 | 新名称 | 変更内容 |
|--------|--------|----------|
| `/code-review` | `/review-pr` | 短縮かつ明確 |
| `/self` | `/run-self-review` | 動作を明確に |
| `/reply` | `/reply-review` | 対象を明示 |
| `/fix` | `/fix-review-issues` | 対象を明示 |

### 品質チェック

| 旧名称 | 新名称 | 変更内容 |
|--------|--------|----------|
| `/full-check` | `/run-full-check` | 動詞を追加 |
| `/deploy-ready` | `/check-deploy` | 動詞始まり + 短縮 |

### Git操作

| 旧名称 | 新名称 | 変更内容 |
|--------|--------|----------|
| `/conflicts` | `/resolve-conflicts` | 動詞を追加 |
| `/diff` | `/show-diff` | 動詞を追加 |
| `/reset` | `/reset-changes` | 対象を明示 |
| `/rollback` | `/rollback-commit` | 対象を明示 |
| `/stash` | `/stash-changes` | 対象を明示 |

### ドキュメント生成

| 旧名称 | 新名称 | 変更内容 |
|--------|--------|----------|
| `/prt` | `/generate-pr-template` | 動作を明確に |
| `/retro` | `/create-retrospective` | 動詞始まりに |
| `/rcd` | `/rollback-claude-md` | ターゲットを明示 |

### その他

| 旧名称 | 新名称 | 変更内容 |
|--------|--------|----------|
| `/new-command` | `/create-command` | create で統一 |

## 後方互換性

旧コマンド名は当面サポートされますが、非推奨警告が表示されます。

### エイリアスの動作

- 旧コマンドを実行すると、先頭に **⚠️ このコマンドは非推奨です** という警告が表示されます
- 新しいコマンド名が明示されます
- 機能は引き続き動作します（後方互換性を維持）

### 例

```
$ /bc

⚠️ このコマンドは非推奨です

新しいコマンド: /check-branch を使用してください。

このコマンドは後方互換性のために残されていますが、将来のバージョンで削除される予定です。

## 移行ガイド

- 旧: /bc
- 新: /check-branch

詳細は .claude/rules/command-migration-guide.md を参照してください。

---

# ブランチチェック
...
```

## 移行スケジュール

### Phase 1 (即座): 新コマンドの利用開始

- ✅ すべての新コマンドが利用可能
- ✅ ドキュメントは新コマンド名に更新済み
- ✅ 旧コマンドも動作（非推奨警告付き）

### Phase 2 (3ヶ月後): 旧コマンドに非推奨警告強化

- 旧コマンド実行時により目立つ警告を表示
- ログに移行を促すメッセージを記録

### Phase 3 (6ヶ月後): 旧コマンドの削除を検討

- 使用状況を確認
- 使用率が十分低下した場合、旧コマンドファイルを削除

## よくある質問

### Q: なぜ今回の変更が必要だったのか？

A: 2文字の略語（bc, mg, rv等）は、初見では意味が分からず、学習コストが高くなっていました。動詞始まりの明確な名前にすることで、コマンドの目的が即座に理解できるようになります。

### Q: 古いコマンドはいつまで使えるか？

A: 最低6ヶ月間はサポートされますが、できるだけ早く新コマンドへの移行を推奨します。

### Q: 一度にすべて覚える必要があるか？

A: いいえ。よく使うコマンドから徐々に移行してください。旧コマンドを実行すると新コマンド名が表示されるので、自然に覚えられます。

### Q: スクリプトやドキュメントの更新は必要か？

A: プロジェクト内のドキュメントは既に更新済みです。個人的なメモやスクリプトがある場合は、時間のあるときに更新してください。

## 移行のヒント

### 1. 頻繁に使うコマンドから覚える

以下の高頻度コマンドを優先して覚えましょう:

```
/check-branch    (旧: /bc)
/update-claude-md (旧: /suc)
/create-pr        (旧: /pr)
/check-merge      (旧: /mg)
/review-pr        (旧: /code-review)
```

### 2. パターンを理解する

動詞のパターンを覚えれば、推測できるようになります:

- `check-*`: 状態確認
- `show-*/list-*`: 情報表示
- `create-*`: 新規作成
- `run-*`: 実行
- `update-*`: 更新

### 3. タブ補完を活用

Claude Code のコマンド補完機能を使えば、コマンド名を途中まで入力するだけで候補が表示されます。

## トラブルシューティング

### 新コマンドが見つからない

```bash
# コマンドファイルの存在を確認
ls -la .claude/commands/ | grep <command-name>
```

すべての新コマンドファイルが存在することを確認してください。

### 旧コマンドが警告なしで動作する

エイリアスファイルが正しく更新されていない可能性があります。`.claude/commands/<old-name>.md` の内容を確認してください。

## サポート

質問や問題がある場合は、GitHub Issue で報告してください。

---

最終更新: 2026-01-23
