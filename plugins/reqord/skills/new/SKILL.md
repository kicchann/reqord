---
name: new
description: reqordデータ（Requirement, Specification）の新規作成。対話的にデータを作成し、初期品質を確保する。
argument-hint: "<req|spec> [req-id] (specの場合はreq-idで紐づけ先を指定)"
allowed-tools: Read, Glob, Write, Bash(reqord:req *), Bash(reqord:spec *), Bash(reqord:context show *), AskUserQuestion
---

## Scope

- **Do**: req/specの新規作成、description.mdの初期記述、design.mdの初期テンプレート生成、ステータス遷移（approve）
- **Don't**: 既存データの編集・改善（`/reqord:edit` を使用）。design.mdの詳細記述（`/reqord:edit <spec-id>` で実施）

---

> **ユーザー確認必須**: このスキルはreqordデータの作成・ステータス変更を伴います。作成前にユーザーの承認を得てください。

# reqord-new: データ新規作成

reqordデータを対話的に新規作成する。

---

## 引数解析

ユーザー入力: `$ARGUMENTS`

パターンマッチ:

- `req` → **new req**（Requirement新規作成）→ `resources/new-req.md`
- `spec <req-id>` → **new spec**（Specification新規作成）→ `resources/new-spec.md`
- `spec` （req-id省略）→ AskUserQuestionで紐づけ先reqを選択 → `resources/new-spec.md`
- 空 → AskUserQuestionで種別（req / spec）を選択
- 上記以外 → エラー: `使い方: /reqord:new <req|spec> [req-id]`

**引数を解析したら、対応するresourcesファイルを読み込んで手順を実行すること。**

---

## リファレンス（resources/）

| ファイル | 内容 | 読むタイミング |
|---------|------|--------------|
| `resources/new-req.md` | Requirement新規作成の手順 | new req 実行時 |
| `resources/new-spec.md` | Specification新規作成の手順 | new spec 実行時 |

---

## エラーハンドリング

### reqord CLIが利用不可の場合

```
❌ reqord CLIが見つかりません。
インストール方法: npm install -g @reqord/cli
環境確認は `/reqord:setup --check` で実行できます。
```

直接ファイル読み取りによるフォールバックは行わない。
