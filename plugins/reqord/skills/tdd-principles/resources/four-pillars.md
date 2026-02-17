# The Four Pillars of Good Tests

All tests should be designed with awareness of these four pillars. They are in a trade-off relationship, but **Resistance to Refactoring is non-negotiable**.

## 1. Protection Against Regressions

How effectively a test detects bugs.

**Factors that increase protection:**
- Code complexity and importance: Tests for complex business logic are highly valuable
- Amount of code executed: More code paths covered = higher bug detection probability
- Domain significance: Bugs in core domain logic cause more damage

**This pillar minimizes False Negatives** (bugs exist but tests pass).

## 2. Resistance to Refactoring (MOST IMPORTANT)

The degree to which tests don't fail when internal structure changes without changing external behavior.

**Key principles:**
- Thoroughly eliminate coupling to implementation details
- Verify only externally observable behavior
- Minimize False Positives (tests fail but functionality is correct)

**Why this is non-negotiable:**
- False positives create "cry wolf" effect - developers ignore test failures
- Fear of test maintenance inhibits refactoring
- Trust in test suite collapses over time

**Warning signs of low resistance:**
- Tests verify method call counts
- Tests check argument order to internal methods
- Tests break when renaming private methods
- Tests verify which class performed a calculation

## 3. Fast Feedback

Test execution speed.

**Benefits of fast tests:**
- Immediate awareness of code change impacts
- Keep developers in "flow state"
- Enable frequent test runs

**Slow tests:**
- Interrupt development flow
- Reduce test execution frequency
- Delay bug discovery, increasing fix cost

## 4. Maintainability

The operational cost of test code itself.

**Two aspects:**

1. **Understandability**: Intent and verification content immediately clear when reading
2. **Execution difficulty**: Minimal setup cost for external dependencies

**Maintainability killers:**
- Over-abstracted test code
- Bloated setup sections
- Complex mock configurations

## The Trade-off Reality

These pillars cannot all be maximized simultaneously. Like CAP theorem in distributed systems, there's an inherent trade-off between:
- Regression Protection
- Refactoring Resistance
- Fast Feedback

**Strategic conclusion**: Never sacrifice Refactoring Resistance. Balance between Regression Protection (integration test direction) and Fast Feedback (unit test direction) based on application characteristics.

## Comparison Table

| Test Type | Regression Protection | Refactoring Resistance | Fast Feedback | Maintainability |
|-----------|----------------------|------------------------|---------------|-----------------|
| E2E Test | High | High | Low | Low |
| Trivial Test | Low | High | High | High |
| Brittle Test | High | Low | High | Medium |
| Ideal Unit Test | High | High | High | High |
