# Specification承認フロー - 技術設計書

## 1. 設計概要

Specificationの承認プロセスをGitHub PRベースで管理する。`reqord spec approve <id>` コマンドにより、承認ブランチ作成・ステータス変更・PR自動生成を実行する。spec-000011（Requirement承認フロー）で導入する共通のapproval-serviceを再利用し、Specification固有の前提条件チェック（関連Requirementがapproved済みであること）を追加する。

## 2. アーキテクチャ

```
Command Layer:  commands/spec/approve.ts      (新規)
                commands/spec/draft.ts        (新規)
                commands/spec/implement.ts    (新規)
                    ↓
Service Layer:  services/approval-service.ts   (spec-000011で追加 - 共通)
                services/draft-reversion-service.ts (spec-000011で追加 - 共通)
                services/specification-service.ts (既存拡張)
                    ↓
Repository:     repositories/specification.ts  (既存)
                repositories/requirement.ts    (既存)
                repositories/git.ts            (spec-000011で追加)
                repositories/github.ts         (spec-000011で追加)
                    ↓
External:       git CLI / gh CLI
                    ↓
Storage:        .reqord/specifications/spec-NNNNNN.yaml
                GitHub PR
```

Requirement承認フローと同一のapproval-serviceおよびdraft-reversion-serviceを使用し、Specification固有のロジック（前提条件チェック、PR本文テンプレート）のみをコマンド層とサービス層で追加する。

## 3. コンポーネント設計

### 3.1 approveコマンド (`commands/spec/approve.ts` - 新規)

**責務:** CLIエントリポイント。承認対象のSpecification ID受け取り。

```
reqord spec approve <id> [--dry-run]
```

| オプション | 説明 |
|-----------|------|
| `<id>` | 承認対象のSpecification ID（spec-NNNNNN） |
| `--dry-run` | 実際のGit/GitHub操作を行わず、実行予定の内容を表示 |

### 3.2 前提条件チェック

Specification承認の前提条件は、Requirement承認より厳格:

1. **Specificationのステータスがdraft**であること
2. **関連Requirementのステータスがapprovedまたはimplemented**であること
   - 未承認の要件に対する仕様承認は整合性に問題がある
3. **design.mdが空でない（テンプレートのままではない）**こと
   - 設計文書が実際に記述されている必要がある

```typescript
async function checkSpecApprovalPrerequisites(
  cwd: string,
  specId: string,
): Promise<{ ok: boolean; errors: string[] }> {
  const spec = await specRepo.findById(cwd, specId);
  const errors: string[] = [];

  // 1. ステータスチェック
  if (spec.status !== "draft") {
    errors.push(`Specificationのステータスが draft ではありません（現在: ${spec.status}）`);
  }

  // 2. 関連Requirementのステータスチェック
  const req = await reqRepo.findById(cwd, spec.requirementId);
  if (req && req.status !== "approved" && req.status !== "implemented") {
    errors.push(`関連要件 ${spec.requirementId} が未承認です（現在: ${req.status}）`);
  }

  // 3. design.mdの内容チェック
  const design = await specRepo.loadFile(cwd, specId, "design.md");
  if (!design || design.includes("Phase 3で実装予定")) {
    errors.push("design.mdがテンプレートのままです。設計内容を記述してください。");
  }

  return { ok: errors.length === 0, errors };
}
```

### 3.3 ApprovalServiceの再利用

spec-000011で定義したApprovalTarget/ApprovalServiceをそのまま利用:

```typescript
const target: ApprovalTarget = {
  type: "specification",
  id: spec.id,
  version: spec.version,
  status: spec.status,
  title: `Specification ${spec.id} (${req.title})`,
  files: [
    `.reqord/specifications/${spec.id}.yaml`,
    `.reqord/specifications/${spec.id}/design.md`,
  ],
};

const result = await startApproval(cwd, target, { dryRun: options.dryRun });
```

### 3.4 ブランチ命名規則

```
reqord/spec-<id>-approve-v<version>
例: reqord/spec-000015-approve-v1.0.0
```

### 3.5 SpecificationSchema拡張

### 3.5 PR本文テンプレート

```markdown
## 仕様承認依頼

| フィールド | 値 |
|-----------|------|
| Specification ID | {specId} |
| Requirement ID | {reqId} |
| 要件タイトル | {reqTitle} |
| バージョン | {version} |

### 設計概要
{designSummary}

### 変更内容
status: draft → approved

### 設計ファイル
- `specifications/{specId}/design.md`

> このPRをマージすると、仕様のステータスが `approved` に確定します。
```

**designSummary抽出:** design.mdの「設計概要」セクション（## 1. 設計概要 の直下テキスト）を自動抽出してPR本文に含める。

## 4. データフロー

### 承認開始フロー

```
ユーザー → reqord spec approve spec-000015
  → specApproveCommand.action("spec-000015")
    → specRepo.findById(cwd, "spec-000015") → Specification取得
    → reqRepo.findById(cwd, spec.requirementId) → 関連Requirement取得
    → checkSpecApprovalPrerequisites(cwd, "spec-000015")
      → ステータスチェック: draft → OK
      → Requirement承認チェック: approved → OK
      → design.md内容チェック: テンプレートでない → OK
    → ApprovalTarget構築
    → approvalService.startApproval(cwd, target)
      → specificationService.updateSpec(cwd, id, { status: "approved" })
      → gitRepo.createBranch("reqord/spec-000015-approve-v1.0.0")
      → gitRepo.checkout("reqord/spec-000015-approve-v1.0.0")
      → gitRepo.add([".reqord/specifications/spec-000015.yaml", ".reqord/specifications/spec-000015/design.md"])
      → gitRepo.commit("chore(reqord): request approval for spec-000015")
      → gitRepo.push("reqord/spec-000015-approve-v1.0.0")
      → githubRepo.createPullRequest({ title, body, head })
    → 成功メッセージ表示（PR URL含む）
```

### エラーケース: Requirement未承認

```
ユーザー → reqord spec approve spec-000015
  → checkSpecApprovalPrerequisites(cwd, "spec-000015")
    → Requirement承認チェック: req-000015 status=draft → NG
  → stderr: "エラー: 関連要件 req-000015 が未承認です（現在: draft）"
  → stderr: "先に 'reqord req approve req-000015' を実行してください。"
```

## 5. テスト方針

### ユニットテスト

- **前提条件チェック（approve）**:
  - Specificationがdraftのときに成功すること
  - Specificationがdraft以外のときにエラーメッセージが返ること
  - 関連Requirementがapproved/implementedのときに成功すること
  - 関連Requirementがdraftのときにエラーメッセージが返ること
  - design.mdがテンプレートのままのときにエラーメッセージが返ること
- **ApprovalTarget構築**: type="specification"、files配列にdesign.mdが含まれること
- **designSummary抽出**: 設計概要セクションの正しい抽出
- **ブランチ名生成**: "reqord/spec-{id}-approve-v{version}" 形式
- **draftコマンド**:
  - approved → draftへのステータス遷移が正しく行われること
  - implemented → draftへのステータス遷移が正しく行われること
  - 影響分析が実行されること
  - バージョンがインクリメントされないこと
  - PRが作成されること（approved/implementedからの差し戻し時）
  - ブランチ名が `reqord/spec-<id>-revert-to-draft` 形式であること
- **implementコマンド**:
  - approved → implementedへのステータス遷移が正しく行われること
  - approved以外のステータスでエラーが返ること
  - バージョンがインクリメントされないこと

### 統合テスト

- Requirement承認済み → Specification承認の一連フロー
- `--dry-run` モードでの動作確認
- 前提条件エラー時の適切なメッセージ表示
- draft差し戻しフロー: approved → draft → PR作成
- implement遷移フロー: approved → implemented

## 6. 技術的決定事項

### 共通approval-serviceの再利用

**決定:** spec-000011で作成するapproval-serviceをそのまま利用し、Specification固有ロジックはコマンド層に実装
**理由:** 承認フローの核心（ブランチ作成→コミット→プッシュ→PR作成）は同一。ApprovalTargetインターフェースにより、RequirementとSpecificationの差異を吸収できる。重複コードを排除しつつ、各承認対象の固有ロジック（前提条件チェック、PR本文テンプレート）は分離可能。

### Requirement承認の前提条件化

**決定:** Specification承認時に関連Requirementのapproved/implementedステータスを前提条件とする
**理由:** 未承認の要件に対して仕様を承認しても、要件自体が変更される可能性がある。要件→仕様の承認順序を強制することで、手戻りリスクを最小化する。implementedも許容するのは、approvedの後の状態であり、仕様の再承認時にも対応するため。

### design.mdの空チェック

**決定:** テンプレートのままのdesign.mdでは承認を拒否
**理由:** 設計文書が実際に記述されていない仕様の承認は意味がない。テンプレートのデフォルトテキスト（「Phase 3で実装予定」等）が残っている場合はエラーとする。

## 7. draftコマンド設計

### 7.1 draftコマンド (`commands/spec/draft.ts`)

**責務:** approved/implementedのspecをdraft状態に差し戻す。ステータス変更のみ行い、バージョンはインクリメントしない。

```
reqord spec draft <id> [--dry-run]
```

| オプション | 説明 |
|-----------|------|
| `<id>` | 差し戻し対象のSpecification ID（spec-NNNNNN） |
| `--dry-run` | 実際の操作を行わず、実行予定の内容を表示 |

### 7.2 DraftReversionServiceの再利用

spec-000011で追加した `DraftReversionService` を再利用する。Specification用のコマンド層で `type: "specification"` として呼び出す。

### 7.3 処理フロー

1. 前提条件チェック（statusが `draft` 以外）
2. `impact-service.analyzeImpact()` で影響範囲を分析
3. 影響範囲をコンソールに表示
4. Gitブランチ作成: `reqord/spec-<id>-revert-to-draft`
5. `status` を `draft` に更新（**バージョンはインクリメントしない**）
6. `versionHistory` にエントリを追加
7. 変更をコミット・プッシュ
8. PRを作成（影響範囲をPR本文に記載）

### 7.4 PR本文テンプレート（差し戻し用）

```markdown
## 仕様差し戻し

| フィールド | 値 |
|-----------|------|
| ID | {id} |
| タイトル | {title} |
| バージョン | {version} |
| 変更前ステータス | {previousStatus} |

### 影響範囲

以下の仕様がこの仕様に依存しています:

{impactedSpecifications}

### 変更内容
status: {previousStatus} → draft

> このPRをマージすると、仕様のステータスが `draft` に差し戻されます。
```

### 7.5 ブランチ命名規則

```
reqord/spec-<id>-revert-to-draft
例: reqord/spec-000015-revert-to-draft
```

## 8. implementコマンド設計

### 8.1 implementコマンド (`commands/spec/implement.ts`)

**責務:** approvedのspecをimplemented状態に遷移させる。ステータス変更のみ行い、バージョンはインクリメントしない。

```
reqord spec implement <id>
```

| オプション | 説明 |
|-----------|------|
| `<id>` | 対象のSpecification ID（spec-NNNNNN） |

### 8.2 処理フロー

1. 前提条件チェック: `status === "approved"`
2. `status` を `implemented` に更新（**バージョンはインクリメントしない**）
3. `versionHistory` にエントリを追加

> バージョン変更は `reqord version` コマンドで明示的に行う（req-000005参照）。
