---
description: TDDによる実装を専門エージェントで実行
argument-hint: <設計内容または対象ファイル>
model: sonnet
---

# TDD Implementation

You orchestrate TDD implementation using specialized subagents. Your role is coordination and human interaction - delegate actual coding to the tdd-implementer agent.

## Core Principles

- **Delegate implementation**: Use tdd-implementer agent for all coding work
- **Preserve context**: Subagents do heavy lifting, you integrate results
- **Human checkpoints**: Get approval before implementation starts
- **Read agent outputs**: After agents return file lists, read key files yourself

---

## Phase 1: Understand the Request

**Goal**: Clarify what needs to be implemented

Request: $ARGUMENTS

**Actions**:

1. Create todo list for all phases
2. If request is an issue number (#123), note it for exploration
3. If request is unclear, ask user:
   - What specific behavior should be implemented?
   - Are there acceptance criteria?
4. Summarize understanding and confirm with user

---

## Phase 2: Codebase Exploration

**Goal**: Understand relevant code and patterns

**Actions**:

1. Launch 2-3 code-explorer agents in parallel:
   - "Analyze code related to [feature area], trace execution paths, identify patterns"
   - "Find similar implementations in the codebase, document their approach"
   - "Map dependencies and integration points for [feature]"

2. Read all files identified by agents
3. Summarize findings: patterns, conventions, key abstractions

---

## Phase 3: Design

**Goal**: Create implementation blueprint

**Actions**:

1. Launch 1-2 code-architect agents:
   - "Design TDD-ready implementation for [feature] following existing patterns"
   - Focus on: component design, file locations, test strategy, build sequence

2. Read files referenced in the design

3. **Self-Review Loop** (Max 3 iterations):
   - Evaluate the design critically:
     - Is it consistent with codebase patterns found in Phase 2?
     - Are all components clearly defined?
     - Is the test strategy appropriate?
     - Are there ambiguities or missing pieces?
   - If concerns exist:
     - Document specific issues
     - Re-launch architect agent with feedback
     - Repeat evaluation
   - If satisfied, proceed to step 4

4. Present design to user:
   - Components to create/modify
   - Implementation sequence
   - Test approach

5. **Get explicit user approval before proceeding**

**Plan Template**: Use `.claude/rules/plan-template.md` as the output format for the design.

---

## Phase 4: TDD Implementation

**Goal**: Implement via test-first development

**DO NOT START WITHOUT USER APPROVAL**

**Actions**:

1. Launch tdd-implementer agent(s) with:
   - Design specification from Phase 3
   - Target files and test locations
   - Coding conventions from CLAUDE.md
   - Test framework and runner commands

   Example prompt:
   "Implement [component] using TDD. Design: [summary]. Files: [list]. Test with: [command]. Follow existing patterns in [reference files]."

2. If implementation is large, split into parallel tdd-implementer agents by component (ensure no file conflicts)

3. Review tdd-implementer output:
   - Were tests written first?
   - Do all tests pass?
   - Does code follow conventions?

---

## Phase 5: Code Review

**Goal**: Verify quality and correctness

**Actions**:

1. Launch 2-3 code-reviewer agents in parallel:
   - "Review for bugs, logic errors, and security issues"
   - "Review for test quality (Khorikov's Four Pillars)"
   - "Review for project conventions and code quality"

2. Consolidate findings by severity
3. **Present issues to user**:
   - Critical issues (recommend fixing)
   - Important issues (user decides)
   - If no issues, confirm code is ready

---

## Phase 6: Fix Issues (if needed)

**Goal**: Address review findings

**Actions**:

1. If user wants fixes, launch tdd-implementer agent:
   "Fix the following issues: [list]. Ensure tests still pass."

2. Re-run reviewers if changes were significant
3. Maximum 3 fix cycles - escalate to user if issues persist

---

## Phase 7: Simplification (optional)

**Goal**: Refactor for clarity

**Actions**:

1. Ask user: "Would you like to run /simplify for refactoring?"
2. If yes, invoke /simplify skill
3. If no or user skips, proceed to summary

---

## Phase 8: Summary

**Goal**: Document what was accomplished

**Actions**:

1. Mark all todos complete
2. Present summary:
   - Implemented functionality
   - Files created/modified
   - Test coverage
   - Key decisions made
3. Suggest next steps:
   - Run full test suite: `/test`
   - Run linter: `/lint`
   - Commit changes: `/commit-push-pr`
