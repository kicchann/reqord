# 共有型定義 (@reqord/shared)

## 概要

CLIパッケージとUIパッケージで共有するTypeScript型定義・バリデーションスキーマを提供するパッケージ。

## ユーザーストーリー

開発者として、CLIとUIで共通の型定義を使いたい。
なぜなら、データ構造の不整合を防ぎ、型安全に開発できるから。

## パッケージ構成

### @reqord/shared

```
packages/shared/
├── src/
│   ├── types/
│   │   ├── requirement.ts      # Requirement型
│   │   ├── project-context.ts  # ProjectContext型
│   │   ├── specification.ts    # Specification型
│   │   └── index.ts
│   ├── schemas/
│   │   ├── requirement.ts      # Zodスキーマ
│   │   ├── project-context.ts
│   │   ├── specification.ts
│   │   └── index.ts
│   └── index.ts
├── package.json
└── tsconfig.json
```

## 主要な型定義

- `Requirement` - 要件のJSON構造
- `StatusSchema`（Requirement・Specification共通） - draft | approved | implemented | deprecated
- `Priority` - low | medium | high
- `Complexity` - small | medium | large | xlarge
- `EarsFormat` / `UserStoryFormat` / `FreeFormFormat` - 要件記述形式
- `ProjectContext` - プロジェクトコンテキスト全体
- `Specification` - 仕様書
- `Flag` - feedback-review | security-review | breaking-change 等のフラグ型

## ステータス遷移ルール（計画中, Feedback #16）

> **実装状況**: 未実装。遷移チェックはCLI各コマンドにハードコードで散在しており、
> @reqord/shared への集約が未完了。

### Requirement

```
draft → approved → implemented
  ↓                    ↓
deprecated         deprecated
```

### Specification

```
draft → approved → implemented
  ↓                    ↓
deprecated         deprecated
```

### Req/Spec 整合性ルール

| 条件 | 警告 |
|------|------|
| 全関連Specが `implemented` だがRequirementが `approved` のまま | "全Specが実装完了。Requirementを `implemented` に更新を検討" |
| Requirementが `deprecated` だが関連Specが `draft`/`approved` | "親Requirementが廃止。関連Specの廃止を検討" |

これらのルールは `reqord status` コマンド（req-000019）の整合性チェックで使用予定。自動ステータス変更は行わず、警告として表示しユーザーの判断に委ねる（human-in-the-loop）。

## 技術的制約

- Zodでランタイムバリデーション
- TypeScript strict mode
- monorepo内部パッケージとして `workspace:*` で参照
- ESM + CJS デュアルビルド
