# Getting Started

> [日本語](./getting-started.ja.md)

Install Reqord and start managing your project's requirements.

## Prerequisites

- Node.js 20+
- Git

## Install

```bash
npm install -g @reqord/cli
```

## Initialize a project

```bash
cd /path/to/your/project

# Create the .reqord/ directory structure
reqord init

# Set up the project context
reqord context init
```

Running `reqord init` generates the following structure at the project root:

```
.reqord/
├── context/          # Project context
│   ├── context.yaml
│   ├── product.yaml
│   ├── technical.yaml
│   └── domain/
├── requirements/     # Requirements data
├── specifications/   # Specifications data
└── settings/         # Templates and rules
```

## Create your first requirement

```bash
# Create a requirement interactively (choose from EARS / User Story / Free-form format)
reqord req create

# List created requirements
reqord req list

# View requirement details
reqord req show req-000001
```

## Validate quality

```bash
# Score requirement quality against SMART criteria
reqord req validate req-000001
```

SMART validation detects ambiguous descriptions and provides guidance for improvement.

## Create a specification

Once a requirement is defined, create a specification (how to implement it):

```bash
# Create a specification linked to a requirement
reqord spec create req-000001

# View the design document
reqord spec design spec-000001
```

## Launch the dashboard

Visualize requirement status and dependencies through the Web UI:

```bash
reqord ui
```

This opens `http://localhost:3000` in your browser, where you can view project health metrics, dependency graphs, specification details, and more.

## Next steps

- [Requirements Guide](./guide-requirements.md) -- How to write requirements, granularity, and formats
- [CLI Reference](./cli-reference.md) -- Full command reference
- [About Reqord](./about/index.md) -- Design philosophy and theoretical background
