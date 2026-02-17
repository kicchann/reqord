# TDD実装フェーズ（implement-phase）

SKILL.md の Step 5 で参照されるTDD実装の詳細手順。

---

## reqord-implementerエージェントへの委譲

### プロンプト構成

以下の情報をまとめてreqord-implementer（tdd-implementer）エージェントに渡す:

```
## 目的
spec-NNNNNN の実装をTDD（Red-Green-Refactor）で行ってください。

## 実装ブループリント
[Step 4で生成した実装計画の全文]

## Design Document
[design.md の全文]

## Success Criteria
[requirementのsuccessCriteriaリスト]

## 既存コードパターン
[Step 3の調査結果から抽出した実装パターン]

## 制約事項
- ProjectContextのtechnical.yaml/structure.yamlに定義された技術スタック・命名規則に従うこと
- 既存の命名規則・コード構造に従うこと
```

---

## 実装の進め方

### フェーズ分割実行

実装ブループリントのBuild Sequenceに従い、フェーズごとに実行する。

```
Phase 1: スキーマ・型定義（shared）
  → テスト作成 → 実装 → テスト通過確認

Phase 2: コアロジック（shared or cli）
  → テスト作成 → 実装 → テスト通過確認

Phase 3: コマンド・UI層（cli or web）
  → テスト作成 → 実装 → テスト通過確認

Phase 4: 統合・結合
  → 統合テスト → 全体テスト実行
```

### 各フェーズのサイクル

1. **テスト作成（Red）**: success criteriaに対応するテストを書く
2. **テスト実行**: 失敗を確認（Red確認）
3. **実装（Green）**: テストが通る最小限のコードを書く
4. **テスト実行**: 全テスト通過を確認（Green確認）
5. **リファクタ**: コード品質を改善（テストはGreenのまま）

---

## コンポーネント並列実装

依存関係のないコンポーネントは並列実装が可能。

### 並列化判断

```
依存グラフ例:
  schema.ts ← service.ts ← command.ts
                          ← handler.ts

→ schema.ts を先に実装
→ service.ts を次に実装
→ command.ts と handler.ts は並列実装可能
```

### 並列実装時の注意

- 共通依存（schema等）は先に完成させる
- 並列実装する各コンポーネントは独立してテスト可能であること
- 並列実装後に統合テストを実行する

---

## テスト実行・確認手順

### 各フェーズ完了時

ProjectContextの`technical.yaml`に定義されたテスト・型チェック・リントコマンドを実行する。

### 全フェーズ完了時

全テスト・型チェック・リントを実行する。コマンドは`technical.yaml`の定義に従う。

エラーがある場合は修正してから次へ進む。テスト失敗を放置しない。

---

## Success Criteriaとテストの対応

各success criteriaに対して、少なくとも1つのテストケースを作成する。

### テスト名の規約

- **言語**: ProjectContextの `language` フィールドに従う（例: `ja` なら日本語）
- **命名スタイル**: 「should ...」ではなく、**振る舞いの事実を平叙文で記述**する
  - Bad: `"should return error when id is invalid"`
  - Good: `"無効なIDの場合エラーを返す"` / `"invalid id returns error"`

### 対応表の作成

実装完了時に以下の対応表を作成し、SKILL.md Step 7 に渡す:

```
| # | Success Criteria | テストファイル | テスト名 | 結果 |
|---|-----------------|--------------|---------|------|
| 1 | [基準1] | xxx.test.ts:L10 | "正常な入力で要件を作成できる" | PASS |
| 2 | [基準2] | xxx.test.ts:L25 | "必須フィールド未指定でバリデーションエラー" | PASS |
| 3 | [基準3] | yyy.test.ts:L8 | "依存先が未実装の場合ブロック状態を返す" | PASS |
```

### 未充足の基準がある場合

- 技術的に実装不可能な場合: 理由を明記
- スコープ外と判断した場合: 理由を明記してユーザーに確認
- 部分的に充足の場合: 充足している部分と未充足部分を区別
