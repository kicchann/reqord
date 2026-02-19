# Requirements Writing Guide

> [日本語](./guide-requirements.ja.md)

Guidelines for creating and managing requirements in reqord.

---

## Requirement Granularity

Each requirement should correspond to **one feature or behavior**.

**Appropriate granularity:**
- "User can log in"
- "CSV export feature"

**Too coarse-grained:**
- "User management feature" (mixes login, registration, profile editing, and password reset)

**Too fine-grained:**
- "Make the login button blue" (UI details belong in the Specification)

Rule of thumb when in doubt: ideally, 1 to 3 Specifications should be derived from a single requirement.

---

## Status

A requirement's status represents the **approval lifecycle and implementation state**.

| Status | Meaning | Transition Condition |
|--------|---------|---------------------|
| `draft` | Being created or edited | Initial state |
| `pending_approval` | Awaiting review | When a PR is created via `reqord req approve` |
| `approved` | Approved and ready for implementation | When the PR is merged |
| `implemented` | Implementation complete | When implementation is finished |
| `deprecated` | Retired | When the requirement is no longer needed |

- `approved` means "this requirement is correctly defined and cleared for implementation"
- `implemented` indicates that implementation is complete. It can be set regardless of whether a GitHub Issue exists

---

## Priority

| Priority | Usage |
|----------|-------|
| `high` | Core project feature. Other requirements depend on this |
| `medium` | Standard feature. Default value |
| `low` | Nice to have, but the project can work without it |

---

## Dependencies

There are 3 types of relationships between requirements.

### blockedBy / blocks

Represents an **implementation order constraint: "cannot start until this is done"**.

```
req-000001 (DB Design)
  └── blocks: ["req-000002"]

req-000002 (Auth API)
  └── blockedBy: ["req-000001"]
```

`blocks` and `blockedBy` always come in pairs. When you set one side, make sure to reflect it on the other.

**When to use:**
- When a preceding implementation is technically required (DB schema -> API -> UI)
- When shared infrastructure is needed (auth foundation -> auth integration in each feature)

### relatedTo

A **reference link for items that can be implemented independently but should be considered together during design and review**. There is no implementation order constraint.

```
req-000003 (Login)
  └── relatedTo: ["req-000004"]

req-000004 (Password Reset)
  └── relatedTo: ["req-000003"]
```

`relatedTo` is bidirectional. When you set it on one side, set it on the other as well.

**When to use:**

1. **Shared domain** -- Requirements that belong to the same feature area and should maintain design consistency
   > "User Registration" and "Profile Editing" -- both involve the user model

2. **Shared infrastructure** -- May use the same infrastructure or libraries in implementation
   > "Email Notifications" and "Slack Notifications" -- may share a notification foundation

3. **Specification consistency** -- Requirements that should be aligned to avoid contradictions
   > "CSV Export" and "CSV Import" -- need to align on format definitions

**Actions to take when you see relatedTo:**
- **During Specification creation**: Review related requirement Specs to verify design consistency
- **During review**: Check for impacts on related requirements
- **During changes**: Consider whether related requirement Specs also need changes

**Criteria for choosing blockedBy vs relatedTo:**
- "Technically impossible without this being implemented first" -> `blockedBy`
- "Design would be better if considered together" -> `relatedTo`

---

## Format

Choose one of 3 formats for describing requirements.

### User Story

Describes "who, what, why" from the user's perspective. This is the most common format.

```json
{
  "type": "user-story",
  "userStory": {
    "as": "Developer",
    "iWant": "to manage requirements via CLI commands",
    "soThat": "I can prevent manual management mistakes"
  }
}
```

**Best suited for:** Functional requirements targeting end users

### EARS (Easy Approach to Requirements Syntax)

Describes system behavior with conditions.

```json
{
  "type": "ears",
  "ears": {
    "type": "event-driven",
    "trigger": "User presses the export button",
    "condition": "Model contains structural elements",
    "action": "Export file in IFC4 format",
    "response": "Display completion notification"
  }
}
```

**Best suited for:** Non-functional requirements, system integrations, requirements with conditional branching

### Free-form

Free text for cases that don't fit a standard format. Write details in description.md.

```json
{
  "type": "free-form"
}
```

**Best suited for:** Technical constraints, research tasks, prototypes

---

## Files

### description (required)

A Markdown file that describes the requirement details. Write it following the template.

### supplementary (optional)

You can freely add supplementary materials for a requirement. Similar to the specification directory, reqord recognizes supplementary materials from the `supplementary` array in the JSON.

```json
{
  "files": {
    "description": "requirements/req-000001/description.md",
    "supplementary": [
      "requirements/req-000001/mockup.png",
      "requirements/req-000001/user-flow.mmd"
    ]
  }
}
```

Examples of files you can include:
- Screen mockups (PNG, PDF)
- Flow diagrams (Mermaid `.mmd`)
- Reference materials (PDF)
- Data samples (CSV, JSON)

---

## estimatedComplexity / estimatedHours

These are **intuitive difficulty and effort estimates** made during requirements gathering. They are not precise estimates but rather reference values for prioritization decisions.

| Complexity | Guideline |
|-----------|-----------|
| `small` | Expected to be completed in a few hours to 1 day |
| `medium` | Expected to take a few days |
| `large` | Expected to take 1 week or more |
| `xlarge` | Expected to span multiple weeks. Consider splitting |

- Set `estimatedHours` within a range consistent with `estimatedComplexity`
- Precise estimates are done when breaking down Issues from Specifications
