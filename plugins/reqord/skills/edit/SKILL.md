---
name: edit
description: reqordデータ（Requirement, Specification, ProjectContext）の編集・改善を統合的に行う。reqのSMART品質改善、specのdesign.md技術設計書の生成・更新、contextの充実化をカバーする。
argument-hint: "<req-id...|spec-id...|context|--all> (省略時は対話選択)"
allowed-tools: Read, Glob, Write, Bash(reqord:req *), Bash(reqord:spec *), Bash(reqord:context *), Bash(reqord:version *), Agent(Explore), AskUserQuestion
model: sonnet
---

## Scope

- **Do**: req/spec/contextの品質分析・改善案の提示・承認後の適用
- **Don't**: 実装コードの変更や検証。コードベース調査が必要な場合はexplorerエージェントを、設計の詳細化が必要な場合はarchitectエージェントを併用すること

---

> **ユーザー確認必須**: このスキルはreqordデータの変更を伴います。改善案の適用前にユーザーの承認を得てください。

# reqord-edit: データ編集・改善

reqordデータを分析し、品質改善案を提示し、承認後に適用する。

---

## 引数解析

ユーザー入力: `$ARGUMENTS`

パターンマッチ:

- `<req-id...>` → **edit req**（SMART品質改善）→ `resources/edit-req.md`
- `<spec-id...>` → **edit spec**（design.md生成・更新）→ `resources/edit-spec.md`
- `context` → **edit context**（ProjectContext充実化）→ `resources/edit-context.md`
- `--all` → design.md未記述の全specを対象 → `resources/edit-spec.md`
- 空 → AskUserQuestionで対象種別（req / spec / context）を選択してもらい、該当resourcesへ

IDは `req-NNNNNN` または `spec-NNNNNN` 形式（`/^(spec|req)-\d{6}$/`）であることを検証する。複数ID指定はスペースまたはカンマ区切り。形式不正な入力はエラーで拒否。

**引数を解析したら、対応するresourcesファイルを読み込んで手順を実行すること。**

---

## リファレンス（resources/）

| ファイル | 内容 | 読むタイミング |
|---------|------|--------------|
| `resources/edit-req.md` | Requirement品質改善の手順（SMART分析・改善案提示・適用） | edit req 実行時 |
| `resources/edit-spec.md` | design.md生成・更新の手順（6セクション構造・分割判断） | edit spec 実行時 |
| `resources/edit-context.md` | ProjectContext充実化の手順（参照ファイル作成・更新） | edit context 実行時 |

---

## エラーハンドリング

### ID が見つからない場合

```
<id> が見つかりません。
新規作成する場合は `/reqord:new req` または `/reqord:new spec` を使用してください。
既存IDの確認は `reqord req list` / `reqord spec list` で実行できます。
```

### reqord CLIが利用不可の場合

```
❌ reqord CLIが見つかりません。
インストール方法: npm install -g @reqord/cli
環境確認は `/reqord:setup --check` で実行できます。
```

直接ファイル読み取りによるフォールバックは行わない。
