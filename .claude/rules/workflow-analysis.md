---
paths: /never/match/folder/**
---

# 開発フロー - 人間介入ポイント明示版

## 凡例

- 🤖 Claude自動処理
- 👤 人間の判断・介入が必要

---

## WorkFlow

### issue理解

存在する.shでghをインストール
以下を説明issueNN

### 修正

/feature-dev
 /update-claude-md (suggest updating claude.md)

### PR

/quick-pr
 /test
 /review-pr
 /commit-push-pr

### 人間レビュー

### merge

## コマンド実装状況

### 準備フェーズ

- [x] 🤖 `/list-issues` (issue list) - issue一覧確認
- [x] 👤 `/show-issue` (issue detail) - 指定したissueの詳細表示
- [x] 👤 `/create-branch` (branch new) - issue番号からブランチ作成
- [x] 👤 `/switch-branch` (branch switch) - ブランチ切り替え
- [x] 🤖 `/list-branches` (branch list) - ブランチ一覧表示
- [x] 🤖 `/check-branch` (branch check) - ブランチ状態確認・mainなら警告

### 実装フェーズ

- [x] 🤖 `/feature-dev` (implement) - 実装
- [x] 🤖 `/update-claude-md` (suggest updating CLAUDE.md) - CLAUDE.md更新提案

### 検証フェーズ

- [x] 🤖 `/test` - テスト実行（pytest + カバレッジ確認 + 失敗時対処）
- [x] 🤖 `/lint` - Linter/Formatter実行（ruff, black, mypy）
- [x] 🤖 `/show-coverage` - カバレッジレポート詳細表示

### レビュー準備フェーズ

- [x] 🤖 `/review-pr` - コードレビュー
- [x] 👤 `/run-self-review` - セルフレビューチェックリスト実行
- [x] 👤 `/show-diff` - 変更差分の整理・サマリー作成

### PR作成フェーズ

- [x] 🤖 `/commit-push-pr` - コミット・プッシュ・PR作成
- [x] 👤 `/create-pr` - PR作成（シンプル版）
- [x] 👤 `/create-draft-pr` (PR draft) - ドラフトPR作成
- [x] 🤖 `/generate-pr-template` (PR template) - PR説明文テンプレート生成

### レビュー対応フェーズ

- [x] 👤 `/show-reviews` (review comments) - レビューコメント一覧表示
- [x] 👤 `/reply-review` - レビューコメントへの返信作成
- [x] 👤 `/fix-review-issues` - レビュー指摘事項の修正実装

### マージフェーズ

- [x] 🤖 `/check-ci` - CI/CD結果確認
- [x] 👤 `/check-merge` (merge check) - マージ前最終チェック（CI、Approve、コンフリクト）
- [x] 🤖 `/clean-branches` - マージ後のブランチ削除（local & remote）

### 事後処理フェーズ

- [x] 👤 `/close-issue` - issue close（コメント付き）
- [x] 👤 `/create-retrospective` - 振り返りメモ作成テンプレート

### ドキュメント管理

#### CLAUDE.md管理

- [x] 🤖 `/update-claude-md` (suggest updating CLAUDE.md) - CLAUDE.md更新提案・適用
- [x] 🤖 `/check-claude-md` - CLAUDE.mdをベストプラクティスに照らしてチェック
- [x] 🤖 `/rollback-claude-md` (review CLAUDE.md diff) - CLAUDE.md変更差分確認・ロールバック
- [ ] 🤖 `/ac` (add to CLAUDE.md) - CLAUDE.mdにルール追加実行

#### README管理

- [x] 🤖 `/update-readme` (suggest updating README) - README.md更新提案
- [ ] 🤖 `/ur` (update README) - README.md更新実行

#### CHANGELOG管理

- [x] 🤖 `/update-changelog` (suggest updating CHANGELOG) - CHANGELOG.md更新提案
- [ ] 🤖 `/ucl` (update CHANGELOG) - CHANGELOG.md更新実行

#### ドキュメント全体管理

- [ ] 🤖 `/sud` (suggest updating docs) - 全ドキュメント更新提案（CLAUDE.md + README + CHANGELOG）
- [ ] 🤖 `/ud` (update docs) - 全ドキュメント更新実行

### トラブル対処フェーズ

- [x] 🤖 `/reset-changes` - 変更の取り消し
- [x] 🤖 `/stash-changes` - 一時退避
- [x] 👤 `/resolve-conflicts` - コンフリクト解決支援
- [x] 🤖 `/rollback-commit` - 直前のコミット取り消し

### 開発支援フェーズ

- [x] 🤖 `/create-command` - 新しいコマンドファイルのテンプレート生成
- [x] 🤖 `/sync-plugins` - プラグインマーケットプレイスへの同期

### 複合コマンド（ワンライナー）

- [x] 🤖 `/quick-pr` - `/test` + `/review-pr` + `/commit-push-pr` の一括実行
- [x] 🤖 `/run-full-check` - `/lint` + `/test` + `/show-coverage` の一括実行
- [x] 🤖 `/check-deploy` - デプロイ前の全チェック実行

---

## その他TODO

- [ ] プロジェクトにCode-Reviewプラグインを追加
- [ ] /create-prなどの反復的な/コマンドの例を調べる
- [ ] githubアプリでコードレビュー中に @claudeで新しいルールを CLAUDE.md に自動追加
- [ ] allowの整ったsetting.jsonをプロジェクトに追加
- [ ] ralphを試し、claude.aiでの利用挑戦
- [ ] pytest実行するhooksの.sh作る
- [ ] pytestのhooksをプロジェクトに追加する

## 【準備フェーズ】

- [X] 🤖 issue一覧確認 `/list-issues`
- [ ] 👤 **【人間】issue選択・優先順位判断**
- [ ] 👤 **【人間】issue理解・不明点の確認**
  - 存在する.shでghをインストール
  - issueNNを説明で理解
  - **仕様の曖昧さを人間が判断**
- [ ] 🤖 ブランチ戦略確認
- [ ] 👤 **【人間】ブランチ名・戦略の最終決定**
- [ ] 🤖 依存関係チェック
  - 関連issueの有無確認
  - 既存PRとのコンフリクト可能性
- [ ] 👤 **【人間】依存関係の対処方針決定**

---

## 【実装フェーズ】

- [ ] 🤖 実装前準備
  - CLAUDE.mdのルール確認
  - TDD推奨: 先にテスト書く？
- [ ] 🤖 `/feature-dev` (implement)
- [ ] 👤 **【人間】実装方針のレビュー・修正指示**
  - **複数の実装案がある場合の選択**
  - **パフォーマンス vs 可読性のトレードオフ判断**
- [ ] 🤖 `/update-claude-md` (suggest updating claude.md)
  - 提案内容のレビュー（本当に追加すべき？）
  - ルールの重複チェック
- [ ] 👤 **【人間】CLAUDE.mdルール追加の承認**
  - **本当にルール化すべきか判断**

---

## 【検証フェーズ】

- [ ] 👤 **【人間】ローカル動作確認**
  - **実際に触ってみる**
  - **UXの感覚的評価**
  - エッジケースの検証
- [ ] 🤖 `/trp` (test run pytest?)
- [ ] 🤖 `/test`
  - テストカバレッジ確認
  - 失敗時の対処フロー定義
- [ ] 👤 **【人間】テスト結果の解釈**
  - **失敗時の原因分析**
  - **テストケースの妥当性判断**
- [ ] 🤖 Linter/Formatter実行
  - ruff, black, mypyなど
  - `.sh`での自動実行も検討
- [ ] 👤 **【人間】警告の許容可否判断**

---

## 【レビュー準備フェーズ】

- [ ] 🤖 `/review-pr`
- [ ] 👤 **【人間】セルフレビュー**
  - **コード全体を俯瞰して違和感チェック**
  - **「これで本当にいいか？」の最終確認**
  - セルフレビューチェックリスト:
    - [ ] コメント・docstring追加済み？
    - [ ] 不要なコード削除済み？
    - [ ] ハードコード値の定数化済み？
- [ ] 👤 **【人間】変更内容の整理・表現決定**
  - **どう説明すれば伝わるか考える**
  - 何を変更したか箇条書き
  - なぜ変更したか理由明記
  - スクリーンショット（UI変更時）

---

## 【PR作成フェーズ】

- [ ] 🤖 `/commit-push-pr`
  - コミットメッセージの品質確認
    - Conventional Commits形式？
    - issue番号参照？（#24）
  - PR説明文の自動生成
    - 変更内容
    - テスト方法
    - スクリーンショット（必要時）
    - 関連issue/PR
- [ ] 👤 **【人間】PR説明文の最終チェック・修正**
  - **自動生成された文章の調整**
  - **強調すべきポイントの追加**
- [ ] 👤 **【人間】ラベル・マイルストーン設定**
- [ ] 👤 **【人間】レビュアー指定**
  - **誰にレビューしてもらうべきか判断**

---

## 【ドキュメント更新フェーズ】

- [ ] 🤖 `/update-claude-md` (suggest updating CLAUDE.md) で提案・適用
- [ ] 🤖 `/rollback-claude-md` (review claude.md diff) で変更確認
  - カテゴリ分類の適切性確認
- [ ] 👤 **【人間】CLAUDE.md変更の最終承認**
- [ ] 👤 **【人間】README更新の必要性確認**
  - 新機能追加時
  - 使い方変更時
- [ ] 🤖 CHANGELOGの更新
- [ ] 👤 **【人間】README等の更新内容レビュー**

---

## 【人間レビュー待機フェーズ】

- [ ] 🤖 CI/CDの結果確認
  - GitHub Actionsのパス確認
  - カバレッジレポート確認
- [ ] 👤 **【人間】CI失敗時の対処判断**
- [ ] 👤 **【人間】レビュー依頼（必要なら催促）**
- [ ] 🤖 レビューコメントへの対応準備
  - 通知設定確認
  - 対応方針の事前検討

---

## 【👤👤👤 レビュー対応フェーズ 👤👤👤】

### ※最も人間介入が必要なフェーズ

- [ ] 👤 **【人間】レビューコメントの理解**
  - **意図を正確に読み取る**
  - **不明点はレビュアーに質問**
- [ ] 👤 **【人間】レビューコメントの整理**
  - 必須修正 vs 提案レベルの分類
- [ ] 👤 **【人間】対応方針の決定**
  - **修正する/しない の判断**
  - **代替案の提案検討**
- [ ] 🤖 修正実装（必要なら `/feature-dev`）
  - 同じブランチで追加コミット
  - `/test`で再検証
- [ ] 👤 **【人間】修正内容の説明コメント作成**
  - **なぜこう修正したか説明**
  - **議論が必要なら論点整理**
  - 変更理由の説明
- [ ] 👤 **【人間】Re-request review**

---

## 【マージフェーズ】

- [ ] 🤖 最終確認
  - 全てのCIパス
  - Approveされているか
  - コンフリクトなし
- [ ] 👤 **【人間】マージボタンを押す判断**
  - **本当に今マージしていいか**
  - **タイミングの判断（金曜夕方は避ける等）**
- [ ] 👤 **【人間】マージ方法の選択**
  - Squash and merge（推奨）
  - Merge commit
  - Rebase and merge
- [ ] 👤 **【人間】マージ実行**
- [ ] 🤖 ブランチ削除
  - リモートブランチ削除
  - ローカルブランチ削除

---

## 【事後処理フェーズ】

- [ ] 🤖 issue close確認
  - 自動closeされるか
  - 手動でcloseする必要があるか
- [ ] 👤 **【人間】本番環境での動作確認**（該当する場合）
  - **実際のユーザー視点でチェック**
  - 本番環境への反映確認
  - 動作確認
- [ ] 👤 **【人間】振り返り記録**
  - **学びの言語化**
  - **プロセス改善点の発見**
  - 良かった点
  - 改善点
  - 所要時間の記録
- [ ] 🤖 関連ドキュメントの最終更新
  - Wikiやノート等

---

## 【トラブル時の対処】

- [ ] `/reset-changes` - 変更の取り消し
- [ ] `/stash-changes` - 一時退避
- [ ] `/rollback-claude-md` - CLAUDE.md変更の確認・ロールバック

---

## 人間介入が特に重要な3つのフェーズ

### 1. 👤 意思決定フェーズ

- **どのissueに取り組むか**
- **どう実装するか（複数案がある場合）**
- **どこまで品質を追求するか**

### 2. 👤👤👤 レビュー対応フェーズ（最重要）

- **レビューコメントの真意理解**
- **技術的トレードオフの判断**
- **コミュニケーション・交渉**

### 3. 👤 最終判断フェーズ

- **本当にマージしていいか**
- **リリースタイミング**
- **リスク評価**

---

## 自動化できない人間の役割

1. **曖昧さの解消** - 仕様の不明点、意図の読み取り
2. **価値判断** - 優先順位、品質基準、トレードオフ
3. **創造性** - 新しいアプローチの発見
4. **リスク感覚** - 「なんか違和感がある」の検知
5. **コミュニケーション** - レビュアーとの対話・交渉
6. **責任** - 最終的なマージ判断

---

## 複数issueを並行作業する場合の注意

- [ ] ブランチ切り替え前のstash
- [ ] 作業中issueの記録（どこまで進んだか）

---

## 長時間作業時の定期チェックポイント

- [ ] 30分ごとに中間コミット
- [ ] 1時間ごとにリモートプッシュ
