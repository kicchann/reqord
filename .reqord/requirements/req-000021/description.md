# EARS形式変換

> **DEPRECATED (v1.1.0)**: Anthropic SDKを使用したAI変換機能はreqord CLIの責務外。Claude Codeエコシステム（/reqord:refineコマンド等）で実現する。formatフィールドの保存はreq-000002が担当。詳細は Feedback #17 を参照。

## 概要

Requirementの記述形式をEARS（Easy Approach to Requirements Syntax）、ユーザーストーリー、自由記述の間で相互変換する機能。AIを活用して自然な変換を実現する。

## ユーザーストーリー

開発者として、要件を異なるフォーマット（EARS/ユーザーストーリー/自由記述）に変換したい。
なぜなら、プロジェクトのニーズに合った要件記述形式を選択できるから。

## CLIコマンド仕様

### reqord req format \<id\> \<format-type\>

format-type: `ears` | `user-story` | `free-form`

1. 現在のRequirement内容（title, description.md, successCriteria）を読み取り
2. AI（Anthropic SDK）で指定形式に変換
3. Requirement JSONの `format` フィールドを更新
4. 変換前後をdiff表示して確認を求める
5. 確認後に保存

## EARS形式の種類

| Type | Template |
|------|----------|
| ubiquitous | The system shall \<action\> |
| event-driven | When \<trigger\>, the system shall \<action\> |
| state-driven | While \<state\>, the system shall \<action\> |
| optional | Where \<feature\>, the system shall \<action\> |
| unwanted | If \<condition\>, then the system shall \<action\> |

## 変換例

**user-story → ears (event-driven):**
```
Before:
  As: 開発者
  I want: IFCファイルをエクスポートしたい
  So that: 構造データを他ツールに渡せる

After:
  Type: event-driven
  Trigger: user exports model
  Condition: model contains structural elements
  Action: the system shall export to IFC4 format
  Response: preserving all structural attributes
```

## 技術的制約

- Anthropic SDK（Claude API）を使用
- 変換は非破壊（確認プロンプト後に適用）
- `--dry-run` で変換結果のプレビューのみ
