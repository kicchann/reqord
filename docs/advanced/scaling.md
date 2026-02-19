# Scaling

> [日本語](./scaling.ja.md)

## Strategies for 100+ Requirements

### Option 1: **Hybrid Structure** (Recommended)

```
.reqord/
├── index.db                    # SQLite (for search & aggregation)
├── requirements/
│   ├── req-001.json           # For Git diff management (master)
│   └── req-001/
│       └── description.md
```

**How it works:**

- JSON/Markdown is the **single source of truth** (SSOT)
- SQLite serves as a **search index** (can be regenerated)
- `reqord sync-db` syncs JSON → SQLite

**Benefits:**

- Git diffs remain readable as usual
- Search and aggregation over large datasets is fast
- Even if SQLite is deleted, it can be rebuilt

### Option 2: **Partitioned Management**

```
.reqord/
├── requirements/
│   ├── auth/          # By domain
│   ├── payment/
│   └── reporting/
```

Keep each domain to around 10-20 requirements

---

## Flow When Bugs Are Found or Requirements Are Missing

### New Entity: **Feedback**

```
.reqord/
├── feedback/
│   ├── fb-001.json
│   └── fb-001/
│       ├── report.md
│       └── evidence/
│           └── screenshot.png
```

### Feedback Structure

```typescript
{
  "id": "fb-001",
  "type": "bug" | "requirement-gap" | "spec-mismatch",
  "severity": "critical" | "high" | "medium" | "low",
  "

  // Linking
  "linkedTo": {
    "requirement": "req-001",
    "specification": "spec-001",
    "issue": 123
  },

  // Discovery information
  "discovered": {
    "phase": "implementation" | "review" | "testing" | "production",
    "discoveredAt": "2026-02-15T10:00:00Z",
    "discoveredBy": "@alice",
    "environment": "staging"
  },

  // External files
  "files": {
    "report": "feedback/fb-001/report.md",
    "evidence": ["feedback/fb-001/evidence/screenshot.png"]
  },

  // Resolution
  "resolution": {
    "status": "open" | "in-progress" | "resolved" | "wont-fix",
    "action": "requirement-update" | "spec-update" | "bug-fix" | "documentation",

    // Impact
    "impacts": {
      "requirementChanges": ["req-001"],
      "specificationChanges": ["spec-001"],
      "newIssues": [150, 151]
    },

    "resolvedAt": "2026-02-16T15:00:00Z",
    "resolvedBy": "@bob"
  }
}
```

### Flow Diagram

```
Implementation complete
    ↓
Review / Testing
    ↓
Problem found!
    ↓
┌─────────────────┬──────────────────┬─────────────────┐
│ Bug             │ Requirement Gap  │ Spec Mismatch   │
│ (impl error)    │ (missing req)    │ (design error)  │
└────┬────────────┴────┬─────────────┴────┬────────────┘
     │                  │                   │
     ▼                  ▼                   ▼
Create Feedback    Create Feedback     Create Feedback
     │                  │                   │
     ▼                  ▼                   ▼
Fix GitHub Issue   Requirement v1.1.0   Specification v1.1.0
     │             (new version)        (new version)
     │                  │                   │
     ▼                  ▼                   ▼
  Done             Approval flow       Approval flow
                        │                   │
                        ▼                   ▼
                    Generate new        Update existing
                    Issues              Issues
```

### Commands

```bash
# Create Feedback
reqord feedback create bug \
  --issue 123 \
  --spec spec-001 \
  --severity high \
  --description "Token validation fails for expired tokens"

# Attach evidence
reqord feedback attach fb-001 screenshot.png

# List Feedback
reqord feedback list --status open
reqord feedback list --spec spec-001

# Resolution actions
reqord feedback resolve fb-001 requirement-update
# → Suggests creating a new Requirement version

reqord feedback resolve fb-002 bug-fix
# → Automatically comments on the relevant Issue

# Impact analysis
reqord feedback impact fb-001
# → Shows affected Req/Spec/Issues
```

### UI Display

```
┌─────────────────────────────────────────────────┐
│ Feedback: fb-001                    [Critical]  │
│ Type: Requirement Gap                           │
├─────────────────────────────────────────────────┤
│ Linked To:                                       │
│ - Requirement: req-001 v1.0.0                   │
│ - Specification: spec-001 v1.0.0                │
│ - Issue: #123 (closed)                          │
│                                                  │
│ Problem:                                         │
│ Token refresh feature was not included in reqs  │
│                                                  │
│ Evidence:                                        │
│ [screenshot.png] [error-log.txt]                │
│                                                  │
│ Suggested Actions:                               │
│ ⚪ Create req-001 v1.1.0                        │
│    - Add "Token refresh" requirement            │
│    - Trigger approval flow                      │
│                                                  │
│ ⚪ Update spec-001                              │
│    - Add refresh token design                   │
│                                                  │
│ ⚪ Create new issues                            │
│    - Implement refresh endpoint                 │
│    - Update token validation logic              │
│                                                  │
│ [Apply Suggestions] [Custom Action]             │
└─────────────────────────────────────────────────┘
```

### GitHub Issue Integration

Automatic comment from Feedback:

```markdown
## 🔍 Feedback from Reqord

**Feedback ID:** fb-001
**Type:** Requirement Gap
**Severity:** High

### Problem

Token refresh functionality was missing from the original requirements.

### Impact

- Requirement req-001 needs update (v1.0.0 → v1.1.0)
- Specification spec-001 needs redesign
- New implementation issues will be created

### Actions Taken

- [ ] Created req-001 v1.1.0 (PR #160)
- [ ] Updated spec-001 (PR #161)
- [ ] Created implementation issues (#162, #163)

---

_Auto-generated by Reqord Feedback System_
```

This completes the **Implementation → Discovery → Feedback → Improvement** loop!
