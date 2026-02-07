---
paths: /never/match/folder/**
---

# GitHub CLI Usage

## Proxy Environment Support

All gh commands must include repository detection:

```bash
# Get repository name (proxy environment compatible)
GH_REPO=$(git remote get-url origin | sed 's/\.git$//' | grep -oE '[^/]+/[^/]+$')

# Use -R option for all gh commands
gh issue list -R "$GH_REPO"
gh pr view -R "$GH_REPO" <number>
```
**Reason**: Local proxy URLs (127.0.0.1:48480) can prevent `gh` from automatically detecting the repository.

## Multi-User Environment

In environments shared by multiple users, the `GITHUB_TOKEN` environment variable may be set with another user's token.  
Before running the gh CLI, clear the environment variable with `unset GITHUB_TOKEN` to ensure that `gh auth` credentials are used.

```bash
unset GITHUB_TOKEN && gh pr list -R "$GH_REPO"
```

## Cross-Account Access Issues

**Symptom**: `gh` commands fail with "Not Found" or "Could not resolve to a Repository" errors even when the repository exists and you have access.

**Root Cause**: Authenticated as account A (e.g., `okappy`) but trying to access repositories owned by account B (e.g., `kicchann`).

**Check current authentication**:
```bash
gh auth status
```

**Solutions**:

1. **Switch to the repository owner's account**:
   ```bash
   gh auth login
   # Follow prompts to authenticate as the repository owner
   ```

2. **For private repos**: Ensure you're added as a collaborator on the repository

3. **For organizations**: Check if your account has proper organization membership and permissions

**Note**: Even with collaborator access, some `gh` GraphQL operations may require authentication as a member of the owning account/organization.
