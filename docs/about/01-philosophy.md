---
audience: Developers, tech leads, AI agents
prerequisites: Basic understanding of software development
related: docs/advanced/specification.md
---

> **Summary**: The problems Reqord solves and its 5 design principles. A document for understanding "why this tool exists."

# Philosophy — Why Reqord Exists

> [日本語](./01-philosophy.ja.md)

## Problems We Solve

### Scattered Requirements

In software development, information about "what to build" tends to become fragmented:

- Requirements buried in chat histories
- Specification fragments written in note-taking apps
- No record of verbally agreed-upon features
- Additional requirements scattered across issue bodies and comments

The result: repeated discussions and contradictory specifications.

### Loss of Context

Project context is continuously lost:

- New team members and tools cannot understand the project's background
- Design decisions agreed upon in past sessions are not carried forward
- No documentation that can answer "why is this API designed this way?"

### Spec Drift

Specifications created once are not maintained after implementation:

- Implementation diverges from specifications without anyone noticing
- Six months later, "is this spec still valid?" becomes unanswerable
- When adding the next feature, the underlying specifications are outdated

### Broken Traceability

"Why did we build this feature?" cannot be traced:

- The link between requirements -> specifications -> code is unclear
- The impact scope of changes is invisible, leading to unexpected breakage
- The rationale behind past decisions is lost

## 5 Design Principles

### 1. Structure First

Manage requirements as structured data, not plain text.

- **YAML (metadata) + Markdown (content)** hybrid format
- YAML: Status, priority, dependencies, version history — parts suited for machine processing
- Markdown: Descriptions, success criteria, background — parts easy for humans to read and write
- **Zod schemas** ensure type safety, sharing the same validation across CLI and Web UI

### 2. Local-First

The Git repository is the Single Source of Truth (SSoT).

- All data is stored in the `.reqord/` directory
- No SaaS or backend server required
- Works completely offline
- `git clone` alone reproduces the entire project context

### 3. Machine-Readable

Structured data is easy to work with not only for humans but also for tools.

- The YAML + Markdown hybrid format is easy to parse and transform programmatically
- The CLI guarantees structure, providing a consistent interface for integration with external tools
- ProjectContext allows structured accumulation and reference of project-wide context

This design also serves as a foundation for AI agents to accurately interpret requirements.

### 4. Human-in-the-loop

Appropriately separate automation/tool support from human judgment.

- Requirement approval: PR-based review -> Approve by CODEOWNERS -> Finalized on merge
- Specification approval: Same PR-based flow
- Tool output review: Auto-generated content must always be reviewed by humans before applying
- **Security-related** items (authentication, payments, personal data) always require human review

### 5. Living Documentation

Requirements are not disposable — they are "living documents."

- **Version control**: Track approval history (version, gitCommit, approvedBy, approvedAt)
- **Status lifecycle**: draft -> pending_approval -> approved -> implemented -> deprecated
- **Feedback loop**: Post-implementation feedback feeds back into requirement and specification updates
- **Impact analysis**: Understand the ripple effect of changes through a dependency graph

## What Reqord is NOT

Clarifying Reqord's positioning.

### Not a Spec-Driven Development Tool

Different from code generation tools like spec-kit or kiro:

- Reqord specializes in **requirements lifecycle management**
- Code generation is out of scope
- The output is GitHub Issues (implementation tasks), not code

### Not a Jira/Asana Replacement

It does not cover project management in general:

- Sprint planning, resource management, Gantt charts, etc. are out of scope
- It focuses on a single domain: requirements management
- Designed to be **used alongside** existing project management tools

### Not an IDE Extension

It does not depend on a specific editor:

- An independent CLI + Web UI tool
- Usable from any editor/IDE/terminal

### The Essence of Reqord

**Requirements lifecycle management** — continuously running the cycle of creation -> approval -> implementation tracking -> feedback -> updates.

## Why Git as the Foundation

Reqord deliberately chose Git as its foundation:

- **Complete change tracking**: Trace the history of requirement changes with `git log`
- **PR-based review and approval**: Review requirements using the same workflow as code reviews
- **Branching strategy**: Safely work on requirement changes in feature branches
- **CI/CD compatibility**: Automate requirement validation with GitHub Actions
- **Access control**: Leverage existing repository permission management

By managing code and requirements in the same repository with the same workflow, traceability is naturally achieved.

---

**Next**: [02-purpose.md](./02-purpose.md) — What it achieves and for whom
