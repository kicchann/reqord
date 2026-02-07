---
description: ブランチ状態を確認し、mainなら警告・ブランチ作成を促す
allowed-tools: Bash(git:*), AskUserQuestion
model: haiku
---

# ブランチチェック

作業開始前にブランチ状態を確認し、mainブランチでの作業を防止します。

## 実行手順

### 1. 現在のブランチを確認

```bash
git branch --show-current
```

### 2. ブランチ判定

**mainまたはmasterの場合:**

1. 警告を表示:
   ```
   ⚠️ 警告: mainブランチで作業しようとしています
   mainブランチでの直接作業は推奨されません。
   ```

2. AskUserQuestionで選択肢を提示:
   - `/create-branch` でissueからブランチを作成する
   - 手動でブランチ名を指定して作成する
   - mainで続行する（非推奨）

3. 選択に応じた処理:
   - `/create-branch` 選択時: 「`/create-branch <issue番号>` を実行してください」と案内
   - 手動作成選択時: ブランチ名を聞いて `git checkout -b <name>` を実行
   - mainで続行選択時: 警告を再表示し、確認後に続行

**featureブランチの場合:**

```
✓ ブランチ: <branch-name>
  作業を開始できます。
```

## 使い方

実装開始前に実行:

```
/check-branch
/feature-dev <機能説明>
```

または issue番号がある場合:

```
/create-branch #123
/feature-dev <機能説明>
```
