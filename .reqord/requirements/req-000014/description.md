# 設計検証・要件カバレッジ

## 概要

SpecificationがProjectContextで定義されたアーキテクチャ原則・命名規則に準拠しているかを検証し、Requirementに対するカバレッジ状況を可視化する機能。

## ユーザーストーリー

アーキテクトとして、仕様が設計原則に準拠しているか自動検証したい。
なぜなら、設計品質を承認前に保証できるから。

## CLIコマンド仕様

### reqord spec validate \<id\>

Design Validationを実行し結果を表示:

1. **アーキテクチャ整合性チェック**
   - ProjectContext（technical.yaml）で定義されたDesign Patternsとの照合
   - 各パターンの準拠状態を `ok` / `warning` / `error` で判定

2. **命名規則チェック**
   - structure.yamlで定義された命名規則と設計書内のファイル名・クラス名を照合
   - 違反箇所をリスト表示

3. **依存関係コンフリクト検出**
   - design.md内で参照される依存関係の矛盾検出

出力例:

```
Design Validation: spec-001
  Architecture Alignment:
    ✅ Repository Pattern - ok
    ✅ Factory Pattern - ok
  Naming Conventions:
    ✅ ifc-exporter.ts - ok
  Dependency Conflicts: None
```

### reqord spec coverage \<id\>

Specificationが対象Requirementをどの程度カバーしているかを表示:

```
Requirement Coverage: spec-001
  | Req ID  | Title            | Status     | Section |
  | req-001 | IFC4エクスポート | ✅ Covered | 3.1     |
  | req-002 | 属性マッピング   | ⚠️ Partial | 3.2     |
  Overall: 1/2 fully covered (50%)
```

- `--json` で構造化出力
- coverageステータス: `covered` / `partial` / `not-covered`

## designValidation結果の記録

検証結果はSpecification JSONの `designValidation` フィールドに自動保存される。

## 技術的制約

- ProjectContextの読み取りが必要（req-000003）
- パターンマッチングはルールベース（AIは使用しない）
