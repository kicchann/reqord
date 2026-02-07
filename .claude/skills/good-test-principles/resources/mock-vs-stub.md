# Mock vs Stub: CQS-Based Usage

Improper use of test doubles is a primary cause of brittle tests. This guide clarifies the distinction and proper usage based on Command-Query Separation (CQS) principle.

## The Two Types of Test Doubles

| Characteristic | Mock | Stub |
|----------------|------|------|
| **Role** | Emulate/verify **outgoing** (outcoming) interactions | Emulate **incoming** interactions |
| **Data Flow** | SUT → Dependency (side effects) | Dependency → SUT (data provision) |
| **CQS Mapping** | **Command** - operations that change state | **Query** - operations that return values |
| **Verification** | Assert that method was called with correct arguments | **Never verify interactions** |
| **Examples** | Email sending, message publishing, file writing | DB reads, file reads, API data fetching |

## The Golden Rule

### Never Assert Interactions with Stubs

**Why this matters:**

Stubs exist only to "provide test data to SUT". They should never participate in the test's final pass/fail decision (Assertion).

**What you're testing when verifying stub calls:**
- What SQL was issued to the database?
- Was cache checked before DB?
- How many times was data fetched?

These are all **implementation details**. Verifying them leads to:
- Over-specification
- Lost refactoring resistance
- Brittle tests

## Managed vs Unmanaged Dependencies

### Managed Dependencies

**Definition**: Dependencies the application has full control over, not directly accessed externally.

**Examples**: Application-dedicated database

**Treatment**:
- Considered part of implementation detail
- **Do NOT mock**
- In integration tests, use real instances (Docker containers)
- Verify final state (correct data saved to DB)

### Unmanaged Dependencies

**Definition**: Dependencies the application doesn't fully control, shared with external systems or other teams.

**Examples**: SMTP servers, message buses, third-party APIs

**Treatment**:
- Operations are "externally observable side effects"
- These are system contracts requiring backward compatibility
- **Mock usage is justified**
- Verify interactions (message sent in correct format)

## Decision Matrix

| Dependency Type | Query (returns data) | Command (side effect) |
|-----------------|---------------------|----------------------|
| **Managed** (e.g., own DB) | Use real in integration tests | Use real, verify state |
| **Unmanaged** (e.g., external API) | Stub (no interaction verify) | Mock (verify interaction) |

## Common Mistakes

### Mistake 1: Mocking the Database

```
// WRONG: Mocking managed dependency
mockRepository.setup(findById(1)).returns(user)
service.processUser(1)
verify mockRepository.findById(1) was called  // ← Over-specification!
```

**Correct approach**: Use real DB in integration test, verify final state.

### Mistake 2: Verifying Stub Calls

```
// WRONG: Asserting stub interactions
stubCache.setup(get("key")).returns(null)
stubDb.setup(findById(1)).returns(user)

service.getUser(1)

verify stubCache.get("key") was called  // ← Implementation detail!
verify stubDb.findById(1) was called    // ← Implementation detail!
```

**Correct approach**: Only verify the returned result or final state.

### Mistake 3: Mocking Domain Objects

```
// WRONG: Mocking private dependencies
mockUser = createMock(User)
mockUser.setup(calculateDiscount()).returns(20)

service.applyDiscount(mockUser)
```

**Correct approach**: Use real domain objects.

## Architectural Implication

To minimize mock usage while maintaining test coverage:

1. **Separate pure logic from I/O** (Functional Core, Imperative Shell)
2. **Test domain logic with Output-based style** (no mocks needed)
3. **Test integration points with real dependencies** (Docker)
4. **Mock only at external system boundaries**
