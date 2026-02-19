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
| `/reqord:design` | Create specification design document (design.md) |
| `/reqord:dev` | TDD feature development based on design.md |
| `/reqord:git` | spec-id based Git operations (branch, commit, PR) |
| `/reqord:verify` | Implementation verification, traceability check, and completion |
| `/reqord:feedback` | Feedback operations (sync, classify, link, close) |
| `/reqord:refine` | Requirement refinement (improve SMART quality score) |

### Typical Workflow

```
/reqord:setup              # First time: environment check
/reqord:status             # Check progress, identify next task
/reqord:design <spec-id>   # Create design document
/reqord:dev <spec-id>      # TDD implementation
/reqord:git commit <spec-id>  # Commit (with traceability)
/reqord:verify validate <spec-id>  # Verify implementation
```

## Agents

The plugin provides four specialized agents. They are automatically invoked from skills, but can also be used directly via the Task tool.

| Agent | Role | Primary Use |
|-------|------|-------------|
| `reqord-explorer` | Code investigation | Cross-referencing design.md with code, analyzing implementation status |
| `reqord-architect` | Design | Design decisions based on ProjectContext and requirements |
| `reqord-implementer` | TDD implementation | Implementation following the test strategy in design.md |
| `reqord-reviewer` | Code review | Checking success criteria coverage and consistency with design.md |

## Support Skills (Knowledge Base)

Domain knowledge that agents reference automatically. These are not invoked directly.

- `context` -- Common knowledge of Reqord data models, CLI patterns, and development workflows
- `architecture-principles` -- Clean Architecture, dependency inversion, layer separation
- `tdd-principles` -- Four Pillars of Good Tests, Classical vs London school
- `review-standards` -- Test quality verification, architecture compliance checklist

## Prerequisites

- The project must have an initialized `.reqord/` directory (`reqord init`)
- GitHub CLI (`gh`) must be authenticated (required for feedback/approve/issue commands)

For details, see [plugins/reqord/README.md](../../plugins/reqord/README.md).
