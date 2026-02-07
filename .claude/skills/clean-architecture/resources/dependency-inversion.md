# Dependency Inversion Principle

The Dependency Inversion Principle (DIP) is the foundation of Clean Architecture, enabling testability and flexibility.

## The Principle

**High-level modules should not depend on low-level modules. Both should depend on abstractions.**

**Abstractions should not depend on details. Details should depend on abstractions.**

## Traditional vs Inverted Dependencies

### Traditional (Problematic)

```
BusinessLogic → Database
     ↓
  (depends on implementation details)
```

Problems:
- Cannot test business logic without database
- Changing database affects business logic
- Tight coupling

### Inverted (Correct)

```
BusinessLogic → IRepository ← DatabaseRepository
      ↓              ↑              ↓
  (interface)   (abstraction)  (implementation)
```

Benefits:
- Business logic testable in isolation
- Database can be swapped without changing business logic
- Loose coupling

## Interface Placement

### The Rule

**Interfaces belong to the layer that uses them, not the layer that implements them.**

### Why This Matters

```
WRONG:
  Application Layer → Infrastructure Layer
                           ↓
                      IRepository (in Infrastructure)
                           ↓
                      SqlRepository

CORRECT:
  Application Layer → IRepository (in Application) ← Infrastructure Layer
        ↓                  ↑                              ↓
   (uses interface)   (owns interface)            SqlRepository (implements)
```

When the interface is in the using layer:
- Application layer has no compile-time dependency on Infrastructure
- Infrastructure layer depends on Application layer (inversion achieved)
- Application layer controls the contract

## Practical Implementation

### Step 1: Identify External Dependencies

- Databases
- File systems
- Network services
- External APIs
- Time/date providers
- Random number generators

### Step 2: Define Abstractions in Using Layer

Create interfaces/abstract types in the layer that needs the functionality:

```
// In Application Layer
interface IUserRepository:
    function findById(id): User
    function save(user: User): void
```

### Step 3: Implement in Infrastructure Layer

```
// In Infrastructure Layer
class SqlUserRepository implements IUserRepository:
    function findById(id): User
        // SQL implementation

    function save(user: User): void
        // SQL implementation
```

### Step 4: Wire Up with Dependency Injection

At application startup (composition root), wire implementations to interfaces.

## Domain Layer: The Pure Core

The Domain layer should have **zero dependencies** on other layers or frameworks.

### What Belongs in Domain

- Entities (business objects with identity)
- Value Objects (immutable objects without identity)
- Domain Services (stateless business logic)
- Domain Events
- Aggregate Roots

### What Does NOT Belong in Domain

- Database access code
- Framework-specific annotations
- External API clients
- File I/O
- Logging (except possibly a logging abstraction)

## Testing Benefits

With proper dependency inversion:

| Layer | Testability | Test Type |
|-------|-------------|-----------|
| Domain | Highest - No dependencies | Unit tests (Output-based) |
| Application | High - Mock external interfaces | Unit/Integration tests |
| Infrastructure | Medium - Needs real resources | Integration tests |
| Presentation | Medium - Mock application services | Unit/Integration tests |

## Common Mistakes

### Mistake 1: Interface in Wrong Layer

```
// WRONG: Interface in Infrastructure
namespace Infrastructure:
    interface IRepository { ... }
    class SqlRepository implements IRepository { ... }

// This doesn't invert the dependency!
```

### Mistake 2: Leaking Infrastructure Types

```
// WRONG: Domain depends on infrastructure types
class Order:
    function save(connection: SqlConnection)  // ← Infrastructure leaked in!
```

### Mistake 3: Service Locator Pattern

```
// WRONG: Hiding dependencies
class OrderService:
    function process():
        repo = ServiceLocator.get(IRepository)  // ← Hidden dependency
```

Use constructor injection instead.
