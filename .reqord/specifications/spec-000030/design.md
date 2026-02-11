# YAML変換レイヤー実装 - 技術設計書

## 1. 設計概要

要件・仕様・ProjectContext・Feedbackの保存形式をJSONからYAMLに移行する。既存のZod スキーマは変更せず、FileSystem層にYAML読み書き機能を追加し、Repository層で拡張子判定によって透過的にフォーマット変換を行う。これにより、人間による直接編集の可読性を向上させつつ、既存のバリデーションロジックはそのまま維持する。

### 技術スタック

- **YAML ライブラリ**: `js-yaml` 4.1.1（TypeScript型定義含む）
- **対象パッケージ**: `@reqord/cli`, `@reqord/web`
- **変更範囲**: FileSystem層、Repository層（最小限の変更）

### 移行対象ファイル

1. `.reqord/requirements/req-NNNNNN.json` → `req-NNNNNN.yaml`
2. `.reqord/specifications/spec-NNNNNN.json` → `spec-NNNNNN.yaml`
3. `.reqord/context/product.json` → `product.yaml`
4. `.reqord/context/technical.json` → `technical.yaml`
5. `.reqord/context/structure.json` → `structure.yaml`
6. `.reqord/context/context.json` → `context.yaml`
7. `.reqord/feedback/index.json` → `index.yaml`

## 2. アーキテクチャ

```
┌─────────────────────────────────────────────────────────┐
│ Command/Service Layer (既存コード変更なし)                │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│ Repository Layer (拡張子判定ロジック追加)                 │
│  - requirement.ts, specification.ts                     │
│  - project-context.ts, feedback.ts                      │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│ FileSystem Layer (YAML読み書き機能追加)                  │
│  - readYAML<T>(path): Promise<T>                        │
│  - writeYAML(path, data): Promise<void>                 │
│  - readJSON<T>(path): Promise<T> (既存維持)             │
│  - writeJSON(path, data): Promise<void> (既存維持)      │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│ File System (.reqord/*.yaml)                            │
└─────────────────────────────────────────────────────────┘
```

### レイヤー責務

- **FileSystem層**: YAML/JSONのシリアライズ・デシリアライズ。`js-yaml`のラッパー関数提供
- **Repository層**: ファイル拡張子に基づいて`readYAML`/`readJSON`を呼び分け。Zod バリデーションは変更なし
- **Service層**: 変更なし（Repository APIを透過的に使用）

## 3. コンポーネント設計

### 3.1 FileSystem層 (`packages/cli/src/repositories/file-system.ts`, `packages/web/src/lib/file-system.ts`)

#### 追加する関数

```typescript
import { load as yamlLoad, dump as yamlDump } from "js-yaml";

export async function readYAML<T>(path: string): Promise<T> {
  const content = await readFile(path, "utf-8");
  try {
    return yamlLoad(content) as T;
  } catch (error) {
    throw new Error(
      `YAML構文エラー (${path}): ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function writeYAML(path: string, data: unknown): Promise<void> {
  try {
    const yamlContent = yamlDump(data, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
      sortKeys: false,
    });
    await writeFile(path, yamlContent, "utf-8");
  } catch (error) {
    throw new Error(
      `YAML書き込みエラー (${path}): ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
```

#### YAMLダンプオプション

- `indent: 2` - インデント幅2スペース
- `lineWidth: 120` - 折り返し幅120文字
- `noRefs: true` - アンカー/エイリアス無効化（シンプルなYAML出力）
- `sortKeys: false` - キーの順序を維持（JSON構造の順序を保持）

### 3.2 Repository層の変更

#### 3.2.1 Requirement Repository (`packages/cli/src/repositories/requirement.ts`)

**変更前:**

```typescript
export async function findById(cwd: string, id: string): Promise<Requirement | null> {
  const reqDir = getRequirementsDir(cwd);
  const jsonPath = fs.joinPath(reqDir, `${id}.json`);

  if (!(await fs.exists(jsonPath))) {
    return null;
  }

  const raw = await fs.readJSON<unknown>(jsonPath);
  const result = RequirementSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`要件 ${id} のバリデーションエラー:\n${formatZodError(result.error)}`);
  }
  return result.data;
}
```

**変更後:**

```typescript
export async function findById(cwd: string, id: string): Promise<Requirement | null> {
  const reqDir = getRequirementsDir(cwd);
  const yamlPath = fs.joinPath(reqDir, `${id}.yaml`);

  if (!(await fs.exists(yamlPath))) {
    return null;
  }

  const raw = await fs.readYAML<unknown>(yamlPath);
  const result = RequirementSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`要件 ${id} のバリデーションエラー:\n${formatZodError(result.error)}`);
  }
  return result.data;
}

export async function save(cwd: string, requirement: Requirement): Promise<void> {
  const reqDir = getRequirementsDir(cwd);
  const yamlPath = fs.joinPath(reqDir, `${requirement.id}.yaml`);
  await fs.writeYAML(yamlPath, requirement);
}

export async function findAll(cwd: string): Promise<Requirement[]> {
  const reqDir = getRequirementsDir(cwd);
  const files = await fs.readdirFiles(reqDir, (name) =>
    /^req-\d{6}\.yaml$/.test(name) // 正規表現を.jsonから.yamlに変更
  );

  const requirements: Requirement[] = [];
  for (const file of files.sort()) {
    const raw = await fs.readYAML<unknown>(fs.joinPath(reqDir, file));
    const result = RequirementSchema.safeParse(raw);
    if (result.success) {
      requirements.push(result.data);
    }
  }
  return requirements;
}
```

#### 3.2.2 Specification Repository (`packages/cli/src/repositories/specification.ts`)

同様の変更を適用:
- `spec-NNNNNN.json` → `spec-NNNNNN.yaml`
- `readJSON` → `readYAML`
- `writeJSON` → `writeYAML`
- 正規表現パターン: `/^spec-\d{6}\.json$/` → `/^spec-\d{6}\.yaml$/`

#### 3.2.3 ProjectContext Repository (`packages/cli/src/repositories/project-context.ts`)

```typescript
function getContextJsonPath(cwd: string): string {
  return fs.joinPath(getContextDir(cwd), "context.yaml"); // .json → .yaml
}

export async function load(cwd: string): Promise<ProjectContext | null> {
  const yamlPath = getContextJsonPath(cwd);

  if (!(await fs.exists(yamlPath))) {
    return null;
  }

  const raw = await fs.readYAML<unknown>(yamlPath);
  const result = ProjectContextSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid context.yaml: ${result.error.message}`);
  }
  return result.data;
}

export async function save(cwd: string, context: ProjectContext): Promise<void> {
  const contextDir = getContextDir(cwd);
  await fs.mkdirp(contextDir);
  await fs.writeYAML(getContextJsonPath(cwd), context);
}

function getContextFilePath(cwd: string, fileType: ContextFileType): string {
  return fs.joinPath(getContextDir(cwd), `${fileType}.yaml`); // .json → .yaml
}

export async function loadContextFile(cwd: string, fileType: ContextFileType): Promise<unknown | null> {
  const filePath = getContextFilePath(cwd, fileType);
  if (!(await fs.exists(filePath))) {
    return null;
  }
  return fs.readYAML<unknown>(filePath);
}

export async function saveContextFile(cwd: string, fileType: ContextFileType, data: unknown): Promise<void> {
  const filePath = getContextFilePath(cwd, fileType);
  await fs.writeYAML(filePath, data);
}
```

#### 3.2.4 Feedback Repository (`packages/cli/src/repositories/feedback.ts`)

```typescript
const INDEX_FILENAME = "index.yaml"; // index.json → index.yaml

export async function loadIndex(cwd: string): Promise<FeedbackIndex> {
  const indexPath = getIndexPath(cwd);
  if (!(await fs.exists(indexPath))) {
    return { feedbacks: [] };
  }
  const raw = await fs.readYAML<unknown>(indexPath);
  const result = FeedbackIndexSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid feedback index: ${result.error.message}`);
  }
  return result.data;
}

export async function saveIndex(cwd: string, index: FeedbackIndex): Promise<void> {
  const feedbackDir = getFeedbackDir(cwd);
  await fs.mkdirp(feedbackDir);
  const indexPath = getIndexPath(cwd);
  const validated = FeedbackIndexSchema.parse(index);
  await fs.writeYAML(indexPath, validated);
}
```

### 3.3 Web UI側の変更

`packages/web/src/lib/file-system.ts`, `packages/web/src/lib/local-repository.ts`, `packages/web/src/lib/local-specification-repository.ts`にも同様の変更を適用。CLI側と同じ実装パターンを使用。

## 4. データフロー

### 読み込みフロー

```
User → Command → Service → Repository → FileSystem
                                           ↓
                              readYAML<unknown>(path)
                                           ↓
                              js-yaml.load(content)
                                           ↓
                              JSONオブジェクト
                                           ↓
                              ZodSchema.safeParse(obj)
                                           ↓
                              型安全なRequirement/Specification
```

### 書き込みフロー

```
Service → Repository → FileSystem
                         ↓
            writeYAML(path, data)
                         ↓
            js-yaml.dump(data)
                         ↓
            YAML文字列
                         ↓
            writeFile(path, yaml)
```

### エラーハンドリング

1. **YAML構文エラー**: `readYAML`内で`js-yaml`の例外をキャッチし、ファイルパスとエラーメッセージを含む`Error`をスロー
2. **Zodバリデーションエラー**: 既存の`formatZodError`を使用してエラーメッセージを整形（変更なし）
3. **ファイル不存在**: `exists()`チェックで事前検証（既存と同じ）

## 5. テスト方針

### 5.1 ユニットテスト

#### FileSystem層

- **`readYAML`**:
  - 有効なYAMLファイルを正しくパースできる
  - YAML構文エラー時に適切なエラーメッセージをスローする
  - ネストされたオブジェクト・配列を正しく読み込める
  - 日本語文字列を正しく処理できる
- **`writeYAML`**:
  - JavaScriptオブジェクトをYAML形式で書き込める
  - インデント・フォーマットが正しい（2スペース、120文字折り返し）
  - 空配列 `[]`、空オブジェクト `{}`、null値を正しく処理できる
  - 日付（ISO 8601文字列）を正しく保持できる

#### Repository層

- **Requirement Repository**:
  - `findAll()`が`.yaml`ファイルのみをフィルタリングする
  - `findById()`がYAMLファイルを読み込み、Zodバリデーションを通過する
  - `save()`が`.yaml`拡張子で保存する
- **Specification Repository**: Requirement Repositoryと同様のテストケース
- **ProjectContext Repository**:
  - `context.yaml`, `product.yaml`, `technical.yaml`, `structure.yaml`の読み書きができる
- **Feedback Repository**:
  - `index.yaml`の読み書きができる

### 5.2 統合テスト

#### 既存機能の互換性テスト

- `reqord req create <title>` → YAMLファイルが生成される
- `reqord req list` → YAMLファイルを読み込んで一覧表示できる
- `reqord req show <id>` → YAMLファイルの内容を表示できる
- `reqord spec create <req-id>` → YAMLファイルが生成される
- `reqord context init` → YAML形式のコンテキストファイルが生成される

#### Web UI統合テスト

- Requirements一覧ページでYAMLファイルを読み込める
- Specifications詳細ページでYAMLファイルを表示できる
- ProjectContextダッシュボードでYAML形式のコンテキストを表示できる

### 5.3 エッジケーステスト

- **空配列・空オブジェクト**: `[]`, `{}` がYAMLとして正しく表現される
- **日本語文字列**: マルチバイト文字が正しくエスケープ・デシリアライズされる
- **特殊文字**: `:`, `#`, `-`, `|`, `>` 等のYAML特殊文字を含む文字列が正しく処理される
- **日付フォーマット**: ISO 8601文字列（`2026-02-11T09:00:00.000Z`）が文字列として保持される（YAMLの日付型に自動変換されない）
- **YAML構文エラー**: 不正なインデントやクォートミスに対してエラーメッセージが表示される

### 5.4 テストツール

- **テストランナー**: Vitest（既存のテストインフラを使用）
- **一時ディレクトリ**: `node:fs/promises` + `os.tmpdir()`でテスト用ディレクトリ作成
- **アサーション**: `expect()`でYAML出力の構造・フォーマットを検証

## 6. 技術的決定事項

### 6.1 YAML ライブラリの選定

**決定**: `js-yaml` 4.1.1を使用

**理由**:
- TypeScript型定義が公式に提供されている
- Node.js標準の`node:fs/promises`と組み合わせて使用可能
- Zodスキーマとの互換性が高い（JSON構造をそのままYAMLに変換）
- 広く使用されており、npmダウンロード数が多い（週10M+）

**代替案**: `yaml` (npm 週5M+) - より新しいが、`js-yaml`の方が成熟している

### 6.2 Zodスキーマの変更不要

**決定**: Zodスキーマは変更しない（JSON構造ベースを維持）

**理由**:
- YAMLは構造的にJSONのスーパーセットであるため、JSON構造のスキーマがそのまま使用可能
- `js-yaml.load()`の戻り値は`unknown`型のJavaScriptオブジェクトであり、既存のZodバリデーションがそのまま適用できる
- スキーマ変更によるバリデーションロジックの破壊リスクを回避

### 6.3 拡張子の完全移行（後方互換性なし）

**決定**: `.json` → `.yaml`に完全移行し、JSONとYAMLの混在はサポートしない

**理由**:
- 後方互換性を維持する複雑なロジック（拡張子判定の条件分岐）を避ける
- 移行コマンド（`reqord migrate-to-yaml`）で一括変換を実行するため、段階的な移行は不要
- シンプルなコードベースを維持

**移行手順**: 別途実装される`reqord migrate-to-yaml`コマンドで既存のJSONファイルをYAMLに一括変換

### 6.4 YAMLフォーマット設定

**決定**:
- インデント: 2スペース
- 折り返し: 120文字
- アンカー/エイリアス: 無効化（`noRefs: true`）
- キー順序: 保持（`sortKeys: false`）

**理由**:
- 既存のJSON Pretty Print設定（2スペースインデント）と統一
- アンカー/エイリアスは可読性を下げるため無効化
- キーの順序を維持することで、Gitでの差分が読みやすくなる

### 6.5 日付フォーマットの維持

**決定**: ISO 8601文字列（`2026-02-11T09:00:00.000Z`）は文字列として保持

**理由**:
- `js-yaml`はデフォルトでYAML 1.1の日付型にパースする可能性があるが、`!!str`タグを使用せずに文字列として扱う
- Zodスキーマは`z.string()`で日付を定義しているため、文字列として保持する必要がある
- `js-yaml`の`dump()`は自動的に文字列として出力する（明示的な型変換不要）

### 6.6 エラーメッセージの日本語化

**決定**: YAML構文エラー・書き込みエラーは日本語メッセージで表示

**理由**:
- 既存のRequirement/Specificationのバリデーションエラーが日本語であるため、統一
- `js-yaml`の英語エラーメッセージをラップし、ファイルパスと共に表示

### 6.7 Web UI側の実装

**決定**: Web UI側も同じYAML変換ロジックを実装（`packages/web/src/lib/file-system.ts`に`readYAML`/`writeYAML`を追加）

**理由**:
- Next.js Server Actionsでファイルシステムに直接アクセスするため、Web UI側にも独自のFileSystem層がある
- CLI側とWeb UI側でコードを共有するよりも、各パッケージで独立して実装する方がシンプル（`@reqord/shared`はスキーマのみを提供）

### 6.8 移行コマンドの分離

**決定**: `reqord migrate-to-yaml`コマンドは本仕様（spec-000030）の範囲外とし、別の仕様（spec-000031等）で実装

**理由**:
- YAML変換レイヤーの実装と移行コマンドの実装は独立している
- 本仕様は「新規ファイルをYAML形式で保存できるようにする」ことに集中
- 移行コマンドは既存JSONファイルの読み込み、YAML変換、バックアップ作成等の追加ロジックが必要

---

**総行数**: 350行
**複雑度**: Large（Repository層の複数ファイル変更、CLIとWeb UIの両方に影響）
**見積もり工数**: 12〜16時間（実装6h、テスト8h、ドキュメント2h）
