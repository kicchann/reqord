---
description: Code review principles covering test quality verification, architecture compliance, and general review checklist. Use when reviewing code, providing feedback, or establishing review standards.
allowed-tools: Read, Grep, Glob, Edit, Write, Bash
---

# Code Review Guideline

This skill provides language-agnostic principles for conducting effective code reviews.

## When to Use This Skill

- Reviewing pull requests
- Providing constructive feedback
- Setting up review standards for a team
- Self-reviewing code before submission

## Core Philosophy

Code review serves two purposes:
1. **Quality Gate**: Catch bugs, vulnerabilities, and design issues
2. **Knowledge Sharing**: Spread understanding across the team

## Quick Reference

### Review Priorities (Highest → Lowest)

1. **Correctness**: Does it work correctly?
2. **Security**: Any vulnerabilities?
3. **Architecture**: Does it follow project patterns?
4. **Test Quality**: Are tests valuable (not just present)?
5. **Readability**: Can others understand it?
6. **Performance**: Any obvious issues?

### Test Quality Signals

**Good Signs:**
- Tests verify behavior, not implementation
- Tests use real objects where possible
- Mocks only at external boundaries
- Clear Arrange-Act-Assert structure

**Warning Signs:**
- Tests verify method call counts
- Tests break on refactoring
- Every class has corresponding test file (London school smell)
- Mock setup longer than actual test

## Resources

1. `resources/review-checklist.md` - General review checklist
2. `resources/tdd-verification.md` - TDD practice verification

## Integration with Other Skills

- **good-test-principles**: Detailed test quality criteria
- **clean-architecture**: Architecture compliance checking
