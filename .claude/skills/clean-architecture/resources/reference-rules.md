# Reference Rules

Abstract rules for what each layer can and cannot reference.

## Matrix of Allowed References

| From Layer | Can Reference | Cannot Reference |
|------------|---------------|------------------|
| **Domain** | Standard library only | Application, Presentation, Infrastructure |
| **Application** | Domain, own Ports | Presentation, Infrastructure implementations |
| **Presentation** | Application DTOs, Ports | Domain directly, Infrastructure |
| **Infrastructure** | Domain, Application Ports | Application Services directly, Presentation |

## Domain Layer Rules

### Allowed

- Standard library types
- Other Domain layer types (entities, value objects)
- Domain services within same bounded context

### Prohibited

- Application layer types
- Framework types
- Database types
- External library types (with rare exceptions)
- Infrastructure implementations

### Rationale

Domain contains core business logic. Any external dependency:
- Makes testing harder
- Creates upgrade risk
- Couples business rules to technical decisions

## Application Layer Rules

### Allowed

- Domain layer (entities, value objects, domain services)
- Own Port interfaces (abstractions for external dependencies)
- Own DTOs
- Other Application services (same bounded context)

### Prohibited

- Infrastructure implementations directly
- Presentation layer types
- Framework-specific types (where avoidable)

### Port Pattern

```
// Application Layer defines the interface
interface IEmailPort:
    function send(to: string, subject: string, body: string): void

// Application Service uses the interface
class OrderService:
    emailPort: IEmailPort

    function complete(order: Order):
        // ... business logic ...
        emailPort.send(order.customerEmail, "Order Complete", "...")
```

## Presentation Layer Rules

### Allowed

- Application layer DTOs
- Application layer Ports (for dependency injection)
- Application Services (through interfaces)
- Framework types (this layer is framework-dependent)

### Prohibited

- Domain layer directly
- Infrastructure implementations directly
- Database types

### DTO Boundary

Presentation should never expose Domain types to users:

```
// WRONG: Exposing Domain entity
function getUser(id): User  // Domain entity exposed

// CORRECT: Using DTO
function getUser(id): UserDTO  // Application DTO exposed
```

## Infrastructure Layer Rules

### Allowed

- Domain layer (to implement repository interfaces, etc.)
- Application layer Port interfaces (to implement them)
- External libraries and frameworks
- Database/file system/network types

### Prohibited

- Application Services directly (only Ports)
- Presentation layer types

### Implementation Pattern

```
// Infrastructure implements Application's Port
class SmtpEmailAdapter implements IEmailPort:
    function send(to: string, subject: string, body: string):
        // SMTP-specific implementation
```

## Special Cases

### Cross-Cutting Concerns

Logging, authentication, and similar concerns need special treatment:

**Option 1: Abstract in Application, Implement in Infrastructure**
```
// Application
interface ILogger:
    function log(level: Level, message: string): void

// Infrastructure
class SerilogLogger implements ILogger:
    // implementation
```

**Option 2: Aspect-Oriented Approach**
Use framework capabilities to inject concerns without explicit dependencies.

### Shared Kernel

For shared types between bounded contexts:

- Create a separate "Shared Kernel" module
- Contains only simple value objects and interfaces
- Both Domain layers can reference it
- Minimize what goes here

## Validation Checklist

### For Each File, Ask:

1. **What layer is this in?**
2. **What does it reference?**
3. **Do references follow the rules?**

### Quick Reference Validation

```
Domain file references:
  ✓ Standard library
  ✓ Other Domain types
  ✗ Application/Presentation/Infrastructure

Application file references:
  ✓ Domain
  ✓ Own Ports (interfaces)
  ✓ Own DTOs
  ✗ Infrastructure implementations

Presentation file references:
  ✓ Application DTOs
  ✓ Application Ports
  ✗ Domain directly
  ✗ Infrastructure directly

Infrastructure file references:
  ✓ Domain
  ✓ Application Ports (to implement)
  ✗ Application Services
  ✗ Presentation
```

## Enforcement Strategies

1. **Module/Package Boundaries**: Use language features to enforce access
2. **Build Tool Checks**: Configure dependency analysis
3. **Code Review**: Include reference checking in review
4. **Architecture Tests**: Write tests that verify references
