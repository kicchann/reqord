# Git操作規約

reqordプロジェクトでのGit操作における命名規則・テンプレート。
ブランチ作成・コミット・PR作成時にトレーサビリティを付与するための規約。

---

## ブランチ命名規則

```
<prefix>/spec-NNNNNN-<sanitized-title>
```

- **prefix**: `.reqord/settings/setting.yaml` の `branchNaming` 設定を確認する。未設定の場合は `feature`（デフォルト）。他に `fix`, `refactor`, `docs`, `chore` を使い分ける
- **sanitized-title**: specのtitleを小文字化、英数字とハイフン以外を除去、50文字以内

### 関連Issueがある場合

```
<type>/spec-NNNNNN-issues-<N1>-<N2>-<sanitized-title>
```

### 例

```
feature/spec-000042-add-version-command
fix/spec-000015-issues-208-fix-validation-error
```

---

## コミットメッセージ

```
<type>(<scope>): <summary>

Implements spec-NNNNNN (req-NNNNNN: <req-title>)
```

- **type**: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`
- **scope**: 変更対象のパッケージやモジュール（ProjectContextの`structure.yaml`を参考に判断）
- **summary**: 変更内容を簡潔に（50文字以内）

---

## PRテンプレート

```markdown
## Specification

**spec-NNNNNN**: <spec-title>

## Requirement

**req-NNNNNN**: <req-title>

## Success Criteria

- [ ] <criterion-1>
- [ ] <criterion-2>
- [ ] <criterion-3>

## Changes

<変更ファイルの要約>
```

---

## `.reqord/`変更時の注意

コミット対象に`.reqord/`配下のファイル（description.md, design.md等）が含まれる場合、コミット前にバージョンバンプが必要か確認する:

```bash
reqord version <id> --patch --summary "<変更概要>"
```

`.reqord/`配下のYAMLフィールド（version, versionHistory, flags等）は直接編集せず、CLIコマンドを使用すること。
