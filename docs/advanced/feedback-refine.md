# Deprecating Label-based Approach → Migrating to HTML Comment Tag Approach

> [日本語](./feedback-refine.ja.md)

## Context

We have been using GitHub labels in the format `req:NNNNNN` / `spec:NNNNNN` to link feedback to requirements and specifications. However, as the number of requirements grows, the labels grow infinitely as well, making management untenable.

**Root cause**: While `docs/feedback-control.md` had designed the HTML comment tag approach (`<!-- reqord:feedback {...} -->`), spec-000027 (design document section 3.4) and spec-000028 (design document section 3.1) were written using the label-based approach, and the implementation followed suit. This was an inconsistency between the specification and the design documents.

## Step 0: Create Issue + Fix Data

### Create GitHub Issue

Create an issue for this change following the Feature template.

### Data Fixes

- Issue #23: Resolved in PR #31 (Zod schema implemented) → `npx reqord feedback close 23`
- Issue #30: Change link from req-000023 (feedback management) → req-000016 (GitHub Issue generation & management)
- Delete unnecessary labels: `req:000001`, `req:000022`, `req:000023`, `improvement`, `spec-mismatch`, `requirement-gap`

## Step 1: Fix Specifications

### spec-000027/design.md

- Section 3.4 "FeedbackSyncService": Rewrite from label parsing/building → HTML comment parsing/building
  - `parseGitHubIssue()`: Extract metadata from `body` HTML comments instead of labels
  - `syncToGitHub()`: Insert/update HTML comments in Issue body instead of adding labels
  - Delete `parseTypeFromLabels()`, `parseLinkedToFromLabels()`, `buildLabelsFromFeedback()`
- Section 3.3 "GitHubClient": Add `body` to the JSON fields of `listFeedbackIssues()`
- Sections 4.1/4.2 "Data Flow": Update label descriptions → HTML comment descriptions

### spec-000028/design.md

- Section 3.1 "FeedbackService": Change `addLabelsToIssue` calls in `linkToRequirement()`, `linkWithNewRequirement()`, `linkToSpecification()` → HTML comment insert/update
- Sections 4.3/4.4 "Data Flow": Update label addition descriptions → HTML comment insertion

## Step 2: Implementation

### 2.1 New: HTML Comment Tag Parser

**`packages/cli/src/services/reqord-comment.ts`** + tests

```typescript
export interface ReqordFeedbackComment {
  type?: FeedbackType;
  severity?: FeedbackSeverity;
  linkedTo: {
    requirements: string[];
    createdRequirements: string[];
    specifications: string[];
  };
}

export function parseReqordComment(body: string): ReqordFeedbackComment | null;
export function buildReqordComment(metadata: ReqordFeedbackComment): string;
export function upsertReqordComment(
  body: string,
  metadata: ReqordFeedbackComment,
): string;
```

### 2.2 github-client.ts

- Add `updateIssueBody(issueNumber, newBody)`
- Add `body` field to `listFeedbackIssues()`

### 2.3 feedback-service.ts

- `linkToRequirement()` etc.: `addLabelsToIssue` → `getIssue()` + `upsertReqordComment()` + `updateIssueBody()`

### 2.4 feedback-sync-service.ts

- `parseGitHubIssue()`: Change from label parsing → `parseReqordComment(issue.body)`
- `syncToGitHub()`: Label addition → HTML comment insert/update
- Delete `buildLabelsFromFeedback()`, `parseTypeFromLabels()`, `parseLinkedToFromLabels()`

### 2.5 Update Tests

- feedback-service.test.ts: Change `addLabelsToIssue` assertions → `updateIssueBody` assertions
- feedback-sync-service.test.ts: Rewrite label-based tests → HTML comment-based tests
- github-client.test.ts: Add `updateIssueBody` tests
- reqord-comment.test.ts: New

## Step 3: Update Documentation

### docs/guide-feedback.md

- Delete the "Labels Addition" section at lines 141-145
- Remove all references to the label-based approach
- Clearly state that HTML comment tags are the sole metadata communication method

## Verification

```bash
npm test -w packages/cli -w packages/shared   # Tests pass
npm run lint                                    # Lint passes
npx reqord feedback sync                        # Extracts from HTML comments
npx reqord feedback link 19 --req req-000001 --type improvement
gh issue view 19 --json body | jq '.body'       # Verify <!-- reqord:feedback -->
```
