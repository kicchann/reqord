# Classical vs London School

Two major schools exist in unit testing history, each with different definitions of "good tests".

## The Fundamental Divide: What is "Isolation"?

### London School (Mockist)

**Isolation = Isolate the class under test**

- Replace all collaborators (dependencies) with test doubles (mainly mocks)
- System Under Test (SUT) is tested in complete isolation
- If a dependency has a bug, SUT's test still passes

### Classical School (Detroit)

**Isolation = Isolate test cases from each other**

- Test cases should not affect each other, should be parallelizable
- Replace only shared dependencies (DB, file system) with test doubles
- Use real instances for all other collaborating classes (entities, value objects)
- SUT and its collaborating classes are tested as a behavioral unit

## The "Unit" Definition

### London School
Unit = **Class**

Create one test class per production class, exhaustively testing its methods.

### Classical School
Unit = **Unit of Behavior**

A behavior often spans multiple classes. Test the entire behavior (cohesive class cluster).

## Why Classical is Preferred

### London School's Problem: Over-specification

The London approach inevitably leads to **over-specification**.

When mocking collaborators, tests verify "how SUT communicates with them" (call counts, arguments, order). This is **implementation detail**.

**Example problem:**
- SUT internally calls `Calculator.Add()` for computation
- Test mocks Calculator and verifies `Add()` was called
- Refactor to inline the addition → Test fails even though result is correct

This destroys "Resistance to Refactoring" (Pillar 2).

### Classical School's Advantage

- Uses real instances except for shared dependencies
- Tests verify "final output" or "state changes" (State/Output Verification)
- Focuses on observable behavior (is result correct?), not implementation detail (who calculated?)
- Extremely robust against refactoring

## Dependency Classification

| Category | Definition | Examples | Treatment |
|----------|-----------|----------|-----------|
| **Shared** | Shared between tests, causes interference | DB, file system | Use test doubles |
| **Private** | Exists only within specific test execution | In-memory objects | Use real instances |
| **Volatile** | Not on dev machine, non-deterministic | Current time, random | Inject via arguments or use test doubles |

## Practical Guidelines

**Do:**
- Test behavior, not classes
- Use real objects for domain entities, value objects
- Mock only external boundaries (DB, APIs, file system)
- Verify end results, not intermediate steps

**Don't:**
- Mock everything to achieve "unit isolation"
- Verify internal method calls between collaborating classes
- Create one test class per production class automatically
- Test private methods directly
