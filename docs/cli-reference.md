# Reqord CLI Command Reference

> [日本語](./cli-reference.ja.md)

A list of commands provided (or planned) by the reqord CLI.

> 🔴 **Not implemented** = Command code does not yet exist

## init

```bash
reqord init
```

Initializes the `.reqord/` directory structure. Creates `context/`, `requirements/`, `specifications/`, and `settings/templates/`.

## context (Project Context)

| Command | Description | Status |
|---------|-------------|--------|
| `reqord context init` | Initialize project context (name, language settings) | Implemented |
| `reqord context show` | Display project context summary | Implemented |
| `reqord context update` | Update context metadata (name, version, YAML patch) | Implemented |
| `reqord context export <req-id>` | Export consolidated context related to a requirement (markdown/YAML) | Not implemented |

- Storage: `.reqord/context/`
- Managed files: product.yaml, technical.yaml, structure.yaml

### context export (Not implemented)

**Source**: req-000020 "Context consolidated export" (approved)

Combines ProjectContext + Requirement + Specification and outputs a consolidated view for external tools.

- `--full` / `--compact` to control output volume
- `--format markdown` / `--format json` to select output format
- Designed for piping to external tools

## req (Requirements Management)

| Command | Description | Status |
|---------|-------------|--------|
| `reqord req create` | Create a new requirement (user-story / ears / free-form format) | Implemented |
| `reqord req list` | List requirements (supports priority and status filters) | Implemented |
| `reqord req show <id>` | Show requirement details (supports JSON output) | Implemented |
| `reqord req update <id>` | Update requirement metadata (title, status, priority, --major/--minor/--patch) | Implemented |
| `reqord req delete <id>` | Delete a requirement (with confirmation prompt) | Implemented |
| `reqord req validate <id>` | Validate requirement quality with SMART scoring | Implemented |
| `reqord req history <id>` | Show requirement version history | Implemented |
| `reqord req approve <id>` | Create an approval PR for the requirement (GitHub PR integration) | Implemented |

- Requirement ID format: `req-NNNNNN` (6-digit zero-padded)
- Storage: `.reqord/requirements/`
- File format: YAML (`req-NNNNNN.yaml`)

### req history

**Source**: req-000005 "Requirement version management" (approved)

Displays the version history of a requirement in table format. Shows version number, status, date, and summary.

- `--json` flag for JSON output
- `reqord req update` supports version override with `--major` / `--minor` / `--patch` flags

### req approve

**Source**: req-000011 "Requirement approval flow (GitHub PR integration)" (implemented)

Creates a GitHub PR for requirement approval.

- Changes status to `pending_approval`, transitions to `approved` on merge
- Creates a `reqord/req-<id>-approve-v<version>` branch
- Automatically assigns reviewers from CODEOWNERS
- Records approval metadata (version, phase, prNumber, approvedBy, approvedAt)

## spec (Specification Management)

| Command | Description | Status |
|---------|-------------|--------|
| `reqord spec create <req-id>` | Create a new specification for a given requirement | Implemented |
| `reqord spec list` | List specifications (supports status and requirement ID filters) | Implemented |
| `reqord spec show <id>` | Show specification details (supports JSON output) | Implemented |
| `reqord spec design <id>` | View or update the specification's design document | Implemented |
| `reqord spec approve <id>` | Create an approval PR for the specification (GitHub PR integration) | Implemented |
| `reqord spec validate <id>` | Validate specification design (architecture consistency, naming conventions) | Not implemented |
| `reqord spec coverage <id>` | Show requirement coverage status | Not implemented |

- Storage: `.reqord/specifications/`
- File format: YAML (`spec-NNNNNN.yaml`)

### spec approve

**Source**: req-000015 "Specification approval flow" (implemented)

Creates a GitHub PR for specification approval.

- Pre-validates that the parent Requirement is `approved`
- Creates a `reqord/spec-<id>-approve-v<version>` branch
- Automatically assigns reviewers from CODEOWNERS

### spec validate (Not implemented)

**Source**: req-000014 "Design validation and requirement coverage" (draft)

Validates specification architecture consistency and naming conventions.

- Saves validation results as `designValidation` in the Specification YAML
- `--json` output supported

### spec coverage (Not implemented)

**Source**: req-000014 "Design validation and requirement coverage" (draft)

Shows which sections of a Specification cover each success criterion of the requirement.

## feedback (Feedback Management)

| Command | Description | Status |
|---------|-------------|--------|
| `reqord feedback list` | List feedback (supports state and type filters) | Implemented |
| `reqord feedback show <id>` | Show feedback details (GitHub issue + index.yaml) | Implemented |
| `reqord feedback close <id>` | Close feedback (syncs with GitHub issue) | Implemented |
| `reqord feedback link <id>` | Link feedback to requirements/specifications (with type and severity) | Implemented |
| `reqord feedback sync` | Bidirectional sync between GitHub issues and index.yaml | Implemented |

- Storage: `.reqord/feedback/index.yaml`
- GitHub integration: Syncs with issues labeled `feedback`

## issue (GitHub Issue Generation and Management)

**Source**: req-000016 "GitHub Issue generation and management" (implemented)

| Command | Description | Status |
|---------|-------------|--------|
| `reqord issue create <spec-id>` | Bulk-create GitHub Issues from structured task files | Implemented |
| `reqord issue sync <spec-id>` | Sync Issue status to Specification YAML | Implemented |
| `reqord issue sync-all` | Sync Issue status for all Specifications | Implemented |
| `reqord issue validate <spec-id>` | Check Issue metadata consistency | Implemented |
| `reqord issue fetch <spec-id>` | Fetch GitHub Issue information | Implemented |

- `--tasks-file <path>` to specify the task definition file
- Embeds Reqord metadata as labels and comments
- `--dry-run` / `--json` options supported

## impact (Impact Analysis) -- Not implemented

**Source**: req-000012 "Impact analysis" (draft)

| Command | Description | Status |
|---------|-------------|--------|
| `reqord impact analyze <id>` | Show impact scope of a requirement change (Specification, Issue, Requirement) | Not implemented |
| `reqord impact notify <id>` | Notify stakeholders in the impact scope (Issue/PR comments) | Not implemented |

- Automatically computes the `impact` field when a requirement is updated
- `--dry-run` / `--json` options supported

## validate (Implementation Verification) -- Not implemented

**Source**: req-000018 "Implementation verification" (draft)

| Command | Description | Status |
|---------|-------------|--------|
| `reqord validate impl <spec-id>` | Verify implementation completeness against a specification | Not implemented |

- Checks Issue completion status
- Confirms component file existence
- Verifies test coverage
- `--json` / `--strict` options supported

## status (Status Display) -- Not implemented

**Source**: req-000019 "Status display command" (approved)

| Command | Description | Status |
|---------|-------------|--------|
| `reqord status` | Show project-wide dashboard | Not implemented |
| `reqord status <req-id>` | Show status per Requirement | Not implemented |
| `reqord status <spec-id>` | Show status per Specification | Not implemented |

- Progress bars and metrics display
- Warns about status inconsistencies between Requirements and Specifications
- `--json` / `--quiet` / `--check` options supported

## ui (Web UI)

**Source**: req-000022 "Web UI extensions (Dashboard, Dependency Graph, Gantt Chart)" (approved)

| Command | Description | Status |
|---------|-------------|--------|
| `reqord ui` | Start the Web UI development server (localhost:3000) | Implemented |

- Dashboard (project health metrics)
- Interactive dependency graph (Mermaid.js)
- Gantt Chart (Recharts)
- Specification detail view (Research/Design/Coverage/Issues/History tabs)

## migrate-to-yaml (Data Format Migration Utility)

```bash
reqord migrate-to-yaml
```

A utility command that bulk-converts JSON data files under `.reqord/` to YAML format. Used for the JSON-to-YAML migration performed in req-000027.
