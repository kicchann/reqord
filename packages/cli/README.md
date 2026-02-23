# @reqord/cli

**Git-native requirements management CLI -- traceable, AI-ready, local-first.**

[![npm](https://img.shields.io/npm/v/@reqord/cli)](https://www.npmjs.com/package/@reqord/cli)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](../../LICENSE)

## Install

```bash
npm install -g @reqord/cli
```

## Quick Start

```bash
# 1. Initialize .reqord/ directory in your project
reqord init

# 2. Create your first requirement
reqord req create

# 3. List requirements
reqord req list
```

## Commands

| Command | Description |
|---------|-------------|
| `reqord init` | Initialize `.reqord/` directory structure |
| `reqord context init` | Set up project context |
| `reqord context show` | Display project context summary |
| `reqord context update` | Update context metadata |
| `reqord req create` | Create a new requirement |
| `reqord req list` | List requirements (with filters) |
| `reqord req show <id>` | Show requirement details |
| `reqord req update <id>` | Update requirement metadata |
| `reqord req delete <id>` | Delete a requirement |
| `reqord req validate <id>` | SMART validation scoring |
| `reqord req history <id>` | View version history |
| `reqord req approve <id>` | Create approval PR |
| `reqord spec create <req-id>` | Create specification for a requirement |
| `reqord spec list` | List specifications |
| `reqord spec show <id>` | Show specification details |
| `reqord spec design <id>` | View/update design document |
| `reqord spec approve <id>` | Create approval PR for specification |
| `reqord feedback sync` | Sync with GitHub Issues |
| `reqord feedback list` | List feedback items |
| `reqord feedback show <id>` | Show feedback details |
| `reqord feedback close <id>` | Close a feedback item |
| `reqord feedback link <id>` | Link feedback to requirement/spec |
| `reqord task create <spec-id>` | Generate GitHub Issues from tasks |
| `reqord task sync <spec-id>` | Sync issue status to specification |
| `reqord ui` | Launch web dashboard |

For the full command reference including planned features, see the [CLI Reference](../../docs/cli-reference.md).

## Prerequisites

- Node.js 20+
- Git
- GitHub CLI (`gh`) -- required for feedback sync, approval, and issue commands

## Documentation

- [Getting Started](../../docs/getting-started.md)
- [Requirements Guide](../../docs/guide-requirements.md)
- [Full Documentation](../../docs/README.md)

## License

[AGPL-3.0](../../LICENSE)
