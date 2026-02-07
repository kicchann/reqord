# Layer Separation

Each layer in Clean Architecture has distinct responsibilities and boundaries.

## Layer Overview

### Domain Layer (Innermost)

**Responsibility**: Business rules and domain logic

**Contains**:
- Entities (objects with identity and lifecycle)
- Value Objects (immutable objects defined by attributes)
- Domain Services (stateless operations on domain objects)
- Domain Events
- Aggregate Roots (consistency boundaries)

**Dependencies**: None (standard library only)

**Characteristics**:
- Framework-independent
- Persistence-ignorant
- Can be tested in isolation
- Changes only when business rules change

### Application Layer

**Responsibility**: Application-specific business rules, orchestration

**Contains**:
- Use Cases / Application Services
- Commands and Queries
- DTOs for layer boundaries
- Port interfaces (abstractions for external dependencies)
- Application Events

**Dependencies**: Domain Layer only

**Characteristics**:
- Orchestrates domain objects
- Defines application workflows
- Transaction boundaries
- Contains no business rules (those belong in Domain)
- Changes when application workflows change

### Presentation Layer

**Responsibility**: User interface and user interaction

**Contains**:
- Controllers / Handlers
- View Models
- Views / Templates
- Input Validation
- Response Formatting

**Dependencies**: Application Layer (through DTOs)

**Characteristics**:
- Framework-dependent (acceptable)
- Transforms between user format and application format
- No business logic
- Changes when UI requirements change

### Infrastructure Layer (Outermost)

**Responsibility**: Technical capabilities, external services

**Contains**:
- Database implementations (repositories)
- File system access
- External API clients
- Message queue implementations
- Caching implementations
- Logging implementations

**Dependencies**: Application Layer (for Port interfaces), Domain Layer

**Characteristics**:
- Framework and library dependent
- Implements Port interfaces from Application layer
- Changes when external dependencies change

## The Dependency Rule

**Dependencies always point inward.**

```
┌─────────────────────────────────────┐
│         Infrastructure              │
│  ┌───────────────────────────────┐  │
│  │       Presentation            │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │      Application        │  │  │
│  │  │  ┌───────────────────┐  │  │  │
│  │  │  │      Domain       │  │  │  │
│  │  │  │                   │  │  │  │
│  │  │  └───────────────────┘  │  │  │
│  │  └─────────────────────────┘  │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
        ← Dependencies point inward
```

## Crossing Layer Boundaries

### Data Flow

**Inward (User → Domain):**
1. Presentation receives raw input
2. Transforms to Application DTOs
3. Application orchestrates Domain operations
4. Domain executes business rules

**Outward (Domain → User):**
1. Domain returns results
2. Application transforms to response DTOs
3. Presentation formats for user

### Interface Boundaries

Each layer boundary should have explicit interfaces:

```
Presentation → IApplicationService → Application → IDomainService → Domain
              ← ResponseDTO         ← DomainResult
```

## Characteristics of Proper Separation

### 1. Independent Deployability

Each layer could theoretically be deployed independently:
- Domain as a library
- Application as a service
- Presentation as separate UI application
- Infrastructure as plugins

### 2. Framework Independence

- Domain: Zero framework dependencies
- Application: Minimal framework dependencies
- Only outer layers: Heavy framework usage acceptable

### 3. Testability Gradient

| Layer | Isolation Level | Test Speed | Mock Needs |
|-------|-----------------|------------|------------|
| Domain | Complete | Fastest | None |
| Application | High | Fast | Ports only |
| Presentation | Medium | Medium | App services |
| Infrastructure | Low | Slower | Real resources |

### 4. Change Frequency

Expect change frequency to decrease toward center:
- Infrastructure: Frequent (external changes)
- Presentation: Frequent (UI changes)
- Application: Moderate (workflow changes)
- Domain: Rare (business rule changes)

## Anti-patterns

### Anemic Domain Model

```
// WRONG: Logic in Application, Domain is just data
class User:
    name: string
    email: string

class UserService:
    function changeEmail(user: User, newEmail: string):
        if isValidEmail(newEmail):  // ← Business rule leaked out!
            user.email = newEmail
```

```
// CORRECT: Logic in Domain
class User:
    function changeEmail(newEmail: string): Result
        if not isValidEmail(newEmail):
            return Error("Invalid email")
        this.email = newEmail
        return Success
```

### Smart Controllers

```
// WRONG: Business logic in Presentation
class OrderController:
    function create(items):
        if items.length == 0:  // ← Business rule!
            return Error("Empty order")
        total = calculateTotal(items)  // ← Business logic!
```

### Leaky Abstractions

```
// WRONG: Infrastructure types in Domain
class User:
    id: SqlGuid  // ← SQL-specific type!
```

### Circular Dependencies

```
// WRONG: Application depends on Infrastructure
class OrderService:
    repo: SqlOrderRepository  // ← Concrete type!
```
