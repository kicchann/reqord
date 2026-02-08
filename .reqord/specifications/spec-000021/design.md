# EARS形式変換コマンド - 技術設計書

## 1. 設計概要

`reqord req format <id> <target-format>` コマンドにより、要件のフォーマット（user-story / ears / free-form）を相互変換する。Anthropic SDK（Claude API）を使用して自然言語の要件記述を目標フォーマットに変換し、変換前後のdiffをユーザーに提示して確認後に適用する。EARS形式ではubiquitous, event-driven, state-driven, optional, unwantedの5タイプをサポートし、`--dry-run` でプレビューのみの実行も可能とする。

## 2. アーキテクチャ

```
Command Layer:  commands/req/format.ts           (新規)
                    ↓
Service Layer:  services/format-service.ts        (新規)
                    ↓
Repository:     repositories/requirement.ts       (既存)
                repositories/ai.ts               (spec-000016で追加)
                    ↓
External:       Anthropic API (Claude)
                    ↓
Shared:         @reqord/shared
                  schemas/requirement.ts          (既存: FormatSchema)
                    ↓
Storage:        .reqord/requirements/req-NNNNNN.json
```

フォーマット変換ロジックをformat-serviceに集約し、AI呼び出しはspec-000016で導入するAIリポジトリを再利用する。変換プロンプトの構築とレスポンスのZodスキーマ検証をサービス層で行う。

## 3. コンポーネント設計

### 3.1 formatコマンド (`commands/req/format.ts` - 新規)

**責務:** フォーマット変換の実行とdiff表示。

```
reqord req format <id> <target> [options]
```

| オプション | 説明 |
|-----------|------|
| `<id>` | 変換対象の要件ID（req-NNNNNN） |
| `<target>` | 目標フォーマット: ears, user-story, free-form |
| `--ears-type <type>` | EARS変換時のタイプ指定: ubiquitous, event-driven, state-driven, optional, unwanted |
| `--dry-run` | 変換結果をプレビュー表示のみ（適用しない） |
| `--json` | 構造化JSON出力 |

### 3.2 FormatService (`services/format-service.ts` - 新規)

**責務:** フォーマット変換のオーケストレーション。

```typescript
export type TargetFormat = "user-story" | "ears" | "free-form";
export type EarsType = "ubiquitous" | "event-driven" | "state-driven" | "optional" | "unwanted";

export interface FormatConversionOptions {
  earsType?: EarsType;
  dryRun?: boolean;
}

export interface FormatConversionResult {
  requirementId: string;
  before: {
    format: Requirement["format"];
    title: string;
    description: string | null;
  };
  after: {
    format: Requirement["format"];
    title: string;
    description: string | null;
  };
  applied: boolean;
}

export async function convertFormat(
  cwd: string,
  id: string,
  target: TargetFormat,
  options?: FormatConversionOptions,
): Promise<FormatConversionResult>;
```

### 3.3 EARS形式の5タイプ

**EARS (Easy Approach to Requirements Syntax) テンプレート:**

| タイプ | テンプレート | 例 |
|--------|------------|-----|
| ubiquitous | The system shall {action} | The system shall validate all input fields |
| event-driven | When {trigger}, the system shall {action} | When the user clicks submit, the system shall save the data |
| state-driven | While {condition}, the system shall {action} | While the system is in maintenance mode, the system shall reject new connections |
| optional | Where {feature}, the system shall {action} | Where multi-language support is enabled, the system shall display content in the user's locale |
| unwanted | If {condition}, then the system shall {action} | If the API key is invalid, then the system shall return a 401 error |

**EarsSchemaとの対応:**
```typescript
// 既存の @reqord/shared EarsSchema
const EarsSchema = z.object({
  type: z.string(),          // "ubiquitous" | "event-driven" | ...
  trigger: z.string().optional(),    // event-driven: When {trigger}
  condition: z.string().optional(),  // state-driven: While {condition}, unwanted: If {condition}
  action: z.string(),               // 全タイプ共通: shall {action}
  response: z.string().optional(),   // オプショナルな応答記述
});
```

### 3.4 AI変換プロンプト設計

**System Prompt:**
```
あなたは要件定義の専門家です。
与えられた要件を指定されたフォーマットに変換してください。
要件の意味を変えずに、フォーマットのみを変換します。
出力は指定されたJSONスキーマに従ってください。
```

**User Prompt構築（例: user-story → ears変換）:**
```
## 現在の要件
ID: {id}
タイトル: {title}
フォーマット: user-story
  As: {userStory.as}
  I want: {userStory.iWant}
  So that: {userStory.soThat}

説明:
{description}

成功基準:
{successCriteria}

## 変換先
フォーマット: ears
EARSタイプ: {earsType}

## 出力
以下のJSONスキーマに従って変換結果を出力してください:
- format: EARSフォーマットオブジェクト
- title: 変換後のタイトル（必要に応じて調整）
- description: 変換後の説明文（必要に応じて調整）
```

**AIレスポンススキーマ:**
```typescript
const ConversionResponseSchema = z.object({
  format: FormatSchema,  // 既存の FormatSchema を再利用
  title: z.string().min(1),
  description: z.string().optional(),
});
```

### 3.5 diff表示

**変換前後の差分表示:**
```
フォーマット変換: req-000016

変換前:
  フォーマット: user-story
  As: 開発者
  I want: SpecificationからGitHub Issueを自動生成したい
  So that: 実装タスクの管理が効率化される

変換後:
  フォーマット: ears (event-driven)
  Trigger: 開発者がSpecificationの実装タスク分解を要求したとき
  Action: システムはSpecificationを解析しGitHub Issueを自動生成する

タイトル変更:
  - GitHub Issue生成
  + Specificationからのevent-driven Issue自動生成

この変換を適用しますか？ [y/N]
```

### 3.6 ユーザー確認フロー

```typescript
async function confirmConversion(
  result: FormatConversionResult,
): Promise<boolean> {
  // diff表示
  displayDiff(result.before, result.after);

  // 対話的確認（--dry-runの場合はスキップ）
  if (result.applied) return true;

  const readline = await import("node:readline/promises");
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  const answer = await rl.question("この変換を適用しますか？ [y/N] ");
  rl.close();
  return answer.toLowerCase() === "y";
}
```

### 3.7 同一フォーマットへの変換防止

```typescript
function validateConversion(
  currentFormat: Requirement["format"],
  target: TargetFormat,
): void {
  if (currentFormat.type === target) {
    throw new Error(`要件は既に ${target} フォーマットです`);
  }
}
```

## 4. データフロー

### フォーマット変換フロー

```
ユーザー → reqord req format req-000016 ears --ears-type event-driven
  → formatCommand.action("req-000016", "ears", { earsType: "event-driven" })
    → formatService.convertFormat(cwd, "req-000016", "ears", { earsType: "event-driven" })
      → reqRepo.findById(cwd, "req-000016") → Requirement取得
      → reqRepo.loadDescription(cwd, "req-000016") → description.md
      → validateConversion(req.format, "ears") → 同一フォーマットでないことを確認
      → AI変換プロンプト構築
      → aiRepo.completeWithSchema(prompt, ConversionResponseSchema)
        → Anthropic API呼び出し
        → レスポンスをZodスキーマでパース
      → FormatConversionResult構築（applied: false）
    → diff表示
    → ユーザー確認: "y"
    → reqRepo.save(cwd, { ...req, format: result.after.format, title: result.after.title, updatedAt: now })
    → reqRepo.saveDescription(cwd, id, result.after.description) （descriptionが変更された場合）
  → 成功メッセージ: "フォーマットを変換しました: user-story → ears (event-driven)"
```

### dry-runフロー

```
ユーザー → reqord req format req-000016 ears --dry-run
  → formatService.convertFormat(cwd, "req-000016", "ears", { dryRun: true })
    → AI変換実行 → FormatConversionResult
  → diff表示のみ（適用なし、確認プロンプトなし）
  → "dry-runモード: 変換は適用されていません"
```

### free-formへの変換

```
ユーザー → reqord req format req-000016 free-form
  → formatService.convertFormat(cwd, "req-000016", "free-form")
    → AI変換: 構造化フォーマットからフリーフォームのタイトルと説明に変換
    → format: { type: "free-form" }
    → title, description の自然言語化
  → diff表示 → 確認 → 適用
```

## 5. テスト方針

### ユニットテスト

- **convertFormat**:
  - user-story → ears: 全5タイプ（ubiquitous, event-driven, state-driven, optional, unwanted）
  - ears → user-story: EarsSchemaからUserStorySchemaへの変換
  - user-story → free-form: 構造の平坦化
  - free-form → user-story: 自然言語からの構造化
  - free-form → ears: 自然言語からEARS構造化
  - ears → free-form: EARS構造の平坦化
- **validateConversion**: 同一フォーマットでのエラー
- **プロンプト構築**: 各フォーマットの情報がプロンプトに含まれること
- **AIレスポンスパース**: 正常系・不正レスポンス時のエラーハンドリング

### 統合テスト

- テスト用のRequirementでフォーマット変換を実行し、JSON永続化が正しいことを確認（AIモック使用）
- `--dry-run` モードでファイルが変更されないことの検証
- `--json` 出力のスキーマ検証

### AIモックテスト

AIリポジトリをモック化し、事前定義された変換レスポンスでサービスロジックを検証。実際のAPI呼び出しはテストから除外する。

## 6. 技術的決定事項

### AI（Claude API）によるフォーマット変換

**決定:** フォーマット変換にAnthropic SDK（Claude API）を使用
**理由:** 自然言語で記述された要件を異なる構造形式に変換するには、文脈理解と自然言語生成が必要。ルールベースの変換（テンプレート穴埋め）では意味的な変換品質が不十分であり、特にfree-form↔構造化フォーマット間の変換にはLLMが適切。

### 変換前のユーザー確認

**決定:** 変換結果をdiff表示し、ユーザーの明示的な確認後に適用
**理由:** AI生成の変換結果は意図しない意味の変化を含む可能性がある。Human-in-the-loopの原則に基づき、変換結果を確認してから適用することで、要件の品質を保証する。`--dry-run` オプションはプレビューのみで確認プロンプトも表示しない。

### EarsTypeのオプション化

**決定:** `--ears-type` は指定しない場合、AIが要件内容から最適なタイプを自動判定
**理由:** ユーザーがEARSの5タイプの違いを熟知しているとは限らない。AIが要件の文脈（トリガーの有無、状態条件の有無等）を分析して最適なタイプを選択できる。明示的に指定された場合はそのタイプを使用する。

### FormatSchemaの再利用

**決定:** AIレスポンスの検証に既存の `@reqord/shared` FormatSchemaを使用
**理由:** Requirement JSONのformatフィールドと同一のスキーマでAIレスポンスを検証することで、型の一貫性を保証する。AIが不正なフォーマットを返した場合はZodバリデーションで検出され、エラーメッセージを表示する。
