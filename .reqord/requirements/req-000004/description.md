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
- `RequirementStatus` - draft | pending_approval | approved | deprecated
- `Priority` - low | medium | high
- `Complexity` - small | medium | large | xlarge
- `EarsFormat` / `UserStoryFormat` / `FreeFormFormat` - 要件記述形式
- `ProjectContext` - プロジェクトコンテキスト全体
- `Specification` - 仕様書（Phase 3以降）

## 技術的制約

- Zodでランタイムバリデーション
- TypeScript strict mode
- monorepo内部パッケージとして `workspace:*` で参照
- ESM + CJS デュアルビルド
