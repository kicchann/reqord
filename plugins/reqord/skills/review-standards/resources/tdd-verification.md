# TDD Practice Verification

Checklist for reviewing whether TDD principles are being followed correctly.

## Four Pillars Review

For each test, evaluate against the Four Pillars:

### 1. Protection Against Regressions

**Questions to ask:**
- Does this test cover important business logic?
- Would a bug in this area cause significant damage?
- Does the test exercise multiple code paths?

**Red flags:**
- Testing trivial code (getters/setters)
- Testing framework code that's already tested
- Low-value tests with high maintenance cost

### 2. Resistance to Refactoring

**Questions to ask:**
- Would renaming an internal method break this test?
- Would changing implementation (same behavior) break this test?
- Is the test verifying "how" or "what"?

**Red flags:**
- Verifying mock call counts
- Verifying method call order
- Testing private/internal methods
- Mock setup that mirrors implementation

**Examples:**

```
// RED FLAG: Implementation coupling
verify calculator.add was called exactly once
verify repository.findById was called before repository.save

// GOOD: Behavior verification
assert result equals expectedValue
assert order.status equals COMPLETED
```

### 3. Fast Feedback

**Questions to ask:**
- Does the test use external resources it could avoid?
- Is there unnecessary setup slowing it down?
- Could this be a unit test instead of integration?

**Red flags:**
- Unit tests hitting database
- Tests with sleep/wait calls
- Tests depending on network

### 4. Maintainability

**Questions to ask:**
- Can I understand what this tests by reading it once?
- Is the setup minimal and clear?
- Is the AAA structure evident?

**Red flags:**
- Cryptic test names
- Setup longer than the test
- Multiple assertions testing different things
- Shared mutable state between tests

## Classical Approach Verification

### Unit Definition Check

**Ask:** Is the test verifying a behavior or a class?

**Good:**
```
test "completing order sends confirmation and reduces stock"
  // Tests the behavior across Order, Inventory, EmailService
```

**Bad:**
```
test "Order.complete() calls Inventory.reduce()"
  // Testing class interaction, not behavior
```

### Isolation Check

**Ask:** Are tests isolated from each other, or isolated from collaborators?

**Good:** Tests can run in any order, in parallel
**Bad:** Tests mock every collaborator

### Test Double Usage Check

| Dependency Type | Should Use |
|-----------------|------------|
| Domain entities | Real objects |
| Value objects | Real objects |
| Domain services | Real objects |
| Application services | Usually real |
| Repository (in unit test) | Real (in-memory) or mock |
| External API | Mock |
| Database (in integration) | Real (Docker) |
| Email service | Mock |
| Message queue | Mock |

## Test Style Appropriateness

### For Domain Logic

**Expected:** Output-based tests

```
// GOOD: Pure function test
test "discount calculation for gold tier":
    discount = calculateDiscount(100, GOLD_TIER)
    assert discount equals 20
```

### For Application Services

**Expected:** State-based tests (with real domain objects)

```
// GOOD: State verification
test "completing order updates status":
    order = createTestOrder()
    service.complete(order)
    assert order.status equals COMPLETED
```

### For External Integrations

**Expected:** Communication-based tests (mocks allowed)

```
// GOOD: Verifying external system interaction
test "order completion sends email":
    mockEmailService = createMock()
    service.complete(order)
    verify mockEmailService.sendConfirmation was called
```

## Anti-pattern Detection

### 1. Over-specification

**Symptom:** Test knows too much about implementation
**Check:** Would reasonable refactoring break this test?

### 2. Stub Verification

**Symptom:** Asserting on stub calls
```
// ANTI-PATTERN
stubRepo.setup(findById).returns(user)
service.process(userId)
verify stubRepo.findById was called  // <- WRONG
```

### 3. Test-Induced Design Damage

**Symptom:** Production code modified just for testing
```
// ANTI-PATTERN: Test-only code in production
if (testMode) {
    return fakeResult
}
```

### 4. Fragile Test Suite

**Symptom:** Tests frequently break on changes
**Root cause:** Usually implementation coupling

### 5. Test Duplication

**Symptom:** Same behavior tested in multiple places
**Impact:** Maintenance burden, change amplification

## Review Questions Summary

1. **Is the unit a behavior or a class?** (Should be behavior)
2. **What would break this test?** (Should be behavior change only)
3. **What's being mocked?** (Should be external boundaries only)
4. **Is stub interaction verified?** (Should be never)
5. **What style is used?** (Should match the layer)
