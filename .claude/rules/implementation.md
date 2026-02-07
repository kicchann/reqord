---
paths: /never/match/folder/**
---

# Implementation Workflow

**MUST**: Follow this workflow during implementation.

## Quick Reference

- Phase 1: `/check-branch` → `/feature-dev` → `/test` → `/lint` → `/update-claude-md` → `/commit-push-pr`
- Phase 2: `/review-pr` → `/check-merge` → [Merge or Human Review]
- Phase 3: `/close-issue` → `/create-retrospective`

## Composite Commands (optional shortcuts)

- `/quick-pr` - Test + Lint + PR (automated flow batch)
- `/run-full-check` - Lint + Test + Coverage
- `/check-deploy` - Pre-deploy full check

## Phase 1: Automated Flow (up to PR creation)

1. `/check-branch` - Branch check **[Required]**
2. `/feature-dev` - Feature implementation
3. `/test` - Run tests **[Required]**
4. `/lint` - Run Linter/Formatter **[Required]**
5. `/show-coverage` - Coverage check (optional)
6. `/update-claude-md` - CLAUDE.md update proposal **[Required]**
7. `/commit-push-pr` - Commit, push, and create PR

## Phase 2: Human-in-the-loop (post-PR checks)

8. `/review-pr` - Run code review (prompts for `/check-merge`)
9. `/check-merge` - Final check → Choose: Merge or Human Review

## Phase 3: Post-merge

12. `/close-issue #N` - Close related issue
13. `/create-retrospective` - Create retrospective memo (optional)

## On Conflict

`/resolve-conflicts` → Resolve → `/test` → push

## Workflow Exceptions

**Can be skipped when:**

- `/test`, `/lint`: No Python code to test
- `/show-coverage`: Minor changes
- Emergency hotfixes, typo fixes, documentation-only updates

**In all cases, `/update-claude-md` and `/commit-push-pr` are required.**

## Markdown-only Changes

Execute Phase 1 only (`/test`, `/lint`, `/show-coverage` can be skipped). Phase 2-3 remain the same.

## Error Handling Policy

- `/test` error: Must pass tests before proceeding to next step
- `/lint` error: Must fix before proceeding to next step
- Committing with errors is prohibited

See `.claude/rules/workflow-analysis.md` for full command list.
