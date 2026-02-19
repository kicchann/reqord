---
audience: Everyone (developers, tech leads, POs, AI agents)
prerequisites: None
related: docs/advanced/specification.md, docs/guide-requirements.md
---

> **Summary**: A 30-second overview of Reqord and a guide to the best reading path for your role.

# About Reqord

> [日本語](./index.ja.md)

## What is Reqord?

**Reqord** is a CLI tool that structures product requirements, specifications, and implementation tasks, managing and visualizing the entire lifecycle.

It keeps "what to build" and "why to build it" in the same repository as your code, maintaining synchronization with the implementation.

### Value in AI-Driven Development

In an era where AI generates code at high speed, managing "what we are building" becomes even more important. Reqord's structured data serves as clear input for AI, providing a foundation for humans to maintain situational awareness.

### Concrete Use Cases

1. **Create requirements with the CLI** — Write structured requirements with `reqord req create`
2. **Refine and review with AI** — Supports EARS format conversion, SMART validation, and specification design
3. **Approve via PR** — Git-based approval flow (CODEOWNERS review -> merge to confirm approval)
4. **Break down into GitHub Issues** — Auto-generate implementation tasks from specifications, reflecting dependencies

## Document Structure

| File | Content | When to Read |
|------|---------|--------------|
| [01-philosophy.md](./01-philosophy.md) | Why Reqord exists | To understand the rationale behind design decisions |
| [02-purpose.md](./02-purpose.md) | What it achieves and for whom | To learn what Reqord can do |
| [03-theory.md](./03-theory.md) | Adopted methodologies and rationale | To understand the theoretical background of EARS, SMART, etc. |
| [04-best-practices.md](./04-best-practices.md) | Effective usage patterns | To get practical know-how |
| [05-donts.md](./05-donts.md) | Things to avoid | To prevent common mistakes |
| [06-ai-integration.md](./06-ai-integration.md) | Usage in AI-driven development | To learn how to integrate with AI tools |

Each document can be read independently, but reading them in order provides a systematic understanding.

## Recommended Paths by Persona

### Already Doing AI-Driven Development
-> [philosophy](./01-philosophy.md) -> [purpose](./02-purpose.md) -> [ai-integration](./06-ai-integration.md)
- Understand how Reqord differs from spec-kit/kiro and its positioning
- Learn concrete AI workflows and tool-specific patterns

### New to Requirements Management
-> [purpose](./02-purpose.md) -> [theory](./03-theory.md) -> [best-practices](./04-best-practices.md)
- Learn step by step from basic concepts to practical patterns

### Want to Get Started Quickly
-> [purpose](./02-purpose.md) -> [best-practices](./04-best-practices.md) -> [donts](./05-donts.md)
- Start using Reqord effectively in the shortest time

### AI Agents
-> [philosophy](./01-philosophy.md) + [purpose](./02-purpose.md) -> [best-practices](./04-best-practices.md) + [donts](./05-donts.md) -> [ai-integration](./06-ai-integration.md)
- Accurately grasp design intent and constraints
- Understand AI integration phases and ProjectContext structure

## Related Documents

- [docs/advanced/specification.md](../advanced/specification.md) — Detailed technical specifications and design principles
- [docs/guide-requirements.md](../guide-requirements.md) — Requirements writing guide (implementation details)
- [docs/guide-feedback.md](../guide-feedback.md) — Feedback management design
- [.reqord/context/domain/](../../.reqord/context/domain/) — Domain knowledge referenced by AI
