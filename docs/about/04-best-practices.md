---
audience: Developers, tech leads, AI agents
prerequisites: Basic Reqord concepts (02-purpose.md recommended)
related: docs/guide-requirements.md, docs/guide-feedback.md, .reqord/context/domain/ai-integration.md
---

> **Summary**: Practical patterns for using Reqord effectively. Best practices for writing requirements, workflows, AI integration, and scaling.

# Best Practices — Patterns for Effective Usage

> [日本語](./04-best-practices.ja.md)

## Writing Requirements

### Granularity

**1 requirement = 1 feature / 1 behavior** as a general rule.

- Guideline: 1 requirement should produce 1-3 specifications
- Effort: 1-40 hours range (splitting is recommended for xlarge and above)
- Decision criterion: "Can you explain this requirement in one sentence?" — if not, it needs to be split

| Complexity | Effort Estimate | Characteristics |
| ---------- | --------------- | --------------- |
| small  | 1-8h     | Single component, clear path |
| medium | 8-24h    | Multiple components, design decisions involved |
| large  | 24-40h   | Impact on architecture |
| xlarge | 40h+     | Splitting recommended |

> Details: [docs/guide-requirements.md](../guide-requirements.md)

### Success Criteria

- **3-7** is the appropriate range
- **Include numbers**: "Response time under 3 seconds," "Coverage of 80% or higher"
- **Must be verifiable**: Can be confirmed by tests, or the manual verification steps are clear
- A format ending with "...can be done" or "...is confirmed" is easy to write

Good examples:

```
- Users can log in with email and password
- After 3 failed login attempts with incorrect passwords, the account is temporarily locked
- Upon successful login, a JWT token is issued with a 24-hour expiration
```

### Format Selection

| Use Case | Recommended Format |
| -------- | ------------------ |
| Features directly operated by users | User Story |
| System behavior / non-functional requirements | EARS |
| Research, technical investigation, etc. | Free-form |

When in doubt, start with User Story. Switch to EARS if system-side constraints are the focus.

### Dependencies

- **Always use bidirectional links**: When setting blockedBy, also set blocks
- **Avoid deep dependency chains**: Consider redesigning if chains exceed 3 levels
- **Use relatedTo**: Group related requirements without direct ordering constraints using relatedTo

## Workflow Patterns

### New Projects

```
1. reqord init           — Initialize the .reqord/ directory
2. Enrich ProjectContext — Write product.yaml, technical.yaml
3. Create 3-5 core requirements — Requirements forming the project's backbone
4. AI refinement         — Convert to EARS/User Story with enhance, generate success criteria
5. SMART validation      — Improve areas with low scores
6. Specification design  — Create specifications for each requirement
7. GitHub Issue generation — Break down specifications into implementation tasks
```

Don't aim for perfection from the start. Begin with 3-5 core requirements and add/improve as you implement.

### Existing Projects

```
1. reqord init                    — Add .reqord/ to existing repository
2. Identify undocumented requirements — Verbalize implicit knowledge
3. Structure incrementally        — Start with high-priority requirements
4. Full adoption from new features — Practice the full flow for future feature additions
```

You don't need to structure all existing requirements at once. Incorporate them incrementally, starting with the most important ones.

### Feedback Cycle

```
1. Receive feedback via GitHub Issues (feedback label)
2. Discuss and investigate in Issue comments
3. Structure in Reqord as needed (track with flag system)
4. Update requirements/specifications
5. Review and approve updates
```

Not all feedback needs to be structured immediately. First discuss in GitHub Issues, and incorporate into Reqord when structuring would be beneficial.

### Requirement Maintenance

Requirements are a Living Document — continue updating them even after implementation:

- Reflect constraints and changes discovered during implementation back into requirements
- Revisit success criteria based on test results
- Update dependencies when adding related new features
- Change retired requirements to deprecated (preserve history rather than deleting)

## Best Practices for AI Integration

> Reqord's structured data delivers especially significant value when used with AI.
> This section covers practices for teams that use AI alongside Reqord.

### ProjectContext Quality Drives Output Quality

AI output quality is proportional to input quality. Enriching the four user-editable files in ProjectContext is the most effective approach (`context.json` is tool-managed metadata and typically does not require manual editing):

| File | Contents | Impact on AI |
| ---- | -------- | ------------ |
| `product.yaml` | Vision, problems, target users | Used for requirement validity assessment |
| `technical.yaml` | Tech stack, architecture | Directly affects specification design quality |
| `structure.yaml` | Naming conventions, directory structure | Affects Issue decomposition accuracy |
| `domain/*.md` | Domain-specific knowledge | Accurate use of specialized terminology |

### Progressive Refinement

Don't try to write everything at once:

```
1. Create with a concise title + one-line description
2. Convert to EARS/User Story with AI enhance, generate success criteria
3. Fine-tune details with AI refine
4. Human reviews and corrects with domain knowledge
5. Confirm quality with SMART validation
```

### Reviewing AI Output (Human-in-the-loop in Practice)

When receiving AI output, check the following:

- **Domain knowledge accuracy**: Are there business rules or constraints the AI doesn't know about?
- **Scope appropriateness**: Is the requirement scope too broad or too narrow?
- **Success criteria verifiability**: Can they actually be confirmed through testing?
- **Dependency accuracy**: Are the implementation order assumptions correct?
- **Security considerations**: Are requirements related to authentication, authorization, and personal data not missing?

## Scaling

Strategies for when the number of requirements grows:

### Organizing by Domain

When requirements exceed several dozen, group them by domain (functional area):

- Classify with tags and categories
- Link related requirements with relatedTo
- Enrich domain/\*.md in ProjectContext for each domain

### Leveraging Indexes

For handling 100+ requirements, there is a design direction where SQLite indexes become effective for search and aggregation.

> Details: [docs/advanced/scaling.md](../advanced/scaling.md)

### Maintenance Habits

- Regularly review deprecated requirements
- Check the dependency graph for orphaned requirements
- Prioritize improving requirements with low SMART scores

---

**Next**: [05-donts.md](./05-donts.md) — Things to avoid
