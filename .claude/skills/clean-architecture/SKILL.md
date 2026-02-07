---
description: Clean Architecture principles including Dependency Inversion, Layer Separation, and Reference Rules. Use when designing new features, reviewing architecture decisions, or ensuring proper layer boundaries.
allowed-tools: Read, Grep, Glob, Edit, Write, Bash
---

# Clean Architecture Principles

This skill provides language-agnostic Clean Architecture principles for designing maintainable, testable software systems.

## When to Use This Skill

- Designing new feature architecture
- Reviewing layer boundaries and dependencies
- Evaluating dependency injection approaches
- Making decisions about abstraction placement

## Core Concepts

Clean Architecture aims to create systems where:
- Business rules are independent of frameworks
- UI, database, and external services are interchangeable
- The system is testable without external dependencies

## Quick Reference

### Layer Structure (Inside → Outside)

1. **Domain Layer** - Business rules, entities, value objects (no dependencies)
2. **Application Layer** - Use cases, application services, ports
3. **Presentation Layer** - UI, controllers, view models
4. **Infrastructure Layer** - Frameworks, databases, external APIs

### Dependency Rule

Dependencies point **inward only**. Outer layers depend on inner layers, never the reverse.

```
Infrastructure → Presentation → Application → Domain
     ↑               ↑              ↑           ↑
   (outer)                                   (inner)
```

### Key Principles

1. **Dependency Inversion**: Depend on abstractions, not concretions
2. **Interface Segregation**: Small, focused interfaces
3. **Single Responsibility**: Each layer has one reason to change

## Resources

Read these in order for comprehensive understanding:

1. `resources/dependency-inversion.md` - Dependency Inversion Principle
2. `resources/layer-separation.md` - Layer responsibilities and boundaries
3. `resources/reference-rules.md` - Abstract reference rules for any language

## Integration with Other Skills

- **good-test-principles**: Testability through proper layer separation
- **code-review-guideline**: Architecture compliance checking
- For language-specific implementation, see app-level skills
