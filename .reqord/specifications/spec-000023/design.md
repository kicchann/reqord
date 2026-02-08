# ローカルUI - 依存関係グラフ - 技術設計書

## 1. 設計概要

Next.js 15 App Router上で、Requirements間の依存関係をDAG（有向非巡回グラフ）として可視化する機能を提供する。既存実装（React Flow + カスタムDAGレイアウト）をベースに、ステータス別の色分け、ノードクリックによる詳細遷移、MiniMap・Controls等のインタラクティブ機能を統合する。本specはRequirementレベルの依存関係グラフに限定し、Specification/Issueレベルの拡張グラフはspec-000026で扱う。

**既存実装の状況:**
- `packages/web/src/app/graph/page.tsx` - グラフページ（Server Component）
- `packages/web/src/components/graph/dependency-graph.tsx` - React Flowによるグラフ描画
- `packages/web/src/components/graph/requirement-node.tsx` - カスタムノードコンポーネント
- `packages/web/src/components/graph/dag-layout.ts` - トポロジカルソートベースのDAGレイアウト
- `packages/web/src/components/graph/graph-loader.tsx` - SSR無効化のための動的ロード

## 2. アーキテクチャ

```
packages/web/src/
  ├── app/
  │   └── graph/
  │       ├── page.tsx                     (既存: Server Component)
  │       └── loading.tsx                  (新規: ローディングUI)
  ├── components/
  │   └── graph/
  │       ├── dependency-graph.tsx          (既存: React Flowメインコンポーネント)
  │       ├── requirement-node.tsx          (既存: カスタムノード)
  │       ├── dag-layout.ts                (既存: DAGレイアウトアルゴリズム)
  │       ├── graph-loader.tsx             (既存: 動的インポートラッパー)
  │       ├── graph-legend.tsx             (新規: ステータス凡例)
  │       ├── graph-toolbar.tsx            (新規: フィルター・操作ツールバー)
  │       └── node-detail-panel.tsx        (新規: ノード詳細パネル)
  └── lib/
      └── data.ts                          (既存: getAllRequirements)
```

### データアクセスの流れ

```
ブラウザ → /graph (GET)
  → GraphPage (Server Component)
    → getAllRequirements() → .reqord/requirements/ (ファイルシステム)
  → GraphLoader (Client Component, dynamic import, ssr: false)
    → DependencyGraph (Client Component)
      → computeDagLayout() → LayoutNode[] + LayoutEdge[]
      → React Flow描画
```

## 3. コンポーネント設計

### 3.1 ページコンポーネント

#### GraphPage (`app/graph/page.tsx` - 既存)

- Server Componentとして全Requirementsを取得
- `dynamic = "force-dynamic"` でキャッシュ無効化
- `<GraphLoader>` にデータを渡す（SSR無効化のためdynamic importを使用）

### 3.2 UIコンポーネント

#### DependencyGraph (`components/graph/dependency-graph.tsx` - 既存)

**責務:** React Flowを用いたグラフの描画とインタラクション管理。

- `useMemo` で `computeDagLayout` を呼び出し、ノード・エッジを計算
- `useNodesState` / `useEdgesState` でReact Flowの状態管理
- `onInit` でfitViewを実行
- `<Background>` / `<Controls>` / `<MiniMap>` の統合

```typescript
// 既存実装の拡張ポイント
interface DependencyGraphProps {
  requirements: Requirement[];
  onNodeClick?: (requirementId: string) => void;  // 新規: ノードクリックハンドラ
  filter?: {
    status?: string[];        // 新規: ステータスフィルター
    priority?: string[];      // 新規: 優先度フィルター
  };
}
```

#### RequirementNode (`components/graph/requirement-node.tsx` - 既存)

**責務:** 個別ノードの描画。ステータス別の色分けとクリック遷移。

```typescript
// 既存のステータス色マッピング
const STATUS_COLORS: Record<string, string> = {
  draft: "border-gray-300 bg-gray-50",
  pending_approval: "border-yellow-300 bg-yellow-50",
  approved: "border-green-300 bg-green-50",
  deprecated: "border-red-300 bg-red-50",
};
```

- ノード幅: 220px固定
- `<Handle>` でソース/ターゲット接続点を提供
- `<Link>` で `/requirements/{id}` への遷移

#### GraphLegend (`components/graph/graph-legend.tsx` - 新規)

**責務:** ステータス色の凡例表示。

```typescript
interface GraphLegendProps {
  className?: string;
}
```

- 各ステータス（draft / pending_approval / approved / deprecated）の色サンプルとラベル
- グラフ右下にオーバーレイ表示
- Tailwind CSSによるコンパクトなカード表示

#### GraphToolbar (`components/graph/graph-toolbar.tsx` - 新規)

**責務:** ステータス・優先度によるフィルタリングUI。

```typescript
"use client";

interface GraphToolbarProps {
  onFilterChange: (filter: GraphFilter) => void;
  currentFilter: GraphFilter;
}

interface GraphFilter {
  statuses: string[];     // 空配列 = すべて表示
  priorities: string[];   // 空配列 = すべて表示
}
```

- チェックボックスまたはトグルボタンによるステータス・優先度フィルタ
- フィルタ適用時にDependencyGraphの表示ノードを絞り込み
- 「すべて表示」リセットボタン

#### NodeDetailPanel (`components/graph/node-detail-panel.tsx` - 新規)

**責務:** ノード選択時の詳細情報パネル。

```typescript
"use client";

interface NodeDetailPanelProps {
  requirement: Requirement | null;
  onClose: () => void;
}
```

- グラフ右側にスライドインするサイドパネル
- 選択されたRequirementの基本情報表示（ID, タイトル, ステータス, 優先度）
- blockedBy / blocks / relatedTo の依存関係リスト
- 「詳細ページへ」リンクボタン

### 3.3 レイアウトアルゴリズム

#### computeDagLayout (`components/graph/dag-layout.ts` - 既存)

**アルゴリズム:** トポロジカルソートベースの左→右DAGレイアウト。

```
1. 全Requirementsからエッジを構築（blockedBy関係）
2. 入次数0のノードをルートとして初期化
3. BFSでトポロジカルソート、各ノードの深度（最長パス）を計算
4. 深度ごとにカラムを割り当て
5. カラム内のノードをID順でソート（安定性のため）
6. (x, y) = (col * (NODE_WIDTH + H_GAP), row * (NODE_HEIGHT + V_GAP))
```

**定数:**
- `NODE_WIDTH = 240`
- `NODE_HEIGHT = 80`
- `HORIZONTAL_GAP = 80`
- `VERTICAL_GAP = 40`

**サイクル処理:** 循環依存が存在する場合、未処理ノードにdepth=0を割り当て（退化ケース）。

## 4. データフロー

### グラフ表示フロー

```
ブラウザ → /graph (GET)
  → GraphPage (Server Component)
    → getAllRequirements()
      → getRepository() → LocalRequirementRepository
        → findAll() → .reqord/requirements/req-*.json 読み込み
    → <GraphLoader requirements={data} />
  → HTML + Requirement[] データのシリアライゼーション

ブラウザ (CSR)
  → GraphLoader → DependencyGraph (dynamic import, ssr: false)
    → computeDagLayout(requirements)
      → エッジ構築: req.dependencies.blockedBy → edge[]
      → トポロジカルソート → depth計算
      → カラム・行レイアウト → LayoutNode[] + LayoutEdge[]
    → React Flow初期化
      → ノード描画: RequirementNode × N
      → エッジ描画: animated=false, markerEnd=arrowclosed
      → fitView() → 全体表示
```

### ノードクリック → 詳細遷移フロー

```
ノードクリック
  → RequirementNode内の<Link href={`/requirements/${id}`}>
  → Next.js App Routerによるページ遷移
  → /requirements/[id]/page.tsx (Server Component)
```

### フィルタリングフロー

```
GraphToolbar: ステータスチェックボックス変更
  → onFilterChange({ statuses: ["approved", "draft"] })
  → DependencyGraph: 表示ノードのフィルタリング
    → computeDagLayout(filteredRequirements)
    → React Flow再描画
```

## 5. テスト方針

### ユニットテスト

- **computeDagLayout**:
  - 空配列: ノード0件、エッジ0件
  - 依存関係なし: 全ノードがdepth=0（1カラム）
  - 線形依存: A → B → C がdepth 0, 1, 2に配置
  - 分岐依存: A → B, A → C がdepth 0, 1, 1に配置（Bと Cが同一カラム）
  - 循環依存: サイクルノードがdepth=0にフォールバック
  - 存在しないIDへの依存: 無効なblockedByエントリが無視されること
- **GraphFilter ロジック**:
  - ステータスフィルタ適用時のノード絞り込み
  - 空フィルタ（全表示）の動作

### コンポーネントテスト

- **RequirementNode**: ステータス別の色クラスが適用されること
- **GraphLegend**: 全ステータスの凡例が表示されること
- **GraphToolbar**: フィルタ変更時にonFilterChangeが呼ばれること

### 統合テスト

- GraphPage: Server ComponentがRequirementsを取得し、GraphLoaderに渡すこと
- 依存関係のある要件セットでグラフが正しく描画されること
- ノードクリック → 詳細ページ遷移の動作確認

## 6. 技術的決定事項

### React Flow（@xyflow/react）の採用

**決定:** グラフ描画にReact Flow（@xyflow/react）を使用
**理由:** DAGの可視化に必要なノード描画、エッジ描画、パン・ズーム、MiniMap等の機能を標準で提供する。Reactエコシステムとの親和性が高く、カスタムノードの実装が容易。D3.jsやCytoscapeと比較して、Reactコンポーネントモデルに自然に統合できる。

### SSR無効化（dynamic import + ssr: false）

**決定:** DependencyGraphコンポーネントをdynamic importでSSR無効化
**理由:** React FlowはブラウザDOMに依存するためサーバーサイドレンダリングが不可。`graph-loader.tsx` でnext/dynamicを使用し、`ssr: false` オプションで明示的にCSR限定とする。ローディング中はアニメーション付きプレースホルダーを表示。

### カスタムDAGレイアウトアルゴリズム

**決定:** React Flowの自動レイアウト（dagre等）ではなく、カスタムのトポロジカルソートベースレイアウトを使用
**理由:** Requirementsの依存関係は比較的シンプルなDAG構造であり、dagreライブラリの追加依存を避けられる。最長パスベースの深度計算により、依存関係の階層が視覚的に明確になる。ノード数が数十程度の規模であり、カスタムアルゴリズムで十分なパフォーマンス。

### Server Component + Client Component分離

**決定:** ページレベルはServer Component（データ取得）、グラフ描画はClient Component
**理由:** spec-000007と同一の設計方針。ファイルシステムからのデータ取得はサーバーサイドで完結させ、React Flowの描画はクライアントサイドで実行する。シリアライズ可能なRequirement[]をpropsとして渡すことで、Server/Client境界を明確にする。
