# Claude Code Plugin

> [日本語](./claude-code-plugin.ja.md)

Reqord provides a plugin for Claude Code. It enables consistent design, TDD implementation, code review, and Git operations while maintaining traceability from requirements to specifications, implementation, and verification.

## Installation

```bash
claude plugin install kicchann/reqord
```

To load directly from a local directory:

```bash
claude --plugin-dir ./plugins/reqord
```

## Skills (Slash Commands)

| Command | Description |
|---------|-------------|
| `/reqord:setup` | Environment setup and prerequisite checks |
| `/reqord:status` | Requirements and specification progress dashboard |
| `/reqord:new` | Create new requirements and specifications |
| `/reqord:edit` | Edit and improve requirements, specifications, and context |
| `/reqord:brief` | Comprehensive context display for spec/req/issue |
| `/reqord:verify` | Implementation verification, traceability check, and completion |
| `/reqord:feedback` | Feedback operations (sync, classify, link, close) |

### Typical Workflow

```
/reqord:setup              # First time: environment check
/reqord:status             # Check progress, identify next task
/reqord:edit <spec-id>     # Create/edit design document
/reqord:brief <spec-id>    # View comprehensive context (incl. Git conventions)
/reqord:verify validate <spec-id>  # Verify implementation
```

## Agents

The plugin provides three specialized agents. They are automatically invoked from skills, but can also be used directly via the Task tool.

| Agent | Role | Primary Use |
|-------|------|-------------|
| `reqord-explorer` | Code investigation | Cross-referencing design.md with code, analyzing implementation status |
| `reqord-architect` | Design | Design decisions based on ProjectContext and requirements |
| `reqord-reviewer` | Code review | Checking success criteria coverage and consistency with design.md |

## Support Skills (Knowledge Base)

Domain knowledge that agents reference automatically. These are not invoked directly.

- `context` -- Common knowledge of Reqord data models, CLI patterns, and development workflows

## Prerequisites

- The project must have an initialized `.reqord/` directory (`reqord init`)
- GitHub CLI (`gh`) must be authenticated (required for feedback/approve/issue commands)

For details, see [plugins/reqord/README.md](../../plugins/reqord/README.md).
