# Feedback管理 (GitHub Issue連携)

## 概要

GitHub Issueをベースとしたフィードバック管理機能。feedbackラベル付きGitHub Issueと`.reqord/issues/feedbacks.yaml`の同期をコアコンセプトとし、要件/仕様との紐付け管理を提供する。GitHub Issueを真実の情報源（Single Source of Truth）とし、reqordはメタデータの同期・紐付け・トラッキングに集中する。

> **v1.1.0変更点**: sync中心設計へ再構成。structureコマンドを廃止し、syncコマンドを追加。メタデータ設定はlinkコマンドに統合。Zodスキーマバリデーション成功基準を追加。

> **v4.0変更点**: feedback運用の完全化。unlinkコマンド追加（linkの逆操作）、createコマンド追加（GitHub Issue作成）、close時の未解決feedback警告追加。

> **v4.2変更点**: flagsフィールドをreq/specスキーマから削除。feedbacks.yamlのlinkedTo/linkedTo.resolvedで未解決feedbackを管理する方式に変更。

設計方針は docs/guide-feedback.md を参照。

## ユーザーストーリー

開発者として、Feedbackを要件・仕様と紐付けて管理したい。
なぜなら、Feedbackによる要件変更の追跡と影響把握ができるから。

## Feedbackライフサイクル

**Feedbackの責務は「懸念の捕捉と影響範囲の確定」まで。**

影響範囲が確定した時点でFeedbackの役目は完了する。その後の対応は各アーティファクトのライフサイクルが担う。

### 振り分けフロー

Feedbackの種別と調査結果に基づき、適切なアーティファクトに振り分ける。**全てのFeedbackがRequirement改訂になるとは限らない。**

```
報告（GitHub Issue作成 + feedbackラベル）
  ↓
同期（reqord feedback sync）
  ↓
調査・議論（コメント）
  ↓
影響範囲の判定 ─┬─ Requirement改訂が必要 → パターンA or B
               ├─ Specification更新で対応可能 → パターンC
               └─ 実装タスクで対応可能 → パターンD（Specリンク + Issue作成）
  ↓
紐付け（reqord feedback link）
  ↓
Feedback closed（reqord feedback close）
```

### パターンA: 既存Requirementへの影響

要件の定義自体に問題がある場合（スコープ変更、方針変更、要件漏れ等）。

```bash
reqord feedback link 17 --req req-000006 --type improvement --severity high
# → feedbacks.yamlのlinkedToにreq-000006を追加 → Requirement revision upで対応
```

例: Feedback #17（AI補助機能の分離） → req-000006等を改訂

### パターンB: 新規Requirementの作成

既存要件でカバーされていない新しい機能要求の場合。

```bash
reqord feedback link 13 --created-req --type requirement-gap --severity medium
# → 自動採番で新req作成 → 新reqのライフサイクルで追跡
```

例: Feedback #13（Feedback機構の要件不足） → req-000023を新規作成

### パターンC: Specification更新で対応

要件は正しいが、設計・仕様レベルで対応が必要な場合（テンプレート不整合、設計判断の追加等）。Requirementの改訂は不要。

```bash
reqord feedback link 15 --spec spec-000001 --type spec-mismatch
# → Specificationにリンク → Spec更新で対応
```

例: テンプレートが実態と乖離 → design.mdやテンプレートを更新すれば済む
例: ファイル分割構造の改善 → Specのdesign.mdに設計判断を追記すれば済む

### パターンD: 実装タスク（GitHub Issue）で対応

要件も仕様も正しいが、実装が追いついていない場合。該当するSpecificationを明記し、実装タスクIssueを作成する。

```bash
reqord feedback link 14 --spec spec-000005 --type bug
# → Specificationにリンク（対応すべき仕様を明示）

# 実装タスクIssueを作成（gh CLIまたはreqord issue create）
gh issue create --title "Web UIにSpecification表示機能を追加" --label "spec:000005"

reqord feedback close 14
# → Closed with linked spec and implementation issue
```

例: Web UIにSpec表示機能がない → req-000022に既にスコープ内。実装Issueを作れば済む

### 振り分け判断基準

| Feedbackの種別 | 典型的な振り分け先 | 例 |
|---------------|-----------------|-----|
| requirement-gap（要件不足） | A（改訂）or B（新規） | 要件定義の漏れ、スコープ変更 |
| spec-mismatch（仕様と実装の乖離） | C（Spec更新）or D（Specリンク+Issue） | テンプレート乖離、設計判断の追加 |
| improvement（改善提案） | 影響レベルに応じてA〜D | アーキテクチャ変更ならA、UI改善ならD |
| bug（バグ報告） | D（Specリンク+Issue）。重大ならC or A | 実装バグはD、仕様バグはC |
| security（セキュリティ） | A（要件追加）。軽微ならD | 認証要件の追加はA |

### GitHub Issue中心のアプローチ

```
1. 開発者がバグ/改善提案をGitHub Issueで報告（feedbackラベル付き）
2. reqord feedback sync で feedbacks.yaml に同期
3. チームで調査・議論（コメント）
4. 影響レベルに応じて紐付け:
   a. 既存reqに影響 → reqord feedback link --req → Feedback closed
   b. 新規reqが必要 → reqord feedback link --created-req → Feedback closed
   c. Spec更新で対応 → reqord feedback link --spec → Feedback closed
   d. 実装タスクで対応 → reqord feedback link --spec + Issue作成 → Feedback closed
```

- Issue作成は自由（feedbackラベルを付与すれば同期対象）
- reqordは補助ツール。必須ではない
- 詳細は全てGitHub Issueに保持

### 責務分離

| 責務 | 担当 |
|------|------|
| GitHub Issueとfeedbacks.yamlの同期 | reqord CLI（本要件） |
| Feedbackの一覧・詳細表示 | reqord CLI（本要件） |
| Requirement/Specificationとの紐付け | reqord CLI（本要件） |
| 未解決feedbackの検知（feedbacks.yaml経由） | reqord CLI（本要件） |
| FeedbackIndexのZodスキーマバリデーション | @reqord/shared |
| AI駆動のFeedback分析（種別推定・関連要件推定） | Claude Code エコシステム |
| AI駆動の影響範囲分析 | Claude Code エコシステム |

## CLIコマンド仕様

### reqord feedback sync

GitHub Issueと.reqord/issues/feedbacks.yamlを同期する。全コマンドの起点。

**GitHub → feedbacks.yaml 同期（デフォルト）:**

```bash
reqord feedback sync
# → Fetching feedback issues from GitHub...
# → Found 3 issues with 'feedback' label
# → Updated .reqord/issues/feedbacks.yaml
```

動作:
1. `gh issue list --label feedback --json number,title,state,labels,createdAt,body` でGitHub Issueを取得
2. GitHub Issue bodyのHTMLコメント (`<!-- reqord:feedback {...} -->`) からメタデータをパース
   - `linkedTo.requirements`, `linkedTo.specifications` を抽出
   - `type`, `severity` を抽出
3. feedbacks.yamlにないIssueを追加、既存エントリをマージ更新
4. GitHub Issueがcloseされている場合は`status: "closed"`に更新

**feedbacks.yaml → GitHub 同期（--from-local）:**

```bash
reqord feedback sync --from-local
# → Syncing local metadata to GitHub...
# → Updated Issue body on Issue #17, #21, #23
```

動作:
1. feedbacks.yamlの`linkedTo`情報を元にGitHub Issue bodyのHTMLコメントを挿入/更新
2. `<!-- reqord:feedback {"type":"...","linkedTo":{...}} -->` 形式でメタデータを埋め込み
3. 既存のIssue本文は保持（HTMLコメント部分のみ更新）

オプション:
- `--from-local` : feedbacks.yaml → GitHub方向の同期
- `--json` : 同期結果をJSON出力

### reqord feedback list

同期済みのfeedbacks.yamlからFeedback一覧を表示。

```bash
reqord feedback list
# → #17 [closed] AI補助機能のClaude Codeエコシステムへの分離  (improvement, high)
#   #21 [open]   Specification表示UI改善  (improvement, medium)

reqord feedback list --state open --json
# → [{ "githubIssue": 21, "title": "...", "state": "open", "type": "improvement", ... }]
```

オプション:
- `--state open|closed|all` : 状態フィルタ（デフォルト: all）
- `--type <type>` : 種別フィルタ
- `--json` : JSON出力

### reqord feedback show \<issue-number\>

Feedbackの詳細表示。GitHub Issue内容 + feedbacks.yamlメタデータを統合表示。

```bash
reqord feedback show 17
# → Issue #17: AI補助機能のClaude Codeエコシステムへの分離
#   State: closed
#   Type: improvement
#   Severity: high
#   Linked Requirements: req-000006, req-000017, req-000020, req-000021
#   Linked Specifications: (none)
#   Created: 2026-02-07
#
#   [GitHub Issue本文を表示]
```

動作:
1. `gh issue view <issue-number> --json title,body,state,labels,createdAt` でGitHub Issueを取得
2. feedbacks.yamlから対応するfeedbackエントリを検索
3. 両方のデータをマージして表示

### reqord feedback link \<issue-number\>

Feedbackをアーティファクトに紐付ける。type/severityも同時に設定可能。

#### パターンA: 既存Requirementへの紐付け（--req）

```bash
reqord feedback link 17 --req req-000006 --type improvement --severity high
# → Linked Feedback #17 to req-000006
# → Updated feedbacks.yaml linkedTo
# → Updated GitHub Issue body (HTML comment)
```

動作:
1. feedbacks.yamlの`linkedTo.requirements`に追加
2. GitHub Issue bodyにHTMLコメントを挿入/更新
3. feedbacks.yamlに`type`, `severity`を記録

#### パターンB: 新規Requirement作成（--created-req）

```bash
reqord feedback link 13 --created-req --type requirement-gap --severity medium
# → Created req-000023 from Feedback #13
# → Updated GitHub Issue body (HTML comment)
# → Updated .reqord/issues/feedbacks.yaml
```

動作:
1. 次の連番IDで新Requirementを作成（YAML + ディレクトリ）
2. `origin: { feedbackIssue: 13 }`を記録
3. feedbacks.yamlの`linkedTo.createdRequirements`に追加
4. GitHub Issue bodyにHTMLコメントを挿入/更新

#### パターンC: Specificationへの紐付け（--spec）

```bash
reqord feedback link 15 --spec spec-000001 --type spec-mismatch
# → Linked Feedback #15 to spec-000001
# → Updated GitHub Issue body (HTML comment)
# → Updated .reqord/issues/feedbacks.yaml
```

動作:
1. feedbacks.yamlの`linkedTo.specifications`に追加
2. GitHub Issue bodyにHTMLコメントを挿入/更新

オプション:
- `--req <id>` : 既存Requirementへ紐付け（パターンA）
- `--created-req` : 新規Requirement作成（パターンB）
- `--spec <id>` : Specificationへ紐付け（パターンC）
- `--type <type>` : Feedbackの種別（bug/improvement/requirement-gap/spec-mismatch/security）
- `--severity <level>` : 深刻度（critical/high/medium/low）

### reqord feedback close \<issue-number\>

影響範囲確定後にFeedbackをクローズする。

```bash
reqord feedback close 17
# → Closed Feedback #17 on GitHub
# → Updated .reqord/issues/feedbacks.yaml (status: closed)
# → Unresolved feedbacks remain on: req-000006 (issue #17), req-000020 (issue #17)
```

動作:
1. feedbacks.yamlの`status`を`closed`に更新
2. `gh issue close <issue-number> --comment "<影響範囲サマリー>"`でGitHub Issueをクローズ
3. 紐付けされたartifactの未解決feedbackは**残す**（解決はRequirement側の対応完了時に行う）

**注意**: feedbackの解決はFeedbackのクローズとは独立。Requirementの改訂やSpecificationの更新が完了した時点で、`reqord feedback resolve` によりfeedbacks.yamlのlinkedTo.resolvedに対象IDを追加する。v4.0でクローズ時に未解決feedback警告が追加された（下記「v4.0改善」セクション参照）。

### reqord feedback unlink \<issue-number\>

Feedbackとアーティファクトの紐付けを解除する（linkの逆操作）。

```bash
reqord feedback unlink 224 --req req-000023
# → Unlinked Feedback #224 from req-000023
# → Updated .reqord/issues/feedbacks.yaml

reqord feedback unlink 224 --spec spec-000028
# → Unlinked Feedback #224 from spec-000028
# → Updated .reqord/issues/feedbacks.yaml
```

動作:
1. feedbacks.yamlの`linkedTo.requirements`または`linkedTo.specifications`から削除
2. GitHub Issue bodyのHTMLコメントを更新

オプション:
- `--req <id>` : Requirementとの紐付けを解除
- `--spec <id>` : Specificationとの紐付けを解除

### reqord feedback create

ISSUE_TEMPLATE/05-feedback.yml に準拠したfeedbackラベル付きGitHub Issueを作成し、feedbacks.yamlに新規エントリを追加する。

```bash
reqord feedback create \
  --title "closeコマンドに警告がない" \
  --description "feedback close実行時に未解決feedbackがあっても警告なしでクローズされる" \
  --type improvement \
  --severity low
# → Created GitHub Issue #228 "[Feedback] closeコマンドに警告がない"
# → Labels: feedback, reqord, improvement
# → Updated .reqord/issues/feedbacks.yaml
```

動作:
1. ISSUE_TEMPLATE準拠のbodyを生成（「何が起きた？」セクション等）
2. タイトルに `[Feedback] ` prefixを自動付与
3. `gh issue create`でfeedbackラベル付きGitHub Issueを作成
4. feedbacks.yamlに新規エントリを追加

オプション:
- `--title <title>` : Issueタイトル（必須、自動で`[Feedback]` prefix付与）
- `--description <text>` : 何が起きた？/何に気づいた？（必須）
- `--type <type>` : Feedbackの種別
- `--severity <level>` : 深刻度
- `--related-req <id>` : 関連要件ID
- `--related-spec <id>` : 関連仕様ID

### reqord feedback close \<issue-number\>（v4.0改善）

影響範囲確定後にFeedbackをクローズする。v4.0で未解決feedback警告を追加。

```bash
reqord feedback close 17
# → ⚠ Warning: Linked artifacts have unresolved feedbacks:
# →   - req-000006: unresolved feedback (issue #17)
# →   - req-000020: unresolved feedback (issue #17)
# → Closed Feedback #17 on GitHub
# → Updated .reqord/issues/feedbacks.yaml (status: closed)
```

動作:
1. 紐付けされたartifactの未解決feedback（artifact IDがlinkedTo.requirements/specificationsに含まれるが、対応するlinkedTo.resolved.requirements/specificationsに含まれない）をチェックし、あれば警告表示
2. feedbacks.yamlの`status`を`closed`に更新
3. `gh issue close <issue-number> --comment "<影響範囲サマリー>"`でGitHub Issueをクローズ

## データ構造

### .reqord/issues/feedbacks.yaml

GitHub Issueへの参照情報のみ保持（軽量）。syncコマンドで同期される。

```yaml
feedbacks:
  - githubIssue: 17
    type: improvement
    severity: high
    linkedTo:
      requirements:
        - req-000006
        - req-000017
        - req-000020
        - req-000021
      createdRequirements: []
      specifications: []
      resolved:
        requirements: []
        specifications: []
    syncedAt: "2026-02-09T10:00:00Z"
    status: closed
  - githubIssue: 13
    type: requirement-gap
    severity: medium
    linkedTo:
      requirements: []
      createdRequirements:
        - req-000023
      specifications: []
      resolved:
        requirements: []
        createdRequirements:
          - req-000023
        specifications: []
    syncedAt: "2026-02-09T10:30:00Z"
    status: closed
```

### Feedbackの種別（type）

- `bug` : バグ報告
- `improvement` : 改善提案
- `requirement-gap` : 要件の不足
- `spec-mismatch` : 仕様と実装の不一致
- `security` : セキュリティ関連

### feedbacks.yamlによるFeedback解決管理

#### 設計原則: feedbacks.yamlがトレーサビリティのSource of Truth

feedbacks.yamlのlinkedToで紐付けと解決状態を一元管理する:

| データ | 責務 | ライフサイクル |
|--------|------|---------------|
| `issues/feedbacks.yaml` | feedback issue → req/specの紐付け記録と解決状態管理（**トレーサビリティのSource of Truth**） | 永続。削除しない |
| `linkedTo.resolved` | 解決済みのreq/spec IDを記録するオブジェクト（`{ requirements: [], specifications: [] }`） | resolveコマンドで対象IDを追加 |

#### feedbackの解決ライフサイクル

```
feedback link → feedbacks.yamlにlinkedToを追加（resolved: { requirements: [], specifications: [] }）
    ↓
linkedToの内容をreq/specに反映（version up、成功基準追加など）
    ↓
feedback resolve → feedbacks.yamlのlinkedTo.resolvedに対象IDを追加
```

#### 未解決feedbackの判定

- feedbacks.yamlでreq/specに紐付けられたfeedbackのうち、`linkedTo.resolved.requirements` / `linkedTo.resolved.specifications` に含まれないIDがあるものが未解決
- 未解決feedbackがあるreq/specへの承認操作時に警告を表示

## 技術的制約

- GitHub CLI (`gh`) を使用してIssue操作
- reqord自体にはAI SDK依存を追加しない
- feedbackの分析（種別推定・関連要件推定）はClaude Codeエコシステムの責務
- `.reqord/issues/feedbacks.yaml` はGitHub Issueへの参照のみ保持（詳細は全てGitHub上）
- APIレート制限への配慮（sync時にバッチ取得）
- @reqord/sharedパッケージでFeedbackIndexのZodスキーマを定義し、read/write時にバリデーション
