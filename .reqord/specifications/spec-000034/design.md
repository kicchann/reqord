# Flags表示・Feedback一覧UI - 技術設計書

## 1. 設計概要

Requirement/Specificationの詳細画面にflagsセクションを追加し、`feedback-review`・`security-review`・`breaking-change`フラグの存在をユーザーに可視化する（Feedback #169）。また、`.reqord/feedback/index.yaml`に格納されたFeedbackデータをWeb UIで一覧・詳細表示し、関連Requirement/Specificationとのリンクを確認できるFeedback一覧ページを新設する（Feedback #170）。

本specは既存のダッシュボード（spec-000022）・Gantt（spec-000025）・依存グラフ（spec-000026）・ドリルダウン（spec-000029）とは独立した機能であり、UI表示に必要なデータ層（FeedbackRepository）を新規追加し、既存の詳細ページコンポーネントを拡張する。

## 2. アーキテクチャ

```
packages/web/src/
  ├── app/
  │   ├── feedback/
  │   │   ├── page.tsx                         (新規: Feedback一覧ページ)
  │   │   └── loading.tsx                      (新規: ローディングUI)
  │   ├── requirements/
  │   │   └── [id]/
  │   │       └── page.tsx                     (既存: flags表示のためデータ追加不要 - reqオブジェクトにflags含む)
  │   └── specifications/
  │       └── [id]/
  │           └── page.tsx                     (既存: flags表示のためデータ追加不要 - specオブジェクトにflags含む)
  ├── components/
  │   ├── flags/                               (新規ディレクトリ)
  │   │   ├── flag-list.tsx                    (フラグ一覧セクション)
  │   │   └── flag-badge.tsx                   (フラグ種別バッジ)
  │   ├── feedback/                            (新規ディレクトリ)
  │   │   ├── feedback-client-view.tsx         (フィルタ状態管理 - Client Component境界)
  │   │   ├── feedback-table.tsx               (一覧テーブル)
  │   │   ├── feedback-filters.tsx             (フィルタUI)
  │   │   └── feedback-linked-items.tsx        (関連Req/Specリンク表示)
  │   ├── requirement/
  │   │   └── requirement-detail.tsx           (既存: 拡張 - FlagList追加)
  │   ├── specification/
  │   │   └── spec-detail.tsx                  (既存: 拡張 - FlagList追加)
  │   └── ui/
  │       └── nav.tsx                          (既存: Feedbackリンク追加)
  └── lib/
      ├── feedback-data.ts                     (新規: Feedbackデータ取得)
      ├── feedback-repository.ts               (新規: FeedbackRepositoryインターフェース)
      ├── local-feedback-repository.ts         (新規: ファイルシステム実装)
      └── reqord-root.ts                       (既存: getFeedbackDir追加)
```

### データアクセスの流れ

```
ブラウザ → /feedback (GET)
  → FeedbackPage (Server Component)
    → getAllFeedbacks() + getAllRequirements() + getAllSpecifications()
    → <FeedbackTable> に結合データを渡す

ブラウザ → /requirements/[id] (GET)
  → RequirementDetailPage (Server Component)
    → getRequirementById(id) → Requirement (flags含む)
    → <RequirementDetail> → <FlagList flags={requirement.flags} />

ブラウザ → /specifications/[id] (GET)
  → SpecificationDetailPage (Server Component)
    → getSpecificationById(id) → Specification (flags含む)
    → <SpecDetail> → <FlagList flags={specification.flags} />
```

## 3. コンポーネント設計

### 3.1 FlagList (`components/flags/flag-list.tsx` - 新規)

**責務:** Requirement/Specificationの詳細画面でflagsを一覧表示する共通コンポーネント。

```typescript
interface FlagListProps {
  flags: Flag[];
}
```

- flagsが空の場合は何も表示しない（セクション自体を非表示）
- 各フラグをカード形式で表示:
  - FlagBadge（タイプ別アイコン・色）
  - reason テキスト
  - createdAt 日時
  - フラグ固有フィールド:
    - `feedback-review`: severity バッジ + relatedIssues のGitHubリンク
    - `security-review`: 警告アイコン
    - `breaking-change`: affectedVersions のリスト

**表示例:**
```
⚠ Flags (2件)
┌─────────────────────────────────────────────────────┐
│ 🔍 feedback-review  [high]                          │
│ セキュリティ関連の指摘                                │
│ 関連Issue: #42, #43                                  │
│ 2026-02-15T10:00:00Z                                │
├─────────────────────────────────────────────────────┤
│ ⚡ breaking-change                                   │
│ APIインターフェース変更                               │
│ 影響バージョン: 0.1.0, 0.2.0                         │
│ 2026-02-14T08:00:00Z                                │
└─────────────────────────────────────────────────────┘
```

### 3.2 FlagBadge (`components/flags/flag-badge.tsx` - 新規)

**責務:** フラグ種別に応じたバッジ表示。

```typescript
interface FlagBadgeProps {
  type: "feedback-review" | "security-review" | "breaking-change";
  severity?: "critical" | "high" | "medium" | "low";
}
```

**色マッピング:**

| タイプ | 背景色 | テキスト |
|--------|--------|----------|
| feedback-review | `bg-amber-100 text-amber-800` | Feedback Review |
| security-review | `bg-red-100 text-red-800` | Security Review |
| breaking-change | `bg-purple-100 text-purple-800` | Breaking Change |

**severityバッジ（feedback-review時のみ）:**

| severity | スタイル |
|----------|----------|
| critical | `bg-red-500 text-white` |
| high | `bg-orange-500 text-white` |
| medium | `bg-yellow-500 text-white` |
| low | `bg-gray-400 text-white` |

### 3.3 RequirementDetail 拡張 (`components/requirement/requirement-detail.tsx` - 既存拡張)

**変更内容:** Dependenciesセクションの前（Success Criteriaの後）にFlagListを追加。

```typescript
// 既存のSuccess Criteriaセクションの後に追加
{requirement.flags.length > 0 && (
  <FlagList flags={requirement.flags} />
)}
```

### 3.4 SpecDetail 拡張 (`components/specification/spec-detail.tsx` - 既存拡張)

**変更内容:** MetaGridの後、タブの前にFlagListを追加。

```typescript
// 既存のMetaGridの後、SpecTabsの前に追加
{specification.flags.length > 0 && (
  <FlagList flags={specification.flags} />
)}
```

### 3.5 FeedbackTable (`components/feedback/feedback-table.tsx` - 新規)

**責務:** Feedback一覧のテーブル表示。

```typescript
"use client";

interface FeedbackTableProps {
  feedbacks: FeedbackEntry[];
  requirementTitles: Record<string, string>;
  specificationTitles: Record<string, string>;
}
```

**テーブルカラム:**

| # (Issue番号) | タイプ | 重要度 | ステータス | 関連Req/Spec | 同期日時 |

- Issue番号はGitHub URLへのリンク（`https://github.com/{owner}/{repo}/issues/{number}`）
- タイプ・重要度・ステータスはバッジ表示
- 関連Req/Specは `FeedbackLinkedItems` コンポーネントで表示

**タイプ別バッジ色:**

| タイプ | スタイル |
|--------|----------|
| bug | `bg-red-100 text-red-800` |
| improvement | `bg-blue-100 text-blue-800` |
| requirement-gap | `bg-yellow-100 text-yellow-800` |
| spec-mismatch | `bg-orange-100 text-orange-800` |
| security | `bg-red-200 text-red-900` |

### 3.6 FeedbackFilters (`components/feedback/feedback-filters.tsx` - 新規)

**責務:** タイプ・重要度・ステータスによるフィルタリングUI。

```typescript
"use client";

interface FeedbackFiltersProps {
  onFilterChange: (filters: FeedbackFilters) => void;
  activeFilters: FeedbackFilters;
}

interface FeedbackFilters {
  type?: string;
  severity?: string;
  status?: string;
}
```

- セグメンテッドボタン形式のフィルタ（All / bug / improvement / ...）
- 複数フィルタの組み合わせ可能
- フィルタ状態は `useState` で管理（URL同期不要）

### 3.7 FeedbackLinkedItems (`components/feedback/feedback-linked-items.tsx` - 新規)

**責務:** Feedbackに紐づくRequirement/Specificationへのリンクを表示。

```typescript
interface FeedbackLinkedItemsProps {
  linkedTo: FeedbackLinkedTo;
  requirementTitles: Record<string, string>;
  specificationTitles: Record<string, string>;
}
```

- Requirements: `/requirements/{id}` へのリンク（タイトル付き）
- Specifications: `/specifications/{id}` へのリンク
- `createdRequirements` / `createdSpecifications`: 「作成」バッジ付き
- `resolved.requirements` / `resolved.specifications`: 「解決済み」バッジ付き

### 3.8 Feedbackページ (`app/feedback/page.tsx` - 新規)

**責務:** Feedback一覧ページのServer Component。データ取得のみを担当し、Client Componentにデータを委譲する。

```typescript
export const dynamic = "force-dynamic";

export default async function FeedbackPage() {
  const [feedbacks, requirements, specifications] = await Promise.all([
    getAllFeedbacks(),
    getAllRequirements(),
    getAllSpecifications(),
  ]);

  const reqTitleMap = Object.fromEntries(requirements.map(r => [r.id, r.title]));
  const specTitleMap = Object.fromEntries(specifications.map(s => [s.id, s.title]));

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Feedback</h1>
      <FeedbackClientView
        feedbacks={feedbacks}
        requirementTitles={reqTitleMap}
        specificationTitles={specTitleMap}
      />
    </div>
  );
}
```

**注意:** `Map` はシリアライズ不可のため、Server → Client のprops受け渡しには `Record<string, string>` を使用する。

### 3.8.1 FeedbackClientView (`components/feedback/feedback-client-view.tsx` - 新規)

**責務:** フィルタ状態の管理とフィルタ済みデータの配信。Server ComponentとClient Componentの境界を担う。

```typescript
"use client";

import { useState, useMemo } from "react";

interface FeedbackClientViewProps {
  feedbacks: FeedbackEntry[];
  requirementTitles: Record<string, string>;
  specificationTitles: Record<string, string>;
}

export function FeedbackClientView({
  feedbacks,
  requirementTitles,
  specificationTitles,
}: FeedbackClientViewProps) {
  const [filters, setFilters] = useState<FeedbackFilters>({});

  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter(fb => {
      if (filters.type && fb.type !== filters.type) return false;
      if (filters.severity && fb.severity !== filters.severity) return false;
      if (filters.status && fb.status !== filters.status) return false;
      return true;
    });
  }, [feedbacks, filters]);

  return (
    <>
      <FeedbackFilters activeFilters={filters} onFilterChange={setFilters} />
      <FeedbackTable
        feedbacks={filteredFeedbacks}
        requirementTitles={requirementTitles}
        specificationTitles={specificationTitles}
      />
    </>
  );
}
```

### 3.9 データ層

#### FeedbackRepository (`lib/feedback-repository.ts` - 新規)

```typescript
export interface FeedbackRepository {
  findAll(): Promise<FeedbackEntry[]>;
}
```

#### LocalFeedbackRepository (`lib/local-feedback-repository.ts` - 新規)

```typescript
import { FeedbackIndexSchema, type FeedbackEntry } from "@reqord/shared";
import { readYAML } from "./file-system";
import { getFeedbackDir } from "./reqord-root";

export class LocalFeedbackRepository implements FeedbackRepository {
  async findAll(): Promise<FeedbackEntry[]> {
    const indexPath = path.join(getFeedbackDir(), "index.yaml");
    const raw = await readYAML<unknown>(indexPath);
    const parsed = FeedbackIndexSchema.safeParse(raw);
    if (!parsed.success) return [];
    return parsed.data.feedbacks;
  }
}
```

- `readYAML` を使用してindex.yamlを読み取り
- Zodスキーマ（`FeedbackIndexSchema`）でバリデーション
- パース失敗時は空配列を返す（堅牢性重視）

#### feedback-data.ts (`lib/feedback-data.ts` - 新規)

```typescript
export async function getAllFeedbacks(): Promise<FeedbackEntry[]>;
```

- LocalFeedbackRepositoryのfindAll()をラップ
- 既存のdata.ts / specification-data.ts と同じパターン

#### reqord-root.ts 拡張 (`lib/reqord-root.ts` - 既存拡張)

```typescript
export function getFeedbackDir(): string {
  return path.join(getReqordRoot(), "feedback");
}
```

### 3.10 ナビゲーション更新 (`components/ui/nav.tsx` - 既存拡張)

```typescript
const navItems = [
  { href: "/dashboard", label: "ダッシュボード" },
  { href: "/requirements", label: "要件一覧" },
  { href: "/specifications", label: "仕様一覧" },
  { href: "/feedback", label: "Feedback" },     // 新規追加
  { href: "/graph", label: "依存関係グラフ" },
];
```

## 4. データフロー

### Flags表示フロー（Requirement詳細）

```
ブラウザ → /requirements/req-000016 (GET)
  → RequirementDetailPage (Server Component)
    → getRequirementById("req-000016") → Requirement（flags含む）
  → <RequirementDetail requirement={...}>
    → requirement.flags.length > 0 の場合:
      → <FlagList flags={requirement.flags} />
        → flags.map(flag => <FlagBadge type={flag.type} /> + details)
```

### Flags表示フロー（Specification詳細）

```
ブラウザ → /specifications/spec-000016 (GET)
  → SpecificationDetailPage (Server Component)
    → getSpecificationById("spec-000016") → Specification（flags含む）
  → <SpecDetail specification={...}>
    → specification.flags.length > 0 の場合:
      → <FlagList flags={specification.flags} />
```

### Feedback一覧表示フロー

```
ブラウザ → /feedback (GET)
  → FeedbackPage (Server Component)
    → Promise.all([
        getAllFeedbacks(),           → FeedbackEntry[]
        getAllRequirements(),        → Requirement[]（タイトル取得用）
        getAllSpecifications(),      → Specification[]（タイトル取得用）
      ])
    → タイトルマップ構築
    → <FeedbackTable feedbacks={...} requirementTitles={...} specificationTitles={...}>
  → HTML レスポンス

ブラウザ (CSR)
  → FeedbackTable (Client Component)
    → FeedbackFilters: フィルタ選択
      → onFilterChange → state更新 → feedbacks.filter(...)
    → テーブル描画: Issue番号 | タイプ | 重要度 | ステータス | 関連Req/Spec | 同期日時
    → FeedbackLinkedItems: 関連Req/Specリンク
      → /requirements/{id} or /specifications/{id} へのリンク
```

### Feedback → Requirement/Specification遷移フロー

```
ブラウザ → Feedback一覧 → 関連Reqリンククリック
  → /requirements/{id} → RequirementDetailPage
    → Flagsセクションが表示される（フィードバックとの循環参照）

ブラウザ → Feedback一覧 → 関連Specリンククリック
  → /specifications/{id} → SpecificationDetailPage
    → Flagsセクションが表示される
```

## 5. テスト方針

### ユニットテスト

- **LocalFeedbackRepository.findAll**:
  - index.yamlが存在する場合: FeedbackEntry配列が返されること
  - index.yamlが存在しない場合: 空配列が返されること
  - 不正なYAML: 空配列が返されること（エラーにならない）
- **FeedbackFilters ロジック**:
  - type指定: 該当typeのみフィルタされること
  - severity指定: 該当severityのみフィルタされること
  - status指定: 該当statusのみフィルタされること
  - 複数条件: AND条件でフィルタされること

### コンポーネントテスト

- **FlagList**:
  - flags空配列: 何も表示されないこと
  - feedback-reviewフラグ: severity バッジとrelatedIssuesリンクが表示されること
  - security-reviewフラグ: 警告スタイルが適用されること
  - breaking-changeフラグ: affectedVersionsが表示されること
  - 複数フラグ: 全件表示されること
- **FlagBadge**:
  - 各typeに対応する色クラスが適用されること
  - severity propsがある場合のみseverityバッジが表示されること
- **FeedbackTable**:
  - feedbacks配列に基づく行数の正確性
  - Issue番号のGitHubリンク表示
  - タイプ・重要度のバッジ色
  - 関連Req/Specリンクの表示
- **FeedbackLinkedItems**:
  - requirements / specifications のリンク表示
  - createdRequirements の「作成」バッジ表示
  - resolved の「解決済み」バッジ表示
  - 空の場合: 何も表示されないこと

### 統合テスト

- RequirementDetailページ: flagsがある場合にFlagListが表示されること
- SpecDetailページ: flagsがある場合にFlagListが表示されること
- Feedbackページ: index.yamlからデータが読み込まれテーブル表示されること
- フィルタ操作: タイプ・ステータスフィルタが正しく動作すること
- ナビゲーション: Feedbackリンクが表示されること

## 6. 技術的決定事項

### Flags表示を共通コンポーネント（FlagList）として実装

**決定:** RequirementDetailとSpecDetailで共通のFlagListコンポーネントを使用する
**理由:** RequirementとSpecificationは同じ`Flag`型（`@reqord/shared`で定義）のflags配列を持つため、表示ロジックを共通化する。`components/flags/` ディレクトリに配置し、requirement/specificationのどちらからも独立した位置付けとする。

### Feedback一覧を独立ページとして実装

**決定:** `/feedback` 路線の独立ページとして実装し、既存ページのタブには含めない
**理由:** Feedbackは特定のRequirement/Specificationに紐づくが、プロジェクト全体を横断する情報であり、Requirement詳細やSpecification詳細のタブに収めるとスコープが狭くなる。独立ページとすることで、フィルタリング・ソート等のUI操作が自由に行え、プロジェクト全体のフィードバック状況を俯瞰できる。

### FeedbackRepositoryの読み取り専用設計

**決定:** FeedbackRepositoryは`findAll()`のみとし、書き込みメソッドは提供しない
**理由:** FeedbackデータはCLI（`reqord feedback sync`）でGitHub Issueから同期されるものであり、Web UIからの直接編集は設計範囲外。Web UIは表示のみを担当し、データの変更はCLI経由で行う。

### フィルタ状態のクライアントサイド管理

**決定:** FeedbackFiltersの状態は`useState`で管理し、URLパラメータには反映しない
**理由:** Feedback一覧は通常ブックマークやURL共有の対象にならず、フィルタはセッション内の一時的な操作。URL stateを使うとServer Componentの再レンダリングが必要になり、フィルタ操作のレスポンスが遅くなる。全データをClient Componentで保持し、フィルタリングはクライアントサイドで即時実行する。
