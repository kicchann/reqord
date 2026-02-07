---
description: Test-driven development principles following Khorikov's theory. Covers the Four Pillars of Good Tests, Classical vs London school approaches, and test style hierarchy. Use when writing tests, reviewing test quality, or practicing TDD.
allowed-tools: Read, Grep, Glob, Edit, Write, Bash
---

# Good Test Principles (Khorikov's Theory)

This skill provides language-agnostic principles for writing high-value tests based on Vladimir Khorikov's "Unit Testing Principles, Practices, and Patterns".

## When to Use This Skill

- Writing or reviewing unit tests
- Evaluating test quality
- Designing testable architecture
- Making decisions about test doubles (mocks/stubs)

## Core Concept

The ultimate goal of unit testing is **sustainable software growth**, not just bug detection. Tests are assets that must provide more value than their maintenance cost.

## Quick Reference

### Four Pillars of Good Tests

1. **Protection Against Regressions** - Bug detection effectiveness
2. **Resistance to Refactoring** - Avoids false positives (MOST IMPORTANT)
3. **Fast Feedback** - Quick execution
4. **Maintainability** - Easy to understand and run

### Test Style Hierarchy (Best → Worst)

1. **Output-based** - Verify return values only (pure functions)
2. **State-based** - Verify state changes after operations
3. **Communication-based** - Verify mock interactions (minimize use)

### Classical Approach

- Unit = Behavior unit (not class)
- Isolate test cases from each other
- Mock only shared dependencies
- Use real instances for private dependencies

## Resources

Read these in order for comprehensive understanding:

1. `resources/four-pillars.md` - The Four Pillars in detail
2. `resources/classical-approach.md` - Classical vs London school
3. `resources/test-styles.md` - Output/State/Communication styles
4. `resources/mock-vs-stub.md` - CQS-based test double usage

## Integration with Other Skills

- **clean-architecture**: Functional Core, Imperative Shell for testability
- **code-review-guideline**: Test quality review checklist
- For language-specific implementation, see app-level skills (e.g., tdd-guideline in frontend)
