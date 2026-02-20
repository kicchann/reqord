# Web UI ダッシュボード - 技術設計書

## 1. 設計概要

Next.js 15 App Routerのダッシュボードページとして、プロジェクト全体の健全性をビジュアルに表示する。Requirements承認率・Specifications承認率・Issues完了率のプログレスバー、カテゴリ別ステータスのサマリーカード、警告アラート（Gap Analysis未実行、検証失敗、ブロックされたIssue）、クリティカルパス残時間を一画面に集約する。データソースは `.reqord/` ファイルシステムから直接読み取り、バックエンドAPIは使用しない。本specはダッシュボードページのみを対象とし、ガントチャート（spec-000025）や依存関係グラフ拡張（spec-000026）は含まない。

## 2. アーキテクチャ

```
packages/web/src/
  ├── app/
  │   ├── dashboard/
  │   │   ├── page.tsx                  (ダッシュボードページ - 新規)
  │   │   └── loading.tsx               (ローディングUI - 新規)
  │   └── layout.tsx                    (既存: ナビゲーションにダッシュボードリンク追加)
  ├── components/
  │   ├── dashboard/                    (新規ディレクトリ)
  │   │   ├── project-health.tsx        (プロジェクト健全性サマリー)
  │   │   ├── progress-section.tsx      (プログレスバーセクション)
  │   │   ├── progress-bar.tsx          (個別プログレスバー)
  │   │   ├── status-cards.tsx          (ステータスサマリーカード群)
  │   │   ├── status-card.tsx           (個別ステータスカード)
  │   │   ├── warning-alerts.tsx        (警告アラートリスト)
  │   │   ├── warning-alert.tsx         (個別警告アラート)
  │   │   ├── critical-path-display.tsx (クリティカルパス表示)
  │   │   └── status-chart.tsx          (Rechartsラッパー)
  │   └── ui/
  │       └── badge.tsx                 (既存)
  └── lib/
      ├── dashboard-data.ts             (ダッシュボードデータ取得 - 新規)
      ├── specification-repository.ts   (Specificationデータ読み取り - 新規)
      ├── data.ts                       (既存: Requirement読み取り)
      └── local-repository.ts           (既存: ファイルI/O)
```

### データアクセスの流れ

```
ブラウザ → Next.js Server Component
              ↓
         lib/dashboard-data.ts (データ集約)
              ↓
         lib/data.ts (Requirements) + lib/specification-repository.ts (Specifications)
              ↓
         lib/file-system.ts → .reqord/ (ファイルシステム)
```

## 3. コンポーネント設計

### 3.1 ページコンポーネント

#### ダッシュボードページ (`dashboard/page.tsx`)

- Server Componentとしてすべてのデータを取得
- `dynamic = "force-dynamic"` でキャッシュ無効化
- `<Suspense>` + `<Loading>` でストリーミング表示
- ページ構成:
  1. `<ProjectHealth>` - 全体サマリー
  2. `<ProgressSection>` - 3つのプログレスバー
  3. `<StatusCards>` - カテゴリ別ステータスカード
  4. `<WarningAlerts>` - 警告アラート
  5. `<CriticalPathDisplay>` - クリティカルパス残時間（データがある場合）

```typescript
export default async function DashboardPage() {
  const dashboardData = await getDashboardData();

  return (
    <div className="space-y-8 p-6">
      <h1 className="text-2xl font-bold">プロジェクトダッシュボード</h1>
      <ProjectHealth data={dashboardData.health} />
      <ProgressSection progress={dashboardData.progress} />
      <StatusCards statuses={dashboardData.statusBreakdown} />
      {dashboardData.warnings.length > 0 && (
        <WarningAlerts warnings={dashboardData.warnings} />
      )}
      {dashboardData.criticalPath && (
        <CriticalPathDisplay path={dashboardData.criticalPath} />
      )}
    </div>
  );
}
```

### 3.2 UIコンポーネント

#### ProjectHealth (`components/dashboard/project-health.tsx`)

**責務:** プロジェクト全体の健全性スコアと概要表示。

```typescript
interface ProjectHealthProps {
  data: {
    overallScore: number;        // 0-100の健全性スコア
    requirementCount: number;
    specificationCount: number;
    issueCount: number;
    lastUpdated: string;
  };
}
```

- 健全性スコア: 要件承認率(40%) + 仕様承認率(30%) + Issue完了率(30%) の加重平均
- スコアに応じた色分け: 80以上=緑、50-79=黄、50未満=赤
- Tailwind CSSによるカード表示

#### ProgressSection (`components/dashboard/progress-section.tsx`)

**責務:** 3つのプログレスバーをグリッド配置。

```typescript
interface ProgressSectionProps {
  progress: {
    requirements: { approved: number; total: number; percentage: number };
    specifications: { approved: number; total: number; percentage: number };
    issues: { completed: number; total: number; percentage: number };
  };
}
```

#### ProgressBar (`components/dashboard/progress-bar.tsx`)

**責務:** 個別のプログレスバーの描画。

```typescript
interface ProgressBarProps {
  label: string;
  current: number;
  total: number;
  percentage: number;
  color: "blue" | "green" | "purple";
}
```

- Tailwind CSSの `bg-{color}-500` でバー色指定
- `width: {percentage}%` のインラインスタイルで幅制御
- `{current}/{total} ({percentage}%)` のラベル表示

#### StatusCards (`components/dashboard/status-cards.tsx`)

**責務:** カテゴリ別のステータス内訳をカードグリッドで表示。

```typescript
interface StatusCardsProps {
  statuses: {
    requirements: Record<string, number>;  // { draft: 3, approved: 6, ... }
    specifications: Record<string, number>;
    issues: Record<string, number>;        // { open: 4, closed: 16 }
  };
}
```

- 各カテゴリ（Requirements, Specifications, Issues）のカード
- ステータス別の件数と色分けバッジ
- spec-000007で定義した `<Badge>` コンポーネントを再利用

#### StatusCard (`components/dashboard/status-card.tsx`)

**責務:** 個別のステータスカード。

```typescript
interface StatusCardProps {
  title: string;
  breakdown: Record<string, number>;
  colorMap: Record<string, string>;  // status → Tailwindカラークラス
}
```

#### StatusChart (`components/dashboard/status-chart.tsx`)

**責務:** Rechartsによるドーナツチャートの表示。

```typescript
"use client";

interface StatusChartProps {
  data: Array<{ name: string; value: number; fill: string }>;
  title: string;
}
```

- `"use client"` ディレクティブ（Rechartsはクライアントコンポーネント必須）
- `<PieChart>` + `<Pie>` でドーナツチャート描画
- 各ステータスの割合を視覚化

#### WarningAlerts (`components/dashboard/warning-alerts.tsx`)

**責務:** 警告アラートのリスト表示。

```typescript
interface WarningAlertsProps {
  warnings: Array<{
    id: string;
    type: "gap-missing" | "validation-failed" | "blocked-dependency" | "no-specification";
    message: string;
    severity: "error" | "warning" | "info";
  }>;
}
```

- severity別のアイコンと色分け（error=赤、warning=黄、info=青）
- 各警告にIDへのリンク（要件/仕様の詳細ページへ）
- Tailwind CSSの `border-l-4` でサイドバー色表示

#### WarningAlert (`components/dashboard/warning-alert.tsx`)

**責務:** 個別の警告アラートカード。

#### CriticalPathDisplay (`components/dashboard/critical-path-display.tsx`)

**責務:** クリティカルパスの残時間と進捗表示。

```typescript
interface CriticalPathDisplayProps {
  path: {
    tasks: Array<{ title: string; estimatedHours: number; completed: boolean }>;
    totalHours: number;
    remainingHours: number;
  };
}
```

- タスクリスト表示（完了済み=打ち消し線、未完了=太字）
- 残時間のプログレスバー

### 3.3 データ層

#### ダッシュボードデータ取得 (`lib/dashboard-data.ts` - 新規)

**責務:** ダッシュボード表示に必要なデータの集約。

```typescript
export interface DashboardData {
  health: {
    overallScore: number;
    requirementCount: number;
    specificationCount: number;
    issueCount: number;
    lastUpdated: string;
  };
  progress: {
    requirements: { approved: number; total: number; percentage: number };
    specifications: { approved: number; total: number; percentage: number };
    issues: { completed: number; total: number; percentage: number };
  };
  statusBreakdown: {
    requirements: Record<string, number>;
    specifications: Record<string, number>;
    issues: Record<string, number>;
  };
  warnings: Array<{
    id: string;
    type: string;
    message: string;
    severity: "error" | "warning" | "info";
  }>;
  criticalPath: {
    tasks: Array<{ title: string; estimatedHours: number; completed: boolean }>;
    totalHours: number;
    remainingHours: number;
  } | null;
}

export async function getDashboardData(): Promise<DashboardData>;
```

**集計ロジック:**
```typescript
export async function getDashboardData(): Promise<DashboardData> {
  const requirements = await getAllRequirements();
  const specifications = await getAllSpecifications();

  // Requirements集計
  const reqByStatus = groupByStatus(requirements);
  const reqApproved = reqByStatus.approved ?? 0;
  const reqTotal = requirements.length;

  // Specifications集計
  const specByStatus = groupByStatus(specifications);
  const specApproved = specByStatus.approved ?? 0;
  const specTotal = specifications.length;

  // Issues集計（tasks.yamlから）
  const tasks = await loadTasksYaml(); // .reqord/issues/tasks.yaml
  const allIssues = tasks;
  const issuesClosed = allIssues.filter(i => i.status === "closed").length;
  const issuesTotal = allIssues.length;

  // 健全性スコア
  const reqPct = reqTotal > 0 ? reqApproved / reqTotal * 100 : 0;
  const specPct = specTotal > 0 ? specApproved / specTotal * 100 : 0;
  const issuePct = issuesTotal > 0 ? issuesClosed / issuesTotal * 100 : 0;
  const overallScore = Math.round(reqPct * 0.4 + specPct * 0.3 + issuePct * 0.3);

  // 警告検出
  const warnings = detectWarnings(requirements, specifications);

  // クリティカルパス（implementationフィールドから）
  const criticalPath = extractCriticalPath(specifications);

  return { health, progress, statusBreakdown, warnings, criticalPath };
}
```

#### SpecificationRepository for Web (`lib/specification-repository.ts` - 新規)

**責務:** Specificationデータのファイルシステム読み取り。

```typescript
import { SpecificationSchema, type Specification } from "@reqord/shared";

export async function getAllSpecifications(): Promise<Specification[]>;
export async function getSpecificationById(id: string): Promise<Specification | null>;
```

- `REQORD_ROOT` 環境変数で `.reqord/` ディレクトリを特定
- spec-000007で実装したRequirement読み取りパターン（LocalRequirementRepository）と同様のファイルスキャン
- `spec-\d{6}\.yaml` パターンマッチで全件取得

### 3.4 ナビゲーション更新

既存の `components/ui/nav.tsx` にダッシュボードリンクを追加:

```typescript
const navItems = [
  { href: "/dashboard", label: "ダッシュボード" },  // 追加
  { href: "/requirements", label: "要件一覧" },
  { href: "/graph", label: "依存関係グラフ" },
];
```

## 4. データフロー

### ダッシュボード表示フロー

```
ブラウザ → /dashboard (GET)
  → DashboardPage (Server Component)
    → getDashboardData()
      → getAllRequirements()
        → LocalRequirementRepository.findAll()
          → .reqord/requirements/req-*.yaml 読み込み
      → getAllSpecifications()
        → specificationRepository.findAll()
          → .reqord/specifications/spec-*.yaml 読み込み
      → Requirements集計: byStatus, approvedPercentage
      → Specifications集計: byStatus, approvedPercentage
      → Issues集計: tasks.yaml から
      → 健全性スコア算出
      → 警告検出
      → クリティカルパス抽出
    → DashboardData返却
    → <ProjectHealth />
    → <ProgressSection />
    → <StatusCards />
    → <WarningAlerts /> (warnings.length > 0の場合)
    → <CriticalPathDisplay /> (criticalPath != nullの場合)
  → HTML レスポンス
```

### 警告からの詳細ページ遷移

```
ブラウザ → ダッシュボード警告クリック
  → 警告内のリンク:
    → req-NNNNNN → /requirements/req-NNNNNN (既存ページ)
    → spec-NNNNNN → /specifications/spec-NNNNNN (将来実装)
```

## 5. テスト方針

### ユニットテスト

- **getDashboardData**:
  - 正常系: Requirements/Specifications/Issuesの集計が正確であること
  - 要件0件: total=0, percentage=0
  - tasks.yamlにエントリなし: Issues集計がスキップされること
  - 健全性スコア計算: 加重平均の正確性
- **detectWarnings**:
  - Gap Analysis未実行の承認済み要件
  - 未承認の依存先がある要件
  - Specificationなしの非draft要件
  - 設計検証エラーのSpecification
- **groupByStatus**: 各ステータスのカウントが正確であること
- **extractCriticalPath**: tasks.yamlからのタスク抽出

### コンポーネントテスト

- **ProgressBar**: percentage=0/50/100での描画確認
- **StatusCard**: breakdown propsに基づくバッジ表示
- **WarningAlerts**: severity別の色分け表示
- **StatusChart**: Rechartsコンポーネントのレンダリング（`"use client"` の正常動作）

### 統合テスト

- テスト用の `.reqord/` ディレクトリを用意し、ダッシュボードページの描画検証
- CLIで要件/仕様を変更後、ダッシュボードに反映されること
- 空プロジェクト（要件0件）での正常表示

## 6. 技術的決定事項

### Server Componentでの全データ取得

**決定:** ダッシュボードページはServer Componentとし、すべてのデータをサーバーサイドで取得
**理由:** spec-000007と同一の設計方針。ローカルファイルシステムへのアクセスはサーバーサイドでのみ可能。Requirements + Specifications + Issues の集計をサーバーサイドで完結させ、クライアントに送信するデータ量を最小化する。

### Rechartsのクライアントコンポーネント分離

**決定:** StatusChart（Recharts使用）のみ `"use client"` とし、他のコンポーネントはServer Componentを維持
**理由:** Rechartsはブラウザ側のDOMに依存するため、クライアントコンポーネントとして実装する必要がある。ただし、データ取得はServer Component側で行い、チャートコンポーネントにはpropsとして集計済みデータのみを渡す。これにより、サーバーサイドでのファイルI/Oとクライアントサイドでの描画を適切に分離する。

### SpecificationRepositoryの新規作成

**決定:** Web版のSpecification読み取り用に新規リポジトリを作成（CLI版とは別実装）
**理由:** spec-000007のRequirementと同様に、Web版はREQORD_ROOT環境変数ベース、CLI版はcwd引数ベースで動作する。既存のLocalRequirementRepositoryパターンを踏襲し、Specificationに特化した読み取り専用リポジトリを作成する。

### ダッシュボードのスコープ限定

**決定:** 本specではダッシュボードページのみを実装し、ガントチャート（spec-000025）や依存関係グラフ拡張（spec-000026）は含まない
**理由:** ダッシュボードの基本機能（プログレスバー、サマリーカード、警告アラート）を早期にリリースし、ユーザーフィードバックを得てから高度な可視化機能を追加する。基盤となるデータ集計ロジック（getDashboardData）は共通化されるため、将来のspec実装時に再利用可能。
