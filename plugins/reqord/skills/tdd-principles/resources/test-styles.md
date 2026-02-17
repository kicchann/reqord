# Test Styles: Output, State, Communication

Unit tests fall into three styles, each with different value propositions.

## 1. Output-based Style (HIGHEST VALUE)

**Concept**: Provide input to SUT, verify only the returned output.

**Prerequisite**: SUT must be a **pure function** - no hidden inputs (global state), no side effects, always returns same output for same input.

**Evaluation:**
- Regression Protection: High
- Refactoring Resistance: **Highest** - Only depends on input-output contract
- Maintainability: **Highest** - No complex setup or mocks needed

**Best for**: Domain layer business logic

**Pseudocode example:**
```
// Pure function
function calculateDiscount(orderTotal, customerTier):
    if customerTier == GOLD:
        return orderTotal * 0.20
    else if customerTier == SILVER:
        return orderTotal * 0.10
    else:
        return 0

// Output-based test
test "gold tier gets 20% discount":
    result = calculateDiscount(100, GOLD)
    assert result == 20
```

## 2. State-based Style (MEDIUM VALUE)

**Concept**: Execute operation, then verify state of SUT or collaborators.

**Prerequisite**: Typical OOP methods with side effects.

**Evaluation:**
- Refactoring Resistance: Medium to High (High if only verifying public state)
- Maintainability: Medium - State verification can become verbose

**Best for**: Object state changes, repository operations

**Pseudocode example:**
```
// State-changing method
class ShoppingCart:
    items = []

    function addItem(item):
        items.add(item)

// State-based test
test "adding item increases cart size":
    cart = new ShoppingCart()
    cart.addItem(new Item("Widget"))
    assert cart.items.length == 1
    assert cart.items[0].name == "Widget"
```

## 3. Communication-based Style (LOWEST VALUE - USE SPARINGLY)

**Concept**: Use mocks to verify SUT correctly called collaborators.

**Prerequisite**: Operations with side effects to external systems.

**Evaluation:**
- Refactoring Resistance: **Lowest** - Easily couples to implementation details
- Maintainability: Low - Mock setup is verbose and hard to read

**Use only for**: Unmanaged dependencies (external systems)

**Pseudocode example:**
```
// External system notification
class OrderService:
    emailService: IEmailService

    function completeOrder(order):
        // ... process order ...
        emailService.sendConfirmation(order.customerEmail, order.id)

// Communication-based test (ONLY for external system boundary)
test "sends confirmation email on order completion":
    mockEmailService = createMock(IEmailService)
    service = new OrderService(mockEmailService)

    service.completeOrder(testOrder)

    verify mockEmailService.sendConfirmation was called with
        email = "customer@example.com"
        orderId = testOrder.id
```

## Style Preference Hierarchy

**Output-based > State-based > Communication-based**

## Strategic Implication

To maximize high-value (Output-based) tests:
- Refactor production code to increase pure functions
- Use **Functional Core, Imperative Shell** pattern
- Extract business logic into domain models (pure functions)
- Keep controllers/services as orchestrators with no logic

## Anti-patterns to Avoid

1. **Testing internal delegation**: Verifying that one internal class called another
2. **Verifying query calls**: Checking how many times data was fetched (stub interaction)
3. **Testing implementation order**: Verifying method call sequence for internal operations
4. **Mocking private dependencies**: Using mocks for in-memory domain objects
