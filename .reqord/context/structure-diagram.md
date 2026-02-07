# Structure Diagram

## Monorepo全体構成

```mermaid
graph TB
    subgraph "packages/cli"
        CLI_CMD["commands/"]
        CLI_SVC["services/"]
        CLI_REPO["repositories/"]
        CLI_AI["ai/"]
        CLI_UTIL["utils/"]
    end

    subgraph "packages/web"
        WEB_APP["app/"]
        WEB_COMP["components/"]
        WEB_HOOKS["hooks/"]
        WEB_LIB["lib/"]
    end

    subgraph "packages/shared"
        SHARED_TYPES["types/"]
        SHARED_VAL["validators/"]
        SHARED_CONST["constants/"]
    end

    CLI_CMD --> CLI_SVC
    CLI_SVC --> CLI_REPO
    CLI_SVC --> CLI_AI
    CLI_SVC --> CLI_UTIL
    CLI_REPO --> SHARED_TYPES
    CLI_AI --> SHARED_TYPES

    WEB_APP --> WEB_COMP
    WEB_APP --> WEB_HOOKS
    WEB_HOOKS --> WEB_LIB
    WEB_LIB --> SHARED_TYPES

    CLI_SVC --> SHARED_VAL
    WEB_LIB --> SHARED_VAL
```

## packages/cli/ 詳細構成

```
packages/cli/
├── src/
│   ├── index.ts                    # エントリーポイント
│   ├── commands/                   # CLIコマンド定義
│   │   ├── init.ts                 # reqord init
│   │   ├── context/                # reqord context *
│   │   │   ├── init.ts
│   │   │   ├── edit.ts
│   │   │   └── domain.ts
│   │   ├── req/                    # reqord req *
│   │   │   ├── create.ts
│   │   │   ├── enhance.ts
│   │   │   ├── format.ts
│   │   │   ├── approve.ts
│   │   │   ├── gap-analysis.ts
│   │   │   └── version.ts
│   │   ├── spec/                   # reqord spec *
│   │   │   ├── create.ts
│   │   │   ├── research.ts
│   │   │   ├── design.ts
│   │   │   ├── validate.ts
│   │   │   └── approve.ts
│   │   ├── issue/                  # reqord issue *
│   │   │   ├── create.ts
│   │   │   ├── sync.ts
│   │   │   └── validate.ts
│   │   └── status.ts              # reqord status
│   │
│   ├── services/                   # ビジネスロジック
│   │   ├── requirement-service.ts
│   │   ├── specification-service.ts
│   │   ├── issue-service.ts
│   │   ├── context-service.ts
│   │   ├── approval-service.ts
│   │   └── impact-service.ts
│   │
│   ├── repositories/               # データアクセス層
│   │   ├── requirement-repository.ts
│   │   ├── specification-repository.ts
│   │   ├── context-repository.ts
│   │   └── file-repository.ts
│   │
│   ├── ai/                         # AI連携
│   │   ├── client.ts               # Anthropic SDK ラッパー
│   │   ├── enhance-requirement.ts  # 要件詳細化
│   │   ├── design-specification.ts # 設計生成
│   │   ├── decompose-tasks.ts      # タスク分解
│   │   └── gap-analysis.ts         # Gap Analysis
│   │
│   └── utils/                      # ユーティリティ
│       ├── id-generator.ts         # ID採番 (req-000001, spec-000001)
│       ├── markdown-parser.ts      # Markdown読み書き
│       ├── mermaid-generator.ts    # Mermaid図生成
│       └── github-client.ts        # GitHub API (Octokit)
│
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## packages/shared/ 詳細構成

```
packages/shared/
├── src/
│   ├── index.ts                    # 公開API
│   ├── types/                      # 型定義
│   │   ├── context.ts              # ProjectContext
│   │   ├── requirement.ts          # Requirement
│   │   ├── specification.ts        # Specification
│   │   ├── issue.ts                # Issue metadata
│   │   └── common.ts              # 共通型 (Status, Priority等)
│   │
│   ├── validators/                 # バリデーション
│   │   ├── context-validator.ts
│   │   ├── requirement-validator.ts
│   │   ├── specification-validator.ts
│   │   └── ears-validator.ts       # EARS形式検証
│   │
│   └── constants/                  # 定数
│       ├── statuses.ts             # ステータス定義
│       ├── priorities.ts           # 優先度定義
│       └── templates.ts            # テンプレートパス
│
├── package.json
└── tsconfig.json
```

## packages/web/ 詳細構成

```
packages/web/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx                # Dashboard
│   │   ├── requirements/
│   │   │   ├── page.tsx            # 要件一覧
│   │   │   └── [id]/
│   │   │       └── page.tsx        # 要件詳細
│   │   ├── specifications/
│   │   │   ├── page.tsx            # 仕様一覧
│   │   │   └── [id]/
│   │   │       └── page.tsx        # 仕様詳細
│   │   └── settings/
│   │       └── page.tsx            # 設定
│   │
│   ├── components/                 # UIコンポーネント
│   │   ├── ui/                     # 基本UIパーツ
│   │   ├── requirement/            # 要件関連
│   │   ├── specification/          # 仕様関連
│   │   ├── graph/                  # 依存関係グラフ
│   │   └── chart/                  # Ganttチャート
│   │
│   ├── hooks/                      # カスタムフック
│   │   ├── use-requirements.ts
│   │   ├── use-specifications.ts
│   │   └── use-context.ts
│   │
│   └── lib/                        # ライブラリ連携
│       ├── file-reader.ts          # .reqord/ 読み取り
│       ├── mermaid-renderer.ts     # Mermaid描画
│       └── markdown-renderer.ts    # Markdownレンダリング
│
├── package.json
├── tsconfig.json
├── next.config.ts
└── tailwind.config.ts
```
