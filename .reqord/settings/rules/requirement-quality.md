# Requirement Quality Rules

## DO (必ず守ること)

- EARS形式またはUser Story形式を使用する
- 測定可能な成功基準を3-7個定義する
- 依存関係を明記する（blockedBy, blocks, relatedTo）
- 見積もり複雑度と工数を記載する
- ドメイン用語を正確に使用する（context/domain/ 参照）

## DO NOT (避けること)

- 曖昧な表現を使わない（"なるべく", "適切に", "できれば"）
- 複数の要件を1つに混ぜない（単一責任）
- 実装詳細を要件に含めない（What, not How）
- テスト不可能な基準を書かない
- 依存関係の循環を作らない

## Validation Checklist

- [ ] タイトルが明確（50文字以内）
- [ ] EARS形式またはUser Story形式で記述されている
- [ ] 成功基準が3-7個ある
- [ ] すべての成功基準が測定可能
- [ ] 依存関係に循環がない
- [ ] 見積もりが妥当（1-40時間）
- [ ] description.md にユースケースまたは詳細要件がある

## Auto-validation

Claude Code Commandsで自動検証:

- EARS構文チェック（trigger/condition/action/response）
- 循環依存検出（blockedBy/blocks のグラフ分析）
- 曖昧語句検出（禁止ワードリスト照合）
- 成功基準の数チェック（3-7個）
- 見積もり範囲チェック（1-40時間）
