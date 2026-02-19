---
target audience: Teams practicing AI-driven development (developers, tech leads)
prerequisites: Basic Reqord concepts (02-purpose.md recommended)
related documents: .reqord/context/domain/ai-integration.md, docs/integrations/claude-code-plugin.md
---

> **Summary of this document**: How to leverage Reqord in AI-driven development. Covers "why structured data is effective for AI" and practical patterns by tool.

# AI Integration — Leveraging Reqord in AI-Driven Development

> [日本語](./06-ai-integration.ja.md)

## Why the Combination of Reqord and AI Is Effective

Reqord's core value holds even without AI (see [01-philosophy.md](./01-philosophy.md) through [05-donts.md](./05-donts.md)).
Structuring, approval workflows, and traceability are valuable for human teams alone.

In the AI era, these provide **additional** value:

1. **Structured data → Clear input for AI**
   - Instead of ambiguous natural language, you can pass typed JSON + Markdown
   - EARS-format requirements are easy for AI to interpret (triggers, conditions, and actions are explicit)

2. **ProjectContext → Consistency across sessions**
   - Even when an AI session ends, context can be restored via product.yaml / technical.yaml / domain/\*.md
   - Eliminates the "starting from scratch explaining the project every time" problem

3. **Visualization → Human situational awareness**
   - In environments where AI generates code rapidly, it's easy to lose track of "what's being built"
   - Reqord's dashboard and dependency graphs support human oversight

**The core idea**: Prevent code implementation from racing ahead, and ensure humans can always understand — through Reqord — "what has been decided, what has been implemented, and what remains."

## Reqord's AI-Assisted Phases

Reqord leverages AI across four phases (details: [.reqord/context/domain/ai-integration.md](../../.reqord/context/domain/ai-integration.md)).

### 1. Requirement Enhancement

AI generates detailed requirement definitions from the user's brief title and description.

- Conversion to EARS format / User Story format
- Definition of Success Criteria
- Complexity estimation and dependency inference
- Quality score improvement through SMART validation

### 2. Gap Analysis

AI analyzes the gap between the existing codebase and new requirements.

- Coverage evaluation of existing implementations (full / partial / no coverage)
- Identification of missing features
- Conflict detection (API changes, data model inconsistencies, etc.)

### 3. Specification Design

AI generates a technical design document from requirements and ProjectContext.

- Architecture diagrams (Mermaid format)
- Component design and interface definitions
- Documentation of technical decisions (Rationale, Alternatives, Tradeoffs)

### 4. Task Decomposition

AI breaks specifications down into implementation tasks.

- Decomposition strategies by layer / feature / requirement
- Parallel execution analysis (Parallel Group: P0, P1, P2)
- Critical path identification
- Application of GitHub Issue templates

## ProjectContext: The Key to AI Input Quality

AI output quality is directly tied to input quality. In Reqord, **ProjectContext** determines that input quality.

### Configuration Files and Priority

| Priority        | File             | Role                                                  |
| --------------- | ---------------- | ----------------------------------------------------- |
| 1 (Required)    | `context.json`   | Project metadata (name, version, etc.)                |
| 2 (Required)    | `product.yaml`   | Vision, challenges, target users                      |
| 3 (Required)    | `technical.yaml` | Tech stack, design principles, architecture           |
| 4 (Recommended) | `structure.yaml` | Naming conventions, directory structure, architecture rules |
| 5 (As needed)   | `domain/*.md`    | Domain-specific knowledge (AI integration, approval workflows, etc.) |

### The "Poor ProjectContext → Poor AI Output" Principle

- **No context**: AI produces generic, off-target output (misuses domain terminology, suggests incompatible tech stacks)
- **Minimum (product.yaml + technical.yaml)**: Output quality improves significantly
- **Rich (all files + domain/\*.md)**: Accurate, project-specific output is achieved

Maintaining ProjectContext is valuable even without AI (team knowledge sharing, onboarding). AI utilization is a natural extension of that.

## Usage Patterns by Tool

### Claude Code

Has the highest affinity with Reqord. CLI-to-CLI integration enables seamless collaboration.

**Specification design generation flow (`/reqord:design`):**

1. Select the target requirement
2. Automatically load ProjectContext
3. AI generates a technical design document (design.md)
4. Human reviews, modifies → approves

**Requirement quality improvement flow (`/reqord:refine`):**

1. Select requirements with low SMART scores
2. AI presents suggestions for concretization and improvement
3. Detects vague expressions and replaces them with numbers and conditions

**Automatic ProjectContext utilization:**

- At the start of a Claude Code session, `.reqord/context/` is provided as context
- domain/\*.md functions like Rules, constraining AI output

### Cursor / Windsurf (IDE-Integrated)

By including `.reqord/` in the workspace, the IDE's AI features can reference requirements and specifications.

**Reference pattern during implementation:**

- Instruct: "Implement based on the specification for this requirement (req-000042)"
- AI references the contents of `.reqord/requirements/req-000042/` for implementation
- Converts success criteria into test cases

**ProjectContext utilization:**

- Set `domain/*.md` as Cursor Rules / Windsurf Rules
- Tech stack and naming conventions are reflected in AI-generated implementations

### Codex / Other CLI Agents

By piping CLI output, you can integrate with any AI agent.

```bash
# Pass requirement content to AI
reqord req show req-000042 | codex "Suggest an implementation approach for this requirement"

# Reference spec for task decomposition
reqord spec show req-000042 | codex "Break this specification into GitHub Issues"
```

You can build a flow where task decomposition results are registered as GitHub Issues, driving implementation in an Issue-driven manner.

## Human-in-the-Loop: Boundaries of What to Delegate to AI

### What AI can handle

- **Structuring**: Converting natural language → EARS/User Story format
- **Detailing**: Generating success criteria and complexity estimates from title + summary
- **Consistency checking**: Detecting contradictions between requirements, inferring dependencies
- **Task decomposition**: Converting specifications → GitHub Issues

### What humans should decide

- **Priority**: Prioritization based on business judgment
- **Scope**: Deciding what to include and what to exclude
- **Approval**: Final approval of requirements and specifications (PR merge)
- **Security**: Design decisions regarding authentication, payments, and personal data

Reqord's PR-based approval workflow functions as a quality gate for AI output. Even requirements and specifications generated by AI are only finalized after human review → approval.

## Gradual Adoption

You don't need to adopt everything at once.

### Step 1: Set Up ProjectContext

Valuable even without AI. Structure and share team knowledge.

```bash
reqord init
# Write product.yaml, technical.yaml
```

### Step 2: Try AI Enhancement with enhance / refine

Improve existing requirements with AI and experience the benefits.

```bash
reqord req create  # Write the skeleton first
reqord req enhance req-000001  # AI details it
```

### Step 3: Use AI for Specification Design and Task Decomposition

Once requirements are well-developed, let AI assist with specification design and Issue generation.

### Step 4: Full Flow

Requirement creation → AI enhancement → Specification design → Task decomposition → Issue generation → Implementation → Feedback.
Humans make judgments and approvals at each phase, while AI handles structuring and detailing.

---

**Back to start**: [index.md](./index.md) — Document list and navigation
