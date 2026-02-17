# General Code Review Checklist

A language-agnostic checklist for effective code reviews.

## 1. Correctness

### Logic
- [ ] Does the code do what it's supposed to do?
- [ ] Are edge cases handled?
- [ ] Are error conditions handled appropriately?
- [ ] Are there any off-by-one errors?
- [ ] Are comparison operators correct (< vs <=, etc.)?

### Data Handling
- [ ] Are null/undefined values handled?
- [ ] Are type conversions correct?
- [ ] Are collections/arrays bounds checked?
- [ ] Is data validated before use?

### Concurrency (if applicable)
- [ ] Are shared resources properly synchronized?
- [ ] Are there race conditions?
- [ ] Are deadlocks possible?

## 2. Security

### Input Validation
- [ ] Is all external input validated?
- [ ] Is input sanitized before use?
- [ ] Are injection attacks prevented?

### Authentication & Authorization
- [ ] Are authentication checks in place?
- [ ] Are authorization checks correct?
- [ ] Are secrets properly managed (not hardcoded)?

### Data Protection
- [ ] Is sensitive data properly encrypted?
- [ ] Are logs free of sensitive information?
- [ ] Is personal data handled per requirements?

## 3. Architecture Compliance

### Layer Boundaries
- [ ] Does code belong in the correct layer?
- [ ] Are dependencies pointing in the correct direction?
- [ ] Are abstractions used at layer boundaries?

### Project Patterns
- [ ] Does the code follow project conventions?
- [ ] Are naming conventions followed?
- [ ] Is the file in the correct location?

### SOLID Principles
- [ ] Does each class have a single responsibility?
- [ ] Is new behavior added without modifying existing code (OCP)?
- [ ] Are interfaces small and focused?
- [ ] Are dependencies injected, not created?

## 4. Test Quality

### Coverage
- [ ] Are important paths tested?
- [ ] Are edge cases tested?
- [ ] Are error conditions tested?

### Test Design
- [ ] Do tests verify behavior, not implementation?
- [ ] Are tests independent of each other?
- [ ] Can tests run in any order?
- [ ] Are tests deterministic?

### Test Doubles
- [ ] Are mocks used only for external boundaries?
- [ ] Are real objects used for domain logic?
- [ ] Are stubs not being verified?

(See `tdd-verification.md` for detailed test quality review)

## 5. Readability

### Naming
- [ ] Do names describe purpose/intent?
- [ ] Are names consistent with project conventions?
- [ ] Are abbreviations avoided (unless standard)?

### Structure
- [ ] Is code broken into logical sections?
- [ ] Are functions/methods focused (single purpose)?
- [ ] Is nesting depth reasonable?
- [ ] Is complexity manageable?

### Documentation
- [ ] Are complex algorithms explained?
- [ ] Are "why" decisions documented (not just "what")?
- [ ] Is public API documented appropriately?

## 6. Performance

### Obvious Issues
- [ ] Are there N+1 query problems?
- [ ] Are there unnecessary loops?
- [ ] Is there premature optimization?

### Resource Management
- [ ] Are resources properly released?
- [ ] Are large collections handled appropriately?
- [ ] Are expensive operations cached where sensible?

## 7. Maintainability

### Change Impact
- [ ] Is the change isolated or does it ripple?
- [ ] Are modifications backward compatible?
- [ ] Is the change reversible if needed?

### Technical Debt
- [ ] Does this introduce new debt?
- [ ] Are existing issues made worse?
- [ ] Are TODOs tracked appropriately?

## Review Approach

### Be Constructive
- Focus on the code, not the person
- Explain "why" with suggestions
- Acknowledge good solutions
- Distinguish preferences from requirements

### Be Thorough but Focused
- Review in passes (architecture first, then details)
- Don't block on style-only issues
- Prioritize findings

### Be Timely
- Review within reasonable timeframe
- Don't hold up releases for minor issues
- Follow up on discussions
