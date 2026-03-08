# reqord-plugin 残課題

## High Priority

### 要件ブートストラップのスキル不足

**問題**: ~~要件の作成・初期記述を支援するスキルがない。~~ → `/reqord:new` スキルで対応済み。

残課題: `reqord init` → `reqord context init` の初期化ステップはsetupスキルでカバーされているが、初期化→new req→new spec→edit specの一気通貫フローの導線が弱い。

### フィードバック→修正実装ループの不明瞭さ

**問題**: `/reqord:feedback` で flag 付与・close した後、修正実装→flag解消→再検証のフローが定義されていない。flag 付き spec の修正を「どのスキルで行うか」が曖昧。

**対応案**: feedback の close 後・Step 8（resolve）の前に、修正実装フローの案内を追加:

```
次のステップ:
1. design.md確認・更新: /reqord:edit spec-NNNNNN
2. 修正実装: /reqord:brief spec-NNNNNN
3. flag解消: reqord feedback resolve <artifact-id> --issue <N>
4. 再検証: /reqord:verify done spec-NNNNNN
```

### プロアクティブな品質レビュー・issue起票の仕組みがない

**問題**: 現在のプラグインは「外部から報告されたissueを処理する」リアクティブなフローしかない。プロジェクトの品質を自発的にレビューし、問題を発見してfeedback issueを起票するサイクルが欠落している。

`docs/report/20260211_improvement-review-meeting.md` のような包括的な検証を定期的・体系的に行う仕組みがない。

**不足しているもの**:
- 実装済みspec/reqに対する定期的な品質レビュー（design.mdと実コードの乖離、テスト不足、アーキテクチャ違反等）
- レビュー結果からGitHub issueを自動起票するフロー
- 起票されたissueを `/reqord:feedback` に流して消化する自動サイクル

**対応案**:
- (A) `review` スキルを新設: 実装済みspec群を対象に reqord-reviewer エージェントで品質レビュー → 問題発見 → `gh issue create` で起票 → `/reqord:feedback` への導線
- (B) `health-check` スキルを新設: status の拡張版として、進捗だけでなく品質メトリクス（テストカバレッジ、flag残存数、design.md乖離度等）を計測し、閾値を超えたらissue起票を提案
- (C) 上記を組み合わせた `improve` スキル: レビュー → issue起票 → feedback消化 → 修正実装までの一気通貫サイクル

**備考**: これはプラグインだけでなくreqord本体（CLI）側の機能拡張とも関わる。`reqord review` や `reqord health` のようなCLIコマンドとの連携を検討する必要がある。

### 発見したfeedback issueの自発的消化サイクルがない

**問題**: 上記でissueを起票できたとしても、それを自発的に消化する仕組みがない。現状は人間が `/reqord:feedback` を手動実行→ `/reqord:brief` で修正という流れで、「溜まったfeedbackを定期的に棚卸しして優先度順に消化する」運用が未定義。

**対応案**:
- (A) `feedback` スキルに `triage` サブコマンドを追加: 未処理feedback一覧 → severity/type別に優先度付け → 上位N件を自動的にlink→close→修正実装フローに流す
- (B) `status` スキルの拡張: 未処理feedback数・severity分布を表示し、critical/highがあれば通常開発より先にfeedback消化を推奨する
- (C) CI/hookとの連携: コミット時やPR作成時にfeedback残存チェックを行い、critical feedbackが放置されていたら警告

### 定期的な品質チェック・リファクタリングのトリガー設計

**問題**: 上記2件を実現するには「いつ実行するか」のトリガーが必要だが、適切な指標が定まっていない。

**時間ベース（N日おき）の問題**: AI開発では1セッションで数百行の変更が発生しうるため、人間の開発ペースを前提とした時間間隔は指標として機能しない。1週間分のAI開発は人間の数ヶ月分に相当する場合がある。

**ボリュームベース（行数・コミット数）の問題**: 追加行数やコミット数での管理はトラッキングコストが高く、行数と品質劣化の相関も不明瞭。

**検討すべきトリガー候補**:
- イベント駆動: spec N件の implement 完了ごと、PR N件マージごと
- マイルストーン駆動: requirement 単位の完了時に包括レビュー
- 品質メトリクス駆動: テストカバレッジ低下、lint警告増加を検知
- セッション駆動: `/reqord:status` 実行時に前回チェックからの変更量を算出し、閾値超過で促す
- 手動: 人間が「そろそろやるか」と判断（現状の暗黙的な運用）

**未解決**: AI開発に適した「鮮度」の定義と計測方法。要検討。

## Medium Priority

## Low Priority

### status の推奨アクションから次のスキルへの接続

**問題**: `/reqord:status` が推奨 spec-id を表示した後、ユーザーが spec-id をコピペして次のコマンドを叩く必要がある。自然ではあるが、もう一声欲しい。

**対応案**: AskUserQuestion で「このまま着手しますか？」を提示し、承認されたら `/reqord:brief` を続行する導線を追加。
