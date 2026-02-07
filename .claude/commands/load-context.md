---
description: アプリ固有のコンテキストを読み込む
argument-hint: "<app-name: frontend|backend|backend-billing>"
allowed-tools: Read, Glob, LS
model: haiku
---

# アプリコンテキスト読み込み

指定されたアプリ（$ARGUMENTS）の設定を読み込み、以降の作業で活用できるようにします。

## 実行手順

1. **CLAUDE.md を読み込む**
   - `apps/$ARGUMENTS/CLAUDE.md` を読んで内容を把握
   - 重要なルール、アーキテクチャ、コマンドを要約

2. **利用可能なコマンド一覧**
   - `apps/$ARGUMENTS/.claude/commands/` 配下のファイルを列挙
   - 各コマンドの description を抽出して一覧表示

3. **利用可能なスキル一覧**
   - `apps/$ARGUMENTS/.claude/skills/` 配下のディレクトリを列挙
   - 各スキルの SKILL.md があれば概要を抽出

4. **ドキュメント一覧**
   - `apps/$ARGUMENTS/.claude/docs/` 配下のファイルを列挙

## 出力フォーマット

```
## $ARGUMENTS コンテキスト

### 重要ルール
- [CLAUDE.md から抽出した重要ルール]

### 利用可能コマンド
| コマンド | 説明 |
|---------|------|
| /xxx    | ... |

### 利用可能スキル
| スキル | 説明 |
|-------|------|
| xxx   | ... |

### 関連ドキュメント
- .claude/docs/xxx.md - 説明
```

## 注意

- 指定されたアプリのディレクトリが存在しない場合はエラーを報告
- .claude/ ディレクトリがない場合は CLAUDE.md のみを読み込む
- 以降の作業では、読み込んだコンテキストを考慮して対応すること
