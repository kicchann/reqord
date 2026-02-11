# ローカルUI - 要件管理画面 - 技術設計書

## 1. 設計概要

Next.js 15 App Routerを用いたローカルWebUIで、要件の一覧表示・詳細表示・新規作成・編集画面を提供する。CLIと同じ `.reqord/` ディレクトリ内のファイルシステムに直接アクセスし、Server Actionsを通じてCRUD操作を行う。依存関係グラフの可視化は本仕様のスコープ外（spec-000023で扱う）。

## 2. アーキテクチャ

```
packages/web/src/
  ├── app/                               (App Router ページ)
  │   ├── layout.tsx                     (共通レイアウト)
  │   ├── page.tsx                       (ルートページ)
  │   ├── error.tsx                      (エラーバウンダリ)
  │   ├── requirements/
  │   │   ├── page.tsx                   (一覧ページ)
  │   │   ├── loading.tsx                (一覧ローディング)
  │   │   ├── new/page.tsx               (新規作成ページ)
  │   │   └── [id]/
  │   │       ├── page.tsx               (詳細ページ)
  │   │       ├── loading.tsx            (詳細ローディング)
  │   │       ├── not-found.tsx          (404ページ)
  │   │       └── edit/page.tsx          (編集ページ)
  │   └── graph/page.tsx                 (グラフページ - spec-000023)
  ├── components/
  │   ├── requirement/                   (要件コンポーネント群)
  │   │   ├── requirement-table.tsx      (一覧テーブル)
  │   │   ├── requirement-detail.tsx     (詳細表示)
  │   │   ├── requirement-form.tsx       (作成・編集フォーム)
  │   │   ├── markdown-editor.tsx        (Markdownエディタ)
  │   │   ├── markdown-renderer.tsx      (Markdownレンダラ)
  │   │   ├── success-criteria-editor.tsx (成功基準エディタ)
  │   │   ├── dependency-editor.tsx      (依存関係エディタ)
  │   │   └── delete-button.tsx          (削除ボタン)
  │   └── ui/
  │       ├── badge.tsx                  (ステータスバッジ)
  │       └── nav.tsx                    (ナビゲーション)
  └── lib/
      ├── repository.ts                  (RequirementRepositoryインターフェース)
      ├── local-repository.ts            (ファイルシステム実装)
      ├── get-repository.ts              (リポジトリファクトリ)
      ├── data.ts                        (データ取得関数)
      ├── actions.ts                     (Server Actions)
      ├── file-system.ts                 (ファイルI/Oユーティリティ)
      ├── id-generator.ts                (ID自動採番)
      └── reqord-root.ts                 (REQORD_ROOT環境変数解決)
```

### データアクセスの流れ

```
ブラウザ → Next.js Server Component / Server Action
              ↓
         lib/data.ts (読み取り) / lib/actions.ts (書き込み)
              ↓
         lib/get-repository.ts → LocalRequirementRepository
              ↓
         lib/file-system.ts
              ↓
         .reqord/requirements/ (ファイルシステム)
```

## 3. コンポーネント設計

### 3.1 ページコンポーネント

#### 一覧ページ (`requirements/page.tsx`)

- Server Componentとして全要件を取得
- `<RequirementTable>` にデータを渡す
- `<Suspense>` + `<Loading>` でストリーミング表示
- 「New Requirement」リンクボタン
- `dynamic = "force-dynamic"` でキャッシュ無効化

#### 詳細ページ (`requirements/[id]/page.tsx`)

- `generateMetadata` で動的タイトル生成
- `Promise.all([getRequirementById, getRequirementDescription])` で並列取得
- 要件不在時は `notFound()` で404ページ表示
- `<RequirementDetail>` コンポーネントに委譲

#### 新規作成ページ (`requirements/new/page.tsx`)

- `<RequirementForm mode="create">` を表示
- 全要件リスト取得（依存関係選択用）

#### 編集ページ (`requirements/[id]/edit/page.tsx`)

- 対象要件 + description + 全要件リスト（依存関係選択用）を取得
- `<RequirementForm mode="edit">` に既存データを渡す

### 3.2 UIコンポーネント

#### RequirementTable

- 一覧テーブル表示（ID, Title, Status, Priority）
- 各行クリックで詳細ページへ遷移
- ステータス・優先度のカラーバッジ表示

#### RequirementForm

- `mode: "create" | "edit"` で新規作成/編集を切り替え
- フォーマット選択: user-story / ears / free-form（選択に応じた動的フォーム）
- MarkdownEditor: description.mdの編集
- SuccessCriteriaEditor: 成功基準の動的リスト追加・削除
- DependencyEditor: blockedBy/blocks/relatedToの選択
- Server Action (`createRequirement` / `updateRequirement`) でフォーム送信

#### RequirementDetail

- 全フィールドの読み取り表示
- description.mdのMarkdownレンダリング
- Edit/Deleteボタン

#### DeleteButton

- 削除確認付きボタン
- Server Action (`deleteRequirement`) 呼び出し後にリダイレクト

### 3.3 データ層

#### RequirementRepository インターフェース

```typescript
interface RequirementRepository {
  findAll(): Promise<Requirement[]>;
  findById(id: string): Promise<Requirement | null>;
  loadDescription(id: string): Promise<string | null>;
  save(requirement: Requirement): Promise<void>;
  saveDescription(id: string, content: string): Promise<void>;
  deleteById(id: string): Promise<void>;
  generateNextId(): Promise<string>;
}
```

#### LocalRequirementRepository

- CLI版repositoryと同等のファイルI/Oロジック
- `REQORD_ROOT` 環境変数で `.reqord/` ディレクトリを特定
- `@reqord/shared` のRequirementSchema.safeParseでバリデーション

#### Server Actions (`lib/actions.ts`)

- `createRequirement(formData)`: FormDataからRequirementオブジェクト構築 → Zodバリデーション → save → revalidatePath → redirect
- `updateRequirement(formData)`: 既存データマージ → save → revalidatePath → redirect
- `deleteRequirement(id)`: 削除 → revalidatePath → redirect

## 4. データフロー

### 一覧表示

```
ブラウザ → /requirements (GET)
  → RequirementsPage (Server Component)
    → getAllRequirements()
      → getRepository() → LocalRequirementRepository
        → findAll() → .reqord/requirements/req-*.yaml読み込み
    → <RequirementTable requirements={data} />
  → HTML レスポンス
```

### 新規作成

```
ブラウザ → フォーム送信 (POST)
  → createRequirement(formData) [Server Action]
    → FormData → JSONオブジェクト変換
    → repo.generateNextId() → "req-000002"
    → RequirementSchema.safeParse(raw) → バリデーション
    → repo.save(requirement) → YAML書き込み
    → repo.saveDescription(id, description) → Markdown書き込み
    → revalidatePath("/requirements")
    → redirect(`/requirements/${id}`)
```

### 編集

```
ブラウザ → /requirements/req-000001/edit (GET)
  → EditPage (Server Component)
    → Promise.all([getRequirementById, getRequirementDescription, getAllRequirements])
    → <RequirementForm mode="edit" requirement={...} />

ブラウザ → フォーム送信 (POST)
  → updateRequirement(formData) [Server Action]
    → 既存データ取得 → マージ → バリデーション → save
    → revalidatePath → redirect
```

## 5. テスト方針

### ユニットテスト

- **LocalRequirementRepository**: findAll, findById, save, deleteByIdの各メソッド。テスト用一時ディレクトリ使用
- **reqord-root.ts**: REQORD_ROOT環境変数未設定時のエラー
- **id-generator.ts**: 次IDの自動採番

### コンポーネントテスト

- **RequirementTable**: propsに基づくテーブル行数・カラム値の検証
- **RequirementForm**: 各フォーマット選択時の動的フォーム切り替え

### 統合テスト

- Server Actions経由でのCRUD操作の一連フロー
- CLIで作成した要件がWebUIに表示されること（ファイルシステム共有の検証）

## 6. 技術的決定事項

### Server Componentsによるデータ取得

**決定:** ページコンポーネントはServer Componentとし、データ取得をサーバーサイドで完結
**理由:** ローカルファイルシステムへのアクセスはサーバーサイドでのみ可能。APIエンドポイントを別途作成する必要がなく、Server Components + Server Actionsで読み書きを完結できる。

### dynamic = "force-dynamic"

**決定:** 全ページで `force-dynamic` を設定し、キャッシュを無効化
**理由:** ファイルシステムの変更（CLI操作等）を即座に反映する必要がある。静的生成やキャッシュは、外部からのファイル変更を検知できない。

### REQORD_ROOT環境変数

**決定:** `.reqord/` ディレクトリの位置を `REQORD_ROOT` 環境変数で指定
**理由:** Next.jsのServer Componentは `process.cwd()` がプロジェクトルートを指すため、reqordの対象プロジェクトディレクトリを環境変数で明示的に指定する必要がある。

### CLIとの Repository実装の分離

**決定:** Web版は独自のLocalRequirementRepositoryクラスを持つ（CLI版repositoryと別実装）
**理由:** CLI版はcwdを引数に取る関数ベース、Web版はREQORD_ROOTを参照するクラスベース。I/Oロジックは類似するが、初期化方法とライフサイクルが異なる。共通化は将来の課題。
