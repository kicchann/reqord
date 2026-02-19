---
audience: Developers, tech leads, AI agents
prerequisites: Basic understanding of software development
related: docs/guide-requirements.md, .reqord/context/domain/requirements-engineering.md
---

> **Summary**: The requirements engineering methods adopted by Reqord and the rationale behind each choice. Introduces each concept and explains "why Reqord chose this."

# Theory — Adopted Methods and Rationale

> [日本語](./03-theory.ja.md)

Each topic follows the structure: "Concept -> Why Reqord chose this -> Further reading."

## Separation of Requirements and Specifications

### Concept

- **Requirement**: What to build (What) — from the user's or business perspective
- **Specification**: How to build it (How) — technical design and implementation approach

### Why Reqord Chose This

Explicitly separating requirements from specifications provides:

- **Clear role boundaries**: POs/business stakeholders focus on requirements, engineers focus on specifications
- **Localized changes**: Even if the tech stack changes, requirements remain the same. Conversely, changes in business requirements prompt specification redesign
- **Efficient reviews**: Requirement reviews (validity of What) and specification reviews (validity of How) can be conducted separately

Reqord further adds **GitHub Issues** (implementation tasks) as a third layer, forming a 3-layer model:

```
Requirement (What) → Specification (How) → GitHub Issue (Task)
     req-NNNNNN            spec-NNNNNN           #123, #124, #125
```

Each layer is linked by ID, enabling traceability.

## EARS Format

### Concept

EARS (Easy Approach to Requirements Syntax) provides five patterns that add structure to natural language requirements:

| Pattern | Template | Use Case |
|---------|----------|----------|
| **Ubiquitous** | The system shall [action] | Behavior that always holds |
| **Event-driven** | When [trigger], the system shall [action] | Behavior triggered by events |
| **State-driven** | While [state], the system shall [action] | State-dependent behavior |
| **Optional** | Where [feature enabled], the system shall [action] | Optional features |
| **Unwanted** | If [condition], then the system shall [action] | Error handling / abnormal cases |

### Why Reqord Chose This

- **Eliminates ambiguity**: Following patterns makes "when," "what," and "what happens" explicit
- **Low learning curve**: Five patterns cover the majority of system requirements
- **Machine-readable**: The structured format is well-suited for tool and AI analysis

**Note**: In Reqord's schema, `ears.type` is designed to accept free-form strings. The five patterns are recommended, but the design allows flexibility for project-specific patterns.

> Details: [.reqord/context/domain/requirements-engineering.md](../../.reqord/context/domain/requirements-engineering.md)

## User Story Format

### Concept

```
As [role], I want [action], so that [benefit]
```

A format that describes features from the user's perspective. Three elements clarify "who," "what," and "why."

### Choosing Between EARS and User Story

| Aspect | User Story | EARS |
|--------|-----------|------|
| Perspective | User | System |
| Best for | User-facing features | System behavior / non-functional requirements |
| Examples | Login, search, purchase | Validation, error handling, performance |

When in doubt:
- Features directly operated by users -> **User Story**
- Internal system behavior / constraints -> **EARS**
- Research / technical investigation -> **Free-form**

## SMART Criteria

### Concept

A set of criteria that evaluates requirement quality across five dimensions:

| Criterion | Meaning | Good Example | Bad Example |
|-----------|---------|-------------|-------------|
| **S**pecific | Clear and unambiguous | "Response time under 3 seconds" | "Fast" |
| **M**easurable | Can be measured/verified | "Coverage of 80% or higher" | "Sufficiently tested" |
| **A**chievable | Technically feasible | Achievable with current stack | Unrealistic demands |
| **R**elevant | Aligned with product vision | Related to core features | Out of scope |
| **T**ime-bound | Effort can be estimated | complexity: medium, 8-24h | No estimate |

### Why Reqord Chose This

- **Rule-based (no AI required)**: Can be evaluated instantly and offline
- **Objective evaluation**: Minimizes variation between reviewers
- **Incremental improvement**: Identifies low-scoring areas for targeted improvement

Scoring mechanism: Comprehensively evaluates title completeness, description length, specificity and count of success criteria, absence of ambiguous language, presence of effort estimates, and more.

> Details: [packages/shared/src/validation/smart-scoring.ts](../../packages/shared/src/validation/smart-scoring.ts)

## Traceability

### Concept

The ability to trace from one artifact to related artifacts.

### Traceability Chain in Reqord

```
Requirement (req-NNNNNN)
    ↓ requirementId
Specification (spec-NNNNNN)
    ↓ linkedIssues
GitHub Issue (#NNN)
    ↓ commit/PR
Code
```

- Upstream (why was it built): Issue -> Spec -> Requirement traces "which requirement did this feature originate from"
- Downstream (what does it affect): Requirement -> Spec -> Issue identifies "what is impacted if this requirement changes"

This forms the foundation for change impact analysis.

## Approval Workflow

### Concept

A review process to ensure requirement quality and consensus.

### Reqord's Status Lifecycle

```
draft → pending_approval → approved → implemented → deprecated
```

| Status | Meaning | Trigger |
|--------|---------|---------|
| draft | Being created/edited | Initial state |
| pending_approval | Awaiting review | PR created via `reqord req approve` |
| approved | Approved, ready for implementation | PR merged |
| implemented | Implementation complete | When implementation finishes |
| deprecated | Retired | When the requirement is no longer needed |

### Why PR-based?

- **Leverages existing habits**: Applies the same workflow as code review to requirement review
- **CODEOWNERS**: Automatically assigns reviewers
- **Visible diffs**: JSON/Markdown diffs are clearly visible
- **Approval records**: PR merge history serves as evidence of approval

## Dependency Model

### Concept

Explicitly defines relationships between requirements.

### Reqord's Two Types of Dependencies

| Type | Meaning | Example |
|------|---------|---------|
| **blockedBy / blocks** | Ordering constraint (affects implementation order) | "Authentication" must be completed before "User Profile" can be implemented |
| **relatedTo** | Logical grouping (implementation order is flexible) | "Search" and "Filter" are related but can be implemented independently |

### Design Principles

- **Circular dependencies are prohibited**: Loops like A->B->C->A should be avoided by design
- **Keep dependency chains shallow**: Deep chains hinder parallel implementation
- **Bidirectional links**: When setting blockedBy, also set blocks on the other side

> Details: [docs/guide-requirements.md](../guide-requirements.md)

---

**Next**: [04-best-practices.md](./04-best-practices.md) — Patterns for effective usage
