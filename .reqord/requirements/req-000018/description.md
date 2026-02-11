# 実装検証

## 概要

Specificationで定義された設計に対して、実装の完了度を検証する機能。GitHub Issueの完了状態、コンポーネント実装の有無、テスト記述の確認を行う。

## ユーザーストーリー

テックリードとして、仕様に対する実装の完了度を検証したい。
なぜなら、リリース前に実装漏れを防げるから。

## CLIコマンド仕様

### reqord validate impl \<spec-id\>

1. **Issue完了チェック**
   - Specification内の全GitHub Issueの状態を確認
   - 未完了Issueをリスト表示

2. **コンポーネント実装チェック**
   - design.mdで定義されたコンポーネント・インターフェースの実装有無を確認
   - ファイル存在チェック + 基本的な構造照合

3. **テスト記述チェック**
   - design.mdのTesting Strategyに基づきテストファイルの存在確認
   - Unit Test / Integration Test の網羅性確認

出力例:
```
Implementation Validation: spec-001
  Issues:
    ✅ #123: IFC4 schema (closed)
    🔄 #124: Attribute mapper (open)
    ☐ #125: UI button (open)
    Progress: 1/3 (33%) [Threshold: 80%]
    Status: ❌ FAIL (below threshold)
  Components:
    ✅ src/export/ifc-exporter.ts
    ❌ src/export/attribute-mapper.ts (missing)
  Tests:
    ✅ tests/unit/ifc-exporter.test.ts
    ❌ tests/unit/attribute-mapper.test.ts (missing)
    ❌ tests/integration/export.test.ts (missing)
```

- `--json` で構造化出力
- `--strict` で全項目通過必須モード（CI向け）
  - Issue完了率100%・コンポーネント実装率100%・テストカバレッジ80%以上でない場合はexit code 1

## 技術的制約

- GitHub API + ファイルシステム走査を併用
- design.mdのパース精度に依存（セクション構造が標準化されている前提）
