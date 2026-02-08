# LLMコンテキスト出力コマンド - 技術設計書

## 1. 設計概要

`reqord context <req-id>` コマンドにより、指定された要件に関連するすべてのコンテキスト情報をLLM向けのMarkdown形式に集約して標準出力に出力する。ProjectContext（product/technical/structure）、Requirement（JSON + description.md）、Gap Analysis結果、関連Specification、依存要件をひとつのドキュメントに統合する。`--compact`（約2000トークン）と `--full`（約10000トークン）のモードでトークン量を制御し、パイプ経由でのLLM入力（`reqord context req-001 | claude code`）を主要ユースケースとする。

## 2. アーキテクチャ

```
Command Layer:  commands/context/export.ts       (新規)
                    ↓
Service Layer:  services/context-export-service.ts (新規)
                    ↓
Repository:     repositories/requirement.ts       (既存)
                repositories/specification.ts     (既存)
                repositories/project-context.ts   (既存)
                    ↓
File System:    repositories/file-system.ts       (既存)
                    ↓
Storage:        .reqord/context/ (ProjectContext)
                .reqord/requirements/ (Requirement + description.md)
                .reqord/specifications/ (Specification + design.md)
```

コンテキスト収集と出力フォーマットをサービス層に集約する。各種リポジトリの既存メソッド（findById, loadDescription, loadFile等）を組み合わせて情報を収集し、Markdownテンプレートに変換する。新規リポジトリは不要。

## 3. コンポーネント設計

### 3.1 exportコマンド (`commands/context/export.ts` - 新規)

**責務:** コンテキスト出力のCLIインターフェース。

```
reqord context <req-id> [options]
```

| オプション | 説明 |
|-----------|------|
| `<req-id>` | コンテキスト出力対象の要件ID（req-NNNNNN） |
| `--full` | フルコンテキスト出力（約10000トークン、デフォルト） |
| `--compact` | コンパクト出力（約2000トークン） |
| `--format <type>` | 出力形式: markdown（デフォルト）、json |

**注意:** 既存の `reqord context init/show/update` サブコマンドとの共存のため、IDの有無で動作を判定する。引数がreq-NNNNNN形式であればコンテキスト出力、サブコマンド（init/show/update）であれば既存コマンドにルーティングする。

### 3.2 ContextExportService (`services/context-export-service.ts` - 新規)

**責務:** 各種コンテキスト情報の収集とフォーマット。

```typescript
export type ExportMode = "full" | "compact";
export type ExportFormat = "markdown" | "json";

export interface ContextExportOptions {
  mode: ExportMode;
  format: ExportFormat;
}

export interface CollectedContext {
  projectContext: {
    product?: unknown;
    technical?: unknown;
    structure?: unknown;
  };
  requirement: {
    json: Requirement;
    description: string | null;
  };
  gapAnalysis?: {
    coverage: string;
    missingFeatures: Array<{ description: string; priority: string }>;
    conflicts: Array<{ filePath: string; currentBehavior: string; requiredBehavior: string }>;
  };
  relatedSpecifications: Array<{
    id: string;
    status: string;
    designSummary: string | null;
  }>;
  dependentRequirements: Array<{
    id: string;
    title: string;
    status: string;
    relation: string;
  }>;
}

export async function exportContext(
  cwd: string,
  reqId: string,
  options: ContextExportOptions,
): Promise<string>;

export async function collectContext(
  cwd: string,
  reqId: string,
): Promise<CollectedContext>;
```

### 3.3 コンテキスト収集ロジック

**収集対象と優先度:**

| セクション | fullモード | compactモード |
|-----------|-----------|-------------|
| ProjectContext: product | 全文 | name + visionのみ |
| ProjectContext: technical | 全文 | stack概要のみ |
| ProjectContext: structure | 全文 | 省略 |
| Requirement JSON | 全フィールド | id, title, status, successCriteria, format |
| Requirement description.md | 全文 | 先頭500文字 |
| Gap Analysis | 全詳細 | coverageとmissingFeatures概要 |
| Related Specifications | design.mdの設計概要セクション | id + statusのみ |
| Dependent Requirements | title + status + 関係性 | id + title + statusのみ |

### 3.4 Markdownテンプレート

**fullモード出力構造:**
```markdown
# LLMコンテキスト: {req.title}

## プロジェクト情報

### プロダクト
{product.json の内容}

### 技術スタック
{technical.json の内容}

### プロジェクト構造
{structure.json の内容}

## 対象要件: {req.id}

### 基本情報
- ID: {req.id}
- タイトル: {req.title}
- ステータス: {req.status}
- 優先度: {req.priority}
- フォーマット: {req.format.type}

### 成功基準
{successCriteria を番号付きリストで}

### 要件詳細
{description.md の内容}

## Gap Analysis
{gapAnalysis の詳細、存在する場合}

## 関連仕様
{各Specificationの設計概要}

## 依存要件
{blockedBy, blocks, relatedTo の要件リスト}
```

**compactモード出力構造:**
```markdown
# {req.title} (コンテキスト)

## プロジェクト
{product.name}: {product.vision}
技術: {technical.stack の概要}

## 要件: {req.id}
ステータス: {req.status} | 優先度: {req.priority}

成功基準:
{successCriteria}

{description.md の先頭500文字}

## Gap: {gapAnalysis.coverage}
不足: {missingFeaturesの概要リスト}

## 関連
{関連spec/reqのID + statusリスト}
```

### 3.5 JSONフォーマット出力

`--format json` 指定時は `CollectedContext` オブジェクトをそのままJSON.stringifyして出力。パイプ先のツールがJSONパースする場合に使用。

### 3.6 設計概要抽出ヘルパー

```typescript
function extractDesignSummary(designContent: string): string | null {
  // "## 1. 設計概要" セクションの直下テキストを抽出
  // 次の "## " が出現するまでの内容を返す
  const match = designContent.match(
    /##\s*1\.\s*設計概要\s*\n([\s\S]*?)(?=\n##\s|\n$|$)/
  );
  return match ? match[1].trim() : null;
}
```

## 4. データフロー

### fullモード出力フロー

```
ユーザー → reqord context req-000016 --full
  → contextExportCommand.action("req-000016", { mode: "full" })
    → contextExportService.exportContext(cwd, "req-000016", { mode: "full", format: "markdown" })
      → collectContext(cwd, "req-000016")
        → contextRepo.load(cwd) → ProjectContext取得
        → contextRepo.loadContextFile(cwd, "product") → product.json
        → contextRepo.loadContextFile(cwd, "technical") → technical.json
        → contextRepo.loadContextFile(cwd, "structure") → structure.json
        → reqRepo.findById(cwd, "req-000016") → Requirement取得
        → reqRepo.loadDescription(cwd, "req-000016") → description.md
        → requirement.gapAnalysis → Gap Analysis結果
        → specRepo.findAll(cwd) → requirementIdでフィルタ → 関連Spec
          → 各specのdesign.md → extractDesignSummary()
        → 依存要件の取得:
          → req.dependencies.blockedBy/blocks/relatedTo の各IDでfindById
      → CollectedContext構築
      → fullモードMarkdownテンプレート適用
      → Markdown文字列返却
  → process.stdout.write(output)
```

### パイプ使用フロー

```
ユーザー → reqord context req-000016 --compact | claude code
  → exportContext(cwd, "req-000016", { mode: "compact", format: "markdown" })
  → stdout: コンパクトMarkdown（約2000トークン）
  → パイプ先のclaude codeに入力
```

### JSONフォーマットフロー

```
ユーザー → reqord context req-000016 --format json
  → collectContext(cwd, "req-000016") → CollectedContext
  → JSON.stringify(collectedContext, null, 2)
  → stdout: JSON出力
```

## 5. テスト方針

### ユニットテスト

- **collectContext**:
  - 正常系: 全データが揃っている場合のCollectedContext構築
  - ProjectContext未初期化時: projectContextフィールドが空オブジェクト
  - Gap Analysis未実行時: gapAnalysisがundefined
  - 関連Specificationが0件: 空配列
  - 依存要件が存在しない場合のフォールバック
- **extractDesignSummary**:
  - 正常なdesign.md: 設計概要セクションの抽出
  - テンプレートのみのdesign.md: null返却
  - セクション見出しなし: null返却
- **fullモードテンプレート**: 全セクションが出力に含まれること
- **compactモードテンプレート**: 省略セクション（structure等）が含まれないこと、description.mdが500文字で切り詰められること
- **JSONフォーマット**: JSON.parseableな出力であること

### 統合テスト

- テスト用のProjectContext + Requirement + Specification群を用意し、full/compactモードの出力検証
- `--format json` 出力のスキーマ検証
- stdoutへの出力が正しく行われること（stderr混入なし）

## 6. 技術的決定事項

### stdout専用出力

**決定:** コンテキスト出力はstdoutのみに出力し、プログレス表示やメッセージはstderrに出力
**理由:** パイプ経由でのLLM入力が主要ユースケースであるため、stdoutにはコンテキストのみを出力する必要がある。進捗表示や「出力しました」等のメッセージがstdoutに混入すると、パイプ先のツールで不要なテキストが入力されてしまう。

### compact/fullの2段階モード

**決定:** `--compact`（約2000トークン）と `--full`（約10000トークン）の2モードを提供
**理由:** LLMのコンテキストウィンドウには制限がある。compactモードは小規模な質問やタスクに十分なコンテキストを提供し、fullモードは実装やレビューなど詳細な情報が必要なケースに対応する。中間モードの追加は将来的な拡張として、まず2段階で運用する。

### 既存contextサブコマンドとの共存

**決定:** `reqord context <req-id>` の引数がreq-NNNNNN形式であればコンテキスト出力、それ以外（init/show/update）は既存サブコマンドにルーティング
**理由:** `reqord context export <req-id>` のようにサブコマンドを追加する案もあるが、パイプ使用時のタイピング量を最小化するため、直接ID指定でコンテキスト出力を行える設計とする。Commander.jsのサブコマンドとオプショナル引数の組み合わせで実現可能。

### design.mdの設計概要のみ抽出

**決定:** 関連Specificationのdesign.mdからは「設計概要」セクションのみを抽出
**理由:** design.md全文を含めるとトークン量が大幅に増加する。設計概要セクションにはアプローチの要約が含まれており、LLMがタスクを理解するには十分。詳細設計が必要な場合はユーザーが個別にdesign.mdを参照する。
