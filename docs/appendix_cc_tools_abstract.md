素晴らしい観点です。熟考しました。**大いに活用の余地があります。**

---

## 🎯 Subagent/Skills/Rules/Commandsの活用戦略

### 全体像

```
┌─────────────────────────────────────────────────────────┐
│ Reqord Workflow                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ProjectContext → Requirement → Specification → Issue   │
│       ↓              ↓              ↓             ↓      │
│    [Skills]      [Subagents]    [Commands]    [Rules]   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 📚 Skills (知識・ベストプラクティス)

### 1. **requirement-engineering.md** Skill

**目的:** 優れた要件定義のノウハウを体系化

**配置:** `.reqord/skills/requirement-engineering/SKILL.md`

```markdown
# Requirement Engineering Skill

## Overview

高品質な要件定義を作成するためのベストプラクティス集

## Good Requirements Checklist

### EARS形式の原則

- **Event-driven**: When [trigger], the system shall [action]
- **State-driven**: While [state], the system shall [action]
- **Unwanted**: If [condition], then the system shall [action]
- **Optional**: Where [feature enabled], the system shall [action]
- **Ubiquitous**: The system shall [action]

### SMART基準

- Specific: 具体的
- Measurable: 測定可能
- Achievable: 達成可能
- Relevant: 関連性あり
- Time-bound: 期限あり

## Common Pitfalls (避けるべきこと)

❌ 曖昧な表現

- "なるべく速く"
- "ユーザーフレンドリーに"
- "適切に"

✅ 明確な表現

- "3秒以内にレスポンス"
- "クリック数3回以内で完了"
- "WCAG 2.1 AA準拠"

## Domain-Specific Patterns

### BIM/構造解析ドメイン

- IFCバージョン明記 (IFC2x3 vs IFC4)
- 単位系明記 (SI単位 vs Imperial)
- 要素タイプ明記 (IfcBeam, IfcColumn等)

### 認証ドメイン

- OAuth 2.0 / OIDC仕様準拠
- PKCE必須
- トークン有効期限明記

## Example: Good Requirement
```

REQ-001: OAuth Token Expiration

When a user's access token expires (after 1 hour),
the system shall automatically attempt token refresh using the refresh token,
and if refresh fails, redirect to login page with session expiry message.

Success Criteria:

- Access token lifetime: exactly 3600 seconds
- Refresh token lifetime: 30 days
- Refresh attempt: max 3 retries with exponential backoff
- User notification: displayed within 2 seconds

```

## Usage in Reqord

When creating or enhancing requirements:
1. Read this skill before AI enhancement
2. Validate against checklist
3. Apply domain patterns
4. Ensure SMART compliance
```

**活用タイミング:**

```bash
# AI詳細化の前にSkillを読ませる
reqord req enhance req-001
# → 内部で自動的に requirement-engineering skill を参照
```

---

### 2. **gap-analysis.md** Skill

**目的:** 既存コードとの差分分析手法

**配置:** `.reqord/skills/gap-analysis/SKILL.md`

````markdown
# Gap Analysis Skill

## Overview

既存プロジェクトへの新要件追加時の影響分析

## Analysis Steps

### 1. Code Discovery

- Identify related files using grep/ripgrep
- Check import/dependency tree
- Find similar implementations

### 2. Coverage Assessment

- Full coverage: 既存実装が完全に対応
- Partial coverage: 一部のみ実装済み
- No coverage: 新規実装必要

### 3. Conflict Detection

- API signature changes
- Data model incompatibility
- Breaking changes to existing behavior

## Search Patterns

### Authentication/Authorization

```bash
# 既存認証実装を探す
rg -i "auth|login|token|session"
rg "passport|jwt|oauth"
```
````

### Database/ORM

```bash
# スキーマ定義を探す
rg "Schema|Model|Entity"
find . -name "*migration*"
```

### API Endpoints

```bash
# ルート定義を探す
rg "app\.(get|post|put|delete)|router\."
rg "@(Get|Post|Put|Delete)"
```

## Output Format

```json
{
  "existingImplementations": [
    {
      "file": "src/auth/passport.ts",
      "lines": [45, 120],
      "coverage": "partial",
      "notes": "Basic auth implemented, OAuth missing"
    }
  ],
  "missingFeatures": [
    "OAuth 2.0 provider integration",
    "Token refresh mechanism",
    "PKCE support"
  ],
  "conflicts": [
    {
      "requirement": "JWT token format",
      "existingCode": "src/auth/token.ts:23",
      "issue": "Current implementation uses opaque tokens"
    }
  ]
}
```

````

---

### 3. **parallel-task-analysis.md** Skill

**目的:** タスクの並列実行可能性を判定

**配置:** `.reqord/skills/parallel-task-analysis/SKILL.md`

```markdown
# Parallel Task Analysis Skill

## Overview
実装タスクの依存関係と並列実行可能性を分析

## Dependency Types

### 1. Data Dependency
Task B が Task A の出力データを必要とする
````

P0: Create User table schema
P1: Implement User CRUD (blocked by P0)

```

### 2. Knowledge Dependency
Task B が Task A の技術的知見を前提とする
```

P0: Research OAuth providers
P1: Implement OAuth client (blocked by P0)

```

### 3. Integration Dependency
Task B が Task A の統合点を必要とする
```

P0: Create API endpoint
P1: Create UI component (can run in parallel)
P2: Integration test (blocked by P0 and P1)

```

## Parallel Groups

### P0 (Sequential - Must complete first)
- Infrastructure setup
- Core schema design
- Critical path items

### P1 (Parallel - Independent tracks)
- Frontend + Backend can run in parallel
- Different modules with no shared data
- Documentation tasks

### P2 (Parallel - Integration phase)
- Tests requiring multiple P1 completions
- Final integration work

## Critical Path Identification

Task is on critical path if:
1. Blocks multiple downstream tasks
2. Has longest sequential chain
3. Is required for milestone completion

## Example Analysis

Input Specification:
```

OAuth Integration

- Database schema for users/tokens
- OAuth provider client
- Login UI button
- Token validation middleware
- Integration tests

````

Output:
```json
{
  "tasks": [
    {
      "id": 1,
      "title": "Create OAuth tables",
      "parallelGroup": 0,
      "isCriticalPath": true,
      "dependencies": []
    },
    {
      "id": 2,
      "title": "Implement token validation",
      "parallelGroup": 1,
      "isCriticalPath": true,
      "dependencies": [1]
    },
    {
      "id": 3,
      "title": "Create login button",
      "parallelGroup": 1,
      "isCriticalPath": false,
      "dependencies": [1]
    },
    {
      "id": 4,
      "title": "Integration tests",
      "parallelGroup": 2,
      "isCriticalPath": true,
      "dependencies": [2, 3]
    }
  ],
  "criticalPath": [1, 2, 4],
  "parallelDuration": 9,
  "sequentialDuration": 12
}
````

```

---

## 🤖 Subagents (専門エージェント)

### Subagent構成

```

.reqord/subagents/
├── requirement-engineer/ # 要件詳細化専門
├── architect/ # 設計専門
├── task-decomposer/ # タスク分解専門
├── qa-analyst/ # 品質保証専門
└── gap-analyzer/ # 既存コード分析専門

````

### 1. **requirement-engineer** Subagent

**役割:** 要件の詳細化・検証

```markdown
# Requirement Engineer Subagent

## Role
高品質な要件定義を作成・検証する専門家

## Responsibilities
1. ユーザーの簡単な説明から詳細要件を生成
2. EARS形式への変換
3. 成功基準の定義
4. 依存関係の特定

## Process
1. Read requirement-engineering skill
2. Interview user for missing details
3. Generate structured requirement
4. Validate against SMART criteria
5. Suggest acceptance tests

## Input
- User's brief description
- ProjectContext
- Related requirements

## Output
- description.md (detailed)
- successCriteria (measurable)
- format.ears (structured)
- estimatedComplexity
````

**活用例:**

```bash
reqord req enhance req-001
# → requirement-engineer subagent が起動
# → requirement-engineering skill を読み込み
# → 対話的に詳細化
```

---

### 2. **architect** Subagent

**役割:** 技術設計

```markdown
# Architect Subagent

## Role

要件から技術設計を作成する専門家

## Responsibilities

1. Requirements → Design Document
2. Architecture diagram (Mermaid)
3. API design
4. Data model design
5. Technical decision documentation

## Process

1. Read requirements + ProjectContext
2. Analyze technical constraints
3. Research best practices (use research.md)
4. Design components
5. Create architecture diagram
6. Write design.md

## Skills Used

- system-design patterns
- database-design patterns
- api-design patterns

## Output

- design.md
- architecture.mmd
- examples/\*.ts (code samples)
- technicalDecisions[]
```

---

### 3. **task-decomposer** Subagent

**役割:** 実装タスク分解

```markdown
# Task Decomposer Subagent

## Role

Specificationを実装可能なタスクに分解

## Responsibilities

1. Specification → Implementation tasks
2. Parallel analysis
3. Critical path identification
4. GitHub Issue generation

## Process

1. Read specification design
2. Apply parallel-task-analysis skill
3. Decompose by layer/feature/requirement
4. Calculate dependencies
5. Identify critical path
6. Generate Issue metadata

## Output

- tasks[] with parallelGroup
- criticalPath[]
- GitHub Issue templates
```

---

### 4. **gap-analyzer** Subagent

**役割:** 既存コード分析

```markdown
# Gap Analyzer Subagent

## Role

既存プロジェクトと新要件の差分分析

## Responsibilities

1. Scan existing codebase
2. Identify related implementations
3. Detect conflicts
4. Suggest migration paths

## Process

1. Read requirement
2. Search codebase (ripgrep/AST)
3. Apply gap-analysis skill
4. Generate conflict report
5. Suggest resolution strategy

## Tools

- ripgrep (text search)
- tree-sitter (AST parsing)
- git log (history analysis)

## Output

- gapAnalysis.existingImplementations[]
- gapAnalysis.missingFeatures[]
- gapAnalysis.conflicts[]
```

---

### 5. **qa-analyst** Subagent

**役割:** 品質保証・テスト戦略

```markdown
# QA Analyst Subagent

## Role

テスト戦略とAcceptance Criteria定義

## Responsibilities

1. Requirements → Test scenarios
2. Edge case identification
3. Acceptance criteria validation
4. Test coverage analysis

## Process

1. Read requirement
2. Identify test dimensions
3. Generate test scenarios
4. Define acceptance criteria
5. Suggest test automation

## Output

- Enhanced successCriteria[]
- Test scenarios (unit/integration/e2e)
- Edge cases
- Performance criteria
```

---

## 📜 Rules (品質基準)

### 配置

```
.reqord/settings/rules/
├── requirement-quality.md      # 要件品質基準
├── design-review.md           # 設計レビュー基準
├── task-breakdown.md          # タスク分解基準
└── issue-template.md          # Issue作成基準
```

### 1. **requirement-quality.md**

```markdown
# Requirement Quality Rules

## DO (必ず守ること)

✅ EARS形式を使用
✅ 測定可能な成功基準を定義
✅ 依存関係を明記
✅ 見積もり複雑度を記載
✅ ドメイン用語を正確に使用

## DO NOT (避けること)

❌ 曖昧な表現 ("なるべく", "適切に")
❌ 複数の要件を1つに混ぜる
❌ 実装詳細を要件に含める
❌ テスト不可能な基準
❌ 依存関係の循環

## Validation Checklist

- [ ] タイトルが明確 (50文字以内)
- [ ] EARS形式で記述
- [ ] 成功基準が3-7個
- [ ] すべて測定可能
- [ ] 依存関係に循環なし
- [ ] 見積もり妥当 (1-40時間)

## Auto-validation

Claude Code Commandsで自動検証:

- EARS構文チェック
- 循環依存検出
- 曖昧語句検出
```

---

### 2. **design-review.md**

```markdown
# Design Review Rules

## Architecture

✅ DO

- Mermaid図で可視化
- レイヤー分離明記
- 依存方向を守る (Domain → Infrastructure ❌)

❌ DO NOT

- 単一責任原則違反
- 循環依存
- God Class/God Module

## API Design

✅ DO

- RESTful原則遵守
- バージョニング戦略明記
- エラーハンドリング統一

❌ DO NOT

- 破壊的変更 (既存APIの変更)
- 認証なしエンドポイント
- 標準外HTTPステータス

## Database

✅ DO

- 正規化 (最低3NF)
- インデックス設計
- マイグレーション戦略

❌ DO NOT

- NULL許容多用
- varchar(MAX)
- 外部キー制約なし
```

---

## 🔧 Commands (自動化コマンド)

### 配置

```
.claude/commands/reqord/
├── req-enhance.md              # 要件詳細化
├── spec-design.md             # 設計生成
├── gap-analyze.md             # ギャップ分析
├── task-decompose.md          # タスク分解
└── validate-quality.md        # 品質検証
```

### 1. **req-enhance.md** (Command)

````markdown
# Requirement Enhancement Command

## Purpose

ユーザーの簡単な説明から詳細要件を生成

## Process

1. Load ProjectContext
2. Load requirement-engineering skill
3. Activate requirement-engineer subagent
4. Generate detailed description.md
5. Create EARS format
6. Define success criteria
7. Estimate complexity
8. Save to .reqord/

## Usage

```bash
reqord req enhance req-001
```
````

## Subagents Used

- requirement-engineer

## Skills Used

- requirement-engineering
- domain-specific patterns (from ProjectContext)

## Rules Applied

- requirement-quality.md

## Output

- requirements/req-001/description.md (updated)
- requirements/req-001.json (enhanced)

````

---

### 2. **gap-analyze.md** (Command)

```markdown
# Gap Analysis Command

## Purpose
既存コードと新要件の差分を分析

## Process

1. Load requirement
2. Load gap-analysis skill
3. Activate gap-analyzer subagent
4. Scan codebase
5. Identify existing implementations
6. Detect conflicts
7. Generate report

## Usage
```bash
reqord req gap-analysis req-001
````

## Subagents Used

- gap-analyzer

## Skills Used

- gap-analysis
- codebase-scanning

## Output

- requirements/req-001.json (gapAnalysis field updated)

````

---

### 3. **spec-design.md** (Command)

```markdown
# Specification Design Command

## Purpose
要件から技術設計を生成

## Process

1. Load requirement + ProjectContext
2. Activate architect subagent
3. Research phase (optional)
4. Design architecture
5. Create Mermaid diagrams
6. Generate code examples
7. Document technical decisions

## Usage
```bash
reqord spec design spec-001
````

## Subagents Used

- architect
- qa-analyst (for test strategy)

## Skills Used

- system-design
- api-design
- database-design

## Rules Applied

- design-review.md

## Output

- specifications/spec-001/research.md (optional)
- specifications/spec-001/design.md
- specifications/spec-001/architecture.mmd
- specifications/spec-001/examples/\*.ts

````

---

### 4. **task-decompose.md** (Command)

```markdown
# Task Decomposition Command

## Purpose
Specificationを実装タスクに分解しGitHub Issue生成

## Process

1. Load specification
2. Load parallel-task-analysis skill
3. Activate task-decomposer subagent
4. Decompose into tasks
5. Analyze dependencies
6. Calculate parallel groups
7. Identify critical path
8. Generate GitHub Issues

## Usage
```bash
reqord issue create spec-001
````

## Subagents Used

- task-decomposer

## Skills Used

- parallel-task-analysis
- task-estimation

## Rules Applied

- task-breakdown.md
- issue-template.md

## Output

- specifications/spec-001.json (implementation.issues[] updated)
- GitHub Issues created

````

---

## 🔄 統合ワークフロー例

### 新要件追加フロー

```bash
# 1. 簡単な要件作成
reqord req create "OAuth token refresh"
# → requirement-engineer subagent起動
# → requirement-engineering skill読込
# → 対話的に詳細化

# 2. Gap Analysis
reqord req gap-analysis req-005
# → gap-analyzer subagent起動
# → 既存auth実装をスキャン
# → 差分レポート生成

# 3. 承認依頼
reqord req approve req-005
# → requirement-quality rules で検証
# → PR作成

# 4. 設計生成
reqord spec create req-005
reqord spec design spec-005
# → architect subagent起動
# → system-design skill読込
# → design.md生成

# 5. 設計検証
reqord spec validate spec-005
# → design-review rules適用
# → アーキテクチャ整合性チェック

# 6. タスク分解
reqord issue create spec-005
# → task-decomposer subagent起動
# → parallel-task-analysis skill読込
# → GitHub Issues生成 (並列グループ付き)
````

---

## 📊 活用効果

| フェーズ   | 従来  | Subagent/Skills活用後    |
| ---------- | ----- | ------------------------ |
| 要件作成   | 30分  | **5分** (AI詳細化)       |
| Gap分析    | 2時間 | **10分** (自動スキャン)  |
| 設計書作成 | 4時間 | **30分** (Architect生成) |
| タスク分解 | 1時間 | **5分** (並列分析含む)   |
| 品質検証   | 手動  | **自動** (Rules検証)     |

---

## 🎯 実装優先度

### Phase 1: Skills (最優先)

1. requirement-engineering.md
2. gap-analysis.md
3. parallel-task-analysis.md

### Phase 2: Commands

1. req-enhance (skill読込)
2. gap-analyze (skill読込)
3. task-decompose (skill読込)

### Phase 3: Subagents

1. requirement-engineer
2. gap-analyzer
3. task-decomposer

### Phase 4: Rules

1. requirement-quality.md
2. design-review.md

---

**結論:** Subagent/Skills/Rules/Commandsを活用することで、Reqordは単なる「要件管理ツール」から**「AI駆動の要件エンジニアリングプラットフォーム」**に進化します。

特に**Skillsが最重要**です。これがあることで、AIの出力品質が劇的に向上します。

**重要** 最終的にはこれらをpluginにしてパッケージ予定　参考資料: https://code.claude.com/docs/ja/plugins
