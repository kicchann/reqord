# Reqord

**Git-native requirements management for traceable, AI-ready software development.**

[![Version](https://img.shields.io/badge/version-0.1.0-blue)](https://github.com/kicchann/reqord)
[![License](https://img.shields.io/badge/license-AGPL--3.0-green)](./LICENSE)
[![Tests](https://img.shields.io/badge/tests-675%20passing-brightgreen)](./packages)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6)](https://www.typescriptlang.org/)

---

Reqord stores requirements as structured data (YAML + Markdown) inside your Git repository, giving every requirement a clear lifecycle from draft to implementation. No SaaS, no backend -- just `git clone` and your entire requirements history is there, version-controlled alongside your code, ready for humans and AI tools alike.

<!-- Screenshot: Dashboard overview showing project health metrics, requirement status breakdown, and an interactive dependency graph -->

---

## Why Reqord?

Software teams lose track of requirements. The consequences compound over time:

- **Scattered requirements** -- decisions live in chat threads, meeting notes, and memory. Nothing is canonical.
- **Lost context** -- new team members and AI tools start every session without project background.
- **Spec drift** -- specifications written at project start are never updated. Implementation quietly diverges.
- **Broken traceability** -- no one can answer "why does this feature exist?" or "what breaks if we change it?"
- **AI gets bad inputs** -- unstructured text produces inconsistent AI output. Every session starts from scratch.

Reqord solves these by making requirements structured, versioned, and traceable -- stored right where your code lives.

## How It Works

Reqord enforces a 3-layer traceability model that connects intent to implementation:

```
Requirement (What)  -->  Specification (How)  -->  GitHub Issue (Tasks)
       ^                                                  |
       '------------------ Feedback Loop -----------------'
```

| Layer           | Purpose                        | Example                                      |
|-----------------|--------------------------------|----------------------------------------------|
| **Requirement** | What to build                  | "Users can log in with email"                |
| **Specification** | How to build it              | "OAuth2 + JWT, sessions stored in Redis"     |
| **GitHub Issue** | Concrete implementation tasks | "Implement POST /auth/login endpoint"        |

Each layer links to the others. When a requirement changes, you can trace the impact through specifications to issues. When implementation feedback surfaces, it flows back to update requirements.

**Lifecycle:**

```
draft --> pending_approval --> approved --> implemented --> deprecated
```

Requirements move through a defined lifecycle with PR-based approval gates, so nothing gets lost and nothing ships without review.

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 10+
- Git

### Install

```bash
# Clone the repository
git clone https://github.com/kicchann/reqord.git
cd reqord

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Link the CLI globally
cd packages/cli && pnpm link --global
```

### Initialize a project

```bash
# Navigate to your target project
cd /path/to/your/project

# Initialize the .reqord/ directory structure
reqord init
```

This creates the `.reqord/` directory with subdirectories for requirements, specifications, context, settings, and assets.

### Set up project context

```bash
# Initialize project context (name, language, metadata)
reqord context init

# View current context
reqord context show
```

Project context files (`product.md`, `technical.md`, `structure.md`, `domain/*.md`) serve as persistent background for every AI session and team onboarding.

### Create your first requirement

```bash
# Create a requirement (supports user-story, ears, and free-form formats)
reqord req create

# List all requirements
reqord req list

# View a specific requirement
reqord req show req-000001

# Validate requirement quality with SMART scoring
reqord req validate req-000001
```

### Create a specification

```bash
# Create a specification linked to a requirement
reqord spec create req-000001

# View specification details
reqord spec show spec-000001

# View or update the design document
reqord spec design spec-000001
```

## Key Features

### Hybrid Storage (YAML + Markdown)

Requirements are stored as YAML metadata (status, priority, dependencies, version history) paired with Markdown content (descriptions, success criteria, use cases). Machine-readable structure with human-readable documentation.

```
.reqord/requirements/
  req-000001.yaml          # Metadata: status, priority, dependencies
  req-000001/
    description.md         # Content: detailed description, criteria
```

### SMART Validation

Built-in quality scoring based on the SMART framework (Specific, Measurable, Achievable, Relevant, Time-bound). Run `reqord req validate` to get an objective quality score and actionable improvement suggestions for any requirement.

### PR-Based Approval Workflow

Requirements follow the same review process as code. Submit a requirement for approval, and it creates a pull request. CODEOWNERS review and merge to approve. The entire approval history is tracked with version, commit hash, reviewer, and timestamp.

### Requirement Formats

Supports industry-standard formats out of the box:

- **EARS** (Easy Approach to Requirements Syntax) -- structured trigger/condition/action format
- **User Story** -- "As a [role], I want [feature], so that [benefit]"
- **Free-form** -- flexible format for early-stage requirements

### Dependency Tracking and Web Dashboard

The `@reqord/web` package provides a Next.js dashboard with:

- Project health metrics and status breakdowns
- Interactive dependency graphs
- Requirement and specification browsing
- Markdown rendering with full GFM support

<!-- Screenshot: Dependency graph visualization showing requirement-to-specification-to-issue relationships -->

### AI Integration via ProjectContext

The `.reqord/context/` directory stores structured project knowledge that AI tools can consume directly:

| File | Purpose |
|------|---------|
| `product.md` | Vision, target users, core features, out-of-scope |
| `technical.md` | Tech stack, architecture, design patterns |
| `structure.md` | Naming conventions, directory structure, import rules |
| `domain/*.md` | Domain-specific knowledge (security policies, API standards) |

This context persists across AI sessions, eliminating the "explain the project from scratch every time" problem. Works with Claude Code, Cursor, Windsurf, Codex, and any tool that can read files.

### Feedback Loop

Track feedback from GitHub Issues back to requirements and specifications:

```bash
# Sync feedback from GitHub Issues
reqord feedback sync

# View feedback items
reqord feedback list

# Link feedback to a requirement
reqord feedback link feedback-001
```

When implementation reveals that a requirement needs updating, the feedback loop ensures that knowledge flows back upstream rather than getting lost in issue comments.

### Version History

Every requirement tracks its full version history with semantic versioning. View the complete audit trail of changes, approvals, and status transitions:

```bash
reqord req history req-000001
```

## Comparison

How Reqord compares to existing tools for managing what to build:

| Capability | Reqord | Jira | Linear | Notion | GitHub Projects |
|---|---|---|---|---|---|
| **Git-native** | Yes -- lives in your repo | No | No | No | Partial |
| **Offline-first** | Yes -- no server needed | No | No | No | No |
| **AI-ready structure** | YAML + Markdown, typed schemas | Unstructured text | Unstructured text | Unstructured text | Unstructured text |
| **Traceability** | Enforced (Req -> Spec -> Issue) | Manual linking | Manual linking | Manual linking | Manual linking |
| **Approval workflow** | PR-based with CODEOWNERS | Built-in workflow | Built-in workflow | No formal approval | No formal approval |
| **Version control** | Full Git history + semantic versions | Limited history | Limited history | Page history | No versioning |
| **Quality validation** | SMART scoring built-in | No | No | No | No |
| **Cost** | Free (AGPL-3.0) | Paid | Paid | Freemium | Free (limited) |

**Reqord is not a replacement for project management tools.** It focuses specifically on requirements lifecycle management and is designed to complement tools like Jira, Linear, or GitHub Projects.

## Architecture

Reqord is a pnpm workspaces monorepo with three packages:

```
reqord/
  packages/
    shared/     @reqord/shared   -- Zod schemas, types, utilities (single source of truth)
    cli/        @reqord/cli      -- CLI tool (Commander.js)
    web/        @reqord/web      -- Web dashboard (Next.js 15 + React 19)
```

**Tech stack:**

- **Language:** TypeScript 5.x (ESM)
- **Schemas:** Zod (shared across CLI and Web)
- **CLI:** Commander.js, chalk, cli-table3
- **Web:** Next.js 15, React 19, Tailwind CSS, React Flow (@xyflow/react)
- **Testing:** Vitest (675 tests)
- **Package manager:** pnpm 10 with workspaces

**Data storage format:**

All data lives in the `.reqord/` directory within your project repository:

```
.reqord/
  context/           # Project context (product, technical, structure, domain knowledge)
  requirements/      # Requirement YAML + Markdown files
  specifications/    # Specification YAML + design documents
  settings/          # Templates and rules
  assets/            # Shared assets
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `reqord init` | Initialize `.reqord/` directory structure |
| `reqord context init` | Set up project context |
| `reqord context show` | Display project context summary |
| `reqord context update` | Update context metadata |
| `reqord req create` | Create a new requirement |
| `reqord req list` | List requirements (with filters) |
| `reqord req show <id>` | Show requirement details |
| `reqord req update <id>` | Update requirement metadata |
| `reqord req delete <id>` | Delete a requirement |
| `reqord req validate <id>` | SMART validation scoring |
| `reqord req history <id>` | View version history |
| `reqord spec create <req-id>` | Create specification for a requirement |
| `reqord spec list` | List specifications |
| `reqord spec show <id>` | Show specification details |
| `reqord spec design <id>` | View/update design document |
| `reqord feedback sync` | Sync with GitHub Issues |
| `reqord feedback list` | List feedback items |
| `reqord feedback show <id>` | Show feedback details |
| `reqord feedback close <id>` | Close a feedback item |
| `reqord feedback link <id>` | Link feedback to requirement/spec |

## Documentation

Detailed documentation is available in the `docs/about/` series:

| Document | Topic |
|----------|-------|
| [Philosophy](./docs/about/01-philosophy.md) | Why Reqord exists -- problems solved and design principles |
| [Purpose](./docs/about/02-purpose.md) | What it achieves, who it is for, feature overview |
| [Theory](./docs/about/03-theory.md) | EARS, SMART, and other methodologies adopted |
| [Best Practices](./docs/about/04-best-practices.md) | Effective usage patterns |
| [Don'ts](./docs/about/05-donts.md) | Common mistakes to avoid |
| [AI Integration](./docs/about/06-ai-integration.md) | Using Reqord with Claude Code, Cursor, Codex |

Additional references:

- [Full specification](./docs/main.md) -- complete technical specification
- [CLI command reference](./docs/reqord-cli-commands.md) -- all commands with implementation status
- [Requirements guide](./docs/guide-requirements.md) -- how to write effective requirements

## Roadmap

Reqord is at v0.1.0 (pre-release). Current priorities for upcoming releases:

- **PR-based approval workflow** -- `reqord req approve` and `reqord spec approve` commands with GitHub PR integration
- **Impact analysis** -- trace how changes to one requirement affect specifications and issues
- **GitHub Issue generation** -- decompose specifications into implementation tasks automatically
- **Status dashboard** -- `reqord status` command for project-wide progress overview
- **Web UI enhancements** -- Gantt charts, richer dependency visualization, specification editing

See the [CLI command reference](./docs/reqord-cli-commands.md) for the full list of planned commands and their current implementation status.

## Contributing

Contributions are welcome. Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

[AGPL-3.0](./LICENSE)

Reqord is licensed under the GNU Affero General Public License v3.0. You can freely use, modify, and distribute Reqord for any purpose, including commercial use. If you run a modified version as a network service, you must make the source code available to users of that service.

[Japanese version / 日本語版](./README.ja.md)
