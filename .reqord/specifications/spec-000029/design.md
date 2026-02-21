# 2レベルドリルダウングラフ - 技術設計書

## 1. 設計概要

Full Traceabilityグラフの可読性問題を解決するため、2レベルのドリルダウンUI方式を採用する。Level 1ではRequirement間の依存関係DAGを表示し、Level 2では選択されたRequirementに関連するSpecificationとIssueのみを表示することで、100+ ノードの複雑さを段階的に理解可能にする。

**Progressive Disclosure Pattern:**
- Level 1（概要）: Requirements DAG - プロジェクト全体の依存関係を俯瞰
- Level 2（詳細）: Requirement + Specs + Issues - 単一要件のトレーサビリティを詳細表示

**主要な設計決定:**
- モード選択UIは廃止し、RequirementNodeの"spec count row"をドリルダウンのアフォーダンスとする
- RequirementNodeに2つのクリックゾーンを設ける: ノード本体クリック → 詳細ページ遷移、spec count rowクリック → ドリルダウン
- URL stateは `useSearchParams` で `?req=req-000001` として管理（ハッシュではない）
- アニメーション無しでコンポーネント切替（DependencyGraph ↔ DrillDownGraph）+ CSSクロスフェード（200ms opacity）

本機能は未実装であり、既存のspec-000026（多階層グラフ）の設計を参考にしつつ、UX Lead・Tech Leadの検討結果を反映して設計する。

## 2. アーキテクチャ

```
packages/web/src/
  ├── app/
  │   └── graph/
  │       └── page.tsx                           (既存: Server Component - データ取得)
  ├── components/
  │   └── graph/
  │       ├── graph-page-client.tsx              (既存: 拡張 - モード選択削除、URLベースの状態管理追加)
  │       ├── dependency-graph.tsx               (既存: 拡張 - onRequirementClick prop追加)
  │       ├── requirement-node.tsx               (既存: 拡張 - 2クリックゾーン実装)
  │       ├── specification-node.tsx             (既存: spec-000026で作成済み)
  │       ├── issue-node.tsx                     (既存: spec-000026で作成済み)
  │       ├── drilldown-graph.tsx                (新規: Level 2グラフコンポーネント)
  │       ├── drilldown-breadcrumb.tsx           (新規: 戻りナビゲーション + Escape key)
  │       ├── edge-styles.ts                     (新規: EDGE_STYLES定数抽出)
  │       └── dag-layout.ts                      (既存: spec-000023で作成済み)
  └── lib/
      └── drilldown-graph-data.ts                (新規: buildDrillDownGraphData純粋関数)
```

### コンポーネント階層

```
GraphPage (Server Component)
  └── GraphPageClient (Client Component) ← useSearchParams()
      ├── selectedReqId === null の場合:
      │   └── DependencyGraph
      │       └── RequirementNode[]
      │           ├── onClick on div → router.push(`/requirements/${id}`)
      │           └── button.nodrag onClick → onRequirementClick(id)
      └── selectedReqId !== null の場合:
          ├── DrillDownBreadcrumb
          │   └── button onClick → setSearchParams({})
          └── DrillDownGraph
              ├── RequirementNode (中央配置)
              ├── SpecificationNode[] (左列)
              └── IssueNode[] (右列)
```

### データフロー

```
Level 1 → Level 2:
  RequirementNode spec count button click
    → stopPropagation() (drag防止・navigation防止)
    → onRequirementClick(reqId)
    → setSearchParams({ req: reqId })
    → URL変更: /graph?req=req-000001
    → GraphPageClient rerenders
    → selectedReqId !== null → DrillDownGraph表示

Level 2 → Level 1:
  DrillDownBreadcrumb button click or Escape key
    → setSearchParams({})
    → URL変更: /graph
    → GraphPageClient rerenders
    → selectedReqId === null → DependencyGraph表示

RequirementNode body → Detail page:
  RequirementNode div onClick
    → router.push(`/requirements/${id}`)
    → Next.js navigation → /requirements/{id} ページ
```

## 3. コンポーネント設計

### 3.1 GraphPageClient (拡張)

**ファイルパス:** `packages/web/src/components/graph/graph-page-client.tsx`

**責務:** URLパラメータに基づくグラフモードの切替とReact Flow表示。

**主要な変更:**
- `<GraphModeSelector>` コンポーネントの削除
- `useSearchParams()` を使用して `?req=` パラメータを読み取り
- `selectedReqId` 状態に基づき、DependencyGraph または DrillDownGraph + Breadcrumb を表示
- DependencyGraphに `onRequirementClick` callback propを追加

```typescript
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useCallback } from "react";
import { DependencyGraph } from "./dependency-graph";
import { DrillDownGraph } from "./drilldown-graph";
import { DrillDownBreadcrumb } from "./drilldown-breadcrumb";
import type { Requirement, Specification } from "@reqord/shared";

interface GraphPageClientProps {
  requirements: Requirement[];
  specifications: Specification[];
}

export function GraphPageClient({ requirements, specifications }: GraphPageClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedReqId = searchParams.get("req");

  const handleRequirementClick = useCallback(
    (reqId: string) => {
      const params = new URLSearchParams(searchParams);
      params.set("req", reqId);
      router.push(`/graph?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleBackToOverview = useCallback(() => {
    router.push("/graph");
  }, [router]);

  if (selectedReqId) {
    const requirement = requirements.find((r) => r.id === selectedReqId);
    if (!requirement) {
      // Invalid req ID → fallback to overview
      return <DependencyGraph requirements={requirements} onRequirementClick={handleRequirementClick} />;
    }

    const relatedSpecs = specifications.filter((s) => s.requirementId === selectedReqId);

    return (
      <div>
        <DrillDownBreadcrumb requirementTitle={requirement.title} onBack={handleBackToOverview} />
        <DrillDownGraph requirement={requirement} specifications={relatedSpecs} />
      </div>
    );
  }

  return <DependencyGraph requirements={requirements} onRequirementClick={handleRequirementClick} />;
}
```

### 3.2 DependencyGraph (拡張)

**ファイルパス:** `packages/web/src/components/graph/dependency-graph.tsx`

**責務:** Requirement間の依存関係DAG表示。

**主要な変更:**
- `onRequirementClick?: (reqId: string) => void` propを追加
- RequirementNodeに `onRequirementClick` を渡す
- `issueProgressMap` propを追加（spec count計算用）

```typescript
"use client";

import ReactFlow, { Background, Controls, type Node, type Edge } from "@xyflow/react";
import { useMemo } from "react";
import { RequirementNode } from "./requirement-node";
import { computeDAGLayout } from "./dag-layout";
import { EDGE_STYLES } from "./edge-styles";
import type { Requirement } from "@reqord/shared";

interface DependencyGraphProps {
  requirements: Requirement[];
  onRequirementClick?: (reqId: string) => void;
}

const nodeTypes = {
  requirement: RequirementNode,
};

export function DependencyGraph({ requirements, onRequirementClick }: DependencyGraphProps) {
  const { nodes, edges } = useMemo(() => {
    const positions = computeDAGLayout(requirements);
    const nodes: Node[] = requirements.map((req) => ({
      id: req.id,
      type: "requirement",
      position: positions[req.id] ?? { x: 0, y: 0 },
      data: {
        id: req.id,
        title: req.title,
        status: req.status,
        priority: req.priority,
        specCount: req.specifications?.length ?? 0, // TODO: 実際のspec数を渡す
        onDrillDown: onRequirementClick,
      },
    }));

    const edges: Edge[] = requirements.flatMap((req) =>
      req.dependencies.blockedBy.map((depId) => ({
        id: `${depId}-${req.id}`,
        source: depId,
        target: req.id,
        style: EDGE_STYLES.dependency,
        animated: false,
      }))
    );

    return { nodes, edges };
  }, [requirements, onRequirementClick]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      minZoom={0.1}
      maxZoom={2}
    >
      <Background />
      <Controls />
    </ReactFlow>
  );
}
```

### 3.3 RequirementNode (拡張)

**ファイルパス:** `packages/web/src/components/graph/requirement-node.tsx`

**責務:** Requirementノードの描画と2つのクリックゾーンの実装。

**主要な変更:**
- `<Link>` を削除し、`div` の `onClick` で `router.push()` による遷移を実装
- Spec count rowを `<button className="nodrag">` として実装
- `onMouseDown` にも `e.stopPropagation()` を追加（React Flowのドラッグ開始を防止）

```typescript
"use client";

import { memo, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { NodeProps } from "@xyflow/react";

interface RequirementNodeData {
  id: string;
  title: string;
  status: string;
  priority: string;
  specCount: number;
  onDrillDown?: (reqId: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "border-gray-300 bg-gray-50",
  "pending-approval": "border-yellow-300 bg-yellow-50",
  approved: "border-green-300 bg-green-50",
  rejected: "border-red-300 bg-red-50",
};

const PRIORITY_COLORS: Record<string, string> = {
  P0: "bg-red-100 text-red-800",
  P1: "bg-orange-100 text-orange-800",
  P2: "bg-blue-100 text-blue-800",
  P3: "bg-gray-100 text-gray-800",
};

export const RequirementNode = memo(({ data }: NodeProps<RequirementNodeData>) => {
  const { id, title, status, priority, specCount, onDrillDown } = data;
  const router = useRouter();

  const handleBodyClick = useCallback(() => {
    router.push(`/requirements/${id}`);
  }, [router, id]);

  const handleDrillDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDrillDown?.(id);
    },
    [onDrillDown, id]
  );

  const handleButtonMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div
      onClick={handleBodyClick}
      className={`w-64 cursor-pointer rounded-lg border-2 p-3 shadow-md transition-shadow hover:shadow-lg ${STATUS_COLORS[status] ?? STATUS_COLORS.draft}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">{id}</span>
        <span className={`rounded px-2 py-0.5 text-xs font-semibold ${PRIORITY_COLORS[priority] ?? PRIORITY_COLORS.P3}`}>
          {priority}
        </span>
      </div>
      <h3 className="mb-2 text-sm font-semibold text-gray-900">{title}</h3>
      <div className="text-xs text-gray-600">
        <span className="capitalize">{status.replace(/-/g, " ")}</span>
      </div>

      {onDrillDown && specCount > 0 && (
        <button
          className="nodrag mt-2 w-full rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200"
          onClick={handleDrillDown}
          onMouseDown={handleButtonMouseDown}
        >
          {specCount} {specCount === 1 ? "spec" : "specs"} →
        </button>
      )}
    </div>
  );
});

RequirementNode.displayName = "RequirementNode";
```

### 3.4 DrillDownGraph (新規)

**ファイルパス:** `packages/web/src/components/graph/drilldown-graph.tsx`

**責務:** 単一Requirementとその関連Specification・Issueを3列レイアウトで表示。

```typescript
"use client";

import ReactFlow, { Background, Controls, type Node, type Edge } from "@xyflow/react";
import { useMemo } from "react";
import { RequirementNode } from "./requirement-node";
import { SpecificationNode } from "./specification-node";
import { IssueNode } from "./issue-node";
import { buildDrillDownGraphData } from "@/lib/drilldown-graph-data";
import type { Requirement, Specification } from "@reqord/shared";

interface DrillDownGraphProps {
  requirement: Requirement;
  specifications: Specification[];
}

const nodeTypes = {
  requirement: RequirementNode,
  specification: SpecificationNode,
  issue: IssueNode,
};

export function DrillDownGraph({ requirement, specifications }: DrillDownGraphProps) {
  const { nodes, edges } = useMemo(
    () => buildDrillDownGraphData(requirement, specifications),
    [requirement, specifications]
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      minZoom={0.1}
      maxZoom={2}
    >
      <Background />
      <Controls />
    </ReactFlow>
  );
}
```

### 3.5 DrillDownBreadcrumb (新規)

**ファイルパス:** `packages/web/src/components/graph/drilldown-breadcrumb.tsx`

**責務:** Level 2からLevel 1への戻りナビゲーション + Escapeキー対応。

```typescript
"use client";

import { useEffect } from "react";

interface DrillDownBreadcrumbProps {
  requirementTitle: string;
  onBack: () => void;
}

export function DrillDownBreadcrumb({ requirementTitle, onBack }: DrillDownBreadcrumbProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onBack();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onBack]);

  return (
    <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
      <button
        onClick={onBack}
        className="flex items-center gap-1 rounded px-3 py-1 hover:bg-gray-100"
      >
        ← Back to overview
      </button>
      <span className="text-gray-400">/</span>
      <span className="font-medium text-gray-900">{requirementTitle}</span>
      <span className="ml-auto text-xs text-gray-400">(Press Esc to go back)</span>
    </div>
  );
}
```

### 3.6 buildDrillDownGraphData (新規)

**ファイルパス:** `packages/web/src/lib/drilldown-graph-data.ts`

**責務:** Level 2グラフのノード・エッジデータ構築（純粋関数）。

```typescript
import type { Node, Edge } from "@xyflow/react";
import type { Requirement, Specification } from "@reqord/shared";
import { EDGE_STYLES } from "@/components/graph/edge-styles";

interface DrillDownGraphData {
  nodes: Node[];
  edges: Edge[];
}

const LAYOUT = {
  REQ_X: 420,       // Requirement中央配置
  SPEC_X: 0,        // Specification左列
  ISSUE_X: 720,     // Issue右列
  VERTICAL_GAP: 120,
  ISSUE_VERTICAL_GAP: 80,
};

export function buildDrillDownGraphData(
  requirement: Requirement,
  specifications: Specification[]
): DrillDownGraphData {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // 1. Requirementノード（中央）
  nodes.push({
    id: requirement.id,
    type: "requirement",
    position: { x: LAYOUT.REQ_X, y: 0 },
    data: {
      id: requirement.id,
      title: requirement.title,
      status: requirement.status,
      priority: requirement.priority,
      specCount: specifications.length,
      onDrillDown: undefined, // Level 2では不要
    },
  });

  // 2. Specificationノード（左列）
  specifications.forEach((spec, i) => {
    const specNodeId = spec.id;
    nodes.push({
      id: specNodeId,
      type: "specification",
      position: { x: LAYOUT.SPEC_X, y: i * LAYOUT.VERTICAL_GAP },
      data: {
        id: spec.id,
        status: spec.status,
        version: spec.version,
      },
    });

    // Specification → Requirement の implements エッジ
    edges.push({
      id: `impl-${specNodeId}-${requirement.id}`,
      source: specNodeId,
      target: requirement.id,
      style: EDGE_STYLES.implements,
      animated: false,
    });

    // 3. Issueノード（右列） - tasks.yamlからlinkedTo.specificationsで検索
    const specTasks = tasks.filter(t => t.linkedTo.specifications.includes(spec.id));
    specTasks.forEach((task, j) => {
      const issueNodeId = `issue-${task.number}`;
      nodes.push({
        id: issueNodeId,
        type: "issue",
        position: {
          x: LAYOUT.ISSUE_X,
          y: i * LAYOUT.VERTICAL_GAP + j * LAYOUT.ISSUE_VERTICAL_GAP,
        },
        data: {
          number: task.number,
          title: task.title,
          status: task.status,
          priority: task.priority,
          url: task.url,
        },
      });

      // Issue → Specification の tracks エッジ
      edges.push({
        id: `track-${issueNodeId}-${specNodeId}`,
        source: issueNodeId,
        target: specNodeId,
        style: EDGE_STYLES.tracks,
        animated: false,
      });
    });
  });

  return { nodes, edges };
}
```

### 3.7 EDGE_STYLES (新規)

**ファイルパス:** `packages/web/src/components/graph/edge-styles.ts`

**責務:** React Flowエッジスタイルの定数定義（DRY原則）。

```typescript
export const EDGE_STYLES = {
  dependency: {
    stroke: "#64748b",       // slate-500
    strokeWidth: 2,
  },
  implements: {
    stroke: "#3b82f6",       // blue-500
    strokeWidth: 2,
    strokeDasharray: "5,5",  // 破線
  },
  tracks: {
    stroke: "#22c55e",       // green-500
    strokeWidth: 1.5,
    strokeDasharray: "2,2",  // 点線
  },
} as const;
```

## 4. データフロー

### 4.1 Level 1 → Level 2 ドリルダウンフロー

```
ユーザー: RequirementNode の spec count button をクリック
  ↓
RequirementNode.handleDrillDown
  ↓ e.stopPropagation() (親divのonClick・React Flowのドラッグを防止)
  ↓
onDrillDown(reqId) callback
  ↓
GraphPageClient.handleRequirementClick
  ↓ setSearchParams({ req: reqId })
  ↓
URL変更: /graph → /graph?req=req-000001
  ↓
GraphPageClient rerenders
  ↓ selectedReqId !== null
  ↓
<DrillDownGraph> + <DrillDownBreadcrumb> 表示
  ↓
buildDrillDownGraphData(requirement, specifications)
  ↓ 3列レイアウト計算（Req中央、Spec左、Issue右）
  ↓
ReactFlow描画: 選択されたRequirement + 関連Spec + 関連Issue
```

### 4.2 Level 2 → Level 1 戻りフロー

```
ユーザー: "Back to overview" ボタンクリック or Escape key
  ↓
DrillDownBreadcrumb.onBack
  ↓
GraphPageClient.handleBackToOverview
  ↓ router.push("/graph")
  ↓
URL変更: /graph?req=req-000001 → /graph
  ↓
GraphPageClient rerenders
  ↓ selectedReqId === null
  ↓
<DependencyGraph> 表示
  ↓
Requirements DAG描画
```

### 4.3 RequirementNode body → 詳細ページ遷移フロー

```
ユーザー: RequirementNode の spec count button 以外の領域をクリック
  ↓
RequirementNode div onClick
  ↓ handleBodyClick
  ↓
router.push(`/requirements/${id}`)
  ↓
Next.js App Router navigation
  ↓
/requirements/{id} ページ表示
```

## 5. テスト方針

### 5.1 TDD実装計画（9サイクル）

**Phase 1: データ層・ユーティリティ**

**Cycle 1: EDGE_STYLES定数抽出**
- 目的: DependencyGraphとMultiLevelGraphから重複するエッジスタイル定義を抽出
- Red: `edge-styles.ts` 読み込みテスト（ファイル未作成で失敗）
- Green: EDGE_STYLES定数をexport、dependency/implements/tracksスタイル定義
- Refactor: 既存コンポーネントから定数を削除し、edge-stylesをimport

**Cycle 2: buildDrillDownGraphData - Requirementのみ**
- Red: 単一Requirementのみの入力でノード1個・エッジ0個を返すテスト（関数未実装で失敗）
- Green: Requirementノードを中央（x=420）に配置するロジックを実装
- Refactor: LAYOUT定数を抽出

**Cycle 3: buildDrillDownGraphData - Specification追加**
- Red: Requirement + Specificationsでノード・エッジが正しく生成されるテスト（実装不足で失敗）
- Green: Specificationノード（左列x=0）と implements エッジを追加
- Refactor: ノード生成ロジックを関数に分割

**Cycle 4: buildDrillDownGraphData - Issue追加**
- Red: tasks.yaml（linkedTo.specifications）からIssueノードが生成されるテスト（実装不足で失敗）
- Green: Issueノード（右列x=720）と tracks エッジを追加
- Refactor: エッジ生成ロジックをヘルパー関数に抽出

**Phase 2: UIコンポーネント**

**Cycle 5: DrillDownBreadcrumb**
- Red: Escapeキー押下でonBackが呼ばれるテスト（コンポーネント未作成で失敗）
- Green: useEffectでkeydownイベントリスナーを登録、EscapeキーでonBack呼び出し
- Refactor: クリーンアップ関数の動作を確認

**Cycle 6: RequirementNode - 2クリックゾーン**
- Red: spec count button clickでonDrillDownが呼ばれ、親のonClickは呼ばれないテスト（実装不足で失敗）
- Green: button onClick内でe.stopPropagation()を追加、onDrillDown呼び出し
- Refactor: onMouseDownにもstopPropagation追加（React Flowドラッグ防止）

**Cycle 7: DrillDownGraph**
- Red: requirement + specifications propsからReact Flowに正しいノード・エッジが渡されるテスト（コンポーネント未作成で失敗）
- Green: buildDrillDownGraphDataを呼び出し、結果をReactFlowに渡す
- Refactor: useMemoでデータ生成を最適化

**Phase 3: 統合**

**Cycle 8: DependencyGraph - onRequirementClick prop**
- Red: onRequirementClick propがRequirementNodeに正しく渡されるテスト（prop未追加で失敗）
- Green: DependencyGraph propsにonRequirementClickを追加、RequirementNode dataに渡す
- Refactor: 型定義を明確化

**Cycle 9: GraphPageClient - URL state統合**
- Red: useSearchParamsでselectedReqIdを取得し、条件分岐でDrillDownGraph/DependencyGraphが切り替わるテスト（実装不足で失敗）
- Green: useSearchParams()、handleRequirementClick、handleBackToOverviewを実装
- Refactor: 不正なreq IDのフォールバック処理を追加

### 5.2 ユニットテスト

**buildDrillDownGraphData:**
- 入力: Requirement + Specifications（tasks.yamlにエントリなし）→ ノード: Req + Specs、エッジ: implements のみ
- 入力: Requirement + Specifications（tasks.yamlにエントリあり）→ ノード: Req + Specs + Issues、エッジ: implements + tracks
- 入力: Specifications = [] → ノード: Reqのみ、エッジ: なし
- レイアウト座標: Req x=420, Spec x=0, Issue x=720, y座標が正しくオフセットされること

**EDGE_STYLES:**
- dependency / implements / tracks の各スタイルが定義されていること
- strokeDasharrayが正しく設定されていること

### 5.3 コンポーネントテスト

**RequirementNode:**
- spec count button click → onDrillDown(id)が呼ばれ、親divのonClickは呼ばれない
- spec count button mousedown → stopPropagation()が呼ばれる（React Flowドラッグ防止）
- ノード本体 click → router.push(`/requirements/${id}`)が呼ばれる
- onDrillDown未定義またはspecCount=0の場合、buttonが表示されない

**DrillDownBreadcrumb:**
- "Back to overview" button click → onBackが呼ばれる
- Escape key press → onBackが呼ばれる
- requirementTitleが正しく表示される

**DrillDownGraph:**
- requirement + specifications props → buildDrillDownGraphDataが呼ばれる
- 生成されたノード・エッジがReactFlowに渡される
- fitViewが有効化されている

**DependencyGraph:**
- onRequirementClick prop → RequirementNode dataに渡される
- requirements配列 → computeDAGLayoutが呼ばれる

### 5.4 統合テスト

**ドリルダウンフロー:**
- Level 1表示 → RequirementNode spec count button click → URL `/graph?req=req-000001` に変更 → Level 2表示
- Level 2表示 → Breadcrumb "Back" button click → URL `/graph` に変更 → Level 1表示
- Level 2表示 → Escape key → URL `/graph` に変更 → Level 1表示

**不正なreq ID:**
- URL `/graph?req=invalid-id` → DependencyGraphにフォールバック

**RequirementNode遷移:**
- RequirementNode本体click → `/requirements/{id}` に遷移
- spec count button click → 遷移せず、ドリルダウン

## 6. 技術的決定事項

### 6.1 モード選択UIの廃止

**決定:** GraphModeSelectorコンポーネントを作成せず、RequirementNodeのspec count rowをドリルダウンのアフォーダンスとする

**理由:**
- Full Traceabilityモードは100+ ノードを表示すると可読性が低い
- Progressive Disclosureパターン（概要→詳細）により、ユーザーは必要な情報のみを段階的に表示できる
- モード選択UIは「Requirements Only」と「Full Traceability」の2択を強制するが、実際のニーズは「特定のRequirementの詳細を見たい」という点にフォーカスされる
- Requirement単位のドリルダウンにより、関連するSpecとIssueのみを表示でき、情報密度が最適化される

**代替案:**
- 当初案: GraphModeSelectorで "Requirements Only" / "Drill-Down Traceability" を切り替え
- 不採用理由: UIが複雑化し、ユーザーは「どのモードを選べばいいか」という余計な認知負荷を負う。ドリルダウンボタンを直接配置する方が直感的。

### 6.2 RequirementNodeの2クリックゾーン設計

**決定:** RequirementNodeに2つのクリック領域を設ける
1. ノード本体（上部エリア）: `div` の `onClick` → `router.push()` で詳細ページ遷移
2. Spec count row（下部ボタン）: `<button className="nodrag">` の `onClick` → `onDrillDown()` でドリルダウン

**理由:**
- 詳細ページへの遷移とドリルダウンの両方の導線を維持する必要がある
- `<Link>` 内に `<button>` をネストするのは無効なHTML（button inside anchor tag）
- React Flowの `onNodeClick` だけでは、詳細ページ遷移とドリルダウンの両方を実現できない
- `e.stopPropagation()` を使用することで、buttonクリック時に親divのonClickとReact Flowのドラッグが発動しないようにする
- `onMouseDown` にも `e.stopPropagation()` を追加することで、React Flowのドラッグ開始（mousedown時に発火）を防止する
- `.nodrag` CSSクラスによりReact Flowのドラッグハンドルから除外される

**代替案:**
- 案1: `<Link>` で全体をラップし、`onNodeClick` でドリルダウン → 不採用（詳細ページ遷移とドリルダウンを区別できない）
- 案2: ノード右上にドリルダウンアイコンボタンを配置 → 不採用（spec countという意味のある情報をアフォーダンスとして活用する方が自然）

### 6.3 URL stateの管理方法

**決定:** `useSearchParams()` で `?req=req-000001` として管理（ハッシュ `#req-000001` ではない）

**理由:**
- Next.js App Routerでは `useSearchParams()` がクエリパラメータの標準的なReact Hook
- URLハッシュ（`#`）はページ内アンカーリンクとの競合やSSRでの取得困難さがある
- クエリパラメータはサーバーサイドでも取得可能で、将来的なOGP対応やSEO最適化に有利
- `router.push()` でのナビゲーションが自然にサポートされる

**代替案:**
- 案1: URLハッシュ（`#req-000001`）→ 不採用（SSR困難、ハッシュの本来の用途と異なる）
- 案2: Client側のuseState管理 → 不採用（URLに状態が反映されず、リロード時に状態が失われる）

### 6.4 コンポーネント切替とアニメーション

**決定:** DependencyGraph ↔ DrillDownGraph のコンポーネント remount + CSSクロスフェード（200ms opacity transition）

**理由:**
- React Flow v12はノードの位置をアニメーションで変更する公式APIを持たない
- ノード数の変更（Level 1: 全Requirements → Level 2: 1 Requirement + 関連Specs + Issues）を滑らかにアニメーションするのは複雑
- コンポーネントを完全に切り替え、CSSのopacity transitionでフェードイン・アウトする方がシンプルで保守性が高い
- React FlowのfitView()により、各レベルでの自動ズーム・中央配置が実現される

**代替案:**
- 案1: React Flowのノード位置を動的に変更し、CSS transitionでアニメーション → 不採用（React Flow v12がサポートしていない、複雑度が高い）
- 案2: 3段階アニメーション（siblings fade out → move node → children fade in）→ 不採用（実装コストが高く、UX上の利益が少ない）

### 6.5 buildDrillDownGraphDataの純粋関数化

**決定:** グラフデータ生成を純粋関数として `lib/drilldown-graph-data.ts` に分離

**理由:**
- テスタビリティ: React Flowやフック無しで単体テストが可能
- 再利用性: 将来的にサーバーサイドでのプリレンダリングやOGP画像生成に利用可能
- 保守性: ビジネスロジック（レイアウト計算）とUIロジック（React Flow描画）を分離
- 型安全性: 入力（Requirement, Specification[]）と出力（Node[], Edge[]）の型が明確

**代替案:**
- 案1: DrillDownGraph内でuseMemoを使ってデータ生成 → 不採用（テストが困難、関心の分離が不十分）

### 6.6 React Flowイベント伝播の制御

**決定:** `e.stopPropagation()` を `onClick` と `onMouseDown` の両方に適用

**理由:**
- `onClick` だけでは不十分: React Flowのドラッグは `mousedown` 時に開始されるため、`onMouseDown` でもstopPropagationが必要
- 親divのonClick防止: spec count buttonクリック時に、親divのonClick（詳細ページ遷移）が発火しないようにする
- `.nodrag` CSSクラス: React Flowのドラッグハンドル検出から除外するため、buttonに明示的に付与

**代替案:**
- 案1: `onClick` のみでstopPropagation → 不採用（React Flowのドラッグが発動してしまう）
- 案2: `pointer-events: none` をCSSで設定 → 不採用（ボタンのクリックも無効化されてしまう）
