# Technical Narrative

## Monorepo構成

```mermaid
graph TB
    subgraph "Reqord Monorepo"
        CLI["packages/cli<br/>CLI Tool"]
        WEB["packages/web<br/>Web UI"]
        SHARED["packages/shared<br/>Shared Types & Utils"]
    end

    CLI --> SHARED
    WEB --> SHARED

    subgraph "External"
        GH["GitHub API<br/>(Octokit)"]
        CLAUDE["Claude API<br/>(Anthropic SDK)"]
        FS["File System<br/>(.reqord/)"]
    end

    CLI --> GH
    CLI --> CLAUDE
    CLI --> FS
    WEB --> FS
```

## データフロー

```mermaid
flowchart LR
    subgraph Input
        USER["ユーザー入力<br/>(CLI/Web)"]
        CODE["既存コードベース"]
        CTX["ProjectContext<br/>(.reqord/context/)"]
    end

    subgraph Processing
        REQ["要件管理<br/>create/enhance/approve"]
        GAP["Gap Analysis<br/>既存コード分析"]
        SPEC["仕様設計<br/>research/design/validate"]
        ISSUE["Issue生成<br/>分解/並列分析"]
    end

    subgraph Output
        REQFILES[".reqord/requirements/<br/>YAML + Markdown"]
        SPECFILES[".reqord/specifications/<br/>YAML + Markdown + Mermaid"]
        GHISSUES["GitHub Issues<br/>テンプレート適用済み"]
    end

    USER --> REQ
    CODE --> GAP
    CTX --> REQ
    CTX --> SPEC
    REQ --> GAP
    REQ --> SPEC
    GAP --> REQ
    SPEC --> ISSUE
    REQ --> REQFILES
    SPEC --> SPECFILES
    ISSUE --> GHISSUES
```

## 設計パターン

### Repository Pattern

データアクセス層の抽象化。ファイルシステム操作（YAML/Markdown読み書き）をRepositoryで抽象化し、ビジネスロジックからI/Oを分離する。

- `RequirementRepository` - 要件のCRUD（YAML + Markdownの統合管理）
- `SpecificationRepository` - 仕様のCRUD
- `ContextRepository` - ProjectContextの読み書き

### Command Pattern

CLIコマンドの構造化。Commander.jsと組み合わせ、各コマンドをクラスとして実装。入力バリデーション、実行、出力フォーマットを分離。

### Factory Pattern

オブジェクト生成の統一。要件・仕様・Issueの新規作成時にID採番、初期値設定、テンプレート適用をFactoryに集約。

### Observer Pattern

変更の伝播管理。要件変更時の影響範囲分析（仕様→Issue連鎖）をObserverパターンで実装。依存先への自動通知。
