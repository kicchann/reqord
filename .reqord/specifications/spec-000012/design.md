# 影響範囲分析 - 技術設計書

## 1. 設計概要

指定したRequirementまたはSpecificationに関連するリソース（Specification・Issue・Requirement）を即座に分析・一覧表示する。依存グラフ（blockedBy, blocks, relatedTo）を走査して波及先を検出し、必要に応じてGitHub Issue/PRへ通知コメントを送信する。分析は毎回走査するステートレスな読み取り専用操作とし、`--json` / `--dry-run` オプションでCI/CD連携にも対応する。

## 2. アーキテクチャ

```
Command Layer:  commands/impact/analyze.ts   (新規)
                commands/impact/notify.ts    (新規)
                    ↓
Service Layer:  services/impact-service.ts   (新規)
                    ↓
Repository:     repositories/requirement.ts  (既存)
                repositories/specification.ts (既存)
                repositories/github.ts       (既存 - createIssueComment/createPrComment追加)
                    ↓
Utility:        utils/spec-tag-parser.ts     (既存 - Issue発見に利用)
                    ↓
External:       gh CLI (通知用)
                    ↓
Storage:        .reqord/ (読み取りのみ)
                GitHub Issues / PRs (通知時のみ書き込み)
```

依存グラフの走査はサービス層で行い、GitHub通知はリポジトリ層のgh CLI操作に委譲する。分析と通知は別コマンドに分離し、分析結果の確認後に明示的に通知を実行するワークフローを提供する。

## 3. コンポーネント設計

### 3.1 analyzeコマンド (`commands/impact/analyze.ts` - 新規)

**責務:** 影響範囲分析の実行と結果表示。

```
reqord impact analyze <id> [--json] [--depth <n>]
```

| オプション | 説明 |
|-----------|------|
| `<id>` | 分析起点のID（req-NNNNNN または spec-NNNNNN） |
| `--json` | 構造化JSON出力 |
| `--depth <n>` | 依存走査の最大深度（デフォルト: 無制限） |

IDのプレフィクス（`req-` / `spec-`）で対象の種類を判定する。

**表示形式（Requirement起点の場合）:**
```
影響範囲分析: req-000011

直接影響 (Requirement):
  ID           関係         タイトル
  req-000012   blocks       影響範囲分析
  req-000015   blocks       Specification承認フロー

間接影響（depth: 2）:
  ID           経由         タイトル
  req-000016   req-000015   GitHub Issue生成

関連Specification:
  ID           要件ID         ステータス
  spec-000011  req-000011     draft

関連Issue:
  #123  [open]  ログイン画面の実装
  #124  [open]  認証API統合テスト
```

**表示形式（Specification起点の場合）:**
```
影響範囲分析: spec-000011

親Requirement: req-000011 (Requirement承認フロー)

関連Specification（同一Requirement）:
  ID           ステータス
  spec-000011  draft

関連Issue:
  #123  [open]  ログイン画面の実装
  #124  [open]  認証API統合テスト
```

### 3.2 notifyコマンド (`commands/impact/notify.ts` - 新規)

**責務:** 影響先へのGitHub通知送信。

```
reqord impact notify <id> [--dry-run] [--message <text>]
```

| オプション | 説明 |
|-----------|------|
| `<id>` | 通知起点のID（req-NNNNNN または spec-NNNNNN） |
| `--dry-run` | 通知内容をプレビュー表示（実際に送信しない） |
| `--message <text>` | カスタム通知メッセージ |

### 3.3 ImpactService (`services/impact-service.ts` - 新規)

**責務:** 依存グラフ走査、影響範囲計算、通知メッセージ生成。

```typescript
export interface ImpactAnalysis {
  sourceId: string;
  sourceType: "requirement" | "specification";
  directImpacts: ImpactEntry[];
  indirectImpacts: ImpactEntry[];
  relatedSpecifications: SpecificationRef[];
  relatedIssues: IssueRef[];
  circularDependencies: string[][];
  analyzedAt: string;
}

export interface ImpactEntry {
  id: string;
  relation: "blockedBy" | "blocks" | "relatedTo";
  depth: number;
  path: string[];  // 到達経路: ["req-000011", "req-000015", "req-000016"]
  title: string;
}

export interface SpecificationRef {
  id: string;
  requirementId: string;
  status: Status;
}

export interface IssueRef {
  number: number;
  title: string;
  url: string;
  status: "open" | "closed";
  specificationId: string;  // どのSpecification経由で発見されたか
}

export async function analyzeImpact(
  cwd: string,
  id: string,
  options?: { maxDepth?: number },
): Promise<ImpactAnalysis>;

export async function notifyImpact(
  cwd: string,
  id: string,
  options?: { dryRun?: boolean; message?: string },
): Promise<NotifyResult>;
```

### 3.4 依存グラフ走査アルゴリズム

**BFS（幅優先探索）による波及分析:**

```typescript
function traverseDependencyGraph(
  startId: string,
  allRequirements: Map<string, Requirement>,
  maxDepth?: number,
): ImpactEntry[] {
  const queue: Array<{
    id: string;
    depth: number;
    path: string[];
    relation: "blocks" | "relatedTo";
  }> = [];
  const visited = new Set<string>();
  const results: ImpactEntry[] = [];

  // 起点の直接依存を追加
  const startReq = allRequirements.get(startId);
  for (const depId of startReq.dependencies.blocks) {
    queue.push({ id: depId, depth: 1, path: [startId, depId], relation: "blocks" });
  }
  for (const depId of startReq.dependencies.relatedTo) {
    queue.push({ id: depId, depth: 1, path: [startId, depId], relation: "relatedTo" });
  }

  while (queue.length > 0) {
    const { id, depth, path, relation } = queue.shift()!;
    if (visited.has(id)) continue;  // ダイヤモンド依存: 同一ノードへの複数経路のうち最初到達のみ記録
    if (maxDepth && depth > maxDepth) continue;
    visited.add(id);

    const req = allRequirements.get(id);
    if (!req) continue;

    results.push({
      id,
      relation,
      depth,
      path,
      title: req.title,
    });

    // relatedTo経由の場合は深度1（直接のみ）で走査を打ち切る
    if (relation === "relatedTo") continue;

    // blocks経由の場合のみ、さらに先のblocks/relatedToを走査
    for (const nextId of req.dependencies.blocks) {
      if (!visited.has(nextId)) {
        queue.push({ id: nextId, depth: depth + 1, path: [...path, nextId], relation: "blocks" });
      }
    }
    for (const nextId of req.dependencies.relatedTo) {
      if (!visited.has(nextId)) {
        queue.push({ id: nextId, depth: depth + 1, path: [...path, nextId], relation: "relatedTo" });
      }
    }
  }

  return results;
}
```

**循環依存検出:** 既存のvalidation-serviceの `checkCircularDependencies` ロジック（DFS）を再利用。BFS走査中のvisitedセットは無限ループ防止が目的であり、具体的な循環パス（A→B→C→A）の報告はできない。循環パスの詳細表示には既存DFSロジックを併用する。

### 3.5 Issue発見メカニズム

GitHub Issueの発見は2段階で行う:

**1. ローカル（高速・APIコール不要）:**
`.reqord/issues/tasks.yaml` から該当Specificationに紐づくIssue情報（number, title, url, status）を取得する。`reqord task create` 時にtasks.yamlに保存されたデータを利用する。

```typescript
// tasks.yaml からSpecificationに紐づくIssue一覧を取得
const tasks = await tasksRepo.findBySpecificationId(cwd, specId);
const issues = tasks.map(t => ({ number: t.issueNumber, title: t.title, url: t.url, status: t.status }));
```

**2. GitHub検索（notifyコマンドでのステータス確認用）:**
`reqord task create` が GitHub Issue body に埋め込む `<!-- reqord:specification {...} -->` HTMLコメントタグを利用。既存の `spec-tag-parser.ts` の `parseSpecTag()` でパースし、`specificationId` で紐づけを確認する。

```typescript
// notifyコマンドでは実際のIssueステータスをGitHubから取得
// gh issue list --label reqord-generated --json number,title,body,state
// → body を parseSpecTag() でパースし specificationId でフィルタ
```

analyzeコマンドではローカルデータのみを使用（高速・オフライン動作可能）。notifyコマンドでは実際のIssueステータスをGitHub APIで確認してから通知する。

### 3.6 github.ts 拡張 (`repositories/github.ts` - 既存に追加)

notifyコマンド用に以下のメソッドを追加:

```typescript
export async function createIssueComment(
  issueNumber: number,
  body: string,
): Promise<void>;

export async function createPrComment(
  prNumber: number,
  body: string,
): Promise<void>;
```

いずれも `gh issue comment` / `gh pr comment` を利用して実装する。

### 3.7 通知コメントテンプレート

```markdown
**reqord影響範囲通知**

要件 `{sourceId}` ({title}) が変更されました。
この{type}は影響を受ける可能性があります。

**関係:** {relation}
**経路:** {path}

{customMessage}
```

## 4. データフロー

### 影響分析フロー（Requirement起点）

```
ユーザー → reqord impact analyze req-000011
  → analyzeCommand.action("req-000011")
    → impactService.analyzeImpact(cwd, "req-000011")
      → reqRepo.findAll(cwd) → 全要件取得
      → specRepo.findAll(cwd) → 全仕様取得
      → 依存グラフ構築（Map<id, Requirement>）
      → BFS走査: req-000011 の blocks → [req-000012, req-000015]
        → req-000015 の blocks → [req-000016]
        → relatedTo は depth=1 で打ち切り
      → 関連Specification検索（requirementIdでフィルタ）
      → 関連Issue取得（tasks.yamlから）
      → 循環依存チェック（既存validation-serviceのDFSロジック再利用）
      → ImpactAnalysis構築
  → テーブル表示 or JSON出力
```

### 影響分析フロー（Specification起点）

```
ユーザー → reqord impact analyze spec-000011
  → analyzeCommand.action("spec-000011")
    → impactService.analyzeImpact(cwd, "spec-000011")
      → specRepo.findById(cwd, "spec-000011") → 対象Specification取得
      → 親Requirement取得（spec.requirementId）
      → 同一Requirementに紐づく他のSpecification検索
      → 関連Issue取得（tasks.yamlから）
      → ImpactAnalysis構築（依存グラフ走査はスキップ）
  → テーブル表示 or JSON出力
```

### 通知フロー

```
ユーザー → reqord impact notify req-000011 --message "優先度変更"
  → notifyCommand.action("req-000011", { message: "優先度変更" })
    → impactService.analyzeImpact(cwd, "req-000011") → 影響先取得
    → 関連IssueのステータスをGitHub APIで確認（openのみ通知対象）
    → 各影響先に対して（バッチ処理: 100件/時以下、1件毎に36秒のスリープ間隔）:
      → 通知コメント生成
      → githubRepo.createIssueComment(issueNumber, comment) or
        githubRepo.createPrComment(prNumber, comment)
    → 通知結果サマリー表示
```

## 5. テスト方針

### ユニットテスト

- **依存グラフ走査**: 線形依存（A→B→C）、分岐依存（A→B, A→C）、ダイヤモンド依存（A→B→D, A→C→D）
- **relatedTo深度制限**: relatedTo経由ではdepth=1で走査が打ち切られること
- **循環依存検出**: A→B→C→A のケースで循環が検出されること
- **maxDepth制限**: depth=1で間接影響が含まれないこと
- **Specification関連付け**: requirementIdによる正確なフィルタリング
- **Issue発見**: tasks.yamlからの正確な取得
- **Specification起点分析**: spec-IDで親Requirement・関連Spec・Issueが取得されること
- **通知メッセージ生成**: テンプレート変数が正しく置換されること
- **影響先が0件**: 空のImpactAnalysisが返ること

### 統合テスト

- 複数要件の依存関係を構築し、analyze → notify の一連フロー検証
- Requirement起点とSpecification起点の両方で動作確認
- `--dry-run` モードでGitHub API呼び出しが行われないこと
- `--json` 出力がJSON.parseableであること

## 6. 技術的決定事項

### BFS vs DFS

**決定:** BFS（幅優先探索）を使用
**理由:** 影響の直接度（depth）を正確に測定するにはBFSが適切。DFSでは最短経路が保証されず、depth表示が不正確になる可能性がある。

### 分析と通知の分離

**決定:** `analyze` と `notify` を別コマンドに分離
**理由:** 分析結果の確認なしに自動通知することは、不要な通知の発生リスクがある。Human-in-the-loopの原則に従い、分析結果を確認してから明示的に通知を実行するワークフローとする。

### ステートレスな分析

**決定:** 分析結果をYAMLに永続化せず、毎回走査するステートレス設計とする
**理由:** `.reqord/` 内のローカルYAMLファイルの走査は軽量であり、キャッシュの整合性管理コストの方が高い。分析コマンドは純粋な読み取り専用操作として設計し、副作用を持たない。

### relatedToの走査

**決定:** relatedToも走査対象に含める（blockedBy/blocksだけでなく）
**理由:** relatedToは「関連があるが直接の依存ではない」関係を示す。変更の影響は間接的にも波及する可能性があるため、通知対象に含めるべき。ただし、走査の深度はrelatedTo経由では1（直接のみ）に制限する。

### Issue発見のデータソース

**決定:** analyzeではローカルデータ（tasks.yaml）、notifyではGitHub API
**理由:** analyzeはオフライン・高速動作を優先。notifyは実際のIssueステータス（open/closed）を確認する必要があるためGitHub APIを使用。Issue body の `<!-- reqord:specification -->` タグは紐づけ確認のフォールバックとして利用可能。
