# CLIメッセージ統一 - 技術設計書

## 1. 設計概要

reqord CLI全体のエラーハンドリングを統一し、一貫したエラーメッセージ、終了コード、出力先を提供する。`.reqord/` ディレクトリの初期化チェックを共有ミドルウェアとして導入し、各コマンドで繰り返される定型エラー処理を共通化する。全メッセージ（エラー・情報・警告）は英語で統一し、AIエージェント向けには `--json` オプションでの構造化エラー出力もサポートする。

## 2. アーキテクチャ

```
CLI エントリポイント (index.ts)
    ↓
  Commander.js グローバルフック / ミドルウェア
    ↓
  commands/*/*.ts (各コマンド)
    ↓ throw
  共通エラーハンドラ
    ├── stderr出力（人間向け / --json）
    ├── exit code設定
    └── ログ（デバッグ時）

新規ファイル:
  utils/errors.ts         (エラークラス定義)
  utils/error-handler.ts  (共通ハンドラ)
  middleware/reqord-check.ts  (.reqord/存在チェック)
```

### 既存構造との統合

```
現状:
  各コマンド → try/catch → console.error(chalk.red(...)) → process.exitCode = 1

改善後:
  各コマンド → throw AppError → 共通ハンドラ → 統一フォーマット出力
```

## 3. コンポーネント設計

### 3.1 エラークラス (`utils/errors.ts` - 新規)

**責務:** アプリケーション固有のエラー型定義。

```typescript
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly exitCode: number = 1,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export enum ErrorCode {
  UNINITIALIZED = "UNINITIALIZED",
  NOT_FOUND = "NOT_FOUND",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  FILE_READ_ERROR = "FILE_READ_ERROR",
  FILE_WRITE_ERROR = "FILE_WRITE_ERROR",
  INVALID_ARGUMENT = "INVALID_ARGUMENT",
  ALREADY_EXISTS = "ALREADY_EXISTS",
  DEPENDENCY_ERROR = "DEPENDENCY_ERROR",
}
```

### 3.2 共通エラーハンドラ (`utils/error-handler.ts` - 新規)

**責務:** エラーの統一的な出力処理。

```typescript
export function handleError(error: unknown, options?: { json?: boolean }): void {
  if (error instanceof AppError) {
    if (options?.json) {
      // 構造化エラー出力（stdoutではなくstderr）
      console.error(JSON.stringify({
        error: true,
        code: error.code,
        message: error.message,
      }));
    } else {
      console.error(chalk.red(`Error: ${error.message}`));
    }
    process.exitCode = error.exitCode;
  } else {
    // Unexpected error
    console.error(chalk.red(`Unexpected error: ${(error as Error).message}`));
    process.exitCode = 1;
  }
}
```

### 3.3 .reqord/ 初期化チェックミドルウェア (`middleware/reqord-check.ts` - 新規)

**責務:** `init` 以外のコマンド実行前に `.reqord/` ディレクトリの存在を確認。

```typescript
export async function ensureReqordInitialized(cwd: string): Promise<void> {
  const reqordDir = path.join(cwd, REQORD_DIR);
  if (!(await exists(reqordDir))) {
    throw new AppError(
      ".reqord/ directory not found. Run 'reqord init' first.",
      ErrorCode.UNINITIALIZED,
    );
  }
}
```

**適用方法:** Commander.jsの `hook("preAction")` またはコマンドアクション冒頭での呼び出し。

### 3.4 エラーパターン定義

| ErrorCode | 状況 | メッセージ例 |
|-----------|------|-------------|
| `UNINITIALIZED` | `.reqord/` が存在しない | `.reqord/ directory not found. Run 'reqord init' first.` |
| `NOT_FOUND` | 指定IDの要件が見つからない | `Requirement req-000001 not found.` |
| `VALIDATION_ERROR` | Zodバリデーション失敗 | `Validation error: title must be at least 1 character.` |
| `FILE_READ_ERROR` | ファイル読み込み失敗 | `Failed to read file: {path}` |
| `FILE_WRITE_ERROR` | ファイル書き込み失敗 | `Failed to write file: {path}` |
| `INVALID_ARGUMENT` | 不正な引数 | `Invalid argument: status must be one of draft, approved, deprecated.` |
| `ALREADY_EXISTS` | 既に存在する | `context.yaml already exists.` |
| `DEPENDENCY_ERROR` | 依存関係エラー | `Referenced requirement req-999999 does not exist.` |

### 3.5 終了コード

| コード | 意味 | 使用場面 |
|-------|------|---------|
| `0` | 成功 | 正常完了 |
| `1` | 一般エラー | バリデーション失敗、ファイル不在等 |

## 4. データフロー

### エラーハンドリングフロー（改善後）

```
ユーザー → reqord req show req-999999
  → showCommand.action("req-999999")
    → ensureReqordInitialized(cwd)  ← ミドルウェア
      → .reqord/ 存在確認 → OK
    → showRequirement(cwd, "req-999999")
      → reqRepo.findById(cwd, "req-999999") → null
      → throw new AppError("Requirement req-999999 not found.", ErrorCode.NOT_FOUND)
  → handleError(error)
    → stderr: "Error: Requirement req-999999 not found."
    → process.exitCode = 1
```

### 未初期化時のフロー

```
ユーザー → reqord req list  (init未実行)
  → listCommand.action()
    → ensureReqordInitialized(cwd)  ← ミドルウェア
      → .reqord/ 存在確認 → 不在
      → throw new AppError("...", ErrorCode.UNINITIALIZED)
  → handleError(error)
    → stderr: "Error: .reqord/ directory not found. Run 'reqord init' first."
    → process.exitCode = 1
```

### --json モードでのエラー

```
ユーザー → reqord req show req-999999 --json
  → throw AppError(NOT_FOUND)
  → handleError(error, { json: true })
    → stderr: {"error":true,"code":"NOT_FOUND","message":"Requirement req-999999 not found."}
    → process.exitCode = 1
```

## 5. テスト方針

### ユニットテスト

- **AppError**: 各ErrorCodeの生成、exitCodeの設定
- **handleError**: AppError→統一フォーマット出力、非AppError→予期しないエラー出力
- **ensureReqordInitialized**: .reqord/存在時→正常通過、不在時→AppError(UNINITIALIZED)
- **--jsonモードでのエラー出力**: stderr出力がJSON.parseableであること

### 統合テスト

- 未初期化状態での各コマンド実行 → 統一エラーメッセージ
- 存在しないIDでのshow/update/delete → NOT_FOUNDエラー
- 不正なpatch-file → VALIDATION_ERRORエラー
- exit code検証: 正常→0、エラー→1

### リグレッションテスト

- 既存コマンドの正常動作が維持されること（エラーハンドリング変更による副作用がないこと）

## 6. 技術的決定事項

### カスタムエラークラスの導入

**決定:** `AppError` クラスにErrorCodeとexitCodeを持たせる
**理由:** 現状は各コマンドでcatch→console.error→process.exitCodeの定型コードが繰り返されている。エラーの種類を型で区別することで、ハンドラ側で適切な処理（日本語メッセージ、JSON出力切り替え）が可能になる。

### stderrへのエラー出力

**決定:** すべてのエラーメッセージはstderrに出力
**理由:** stdoutは正常時のデータ出力（特に--jsonモード）に使用する。AIエージェントがstdoutをパースする際にエラーメッセージが混入すると、JSONパースが失敗する。

### 英語メッセージ統一

**決定:** 全CLIメッセージ（エラー・情報・警告）を英語で統一
**理由:** npm publishによるグローバル展開に向けて、言語の壁を取り除く。AIエージェントにとっても英語が最も自然。ErrorCodeにより言語非依存のプログラム的判別も引き続き可能。

### Commander.js preAction フックの活用

**決定:** `.reqord/` 初期化チェックをCommander.jsのhookまたは共通関数として実装
**理由:** 各コマンドのaction内に個別にチェックコードを書くと漏れが生じる。`init` コマンドのみ除外し、他のすべてのコマンドに適用する共通前処理として実装する。
