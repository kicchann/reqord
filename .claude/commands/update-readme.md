---
description: README.md更新提案を生成する
allowed-tools: Bash(git:*), Read, Glob, Grep, AskUserQuestion
model: sonnet
---

# README.md 更新提案

コードの変更内容を分析し、README.mdの更新提案を生成します。

## 実行手順

### 1. README.mdの確認

```bash
# README.mdの存在確認
ls -la README.md 2>/dev/null || echo "README.md not found"
```

README.mdがない場合は新規作成を提案。

### 2. 現在のREADMEを読み込み

```bash
cat README.md
```

### 3. 最近の変更を分析

```bash
# 最近のコミット
git log --oneline -20

# 変更されたファイル
git diff origin/main...HEAD --name-only 2>/dev/null || git log --name-only --oneline -10
```

### 4. 更新が必要な箇所を特定

以下の観点でREADMEを分析:

| セクション | 確認項目 |
|-----------|---------|
| Features | 新機能が追加されたか |
| Installation | 依存関係の変更はあるか |
| Usage | 使い方に変更はあるか |
| Configuration | 設定項目の変更はあるか |
| Commands | 新しいコマンドが追加されたか |

### 5. 更新提案の生成

変更内容に基づいて更新提案を生成:

```markdown
## README.md 更新提案

### 追加が必要な内容

#### Features セクション
- [ ] 新機能Xの説明を追加

#### Commands セクション
- [ ] `/new-command` の説明を追加

### 修正が必要な内容

#### Installation セクション
- [ ] 依存関係の更新を反映

### 削除が推奨される内容

- [ ] 廃止された機能Yの説明
```

### 6. AskUserQuestionで確認

提案内容をユーザーに提示し、以下を選択:
- 「提案を適用する」
- 「一部のみ適用する」
- 「適用しない」

### 7. 適用（承認時）

承認された場合、Editツールを使用してREADME.mdを更新。

## 出力フォーマット

```
=== README.md 更新提案 ===

現在のバージョン: [最終更新日]
分析したコミット数: N

## 提案内容

[提案詳細]

## 変更プレビュー

[差分プレビュー]
```

## 使用例

```
/update-readme
```

→ README.mdの更新提案を生成

## 注意事項

- 既存の内容を尊重
- 過度な変更は避ける
- ユーザー確認後に適用
