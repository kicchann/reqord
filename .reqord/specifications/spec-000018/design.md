# 実装検証コマンド - 技術設計書

## 1. 設計概要

`reqord validate impl <spec-id>` コマンドにより、Specificationの実装完了度を3つの観点で検証する。(1) GitHub Issueの完了状態、(2) design.mdから抽出したコンポーネントの実装ファイル存在確認、(3) テストファイルの存在確認。design.mdのコンポーネント設計セクションとテスト方針セクションをパースしてファイルパスを抽出し、ファイルシステムの実在性とGitHub Issueの状態をチェックする。`--json` オプションでCI/CD連携、`--strict` オプションで未完了時にexit code 1を返すCIモードを提供する。

また、`reqord req implement <req-id>` コマンド実行時に、Requirement配下の全Specificationがimplementedであるか、全紐付きIssueがclosedであるかの整合性チェックを実施し、不整合があれば警告を表示する（Feedback #221）。

## 2. アーキテクチャ

```
Command Layer:  commands/validate/impl.ts        (新規)
                commands/req/implement.ts         (既存: 拡張)
                    ↓
Service Layer:  services/impl-validation-service.ts (新規)
                    ↓
Shared:         @reqord/shared
                  rules/consistency.ts            (既存: checkConsistency)
                    ↓
Repository:     repositories/specification.ts     (既存)
                repositories/requirement.ts       (既存)
                repositories/github.ts            (spec-000011で追加)
                repositories/file-system.ts       (既存)
                    ↓
External:       gh CLI (Issue状態取得)
                ファイルシステム (コンポーネント/テスト存在確認)
                    ↓
Storage:        .reqord/specifications/spec-NNNNNN.yaml
                .reqord/specifications/spec-NNNNNN/design.md
```

design.mdのパースはサービス層に配置し、GitHub Issue状態取得はspec-000011で導入するgithubリポジトリを再利用する。コンポーネントパス抽出とファイル存在確認を分離することで、テスト時のモック化を容易にする。

## 3. コンポーネント設計

### 3.1 implコマンド (`commands/validate/impl.ts` - 新規)

**責務:** 実装検証の実行と結果表示。

```
reqord validate impl <spec-id> [options]
```

| オプション | 説明 |
|-----------|------|
| `<spec-id>` | 検証対象のSpecification ID（spec-NNNNNN） |
| `--json` | 構造化JSON出力 |
| `--strict` | 未完了項目がある場合にexit code 1を返す（CI用） |

**表示形式:**
```
実装検証: spec-000016 (GitHub Issue生成)

GitHub Issues:
  [DONE]    #42 スキーマ定義 (P0)
  [DONE]    #43 Repository実装 (P1)
  [OPEN]    #44 Service実装 (P1)
  [OPEN]    #45 Command実装 (P2)

コンポーネント:
  [EXISTS]  packages/cli/src/commands/issue/create.ts
  [EXISTS]  packages/cli/src/services/issue-service.ts
  [MISSING] packages/cli/src/services/decomposition-service.ts
  [EXISTS]  packages/cli/src/repositories/ai.ts

テストファイル:
  [EXISTS]  packages/cli/src/services/issue-service.test.ts
  [MISSING] packages/cli/src/services/decomposition-service.test.ts

サマリー: Issues 2/4, Components 3/4, Tests 1/2
```

### 3.2 ImplValidationService (`services/impl-validation-service.ts` - 新規)

**責務:** 実装検証のオーケストレーション。

```typescript
export interface ImplValidation {
  specId: string;
  requirementId: string;
  issueCheck: IssueCheckResult;
  componentCheck: ComponentCheckResult;
  testCheck: TestCheckResult;
  overallStatus: "complete" | "partial" | "not-started";
  validatedAt: string;
}

export interface IssueCheckResult {
  total: number;
  completed: number;
  issues: Array<{
    number: number;
    title: string;
    state: "open" | "closed";
    priority?: string;
  }>;
}

export interface ComponentCheckResult {
  total: number;
  exists: number;
  components: Array<{
    path: string;
    exists: boolean;
    description?: string;
  }>;
}

export interface TestCheckResult {
  total: number;
  exists: number;
  tests: Array<{
    path: string;
    exists: boolean;
    type: "unit" | "integration";
  }>;
}

export async function validateImplementation(
  cwd: string,
  specId: string,
): Promise<ImplValidation>;
```

### 3.3 Design.mdパーサー

**責務:** design.mdのセクションからコンポーネントパスとテストパスを抽出。

```typescript
export interface DesignPaths {
  components: Array<{ path: string; description: string }>;
  tests: Array<{ path: string; type: "unit" | "integration" }>;
}

export function parseDesignPaths(designContent: string): DesignPaths;
```

**パース戦略:**

1. **コンポーネント抽出:** 「コンポーネント設計」セクション（`## 3.`）内のコードブロックやバッククォート内のファイルパスパターン（`packages/`, `src/`で始まる文字列、`.ts`/`.tsx`で終わる文字列）を正規表現で抽出
2. **セクション見出しからのパス推定:** `### 3.N タイトル (`パス`)` 形式の見出しからパス抽出
3. **テスト抽出:** 「テスト方針」セクション（`## 5.`）内のファイルパスパターン抽出、および抽出されたコンポーネントパスから `.test.ts` 対応ファイルを推定

**パターンマッチング:**
```typescript
// 見出しからのパス抽出
// 例: ### 3.1 initサービス (`services/init-service.ts`)
const headingPathPattern = /###\s+\d+\.\d+\s+.+?\(`([^`]+\.tsx?)`\)/g;

// バッククォート内のパス抽出
// 例: `packages/cli/src/services/issue-service.ts`
const inlinePathPattern = /`((?:packages\/|src\/)[^`]+\.tsx?)`/g;

// アーキテクチャ図からのパス抽出
// 例: services/issue-service.ts      (新規)
const archPathPattern = /^\s+([\w\-./]+\.tsx?)\s/gm;
```

### 3.4 GitHub Issue状態チェック

**責務:** `.reqord/issues/tasks.yaml` に記録されたIssue番号のGitHub状態を取得。

```typescript
async function checkIssueStates(
  issues: Array<{ number: number; title: string }>,
): Promise<IssueCheckResult> {
  // gh issue view <number> --json state で各Issueの状態を取得
  // tasks.yamlにエントリなし → 空の結果を返す
}
```

tasks.yamlから該当Specificationに紐づくIssue情報を参照する。tasks.yamlにエントリがない場合、Issueチェックはスキップされ、コンポーネント・テストチェックのみ実行される。

### 3.5 overallStatus判定ロジック

```typescript
function determineOverallStatus(
  issueCheck: IssueCheckResult,
  componentCheck: ComponentCheckResult,
  testCheck: TestCheckResult,
): "complete" | "partial" | "not-started" {
  const issueComplete = issueCheck.total === 0 || issueCheck.completed === issueCheck.total;
  const componentComplete = componentCheck.exists === componentCheck.total;
  const testComplete = testCheck.exists === testCheck.total;

  if (issueComplete && componentComplete && testComplete) return "complete";
  if (componentCheck.exists === 0 && testCheck.exists === 0) return "not-started";
  return "partial";
}
```

### 3.6 `reqord req implement` 整合性チェック（Feedback #221）

**責務:** Requirementをimplementedに遷移させる前に、配下のSpecificationとIssueの整合性を検証し、不整合があれば警告を表示する。

**対象ファイル:** `commands/req/implement.ts` (既存: 拡張)

**チェック内容:**

1. **Specification実装状態チェック:** 対象RequirementにリンクされたSpecificationのうち、statusが`implemented`でないものがあれば警告
2. **Issue完了状態チェック:** `tasks.yaml`から各Specificationに紐づく全Issueを収集し、statusが`closed`でないものがあれば警告

**整合性チェックの結果型:**

```typescript
export interface ImplementConsistencyResult {
  canProceed: boolean;
  warnings: ImplementConsistencyWarning[];
}

export interface ImplementConsistencyWarning {
  type: "spec-not-implemented" | "issue-not-closed";
  message: string;
  details: {
    id: string;         // spec-id or issue number
    currentStatus: string;
  };
}
```

**チェックロジック:**

```typescript
export async function checkImplementConsistency(
  cwd: string,
  reqId: string,
): Promise<ImplementConsistencyResult> {
  const specs = await specRepo.findByRequirementId(cwd, reqId);
  const warnings: ImplementConsistencyWarning[] = [];

  // 1. 全Specificationがimplementedか
  for (const spec of specs) {
    if (spec.status !== "implemented") {
      warnings.push({
        type: "spec-not-implemented",
        message: `${spec.id} のステータスが ${spec.status} です（implementedではありません）`,
        details: { id: spec.id, currentStatus: spec.status },
      });
    }
  }

  // 2. 全Issueがclosedか（tasks.yamlから取得）
  for (const spec of specs) {
    const tasks = await tasksRepo.findBySpecificationId(cwd, spec.id);
    for (const task of tasks) {
      if (task.status !== "closed") {
        warnings.push({
          type: "issue-not-closed",
          message: `#${task.issueNumber} (${task.title}) が ${task.status} です`,
          details: { id: String(task.issueNumber), currentStatus: task.status },
        });
      }
    }
  }

  return {
    canProceed: true,  // 警告は表示するが、実行はブロックしない
    warnings,
  };
}
```

**コマンド拡張:**

```typescript
// commands/req/implement.ts への追加
// 既存のステータスチェック（approved確認）の後に実行

const consistencyResult = await checkImplementConsistency(cwd, reqId);

if (consistencyResult.warnings.length > 0) {
  console.warn("\n⚠ 整合性チェック警告:");
  for (const w of consistencyResult.warnings) {
    console.warn(`  - ${w.message}`);
  }
  console.warn("");
}

// 警告があっても処理は続行（ブロックしない）
// ユーザーは警告を確認した上で判断可能
```

**表示形式:**
```
reqord req implement req-000016

⚠ 整合性チェック警告:
  - spec-000016 のステータスが approved です（implementedではありません）
  - #44 (Service実装) が open です
  - #45 (Command実装) が open です

ステータス変更: approved → implemented
```

## 4. データフロー

### 実装検証フロー

```
ユーザー → reqord validate impl spec-000016
  → implValidateCommand.action("spec-000016")
    → implValidationService.validateImplementation(cwd, "spec-000016")
      → specRepo.findById(cwd, "spec-000016") → Specification取得
      → specRepo.loadFile(cwd, "spec-000016", "design.md") → 設計文書取得
      → reqRepo.findById(cwd, spec.requirementId) → 関連Requirement取得
      → parseDesignPaths(designContent)
        → components: [{path: "commands/issue/create.ts", ...}, ...]
        → tests: [{path: "services/issue-service.test.ts", ...}, ...]
      → Issue状態チェック（tasks.yamlにエントリが存在する場合）:
        → tasksRepo.findBySpecificationId(cwd, specId).map(t => githubRepo.getIssueState(t.issueNumber))
      → コンポーネント存在チェック:
        → components.map(c => fs.exists(joinPath(cwd, c.path)))
      → テスト存在チェック:
        → tests.map(t => fs.exists(joinPath(cwd, t.path)))
      → ImplValidation構築
  → テーブル表示 or JSON出力
```

### strictモード

```
ユーザー → reqord validate impl spec-000016 --strict
  → validateImplementation(cwd, "spec-000016")
    → overallStatus: "partial"
  → process.exitCode = 1
  → stderr: "実装検証失敗: 未完了項目があります"
```

### `reqord req implement` 整合性チェックフロー

```
ユーザー → reqord req implement req-000016
  → implementCommand.action("req-000016")
    → requirementService.showRequirement(cwd, "req-000016") → Requirement取得
    → ステータスチェック: status === "approved" を確認
    → checkImplementConsistency(cwd, "req-000016")
      → specRepo.findByRequirementId(cwd, "req-000016") → 関連Spec取得
      → 各Specのstatusがimplementedかチェック
      → tasks.yamlから各Specに紐づくIssueのstatusがclosedかチェック
      → ImplementConsistencyResult返却
    → 警告があれば表示（処理はブロックしない）
    → requirementService.updateRequirement(cwd, "req-000016", { status: "implemented" })
  → ステータス変更結果表示
```

## 5. テスト方針

### ユニットテスト

- **parseDesignPaths**:
  - 見出しパス抽出: `### 3.1 タイトル (`path.ts`)` 形式
  - インラインパス抽出: バッククォート内のパスパターン
  - アーキテクチャ図パス抽出
  - パスが重複する場合のデデュプ
  - 空のdesign.md: 空のDesignPathsが返ること
  - テンプレートのままのdesign.md: 空のDesignPathsが返ること
- **overallStatus判定**:
  - 全完了: complete
  - コンポーネント0件: not-started
  - 一部完了: partial
  - Issue未設定時（total=0）のスキップ動作
- **Issue状態チェック**: githubRepoのモックによる状態取得検証
- **checkImplementConsistency**:
  - 全Specがimplemented・全Issueclosed: warnings空配列
  - 一部Specがdraft/approved: spec-not-implemented警告が含まれる
  - 一部IssueがOpen: issue-not-closed警告が含まれる
  - Specが0件: warnings空配列（関連Specなしでも警告なし）
  - tasks.yamlにエントリなしのSpec: Issueチェックをスキップ

### 統合テスト

- テスト用のspec-NNNNNN + design.md + 実装ファイルを用意し、検証結果が正確であることを確認
- `--strict` モードでexit codeが1になること
- `--json` 出力がJSON.parseableであること
- `reqord req implement` 実行時に整合性チェック警告が表示されること
- 警告があっても `implemented` への遷移が完了すること

## 6. 技術的決定事項

### design.mdからのパス抽出（正規表現ベース）

**決定:** design.mdのテキストを正規表現でパースしてコンポーネントパスを抽出
**理由:** design.mdは自然言語とMarkdown混在のドキュメントであり、構造化パーサーの適用が困難。reqordプロジェクトのdesign.mdは一定の記述規約（セクション見出し、バッククォート内パス、アーキテクチャ図内パス）に従っているため、正規表現による抽出が実用的。AI分析はコスト・レイテンシの観点から検証コマンドには不適切。

### tasks.yamlにエントリなし時のフォールバック

**決定:** tasks.yamlにエントリがない場合、Issueチェックをスキップし、コンポーネント・テストチェックのみ実行
**理由:** Issue生成（spec-000016）はオプショナルな機能であり、すべてのSpecificationがIssueを持つとは限らない。Issueなしでも実装検証は有用であるため、部分的な検証を許容する。

### strictモードのexit code

**決定:** `--strict` オプション指定時、overallStatusが"complete"以外の場合にexit code 1を返す
**理由:** CI/CDパイプラインでの利用を想定。PRマージ前に実装の完了度を自動検証し、未完了の場合にパイプラインを失敗させることで、不完全な実装のマージを防止する。
