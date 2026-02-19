# Feedback Guide

> [日本語](./guide-feedback.ja.md)

A design and operations guide for feedback management using GitHub Issues.

---

## Realistic Feedback/Issue Operations

### ❌ The Ideal (Not Realistic)
```
Developer: Bug found
↓
Create perfectly structured Feedback Issue
- type: requirement-gap ← Can't know this upfront
- linkedTo: req-005, spec-005 ← Unknown before investigation
- severity: high ← Can't judge without impact analysis
- Impact analysis complete ← Impossible at bug report time
```

### ✅ The Actual Flow (Same as OSS)
```
Developer: Bug found
↓
Report simply first
"Getting errors 1 hour after login"
↓
Investigation & discussion
↓
Organize after root cause is found
↓
Decide on action plan
```

---

## 📝 Progressive Issue Evolution Pattern

### Stage 1: **Initial Report (Simple)**

```markdown
Title: Login fails after 1 hour

## What happened
After logging in, I get 401 error after about 1 hour.

## How to reproduce
1. Login
2. Wait 1 hour
3. Try to access /api/profile
4. Error

## Error message
```
401 Unauthorized
{"error": "token_expired"}
```

## Environment
- Browser: Chrome
- Env: Staging
```

**What we know at this point:**
- ✅ Symptom
- ❌ Root cause
- ❌ Impact scope
- ❌ Related Requirement/Spec

---

### Stage 2: **Investigation & Discussion (Comments)**

```markdown
# Comment by @kicchann
Investigated. The JWT token expiry is 1 hour, and
the refresh token mechanism hasn't been implemented.

Related files:
- src/auth/token.ts
- spec-005 (OAuth design)

# Comment by @reviewer
Checked the success criteria in req-005.
There's no mention of "token refresh functionality".
This is a requirements gap.

# Comment by @kicchann
So this is a requirement-gap then.
We need to update req-005 to v1.1.0 and add
token refresh to the acceptance criteria.
```

---

### Stage 3: **Organization & Structuring (Issue Edit)**

**Edit the original Issue body:**

```markdown
Title: [FEEDBACK] Token refresh mechanism missing

<!-- reqord:feedback
{
  "type": "requirement-gap",
  "linkedTo": {
    "requirement": "req-005",
    "specification": "spec-005"
  }
}
-->

## Original Report
After logging in, I get 401 error after about 1 hour.

[Original report content preserved as-is]

---

## 🔍 Investigation Result

**Root cause:** JWT token expires after 1 hour, no refresh mechanism

**Related artifacts:**
- Requirement: req-005 v1.0.0 (OAuth Token Management)
- Specification: spec-005 (Authentication Design)
- Code: `src/auth/token.ts`

**Type:** Requirement Gap
**Severity:** High (affects all logged-in users)

---

## 📋 Action Items

- [ ] Update req-005 to v1.1.0 (add refresh criteria)
- [ ] Update spec-005 design (add refresh flow)
- [ ] Implement refresh mechanism (#124)
- [ ] Add tests (#125)

**Estimated effort:** 8 hours
```

**Metadata transmission**: The HTML comment tag in the Issue body (`<!-- reqord:feedback {...} -->`) is the sole mechanism for conveying metadata. GitHub labels are not used for metadata management.

---

## 🔧 Reqord CLI Support

### Command Design (Progressive)

#### 1. Initial Report (Issue only)
```bash
# Create a regular GitHub Issue
# Reqord is not involved
```

#### 2. Structuring After Investigation
```bash
# After investigating Issue #123

reqord feedback analyze 123
# → Reads Issue body and comments
# → AI analysis: estimates type, linkedTo, severity
# → Adds results as a comment

Output (GitHub Issue Comment):
---
🤖 **Reqord Analysis**

Based on the discussion, this appears to be:
- **Type:** requirement-gap
- **Related Requirement:** req-005 (mentioned in comments)
- **Related Spec:** spec-005 (found in codebase)
- **Severity:** high (affects all users)

**Suggested actions:**
1. Update req-005 to v1.1.0
2. Update spec-005 design section
3. Create implementation issues

Run `reqord feedback structure 123` to apply this analysis.
---
```

#### 3. Apply Structuring
```bash
reqord feedback structure 123
# → Embeds HTML comment
# → Adds Labels
# → Adds Action Items
# → Updates .reqord/feedback/index.json
```

---

## 📊 Directory Structure (Simplified)

```
.reqord/
└── feedback/
    └── index.json         # References to GitHub Issues only

# All details live in GitHub Issues
```

**index.json (Minimal)**
```json
{
  "feedbacks": [
    {
      "githubIssue": 123,
      "type": "requirement-gap",
      "linkedTo": {
        "requirement": "req-005",
        "specification": "spec-005"
      },
      "analyzedAt": "2026-02-07T15:00:00Z",
      "status": "open"
    }
  ]
}
```

---

## 🔄 Actual Workflow

### Pattern A: Regular Developer (Not Using Reqord)

```
1. Bug found
2. Create GitHub Issue (as usual)
3. Team investigates & discusses (comments)
4. Edit Issue body to organize
5. Create PR and fix
```

**No Reqord involvement. This is fine.**

---

### Pattern B: Reqord User (Supplementary)

```
1. Bug found
2. Create GitHub Issue (as usual)
3. Team investigates & discusses (comments)

4. Analyze with Reqord (optional)
   reqord feedback analyze 123
   → AI estimates related Req/Spec
   → Impact scope report

5. Structuring (optional)
   reqord feedback structure 123
   → Add metadata
   → Propose Action Items

6. Create PR and fix
```

**Reqord is supplementary. Not required.**

---

## 🎯 Issue Template (Simple Version)

### For Initial Reports (Minimal Required Fields)

```yaml
name: Bug Report
description: Report a bug or issue
title: ""
labels: ["bug"]
body:
  - type: textarea
    id: description
    attributes:
      label: What happened?
      description: Describe the issue
    validations:
      required: true

  - type: textarea
    id: reproduction
    attributes:
      label: How to reproduce
      placeholder: |
        1. Go to...
        2. Click on...
        3. See error

  - type: textarea
    id: error
    attributes:
      label: Error message / logs
      render: shell

  - type: input
    id: environment
    attributes:
      label: Environment
      placeholder: "Browser, OS, etc."

# That's it. requirement/spec are added later
```

### After Structuring (Edited by Reqord CLI)

```markdown
<!-- reqord:feedback
{
  "type": "requirement-gap",
  "linkedTo": {
    "requirement": "req-005",
    "specification": "spec-005"
  }
}
-->

[Original report content]

---

## 🔍 Analysis (added by Reqord)
[Analysis results]

## 📋 Action Items (added by Reqord)
[Action items]
```

---

## 🚀 Implementation Priority

### Phase 1: GitHub Issue-Centric (MVP)
```
✅ Standard GitHub Issue workflow
✅ Labels: feedback, bug, enhancement
❌ No Reqord structuring (manual organization is fine)
```

### Phase 2: Reqord Analysis Features
```
✅ reqord feedback analyze <issue-number>
   → Posts AI analysis as a comment
✅ reqord feedback list
   → Wrapper around GitHub Issue search
```

### Phase 3: Automated Structuring
```
✅ reqord feedback structure <issue-number>
   → Embed metadata
   → Auto-add Labels
   → Propose Action Items
```

### Phase 4: Analytics & Dashboard
```
✅ Feedback trend analysis
✅ Common problem patterns
✅ Requirements gap trends
```

---

## ✅ Conclusion

**Use GitHub Issues as-is. Reqord is a post-hoc analysis and structuring tool.**

### Principles
1. ✅ Issue creation is free-form (simple is fine)
2. ✅ Investigation and discussion happen in comments
3. ✅ Use Reqord when you want to organize (optional)
4. ✅ Don't force structuring

### Feedback Directory
```
.reqord/feedback/
└── index.json    # GitHub Issue references only (lightweight)

All details live in GitHub Issues.
```

---

## Status Design Options

### Option 1: Add `under-review` to Status

```typescript
type RequirementStatus =
  | "draft"              // Being created
  | "pending_approval"   // Awaiting review
  | "approved"           // Approved
  | "under-review"       // Under reconsideration due to Feedback ⭐ NEW
  | "implemented"        // Implementation complete
  | "deprecated"         // Retired
```

**Issues:**
- ❌ Reason for `under-review` is unclear (Feedback? Spec change? Bug?)
- ❌ Difficult to manage when there are multiple Feedbacks
- ❌ What to revert to after review? -> `draft` or `approved`?

---

### Option 2: Independent `feedbackStatus` Field ⭐ Recommended

```typescript
type Requirement = {
  id: string;
  status: "draft" | "pending_approval" | "approved" | "implemented" | "deprecated";

  // Feedback-specific status (optional)
  feedbackStatus?: {
    hasOpenFeedback: boolean;
    requiresReview: boolean;        // Needs reconsideration?
    feedbackIssues: number[];       // GitHub Issue numbers
    reviewReason?: string;          // "requirement-gap" | "spec-mismatch" | "bug"
    flaggedAt?: string;
  };
}
```

**Examples:**

#### Case 1: Feedback received but still approved
```json
{
  "id": "req-005",
  "version": "1.0.0",
  "status": "approved",              // Still approved
  "feedbackStatus": {
    "hasOpenFeedback": true,
    "requiresReview": true,
    "feedbackIssues": [123, 145],
    "reviewReason": "requirement-gap",
    "flaggedAt": "2026-02-07T15:00:00Z"
  }
}
```

#### Case 2: No Feedback
```json
{
  "id": "req-006",
  "status": "approved",
  "feedbackStatus": undefined        // Or omitted
}
```

---

### Option 3: Flags Array (GitHub-style) ⭐⭐ Most Recommended

```typescript
type Requirement = {
  id: string;
  status: "draft" | "pending_approval" | "approved" | "implemented" | "deprecated";

  // Flags approach (can hold multiple states)
  flags?: {
    type: "feedback-review" | "breaking-change" | "security-review";
    reason: string;
    createdAt: string;
    relatedIssues?: number[];
  }[];
}
```

**Example:**

```json
{
  "id": "req-005",
  "version": "1.0.0",
  "status": "approved",
  "flags": [
    {
      "type": "feedback-review",
      "reason": "Token refresh mechanism missing (requirement gap)",
      "createdAt": "2026-02-07T15:00:00Z",
      "relatedIssues": [123]
    },
    {
      "type": "feedback-review",
      "reason": "PKCE support not mentioned in acceptance criteria",
      "createdAt": "2026-02-08T10:00:00Z",
      "relatedIssues": [145]
    }
  ]
}
```

**Advantages:**
- ✅ Manage multiple Feedbacks individually
- ✅ Reason for each Feedback is clear
- ✅ Remove from array when resolved
- ✅ `status` retains its original state
- ✅ Consistent with GitHub's Issue flags pattern

---

## 🔄 Workflow Comparison

### A. Status Change Approach

```
approved → under-review (Feedback occurs)
         → draft (Start fixing)
         → approved (Re-approved)

Issues:
- Hard to track history
- Difficult to manage multiple Feedbacks
```

### B. feedbackStatus Approach

```
status: approved (unchanged)
feedbackStatus: { requiresReview: true } (added)

After fix:
feedbackStatus: undefined (removed)

Issues:
- Gets overwritten with multiple Feedbacks
```

### C. Flags Approach ⭐

```
status: approved (unchanged)
flags: [
  { type: "feedback-review", reason: "...", relatedIssues: [123] }
]

Feedback #123 resolved:
flags: [] (removed from array)

New Feedback #145:
flags: [
  { type: "feedback-review", reason: "...", relatedIssues: [145] }
]

All Feedbacks resolved:
flags: [] (empty array or undefined)
```

---

## 📊 UI Display Examples

### Requirement List

```
┌─────────────────────────────────────────────────────────┐
│ Requirements                                             │
├──────────┬──────────┬─────────────────┬─────────────────┤
│ ID       │ Status   │ Flags           │ Title           │
├──────────┼──────────┼─────────────────┼─────────────────┤
│ req-004  │ approved │                 │ User Login      │
│ req-005  │ approved │ ⚠️ 2 feedbacks  │ OAuth Tokens    │
│ req-006  │ draft    │                 │ Profile Page    │
│ req-007  │ approved │ 🔒 Security     │ Password Reset  │
└──────────┴──────────┴─────────────────┴─────────────────┘

Legend:
⚠️ feedback-review
🔒 security-review
⚡ breaking-change
```

### Requirement Detail Page

```
┌─────────────────────────────────────────────┐
│ req-005: OAuth Token Management             │
│ Status: ✅ Approved                         │
│ Version: 1.0.0                              │
├─────────────────────────────────────────────┤
│ ⚠️ Active Flags (2)                         │
│                                              │
│ 1. Feedback Review                          │
│    Reason: Token refresh mechanism missing  │
│    Issue: #123                              │
│    Flagged: 2026-02-07                      │
│    [View] [Resolve]                         │
│                                              │
│ 2. Feedback Review                          │
│    Reason: PKCE support not specified       │
│    Issue: #145                              │
│    Flagged: 2026-02-08                      │
│    [View] [Resolve]                         │
└─────────────────────────────────────────────┘
```

---

## 🛠️ CLI Commands

### Adding a Flag

```bash
# Automatic (after Feedback analysis)
reqord feedback analyze 123
# → Adds flag to req-005

# Manual
reqord req flag req-005 \
  --type feedback-review \
  --reason "Token refresh mechanism missing" \
  --issue 123
```

### Checking Flags

```bash
# Check flags for all Requirements
reqord req list --with-flags

Output:
req-005 (approved) ⚠️ 2 feedback-review
req-007 (approved) 🔒 1 security-review

# Flag details for a specific Requirement
reqord req show req-005

Output:
ID: req-005
Status: approved
Version: 1.0.0

Active Flags:
1. feedback-review
   Reason: Token refresh mechanism missing
   Issue: #123
   Flagged: 2026-02-07

2. feedback-review
   Reason: PKCE support not specified
   Issue: #145
   Flagged: 2026-02-08
```

### Resolving Flags

```bash
# When Feedback #123 is resolved
reqord req unflag req-005 --issue 123

# Or remove all flags
reqord req unflag req-005 --all
```

---

## 📁 JSON Structure (Complete)

```typescript
type Requirement = {
  id: string;
  version: string;
  title: string;

  // Main status (do not change)
  status: "draft" | "pending_approval" | "approved" | "implemented" | "deprecated";

  // Version history
  versionHistory: {
    version: string;
    status: string;
    gitCommit?: string;
    approvedAt?: string;
    approvedBy?: string;
    deprecatedReason?: string;
  }[];

  // Approval management
  currentApproval?: {
    version: string;
    phase: "requirement" | "specification";
    status: "pending" | "approved" | "rejected";
    prNumber?: number;
    approvedBy?: string;
    approvedAt?: string;
  };

  // Flags (Feedback, etc.) ⭐ NEW
  flags?: {
    type: "feedback-review" | "security-review" | "breaking-change" | "tech-debt";
    reason: string;
    createdAt: string;
    createdBy?: string;
    relatedIssues?: number[];
    severity?: "low" | "medium" | "high" | "critical";
    metadata?: Record<string, any>;
  }[];

  // Other fields
  files: {
    description: string;
    attachments?: string[];
  };
  successCriteria: string[];
  dependencies: {
    blockedBy?: string[];
    blocks?: string[];
    relatedTo?: string[];
  };
  estimatedComplexity?: "low" | "medium" | "high";
  estimatedHours?: number;
};
```

**Example (with Feedback):**

```json
{
  "id": "req-005",
  "version": "1.0.0",
  "title": "OAuth Token Management",
  "status": "approved",
  "versionHistory": [
    {
      "version": "1.0.0",
      "status": "approved",
      "approvedAt": "2026-01-15T10:00:00Z",
      "approvedBy": "tech-lead"
    }
  ],
  "flags": [
    {
      "type": "feedback-review",
      "reason": "Token refresh mechanism missing (requirement gap)",
      "createdAt": "2026-02-07T15:00:00Z",
      "createdBy": "kicchann",
      "relatedIssues": [123],
      "severity": "high",
      "metadata": {
        "feedbackType": "requirement-gap",
        "affectedUsers": "all"
      }
    },
    {
      "type": "feedback-review",
      "reason": "PKCE support not specified in acceptance criteria",
      "createdAt": "2026-02-08T10:00:00Z",
      "relatedIssues": [145],
      "severity": "medium"
    }
  ],
  "files": {
    "description": "requirements/req-005/description.md"
  },
  "successCriteria": [
    "User can login with OAuth 2.0",
    "Token expires after 1 hour"
  ]
}
```

---

## 🎯 Flag vs Status: When to Use Which

### Use `status` when:
- Representing an essential lifecycle state
- Example: draft -> pending_approval -> approved -> implemented / deprecated

### Use `flags` when:
- Temporary attention items
- Multiple concurrent concerns
- Markers for resolvable issues
- Example: feedback-review, security-review, breaking-change

---

## ✅ Final Recommendation

**Adopt the Flags array approach:**

### Reasons
1. ✅ `status` retains its original state (simple)
2. ✅ Multiple Feedbacks can be managed individually
3. ✅ Consistent with GitHub Issue flags pattern
4. ✅ Remove from array when resolved (history is in Git)
5. ✅ Highly extensible (can add security-review, etc.)

### Implementation
```typescript
type Requirement = {
  status: "draft" | "pending_approval" | "approved" | "implemented" | "deprecated";
  flags?: {
    type: "feedback-review" | "security-review" | "breaking-change";
    reason: string;
    createdAt: string;
    relatedIssues?: number[];
    severity?: "low" | "medium" | "high" | "critical";
  }[];
}
```

### CLI
```bash
reqord req flag req-005 --type feedback-review --issue 123
reqord req unflag req-005 --issue 123
reqord req list --with-flags
```

This approach clearly expresses the state of "approved but under reconsideration due to Feedback".
