# Self-hosting -- Building Reqord with Reqord

> [日本語](./self-hosting.ja.md)

This document explains the bootstrap strategy (dogfooding) of using Reqord itself to develop Reqord.

## "Building Reqord with Reqord" Strategy

### Benefits

1. **Self-validation** - You immediately understand usability by using your own tool
2. **Dogfooding** - Discover real pain points in real time
3. **Living documentation** - `.reqord/` itself serves as a best-practice example
4. **Incremental implementation** - You can start from the bare minimum

---

## 🚀 Bootstrap Strategy

### Phase 0: Manually Create `.reqord/`

```bash
# First, manually create the requirements for the Reqord project
mkdir -p .reqord/{context,requirements,specifications,settings}

# Write the first requirement by hand
cat > .reqord/requirements/req-001.json << 'EOF'
{
  "id": "req-001",
  "title": "CLI Basic Commands",
  "status": "draft",
  ...
}
EOF

cat > .reqord/requirements/req-001/description.md << 'EOF'
# CLI Basic Commands

## Overview
Implementation of basic commands such as reqord init, reqord req create, etc.
...
EOF
```

### Phase 1: Implement the Minimal CLI

**What to build in this phase:**

```bash
# Just getting these working is enough
reqord init           # Create .reqord/ structure
reqord req create     # Generate JSON/Markdown
reqord req list       # Display list
```

**Implementation priority:**

- ✅ Directory creation
- ✅ JSON read/write
- ✅ Markdown read/write
- ❌ AI features (deferred)
- ❌ Web UI (deferred)
- ❌ GitHub integration (deferred)

### Phase 2: Manage Your Own Requirements with Reqord

```bash
# Use the Phase 1 CLI to create Phase 2 requirements
reqord req create "AI Requirement Refinement Feature"
reqord req create "Specification CRUD"
reqord req create "GitHub Issue Generation"

# Manually edit to add details
vim .reqord/requirements/req-002/description.md

# Manually set dependencies
vim .reqord/requirements/req-002.json
# dependencies.blockedBy: ["req-001"]
```

### Phase 3: Add AI Features

```bash
# Implement AI features based on Phase 2 requirements
# Test immediately with your own requirements

reqord req enhance req-004
# → AI refines the details

# If it works well, use the results to create more requirements
reqord req enhance req-005
```

### Phase 4: Continue the Same Pattern

```
Implement → Use on your own project → Discover improvements → Implement
```

---

## 📋 Concrete Initial `.reqord/` Structure

### Example Requirements for the Reqord Project Itself

```
.reqord/
├── context/
│   ├── context.json
│   ├── product.yaml              # "AI-native requirements management tool"
│   ├── technical.yaml            # "Node.js, TypeScript, Next.js"
│   └── structure.yaml            # "packages/ monorepo"
│
├── requirements/
│   ├── req-001.json            # CLI Basic Commands
│   ├── req-001/description.md
│   ├── req-002.json            # JSON/Markdown Read/Write
│   ├── req-002/description.md
│   ├── req-003.json            # AI Requirement Refinement
│   ├── req-003/description.md
│   ├── req-004.json            # Specification CRUD
│   ├── req-005.json            # GitHub Issue Generation
│   └── ...
│
├── specifications/
│   ├── spec-001.json           # CLI Architecture
│   ├── spec-001/
│   │   └── design.md
│   └── ...
│
└── settings/
    └── templates/
        └── requirement-description.md
```

### First Requirement (req-001)

```json
// .reqord/requirements/req-001.json
{
  "id": "req-001",
  "version": "1.0.0",
  "title": "CLI Basic Commands",
  "status": "draft",
  "priority": "high",
  "createdAt": "2026-02-07T10:00:00Z",
  "updatedAt": "2026-02-07T10:00:00Z",
  "versionHistory": [],
  "files": {
    "description": "requirements/req-001/description.md"
  },
  "successCriteria": [
    "reqord init creates the directory structure",
    "reqord req create generates JSON + Markdown",
    "reqord req list displays a list"
  ],
  "format": {
    "type": "user-story",
    "userStory": {
      "as": "a developer",
      "iWant": "to manage requirements via CLI",
      "soThat": "I can quickly add requirements without a GUI"
    }
  },
  "dependencies": {},
  "estimatedComplexity": "small",
  "estimatedHours": 8
}
```

```markdown
<!-- .reqord/requirements/req-001/description.md -->

# CLI Basic Commands

## Overview

Implement the basic functionality of the reqord CLI.

## User Story

As a developer, I want to manage requirements via CLI,
so that I can quickly add requirements without a GUI.

## Required Commands

### reqord init

- Create `.reqord/` directory structure
- Place initial templates

### reqord req create <title>

- Generate JSON (requirements/req-XXX.json)
- Generate Markdown (requirements/req-XXX/description.md)
- Auto-numbering

### reqord req list

- Display requirements in a table
- Filterable by status and priority

## Technical Constraints

- Node.js 20+
- Uses Commander.js
- TypeScript
```

---

## 🔄 Development Cycle

### Week 1

```bash
# 1. Manually create requirements
vim .reqord/requirements/req-001.json

# 2. Implement minimal CLI
# packages/cli/src/commands/init.ts
# packages/cli/src/commands/req.ts

# 3. Verify it works
reqord init
reqord req create "AI Refinement"

# 4. It works!
# → From req-002 onward, create using the CLI
```

### Week 2

```bash
# 1. Create next requirements using CLI
reqord req create "Specification CRUD"

# 2. Manually edit details
vim .reqord/requirements/req-004/description.md

# 3. Implement req-004

# 4. Verify it works
reqord spec create req-001

# 5. It works!
# → From now on, Specifications can be managed too
```

### Week 3

```bash
# 1. Create AI feature requirements (using CLI)
reqord req create "AI Requirement Refinement Feature"

# 2. Implement AI features

# 3. Test with your own past requirements
reqord req enhance req-005

# 4. So convenient!
# → From now on, requirements creation is accelerated with AI
```

---

## ✅ Advantages of This Strategy

1. **Immediate feedback** - Use the features you build right away
2. **Clear priorities** - Build the features you truly need first
3. **Early bug detection** - Real usage surfaces real problems
4. **Auto-generated documentation** - `.reqord/` itself becomes an example
5. **Sustained motivation** - You can tangibly feel your own workflow improving

---

## 🎯 What to Do in the First Week

```bash
# Day 1: Manually create the foundation
mkdir -p .reqord/{context,requirements,specifications,settings}
# Hand-write the first 3-5 requirements

# Day 2-3: Implement minimal CLI
# reqord init
# reqord req create
# reqord req list

# Day 4: Add requirements using your own CLI
reqord req create "AI Refinement"
reqord req create "Spec CRUD"
reqord req create "Issue Generation"

# Day 5: Start implementing the next feature
# Implementation is based on the requirements you created!
```

This approach lets you incrementally improve the tool while feeding real usage experience back into development.
