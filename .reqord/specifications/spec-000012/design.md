# 影響範囲分析 - 技術設計書

## 1. 設計概要

要件変更時の影響範囲を自動的に分析し、関連するSpecification・Issue・Requirementを特定する。依存グラフ（blockedBy, blocks, relatedTo）を走査して波及先を検出し、必要に応じてGitHub Issue/PRへ通知コメントを送信する。影響範囲の分析結果はRequirement YAMLのimpactフィールドに記録し、`--json` / `--dry-run` オプションでCI/CD連携にも対応する。

## 2. アーキテクチャ

```
Command Layer:  commands/impact/analyze.ts   (新規)
                commands/impact/notify.ts    (新規)
                    ↓
Service Layer:  services/impact-service.ts   (新規)
                    ↓
Repository:     repositories/requirement.ts  (既存)
                repositories/specification.ts (既存)
                repositories/github.ts       (spec-000011で追加)
                    ↓
External:       gh CLI (通知用)
                    ↓
Storage:        .reqord/requirements/req-NNNNNN.yaml (impactフィールド)
                GitHub Issues / PRs (コメント)
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
| `<id>` | 分析起点の要件ID（req-NNNNNN） |
| `--json` | 構造化JSON出力 |
| `--depth <n>` | 依存走査の最大深度（デフォルト: 無制限） |

**表示形式（テーブル）:**
```
影響範囲分析: req-000011

直接影響:
  ID           種類           関係         タイトル
  req-000012   Requirement    blockedBy    影響範囲分析
  req-000015   Requirement    blockedBy    Specification承認フロー

間接影響（depth: 2）:
  ID           種類           経由         タイトル
  req-000016   Requirement    req-000015   GitHub Issue生成

関連Specification:
  ID           要件ID         ステータス
  spec-000011  req-000011     draft
```

### 3.2 notifyコマンド (`commands/impact/notify.ts` - 新規)

**責務:** 影響先へのGitHub通知送信。

```
reqord impact notify <id> [--dry-run] [--message <text>]
```

| オプション | 説明 |
|-----------|------|
| `<id>` | 通知起点の要件ID |
| `--dry-run` | 通知内容をプレビュー表示（実際に送信しない） |
| `--message <text>` | カスタム通知メッセージ |

### 3.3 ImpactService (`services/impact-service.ts` - 新規)

**責務:** 依存グラフ走査、影響範囲計算、通知メッセージ生成。

```typescript
export interface ImpactAnalysis {
  sourceId: string;
  directImpacts: ImpactEntry[];
  indirectImpacts: ImpactEntry[];
  relatedSpecifications: SpecificationRef[];
  circularDependencies: string[][];
  analyzedAt: string;
}

export interface ImpactEntry {
  id: string;
  type: "requirement" | "specification";
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
  const queue: Array<{ id: string; depth: number; path: string[] }> = [];
  const visited = new Set<string>();
  const results: ImpactEntry[] = [];

  // 起点の直接依存を追加
  const startReq = allRequirements.get(startId);
  for (const depId of startReq.dependencies.blocks) {
    queue.push({ id: depId, depth: 1, path: [startId, depId] });
  }
  // relatedToも走査対象
  for (const depId of startReq.dependencies.relatedTo) {
    queue.push({ id: depId, depth: 1, path: [startId, depId] });
  }

  while (queue.length > 0) {
    const { id, depth, path } = queue.shift()!;
    if (visited.has(id)) continue;
    if (maxDepth && depth > maxDepth) continue;
    visited.add(id);
    // results追加 + 次のblocks/relatedToをキューに追加
  }

  return results;
}
```

**循環依存検出:** 既存のvalidation-serviceの `checkCircularDependencies` ロジックを再利用。

### 3.5 RequirementSchema拡張

**追加フィールド:**

```typescript
impact: z.object({
  directCount: z.number(),
  indirectCount: z.number(),
  lastAnalyzedAt: z.string(),
  affectedIds: z.array(z.string()),
}).optional(),
```

### 3.6 通知コメントテンプレート

```markdown
**reqord影響範囲通知**

要件 `{sourceId}` ({title}) が変更されました。
この{type}は影響を受ける可能性があります。

**関係:** {relation}
**経路:** {path}

{customMessage}
```

## 4. データフロー

### 影響分析フロー

```
ユーザー → reqord impact analyze req-000011
  → analyzeCommand.action("req-000011")
    → impactService.analyzeImpact(cwd, "req-000011")
      → reqRepo.findAll(cwd) → 全要件取得
      → specRepo.findAll(cwd) → 全仕様取得
      → 依存グラフ構築（Map<id, Requirement>）
      → BFS走査: req-000011 の blocks → [req-000012, req-000015]
        → req-000015 の blocks → [req-000016]
      → relatedTo走査
      → 関連Specification検索（requirementIdでフィルタ）
      → 循環依存チェック
      → ImpactAnalysis構築
    → requirementService.updateRequirement(cwd, id, { patchData: { impact } })
  → テーブル表示 or JSON出力
```

### 通知フロー

```
ユーザー → reqord impact notify req-000011 --message "優先度変更"
  → notifyCommand.action("req-000011", { message: "優先度変更" })
    → impactService.analyzeImpact(cwd, "req-000011") → 影響先取得
    → 各影響先に対して:
      → 通知コメント生成
      → githubRepo.createIssueComment(issueNumber, comment) or
        githubRepo.createPrComment(prNumber, comment)
    → 通知結果サマリー表示
```

## 5. テスト方針

### ユニットテスト

- **依存グラフ走査**: 線形依存（A→B→C）、分岐依存（A→B, A→C）、ダイヤモンド依存（A→B→D, A→C→D）
- **循環依存検出**: A→B→C→A のケースで循環が検出されること
- **maxDepth制限**: depth=1で間接影響が含まれないこと
- **Specification関連付け**: requirementIdによる正確なフィルタリング
- **通知メッセージ生成**: テンプレート変数が正しく置換されること
- **影響先が0件**: 空のImpactAnalysisが返ること

### 統合テスト

- 複数要件の依存関係を構築し、analyse → notify の一連フロー検証
- `--dry-run` モードでGitHub API呼び出しが行われないこと
- `--json` 出力がJSON.parseableであること

## 6. 技術的決定事項

### BFS vs DFS

**決定:** BFS（幅優先探索）を使用
**理由:** 影響の直接度（depth）を正確に測定するにはBFSが適切。DFSでは最短経路が保証されず、depth表示が不正確になる可能性がある。

### 分析と通知の分離

**決定:** `analyze` と `notify` を別コマンドに分離
**理由:** 分析結果の確認なしに自動通知することは、不要な通知の発生リスクがある。Human-in-the-loopの原則に従い、分析結果を確認してから明示的に通知を実行するワークフローとする。

### impactフィールドの永続化

**決定:** 分析結果をRequirement YAMLのimpactフィールドに記録
**理由:** 分析は計算コストがかかるため、結果をキャッシュすることで繰り返し表示時のパフォーマンスを向上させる。lastAnalyzedAtで鮮度を管理し、依存関係変更時に再分析を促す。

### relatedToの走査

**決定:** relatedToも走査対象に含める（blockedBy/blocksだけでなく）
**理由:** relatedToは「関連があるが直接の依存ではない」関係を示す。変更の影響は間接的にも波及する可能性があるため、通知対象に含めるべき。ただし、走査の深度はrelatedTo経由では1（直接のみ）に制限する。
