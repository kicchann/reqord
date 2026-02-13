# Web UI - 依存グラフ拡張・Spec詳細 - 技術設計書

## 1. 設計概要

spec-000023で実装されたRequirementレベルの依存関係グラフを、Requirement → Specification → Issue の3階層に拡張し、プロジェクト全体のトレーサビリティを可視化する。また、Specification詳細ページを新設し、タブ型UIでResearch / Design / Coverage / Issues / Historyの各データを表示する。Markdownコンテンツの表示にはReact Markdown + Mermaid.jsを使用し、設計文書内のダイアグラムをインライン表示する。

## 2. アーキテクチャ

```
packages/web/src/
  ├── app/
  │   ├── graph/
  │   │   └── page.tsx                        (既存: 拡張 - グラフモード切替追加)
  │   └── specifications/
  │       ├── page.tsx                         (新規: Specification一覧)
  │       ├── loading.tsx                      (新規: ローディングUI)
  │       └── [id]/
  │           ├── page.tsx                     (新規: Specification詳細)
  │           ├── loading.tsx                  (新規: ローディングUI)
  │           └── not-found.tsx               (新規: 404ページ)
  ├── components/
  │   ├── graph/
  │   │   ├── dependency-graph.tsx             (既存: 拡張 - 多階層ノード対応)
  │   │   ├── requirement-node.tsx             (既存)
  │   │   ├── specification-node.tsx           (新規: Specificationノード)
  │   │   ├── issue-node.tsx                   (新規: Issueノード)
  │   │   ├── dag-layout.ts                   (既存: 拡張 - 多階層対応)
  │   │   ├── graph-loader.tsx                (既存)
  │   │   ├── graph-mode-selector.tsx          (新規: グラフモード切替)
  │   │   └── multi-level-graph.tsx            (新規: 多階層グラフコンポーネント)
  │   ├── specification/                       (新規ディレクトリ)
  │   │   ├── spec-detail.tsx                  (詳細表示メインコンポーネント)
  │   │   ├── spec-tabs.tsx                    (タブコンテナ)
  │   │   ├── tab-research.tsx                 (Researchタブ)
  │   │   ├── tab-design.tsx                   (Designタブ)
  │   │   ├── tab-coverage.tsx                 (Coverageタブ)
  │   │   ├── tab-issues.tsx                   (Issuesタブ)
  │   │   ├── tab-history.tsx                  (Historyタブ)
  │   │   └── spec-table.tsx                   (一覧テーブル)
  │   ├── markdown/                            (新規ディレクトリ)
  │   │   ├── markdown-renderer.tsx            (React Markdownレンダラ)
  │   │   └── mermaid-block.tsx                (Mermaidダイアグラムレンダラ)
  │   └── ui/
  │       ├── badge.tsx                        (既存)
  │       ├── nav.tsx                          (既存: Specificationsリンク追加)
  │       └── tabs.tsx                         (新規: タブUIコンポーネント)
  └── lib/
      ├── specification-repository.ts          (spec-000022で新規: Specification読み取り)
      ├── specification-data.ts                (新規: Specificationデータ取得)
      ├── graph-data.ts                        (新規: 多階層グラフデータ構築)
      ├── data.ts                              (既存: Requirement読み取り)
      └── local-repository.ts                  (既存: ファイルI/O)
```

### データアクセスの流れ

```
ブラウザ → /specifications/[id] (GET)
  → SpecificationDetailPage (Server Component)
    → getSpecificationById(id) → Specification YAML
    → loadDesignFile(id) → design.md
    → loadResearchFile(id) → research.md (存在する場合)
    → getRequirementById(spec.requirementId) → Requirement YAML
  → SpecDetail (Client Component)
    → タブ切替 → 各タブコンポーネント描画

ブラウザ → /graph (GET)
  → GraphPage (Server Component)
    → getAllRequirements() + getAllSpecifications()
    → buildMultiLevelGraphData() → 多階層グラフデータ
  → GraphLoader → MultiLevelGraph or DependencyGraph
```

## 3. コンポーネント設計

### 3.1 ページコンポーネント

#### Specification一覧ページ (`specifications/page.tsx` - 新規)

- Server Componentとして全Specificationsを取得
- `dynamic = "force-dynamic"` でキャッシュ無効化
- `<SpecTable>` にデータを渡す
- 関連Requirementのタイトルも表示（joinデータ取得）

```typescript
export default async function SpecificationsPage() {
  const specifications = await getAllSpecifications();
  const requirements = await getAllRequirements();

  // RequirementタイトルのマッピングをSpecTableに渡す
  const reqTitleMap = new Map(requirements.map(r => [r.id, r.title]));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Specifications</h1>
      <SpecTable specifications={specifications} requirementTitles={reqTitleMap} />
    </div>
  );
}
```

#### Specification詳細ページ (`specifications/[id]/page.tsx` - 新規)

- `generateMetadata` で動的タイトル生成
- 並列データ取得: Specification YAML + design.md + research.md + Requirement
- Specificationが存在しない場合は `notFound()` を呼び出し
- `<SpecDetail>` コンポーネントに全データを委譲

```typescript
export default async function SpecificationDetailPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [specification, design, research, requirement] = await Promise.all([
    getSpecificationById(id),
    loadSpecFile(id, "design.md"),
    loadSpecFile(id, "research.md"),
    // requirementIdはspec取得後に解決するため、ここでは全req取得
    getAllRequirements(),
  ]);

  if (!specification) notFound();

  const req = requirement.find(r => r.id === specification.requirementId);

  return (
    <SpecDetail
      specification={specification}
      design={design}
      research={research}
      requirement={req ?? null}
    />
  );
}
```

#### グラフページ拡張 (`graph/page.tsx` - 既存拡張)

- グラフモード切替UI追加: "Requirements Only" / "Full Traceability"
- "Full Traceability" モード時は Requirement + Specification + Issue ノードを表示
- 追加データ取得: `getAllSpecifications()`

### 3.2 Specification詳細コンポーネント

#### SpecDetail (`components/specification/spec-detail.tsx` - 新規)

**責務:** Specification詳細表示のメインコンポーネント。

```typescript
"use client";

interface SpecDetailProps {
  specification: Specification;
  design: string | null;
  research: string | null;
  requirement: Requirement | null;
}
```

- ヘッダー: ID、ステータスバッジ、バージョン、関連Requirement名
- タブコンテナ: `<SpecTabs>` で各タブを管理

#### SpecTabs (`components/specification/spec-tabs.tsx` - 新規)

**責務:** タブの切替とコンテンツの表示。

```typescript
"use client";

interface SpecTabsProps {
  tabs: TabConfig[];
  defaultTab?: string;
}

interface TabConfig {
  id: string;
  label: string;
  content: React.ReactNode;
  badge?: string;            // タブラベル横のバッジ（件数等）
  disabled?: boolean;
}
```

- `useState` でアクティブタブを管理
- URLハッシュとの同期（`#design`, `#issues` 等）
- タブ変更時のスムーズな切替（アニメーションなし、即時切替）

#### TabResearch (`components/specification/tab-research.tsx` - 新規)

**責務:** research.md の内容をMarkdownレンダリング。

```typescript
interface TabResearchProps {
  content: string | null;
}
```

- `<MarkdownRenderer>` コンポーネントにコンテンツを渡す
- research.mdが存在しない場合は「Research document not available」表示

#### TabDesign (`components/specification/tab-design.tsx` - 新規)

**責務:** design.md の内容をMarkdownレンダリング + Mermaidダイアグラム対応。

```typescript
interface TabDesignProps {
  content: string | null;
}
```

- `<MarkdownRenderer>` でMarkdown表示
- コードブロック中の `mermaid` 言語指定を検出し、`<MermaidBlock>` で描画

#### TabCoverage (`components/specification/tab-coverage.tsx` - 新規)

**責務:** 成功基準のカバレッジテーブル表示。

```typescript
interface TabCoverageProps {
  requirement: Requirement | null;
  specification: Specification;
}
```

- 関連Requirementの `successCriteria` 一覧
- 各基準のカバー状態（将来的にはspec内のcoverageフィールドから取得、初期は全て「未確認」）
- テーブル表示: 基準テキスト / カバー状態 / 備考

#### TabIssues (`components/specification/tab-issues.tsx` - 新規)

**責務:** GitHub Issueリストとガントチャート表示。

```typescript
interface TabIssuesProps {
  specification: Specification;
}
```

- Issueリストテーブル: Issue番号、タイトル、状態、優先度、GitHub URL
- spec-000025のGanttチャートをインライン表示
- `implementation` フィールドが未設定の場合は「No issues generated yet」表示

#### TabHistory (`components/specification/tab-history.tsx` - 新規)

**責務:** バージョン履歴のタイムライン表示。

```typescript
interface TabHistoryProps {
  versionHistory: VersionHistoryEntry[];
  currentVersion: string;
}
```

- 縦方向のタイムライン表示
- 各エントリ: バージョン番号、ステータス変更、gitコミットハッシュ、承認者、日時
- 最新バージョンにハイライト
- Tailwind CSSによるタイムラインUI（`border-l-2` + ドット）

### 3.3 多階層グラフコンポーネント

#### MultiLevelGraph (`components/graph/multi-level-graph.tsx` - 新規)

**責務:** Requirement → Specification → Issue の3階層グラフ描画。

```typescript
"use client";

interface MultiLevelGraphProps {
  graphData: MultiLevelGraphData;
}

interface MultiLevelGraphData {
  nodes: MultiLevelNode[];
  edges: MultiLevelEdge[];
}

interface MultiLevelNode {
  id: string;
  type: "requirement" | "specification" | "issue";
  data: {
    label: string;
    status: string;
    priority?: string;
    issueNumber?: number;
    issueUrl?: string;
  };
  position: { x: number; y: number };
}

interface MultiLevelEdge {
  id: string;
  source: string;
  target: string;
  type: "dependency" | "implements" | "tracks";  // 関係の種類
}
```

- React Flowベース（DependencyGraphと同じ基盤）
- ノードタイプ別の描画: requirement / specification / issue
- エッジタイプ別のスタイル:
  - `dependency`: 実線矢印（Requirement間のblockedBy）
  - `implements`: 破線矢印（Specification → Requirement）
  - `tracks`: 点線矢印（Issue → Specification）

#### SpecificationNode (`components/graph/specification-node.tsx` - 新規)

**責務:** Specificationノードの描画。

```typescript
"use client";

const SPEC_STATUS_COLORS: Record<string, string> = {
  draft: "border-blue-300 bg-blue-50",
  approved: "border-purple-300 bg-purple-50",
  approved: "border-green-300 bg-green-50",
  deprecated: "border-red-300 bg-red-50",
};
```

- RequirementNodeとは異なる色テーマ（青系）でSpecificationを区別
- クリックで `/specifications/{id}` へ遷移
- ノード幅: 200px

#### IssueNode (`components/graph/issue-node.tsx` - 新規)

**責務:** GitHub Issueノードの描画。

```typescript
"use client";

const ISSUE_STATE_COLORS: Record<string, string> = {
  open: "border-yellow-300 bg-yellow-50",
  in_progress: "border-blue-300 bg-blue-50",
  closed: "border-green-300 bg-green-50",
};
```

- Issue番号とタイトルを表示
- クリックでGitHub Issue URLを新規タブで開く
- ノード幅: 180px（コンパクト表示）

#### GraphModeSelector (`components/graph/graph-mode-selector.tsx` - 新規)

**責務:** グラフモードの切替UI。

```typescript
"use client";

interface GraphModeSelectorProps {
  mode: "requirements" | "traceability";
  onModeChange: (mode: "requirements" | "traceability") => void;
}
```

- セグメンテッドコントロール（2択トグル）
- "Requirements Only": 既存のRequirement依存関係グラフ
- "Full Traceability": Requirement → Specification → Issue の3階層グラフ

### 3.4 Markdownレンダラ

#### MarkdownRenderer (`components/markdown/markdown-renderer.tsx` - 新規)

**責務:** Markdownコンテンツの安全なHTML変換と表示。

```typescript
"use client";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}
```

- `react-markdown` ライブラリによるMarkdown → React変換
- `remark-gfm` プラグインでGitHub Flavored Markdownサポート（テーブル、タスクリスト、打ち消し線）
- カスタムコンポーネントマッピング:
  - `code` ブロック: 言語が `mermaid` の場合は `<MermaidBlock>` に委譲
  - `a` タグ: 外部リンクには `target="_blank"` と `rel="noopener noreferrer"` を付与
  - `table`: Tailwind CSSのテーブルスタイル適用
- Tailwind CSS Typographyプラグインによるproseスタイル

#### MermaidBlock (`components/markdown/mermaid-block.tsx` - 新規)

**責務:** Mermaid.jsによるダイアグラムのクライアントサイドレンダリング。

```typescript
"use client";

interface MermaidBlockProps {
  chart: string;       // Mermaid記法の文字列
  className?: string;
}
```

- `mermaid.render()` によるSVG生成
- `useEffect` 内でMermaid APIを呼び出し（クライアントサイドのみ）
- レンダリング結果を `dangerouslySetInnerHTML` で表示
- パースエラー時はフォールバック（元のコードブロックとして表示）
- Mermaid.js初期化: `mermaid.initialize({ startOnLoad: false, theme: "default" })`

### 3.5 データ層

#### specification-data.ts (`lib/specification-data.ts` - 新規)

**責務:** Specificationデータの取得と関連ファイルの読み込み。

```typescript
export async function getAllSpecifications(): Promise<Specification[]>;
export async function getSpecificationById(id: string): Promise<Specification | null>;
export async function loadSpecFile(id: string, filename: string): Promise<string | null>;
```

- spec-000022で作成される `specification-repository.ts` を利用
- ファイル読み込みは `REQORD_ROOT` 環境変数ベースのディレクトリ解決

#### graph-data.ts (`lib/graph-data.ts` - 新規)

**責務:** 多階層グラフデータの構築。

```typescript
export function buildMultiLevelGraphData(
  requirements: Requirement[],
  specifications: Specification[],
): MultiLevelGraphData;
```

**構築ロジック:**

```typescript
function buildMultiLevelGraphData(
  requirements: Requirement[],
  specifications: Specification[],
): MultiLevelGraphData {
  const nodes: MultiLevelNode[] = [];
  const edges: MultiLevelEdge[] = [];

  // 1. Requirementノードを配置（左列）
  requirements.forEach((req, i) => {
    nodes.push({
      id: req.id,
      type: "requirement",
      data: { label: req.title, status: req.status, priority: req.priority },
      position: { x: 0, y: i * 120 },
    });
    // Requirement間の依存エッジ
    req.dependencies.blockedBy.forEach(depId => {
      edges.push({
        id: `dep-${depId}-${req.id}`,
        source: depId,
        target: req.id,
        type: "dependency",
      });
    });
  });

  // 2. Specificationノードを配置（中央列）
  specifications.forEach((spec, i) => {
    nodes.push({
      id: spec.id,
      type: "specification",
      data: { label: spec.id, status: spec.status },
      position: { x: 400, y: i * 120 },
    });
    // Specification → Requirement の implements エッジ
    edges.push({
      id: `impl-${spec.id}-${spec.requirementId}`,
      source: spec.id,
      target: spec.requirementId,
      type: "implements",
    });

    // 3. Issueノードを配置（右列）
    if (spec.implementation?.issues) {
      spec.implementation.issues.forEach((issue, j) => {
        const issueId = `issue-${issue.number}`;
        nodes.push({
          id: issueId,
          type: "issue",
          data: {
            label: issue.title,
            status: issue.status,
            issueNumber: issue.number,
            issueUrl: issue.url,
          },
          position: { x: 800, y: i * 120 + j * 80 },
        });
        // Issue → Specification の tracks エッジ
        edges.push({
          id: `track-${issueId}-${spec.id}`,
          source: issueId,
          target: spec.id,
          type: "tracks",
        });
      });
    }
  });

  return { nodes, edges };
}
```

### 3.6 ナビゲーション更新

既存の `components/ui/nav.tsx` にSpecificationsリンクを追加:

```typescript
const navItems = [
  { href: "/dashboard", label: "ダッシュボード" },    // spec-000022で追加
  { href: "/requirements", label: "要件一覧" },
  { href: "/specifications", label: "仕様一覧" },     // 新規追加
  { href: "/graph", label: "依存関係グラフ" },
];
```

## 4. データフロー

### Specification詳細表示フロー

```
ブラウザ → /specifications/spec-000016 (GET)
  → SpecificationDetailPage (Server Component)
    → Promise.all([
        getSpecificationById("spec-000016"),  → Specification YAML
        loadSpecFile("spec-000016", "design.md"),  → design.md内容
        loadSpecFile("spec-000016", "research.md"),  → research.md内容（nullの場合あり）
        getAllRequirements(),  → Requirement[] (requirementIdの解決用)
      ])
    → <SpecDetail specification={...} design={...} research={...} requirement={...} />
  → HTML + propsのシリアライゼーション

ブラウザ (CSR)
  → SpecDetail (Client Component)
    → ヘッダー描画: ID, ステータス, バージョン
    → <SpecTabs>
      → デフォルトタブ: "Design"
      → タブクリック → アクティブタブ切替
      → <TabDesign content={design} />
        → <MarkdownRenderer content={design} />
          → react-markdown → HTML変換
          → Mermaidコードブロック検出 → <MermaidBlock>
            → mermaid.render() → SVG表示
```

### 多階層グラフ表示フロー

```
ブラウザ → /graph (GET)
  → GraphPage (Server Component)
    → getAllRequirements() + getAllSpecifications()
    → 両データをGraphLoaderに渡す
  → HTML + データのシリアライゼーション

ブラウザ (CSR)
  → GraphLoader → GraphModeSelector表示
    → "Requirements Only" 選択時:
      → DependencyGraph (既存)
    → "Full Traceability" 選択時:
      → buildMultiLevelGraphData(requirements, specifications)
      → MultiLevelGraph
        → React Flow描画:
          → RequirementNode (左列)
          → SpecificationNode (中央列)
          → IssueNode (右列)
          → dependency / implements / tracks エッジ
```

### ノードクリック → 詳細遷移フロー

```
RequirementNode クリック → /requirements/{id}
SpecificationNode クリック → /specifications/{id}
IssueNode クリック → window.open(issueUrl, "_blank") → GitHub Issue
```

## 5. テスト方針

### ユニットテスト

- **buildMultiLevelGraphData**:
  - Requirementのみ: Specificationノードなし
  - Requirement + Specification: implementsエッジが正しいこと
  - Requirement + Specification + Issue: 3階層のノードとエッジ
  - 存在しないrequirementIdへの参照: エッジが無視されること
  - implementationフィールドなし: Issueノードが生成されないこと
- **loadSpecFile**:
  - ファイルが存在する場合: コンテンツが返されること
  - ファイルが存在しない場合: nullが返されること
- **MarkdownRenderer内部ロジック**:
  - Mermaidコードブロックの検出
  - 外部リンクへのtarget="_blank"付与
  - GFMテーブルのレンダリング

### コンポーネントテスト

- **SpecTable**: Specificationリストの行数・カラム値
- **SpecTabs**: タブ切替でアクティブタブが変わること
- **TabDesign**: Markdownコンテンツの描画
- **TabCoverage**: 成功基準テーブルの行数
- **TabIssues**: Issueリストテーブルの行数、implementationなし時の空状態
- **TabHistory**: バージョン履歴エントリの表示
- **SpecificationNode**: ステータス別の色クラスが適用されること
- **IssueNode**: 状態別の色クラスが適用されること
- **GraphModeSelector**: モード切替時にonModeChangeが呼ばれること
- **MermaidBlock**: レンダリングエラー時のフォールバック表示

### 統合テスト

- Specification詳細ページ: 全タブの切替と表示
- 多階層グラフ: RequirementとSpecificationの接続が正しいこと
- グラフモード切替: RequirentsOnly → Traceabilityの切替
- CLIで作成したSpecificationがWeb UIに表示されること

## 6. 技術的決定事項

### react-markdown + remark-gfmの採用

**決定:** Markdownレンダリングに `react-markdown` + `remark-gfm` を使用
**理由:** Reactコンポーネントとして自然に統合でき、カスタムコンポーネントマッピング（Mermaidブロック等）が容易。`remark-gfm` によりGitHub Flavored Markdown（テーブル、タスクリスト）をサポートし、設計文書の表現力を確保する。`dangerouslySetInnerHTML` を使わずにMarkdownを安全にレンダリング可能（Mermaidのみ例外）。

### Mermaid.jsのクライアントサイドレンダリング

**決定:** MermaidダイアグラムはClient Component内で `mermaid.render()` を使用してレンダリング
**理由:** Mermaid.jsはDOM操作を必要とするため、Server Component内では実行不可。`useEffect` フック内でMermaid APIを呼び出し、生成されたSVGをDOMに挿入する。パースエラー時のフォールバック（元のコードブロック表示）により、不正なMermaid記法でもページが壊れない。

### タブUIのクライアントサイド実装

**決定:** タブ切替はClient Component（`useState`）で実装し、URLハッシュとの同期を行う
**理由:** タブ切替は瞬時に行われるべきで、各タブ切替でサーバーリクエストを発行するのは遅すぎる。全タブのデータをServer Componentで事前取得し、Client Component側でタブの表示/非表示を切り替える。URLハッシュ同期（`#design`, `#issues`）により、直接リンクでの特定タブ表示やブラウザの戻る/進む操作をサポート。

### 多階層グラフのレイアウト方式

**決定:** Requirement（左列）→ Specification（中央列）→ Issue（右列）の3列レイアウト
**理由:** トレーサビリティの階層構造を左→右の方向で直感的に表現。spec-000023の既存DAGレイアウトを拡張し、エンティティタイプごとにx座標のオフセットを固定する。React Flowのauto-layoutではなくカスタム座標計算により、各列の整列を保証する。

### エッジタイプの視覚的区別

**決定:** 3種類のエッジを線のスタイルで区別する（実線 / 破線 / 点線）
**理由:** dependency（Requirement間）、implements（Specification → Requirement）、tracks（Issue → Specification）の3種類の関係を色だけでなく線種で区別することで、色覚に依存しないアクセシブルな表現を実現。凡例とあわせて各エッジの意味をユーザーに明示する。
