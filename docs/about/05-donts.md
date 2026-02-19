---
target audience: Developers, tech leads, AI agents
prerequisites: Basic Reqord concepts (02-purpose.md recommended)
related documents: docs/guide-requirements.md, docs/guide-feedback.md
---

> **Summary of this document**: Anti-patterns and how to avoid them when using Reqord. Each pattern follows a "Symptoms → Why it's a problem → What to do instead" structure. Can also be used as a checklist.

# Don'ts — Anti-Patterns to Avoid

> [日本語](./05-donts.ja.md)

## Requirement Definition Anti-Patterns

### God Requirement

**Symptoms**: Multiple features crammed into a single requirement. Estimated effort exceeds 40 hours. More than 10 success criteria.

**Why it's a problem**:

- High review burden, causing approval bottlenecks
- Specifications become overly complex, making Issue decomposition difficult
- Impossible to determine partial completion

**What to do instead**:

- 1 requirement = 1 feature / 1 behavior
- Consider splitting if effort exceeds 40 hours
- Use this test: "Can I describe this requirement in one sentence?"

---

### Vague Requirements

**Symptoms**: Expressions like "handle appropriately," "respond quickly," or "make the UI user-friendly."

**Why it's a problem**:

- Different people interpret them differently
- Success criteria cannot be defined → untestable
- Reduces accuracy of automated processing (specification design, validation, etc.)

**What to do instead**:

- Use explicit numbers and conditions: "Respond within 3 seconds," "Limit input fields to 3 or fewer"
- Run SMART validation and improve requirements with low Specific scores

**Expressions to especially avoid**:

| Category              | Examples                                                                   |
| --------------------- | -------------------------------------------------------------------------- |
| Degree ambiguity      | appropriately, as much as possible, if possible, as needed                 |
| Quality ambiguity     | fast, efficient, flexible, easy, user-friendly, intuitive                  |
| Relative expressions  | many, few, large, small, good, bad                                         |
| Catch-all expressions | etc., and so on, other, to some extent, sufficiently                       |

> These expressions are automatically detected by SMART validation. Details: [packages/shared/src/validation/ambiguous-phrases.ts](../../packages/shared/src/validation/ambiguous-phrases.ts)

---

### Implementation Details Leaking into Requirements

**Symptoms**: Requirements contain technology choices such as "Implement with React," "Store in PostgreSQL," or "Provide via REST API."

**Why it's a problem**:

- The boundary between requirements (What) and specifications (How) becomes blurred
- Changes to the tech stack require modifying requirements as well
- Inhibits consideration of alternatives

**What to do instead**:

- Write only "what you want to achieve" in requirements
- Make technology choices in Specifications
- Example: Bad: "Manage sessions with JWT" → Good: "Users can maintain their login state"

---

### Neglecting Dependency Management

**Symptoms**: Only blockedBy is set without blocks. relatedTo is never used.

**Why it's a problem**:

- One-directional links make impact analysis incomplete
- Changes to related requirements get overlooked
- Dependency graphs become inaccurate

**What to do instead**:

- When setting blockedBy, always set blocks on the other side as well
- Use relatedTo for requirements that are related but can be implemented independently
- Periodically review the dependency graph

---

### Circular Dependencies

**Symptoms**: Requirement dependencies form a loop like A → B → C → A.

**Why it's a problem**:

- Cannot determine where to start implementation
- Impact analysis falls into infinite loops

**What to do instead**:

- Analyze the root cause of the cycle and reorganize dependency directions
- Split requirements as needed to break the cycle
- Extract common parts into separate requirements

## Workflow Anti-Patterns

### Skipping Approval

**Symptoms**: Starting implementation while still in draft. Moving directly to implemented without going through pending_approval.

**Why it's a problem**:

- Implementation based on unreviewed requirements has high rework risk
- No approval record remains, compromising traceability
- Implementation proceeds without team consensus

**What to do instead**:

- Always follow the draft → pending_approval → approved flow
- Even in urgent cases, perform a brief review + approval
- Treat pre-approval implementation as a "prototype," then do the real implementation after approval

---

### Over-Structuring

**Symptoms**: Trying to fully structure bug reports or minor improvement requests from the start.

**Why it's a problem**:

- Structuring at a stage when information is insufficient tends to be wasteful
- Delays the initial response to feedback
- The overhead of structuring pushes the actual discussion and investigation to the back burner

**What to do instead**:

- First, report and discuss simply via GitHub Issues
- Only bring it into Reqord once investigation has progressed and structuring would be beneficial
- Three stages of feedback: Simple report → Investigation & discussion → Structuring (only when necessary)

> Details: [docs/guide-feedback.md](../guide-feedback.md)

---

### Using AI Without Sufficient Context

**Symptoms**: Running AI enhance/refine when ProjectContext is empty or nearly empty.

**Why it's a problem**:

- AI cannot understand the project context, resulting in generic and off-target output
- Domain terminology is not used correctly
- Suggestions incompatible with the tech stack are generated

**What to do instead**:

- Before using AI, populate the 4 editable ProjectContext files (`context.json` is auto-managed by the tool)
  - `product.yaml` — Vision, challenges, target users
  - `technical.yaml` — Tech stack, architecture
  - `structure.yaml` — Naming conventions, directory structure
  - `domain/*.md` — Domain-specific knowledge
- Having at least product.yaml and technical.yaml significantly improves AI output quality

---

### Neglecting Version Control

**Symptoms**: Directly editing approved requirements without changing their status. Change history cannot be tracked.

**Why it's a problem**:

- If approved requirements change without notice, divergence from implementation occurs
- The scope of impact cannot be assessed
- Previous approvals become invalidated

**What to do instead**:

- Treat changes to approved requirements as a new version
- Submit changes via PR and obtain re-approval
- Track change history with versionHistory

## AI Usage Anti-Patterns

### Uncritical Acceptance of AI Output

**Symptoms**: Approving enhance or refine results without review.

**Why it's a problem**:

- AI may generate inaccurate content due to insufficient domain knowledge or misunderstanding of context
- AI cannot capture subtle nuances of business rules
- Risk of overlooking security requirements

**What to do instead**:

- Treat AI output as a "draft" and always have a human review it
- Key points to verify:
  - Accuracy of domain terminology
  - Consistency with business rules
  - Security and privacy considerations
  - Verifiability of success criteria

---

### Delegating Everything to AI

**Symptoms**: Having AI execute everything from requirement definition to Issue generation without human judgment.

**Why it's a problem**:

- Requirement priority and scope are business decisions that AI alone cannot make
- Domain knowledge resides with humans
- Accountability becomes unclear

**What to do instead**:

- Use AI as a **support tool**
- Humans should handle decision points (priority, scope, approval)
- AI's role: Structuring, detailing, consistency checking, task decomposition
- Human's role: Setting direction, providing domain knowledge, making final decisions

---

### Feeding AI Unstructured Input

**Symptoms**: Writing vague free-form text and asking AI to enhance it.

**Why it's a problem**:

- Vague input leads to vague output (Garbage In, Garbage Out)
- AI guesses and fills in the intent, easily diverging from the original intention
- High cost of corrections afterward

**What to do instead**:

- First, have a human write the skeleton using a User Story or EARS template
- Then ask AI to detail (enhance) it
- Templates: `As [role], I want [action], so that [benefit]` or `When [trigger], the system shall [action]`

## Data Management Anti-Patterns

### Adding .reqord/ to .gitignore

**Symptoms**: `.reqord/` is added to `.gitignore`.

**Why it's a problem**:

- Traceability is completely lost
- Team members cannot access requirements
- PR-based approval workflow stops functioning
- Change tracking via Git history becomes impossible

**What to do instead**:

- Keep `.reqord/` under Git version control (this is Reqord's fundamental design)
- Only add personal settings within `.reqord/settings/` to `.gitignore`

---

### Bypassing Validation by Manually Editing JSON

**Symptoms**: Directly editing `.reqord/requirements/req-*.json` with a text editor.

**Why it's a problem**:

- Zod schema validation is bypassed
- Missing required fields and type mismatches occur
- Status transition rules may not be enforced

**What to do instead**:

- Operate through CLI commands (`reqord req create`, `reqord req update`, etc.)
- If an operation not supported by the CLI is needed, run `reqord validate` after making changes

---

## Checklist

Final checks when creating requirements:

- [ ] Is each requirement scoped to 1 feature / 1 behavior?
- [ ] Does it avoid vague expressions (appropriately, quickly, etc.)?
- [ ] Are there 3–7 success criteria, and are they verifiable?
- [ ] Are implementation details (technology choices) absent from the requirement?
- [ ] Are dependencies set bidirectionally?
- [ ] Has SMART validation been run?
- [ ] Have effort estimates (complexity + hours) been set?

Workflow checks:

- [ ] Has the approval flow (draft → pending_approval → approved) been followed?
- [ ] Has a human reviewed AI output?
- [ ] Is ProjectContext well-populated (at minimum product.yaml + technical.yaml)?
- [ ] Is `.reqord/` under Git version control?

---

**Next**: [06-ai-integration.md](./06-ai-integration.md) — Leveraging Reqord in AI-Driven Development
