# @reqord/shared

**Shared Zod schemas, types, and utilities for Reqord.**

[![npm](https://img.shields.io/npm/v/@reqord/shared)](https://www.npmjs.com/package/@reqord/shared)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](../../LICENSE)

## Install

```bash
npm install @reqord/shared
```

## Usage

```typescript
import {
  requirementSchema,
  specificationSchema,
  feedbackIndexSchema,
  type Requirement,
  type Specification,
} from "@reqord/shared";
```

## Exports

| Module | Description |
|--------|-------------|
| `schemas/` | Zod schemas for requirements, specifications, feedback, context |
| `constants/` | Shared constants (ID formats, status values) |
| `rules/` | Business rules and validation logic |
| `validation/` | SMART scoring, ambiguous phrase detection |
| `utils/` | Zod error formatting utilities |

## License

[AGPL-3.0](../../LICENSE)
