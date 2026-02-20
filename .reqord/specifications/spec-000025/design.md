# Web UI - Ganttチャート - 技術設計書

## 1. 設計概要

Next.js 15 App Router上で、SpecificationごとのGitHub Issue進捗をGanttチャートとして可視化する機能を提供する。並列グループ（P0/P1/P2）ごとのレイアウト、Issue状態に応じた色分け、見積もり時間ベースのバー幅、クリティカルパスのハイライトを実装する。Specification詳細ページのIssuesタブ内に配置し、`.reqord/issues/tasks.yaml` をデータソースとする。SVGベースのカスタム実装により、外部Ganttライブラリへの依存を回避する。

## 2. アーキテクチャ

```
packages/web/src/
  ├── app/
  │   └── specifications/
  │       └── [id]/
  │           └── page.tsx                   (spec-000026で新規: Spec詳細ページ)
  ├── components/
  │   └── gantt/                             (新規ディレクトリ)
  │       ├── gantt-chart.tsx                (メインGanttチャートコンポーネント)
  │       ├── gantt-bar.tsx                  (個別タスクバー)
  │       ├── gantt-header.tsx               (タイムライン・ヘッダー)
  │       ├── gantt-group.tsx                (並列グループ表示)
  │       ├── gantt-critical-path.tsx        (クリティカルパスオーバーレイ)
  │       ├── gantt-legend.tsx               (凡例)
  │       └── gantt-tooltip.tsx              (ツールチップ)
  └── lib/
      ├── gantt-data.ts                      (新規: Ganttデータ変換)
      ├── specification-repository.ts        (spec-000022で新規: Specification読み取り)
      └── data.ts                            (既存: Requirement読み取り)
```

### データアクセスの流れ

```
ブラウザ → /specifications/[id] (GET)
  → SpecificationDetailPage (Server Component)
    → getSpecificationById(id) → Specification YAML取得
      → tasks.yaml からタスク配列取得
    → transformToGanttData() → GanttData変換
  → GanttChart (Client Component)
    → SVG描画
```

## 3. コンポーネント設計

### 3.1 データ変換層

#### gantt-data.ts (`lib/gantt-data.ts` - 新規)

**責務:** `tasks.yaml` のタスクデータからGanttチャート表示用のデータに変換する。

```typescript
export interface GanttData {
  specId: string;
  groups: GanttGroup[];
  criticalPath: string[];       // タスクタイトルの配列
  totalEstimatedHours: number;
  timelineStart: number;        // 0起点（時間単位）
  timelineEnd: number;          // 全タスクの最大終了時間
}

export interface GanttGroup {
  priority: "P0" | "P1" | "P2";
  label: string;                // "P0: Sequential" / "P1: Parallel" / "P2: Parallel"
  tasks: GanttTask[];
}

export interface GanttTask {
  id: string;                   // Issue番号ベース: "issue-42"
  title: string;
  issueNumber: number;
  issueUrl: string;
  priority: "P0" | "P1" | "P2";
  state: "completed" | "in_progress" | "blocked" | "pending";
  estimatedHours: number;
  startOffset: number;          // グループ内開始オフセット（時間単位）
  dependencies: string[];       // 依存先タスクID
  isCriticalPath: boolean;
}

export function transformToGanttData(
  specId: string,
  tasks: TaskEntry[],
): GanttData;
```

**変換ロジック:**

```typescript
function transformToGanttData(specId: string, tasks: TaskEntry[]): GanttData {

  // 1. 優先度別にグループ分け
  const p0Tasks = tasks.filter(t => t.priority === "P0");
  const p1Tasks = tasks.filter(t => t.priority === "P1");
  const p2Tasks = tasks.filter(t => t.priority === "P2");

  // 2. P0: 直列配置（依存関係に従い、累積startOffsetを計算）
  let p0Offset = 0;
  const p0Gantt = p0Tasks.map(t => {
    const task = toGanttTask(t, p0Offset);
    p0Offset += t.estimatedHours ?? DEFAULT_HOURS;
    return task;
  });

  // 3. P1: 並列配置（P0完了後に開始、全タスクのstartOffsetはP0合計時間）
  const p1Start = p0Offset;
  const p1Gantt = p1Tasks.map(t => toGanttTask(t, p1Start));

  // 4. P2: 並列配置（P1の最長タスク完了後に開始）
  const p1MaxEnd = p1Start + Math.max(...p1Tasks.map(t => t.estimatedHours ?? DEFAULT_HOURS), 0);
  const p2Start = p1Tasks.length > 0 ? p1MaxEnd : p1Start;
  const p2Gantt = p2Tasks.map(t => toGanttTask(t, p2Start));

  // 5. タイムラインの範囲計算
  const allGanttTasks = [...p0Gantt, ...p1Gantt, ...p2Gantt];
  const timelineEnd = Math.max(...allGanttTasks.map(t => t.startOffset + t.estimatedHours), 0);

  return {
    specId,
    groups: [
      { priority: "P0", label: "P0: Sequential", tasks: p0Gantt },
      { priority: "P1", label: "P1: Parallel", tasks: p1Gantt },
      { priority: "P2", label: "P2: Parallel", tasks: p2Gantt },
    ].filter(g => g.tasks.length > 0),
    criticalPath: implementation.criticalPath ?? [],
    totalEstimatedHours: implementation.totalEstimatedHours,
    timelineStart: 0,
    timelineEnd,
  };
}
```

### 3.2 UIコンポーネント

#### GanttChart (`components/gantt/gantt-chart.tsx` - 新規)

**責務:** Ganttチャート全体のSVG描画とインタラクション管理。

```typescript
"use client";

interface GanttChartProps {
  data: GanttData;
  className?: string;
}
```

- `"use client"` ディレクティブ（SVGインタラクション、ツールチップ表示のため）
- SVG要素でチャート全体を描画
- 横軸: 時間（時間単位）、縦軸: タスク行
- グループヘッダー + タスクバー + クリティカルパスオーバーレイの3レイヤー構成
- レスポンシブ: コンテナ幅に応じて時間軸のスケールを調整

**SVGレイアウト定数:**

```typescript
const GANTT_CONFIG = {
  ROW_HEIGHT: 36,              // 各タスク行の高さ
  BAR_HEIGHT: 24,              // バーの高さ
  BAR_Y_OFFSET: 6,            // 行内のバーY位置オフセット
  GROUP_HEADER_HEIGHT: 28,     // グループヘッダーの高さ
  LEFT_LABEL_WIDTH: 200,       // 左側のタスクラベル領域幅
  HEADER_HEIGHT: 40,           // タイムラインヘッダーの高さ
  HOUR_WIDTH: 60,              // 1時間あたりのピクセル幅
  PADDING: 16,                 // 左右パディング
};
```

#### GanttBar (`components/gantt/gantt-bar.tsx` - 新規)

**責務:** 個別タスクバーのSVG描画。

```typescript
interface GanttBarProps {
  task: GanttTask;
  y: number;
  hourWidth: number;
  onHover: (task: GanttTask | null) => void;
  onClick: (task: GanttTask) => void;
}
```

**状態別の色分け:**

| 状態 | 色 | Tailwind/SVGカラー |
|------|-----|-----------------|
| completed | 緑 | `#22c55e` (green-500) |
| in_progress | 青 | `#3b82f6` (blue-500) |
| blocked | 赤 | `#ef4444` (red-500) |
| pending | グレー | `#9ca3af` (gray-400) |

- `<rect>` でバーを描画、角丸 `rx=4`
- `<text>` でバー内にタスクタイトル表示（バー幅が十分な場合）
- マウスオーバーでツールチップ表示
- クリックでIssue URLを新規タブで開く

#### GanttHeader (`components/gantt/gantt-header.tsx` - 新規)

**責務:** タイムラインヘッダーの描画。

```typescript
interface GanttHeaderProps {
  timelineStart: number;
  timelineEnd: number;
  hourWidth: number;
}
```

- 時間目盛り: 1h, 2h, 3h, ... のラベル表示
- グリッド線: 各時間位置に縦の点線

#### GanttGroup (`components/gantt/gantt-group.tsx` - 新規)

**責務:** 優先度グループのヘッダーと区切り表示。

```typescript
interface GanttGroupProps {
  group: GanttGroup;
  y: number;
  width: number;
}
```

- グループラベル（"P0: Sequential" 等）の表示
- グループ間の区切り線
- 背景色のストライピング（グループ識別用）

#### GanttCriticalPath (`components/gantt/gantt-critical-path.tsx` - 新規)

**責務:** クリティカルパスのハイライト表示。

```typescript
interface GanttCriticalPathProps {
  tasks: GanttTask[];
  hourWidth: number;
  rowPositions: Map<string, number>;  // taskId → y位置
}
```

- クリティカルパス上のタスクバーに太い赤枠線をオーバーレイ
- タスク間を接続する矢印線の描画
- ツールチップ: 「クリティカルパス: 残りX時間」

#### GanttLegend (`components/gantt/gantt-legend.tsx` - 新規)

**責務:** 状態色の凡例表示。

```typescript
interface GanttLegendProps {
  className?: string;
}
```

- 4つの状態（completed / in_progress / blocked / pending）の色サンプルとラベル
- チャートの上部または下部に配置

#### GanttTooltip (`components/gantt/gantt-tooltip.tsx` - 新規)

**責務:** タスクバーホバー時のツールチップ。

```typescript
interface GanttTooltipProps {
  task: GanttTask | null;
  position: { x: number; y: number };
}
```

- タスクタイトル、Issue番号、状態、見積もり時間、依存関係を表示
- マウス位置に追従するフローティングカード

## 4. データフロー

### Ganttチャート表示フロー

```
ブラウザ → /specifications/[id] (GET)
  → SpecificationDetailPage (Server Component)
    → getSpecificationById(id)
      → .reqord/specifications/spec-NNNNNN.yaml 読み込み
      → tasks.yaml からタスク取得
    → transformToGanttData(specId, implementation)
      → Priority別グループ分け
      → P0: 直列配置 → startOffset累積計算
      → P1: 並列配置 → P0終了時点から開始
      → P2: 並列配置 → P1最長タスク終了後から開始
      → criticalPathフラグの付与
      → GanttData返却
    → <GanttChart data={ganttData} />
  → HTML + GanttDataのシリアライゼーション

ブラウザ (CSR)
  → GanttChart (Client Component)
    → SVG描画:
      → GanttHeader: タイムライン目盛り
      → GanttGroup × N: グループヘッダー
      → GanttBar × M: タスクバー（色分け済み）
      → GanttCriticalPath: ハイライトオーバーレイ
```

### バーホバー → ツールチップ表示フロー

```
マウスオーバー (GanttBar)
  → onHover(task) → GanttChart state更新
  → GanttTooltip表示:
    タイトル: "スキーマ定義"
    Issue: #42
    状態: completed
    見積: 2h
    依存: なし
```

### バークリック → Issue遷移フロー

```
クリック (GanttBar)
  → onClick(task) → window.open(task.issueUrl, "_blank")
  → GitHub IssueページがNewタブで開く
```

## 5. テスト方針

### ユニットテスト

- **transformToGanttData**:
  - P0のみ: 直列配置のstartOffset計算が正しいこと
  - P0 + P1: P1のstartOffsetがP0合計時間と等しいこと
  - P0 + P1 + P2: P2のstartOffsetがP1最長タスク終了後であること
  - タスク0件: 空のグループが除外されること
  - estimatedHoursが未設定: デフォルト値（DEFAULT_HOURS）が使用されること
  - criticalPath指定: 該当タスクの `isCriticalPath` がtrueになること
  - timelineEnd: 全タスクの最大終了時間が正しいこと
- **Issue状態マッピング**:
  - open → pending（デフォルト）
  - open + assignees → in_progress
  - closed → completed
  - open + blocked dependency → blocked

### コンポーネントテスト

- **GanttBar**:
  - 各状態での色が正しいこと
  - バー幅が `estimatedHours * hourWidth` であること
  - バー位置が `startOffset * hourWidth` であること
  - ホバー時にonHoverが呼ばれること
  - クリック時にonClickが呼ばれること
- **GanttHeader**:
  - timelineEndまでの目盛りが表示されること
  - グリッド線の数が時間数と一致すること
- **GanttLegend**:
  - 4つの状態が全て表示されること
- **GanttChart（統合）**:
  - GanttDataに基づくSVG要素の数
  - グループヘッダーの表示
  - クリティカルパスハイライトの適用

### 統合テスト

- Specification詳細ページ内でのGanttチャート表示
- tasks.yamlにエントリがない場合の空状態表示
- 複数グループを持つデータでのレイアウト検証

## 6. 技術的決定事項

### カスタムSVG実装（Rechartsではなく）

**決定:** Ganttチャートはカスタムの SVGコンポーネントで実装し、Rechartsは使用しない
**理由:** Rechartsは棒グラフ・折れ線グラフ等の汎用チャートに適しているが、Ganttチャートの要件（並列グループレイアウト、クリティカルパスオーバーレイ、バー内テキスト、依存関係矢印）は汎用チャートの範囲を超える。カスタムSVGにより、レイアウトの自由度が確保でき、追加の依存ライブラリも不要。SVG要素はReactコンポーネントとして自然に記述できる。

### Server Component → Client Component分離

**決定:** データ変換はServer Component側で完結させ、SVG描画のみをClient Componentで実行
**理由:** `transformToGanttData` はファイルシステムから取得したSpecificationデータに依存するため、Server Component内で実行する。変換後のGanttDataオブジェクトはシリアライズ可能な純粋なデータであり、propsとしてClient Component（GanttChart）に渡す。これにより、クライアントバンドルにファイルI/Oロジックが含まれることを防ぐ。

### P0直列・P1/P2並列のレイアウト方針

**決定:** P0タスクは直列（順次）配置、P1/P2タスクは並列配置とする
**理由:** spec-000016の分解戦略に従い、P0は基盤タスク（スキーマ定義等）で順次実行が必要、P1は並列可能な実装タスク、P2はオプションタスク。この優先度ベースのレイアウトにより、作業のスケジュール感が視覚的に伝わる。

### Issue状態の4状態マッピング

**決定:** GitHub APIの2状態（open/closed）をGanttチャート表示では4状態（completed / in_progress / blocked / pending）にマッピング
**理由:** open状態を「依存先が未完了→blocked」「アサイン済み→in_progress」「それ以外→pending」に細分化することで、Ganttチャートの情報密度が向上する。ただし、初期実装ではspec-000024の同期データに基づく簡易マッピング（open→pending, closed→completed）を優先し、詳細な状態判定は段階的に追加する。
