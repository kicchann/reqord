---
description: Code review a pull request
allowed-tools: Bash(gh issue view:*), Bash(gh search:*), Bash(gh issue list:*), Bash(gh pr comment:*), Bash(gh pr diff:*), Bash(gh pr view:*), Bash(gh pr list:*), Bash(gh pr edit:*), Bash(gh api:*), Bash(git:*), mcp__github_inline_comment__create_inline_comment, AskUserQuestion, Skill
model: opus
---

Provide a code review for the given pull request.

**Agent assumptions (applies to all agents and subagents):**
- All tools are functional and will work without error. Do not test tools or make exploratory calls. Make sure this is clear to every subagent that is launched.
- Only call a tool if it is required to complete the task. Every tool call should have a clear purpose.

To do this, follow these steps precisely:

1. Launch a haiku agent to check if any of the following are true:
   - The pull request is closed
   - The pull request is a draft
   - The pull request does not need code review (e.g. automated PR, trivial change that is obviously correct)
   - Claude has already commented on this PR (check `gh pr view <PR> --comments` for comments left by claude)

   If any condition is true, stop and do not proceed.

Note: Still review Claude generated PR's.

2. Launch a haiku agent to return a list of file paths (not their contents) for all relevant CLAUDE.md files including:
   - The root CLAUDE.md file, if it exists
   - Any CLAUDE.md files in directories containing files modified by the pull request

3. Launch a sonnet agent to view the pull request and return a summary of the changes

4. Launch 4 agents in parallel to independently review the changes. Each agent should return the list of issues, where each issue includes a description and the reason it was flagged (e.g. "CLAUDE.md adherence", "bug"). The agents should do the following:

   Agents 1 + 2: CLAUDE.md compliance sonnet agents
   Audit changes for CLAUDE.md compliance in parallel. Note: When evaluating CLAUDE.md compliance for a file, you should only consider CLAUDE.md files that share a file path with the file or parents.

   Agent 3: Opus bug agent (parallel subagent with agent 4)
   Scan for obvious bugs. Focus only on the diff itself without reading extra context. Flag only significant bugs; ignore nitpicks and likely false positives. Do not flag issues that you cannot validate without looking at context outside of the git diff.

   Agent 4: Opus bug agent (parallel subagent with agent 3)
   Look for problems that exist in the introduced code. This could be security issues, incorrect logic, etc. Only look for issues that fall within the changed code.

   **CRITICAL: We only want HIGH SIGNAL issues.** Flag issues where:
   - The code will fail to compile or parse (syntax errors, type errors, missing imports, unresolved references)
   - The code will definitely produce wrong results regardless of inputs (clear logic errors)
   - Clear, unambiguous CLAUDE.md violations where you can quote the exact rule being broken

   Do NOT flag:
   - Code style or quality concerns
   - Potential issues that depend on specific inputs or state
   - Subjective suggestions or improvements

   If you are not certain an issue is real, do not flag it. False positives erode trust and waste reviewer time.

   In addition to the above, each subagent should be told the PR title and description. This will help provide context regarding the author's intent.

5. For each issue found in the previous step by agents 3 and 4, launch parallel subagents to validate the issue. These subagents should get the PR title and description along with a description of the issue. The agent's job is to review the issue to validate that the stated issue is truly an issue with high confidence. For example, if an issue such as "variable is not defined" was flagged, the subagent's job would be to validate that is actually true in the code. Another example would be CLAUDE.md issues. The agent should validate that the CLAUDE.md rule that was violated is scoped for this file and is actually violated. Use Opus subagents for bugs and logic issues, and sonnet agents for CLAUDE.md violations.

6. Filter out any issues that were not validated in step 5. This step will give us our list of high signal issues for our review.

7. If issues were found, skip to step 8 to post inline comments directly.

   If NO issues were found, post a summary comment using `gh pr comment` (if `--comment` argument is provided):
   "No issues found. Checked for bugs and CLAUDE.md compliance."

8. Create a list of all comments that you plan on leaving. This is only for you to make sure you are comfortable with the comments. Do not post this list anywhere.

9. Post inline comments for each issue using `mcp__github_inline_comment__create_inline_comment`. For each comment:
   - Provide a brief description of the issue
   - For small, self-contained fixes, include a committable suggestion block
   - For larger fixes (6+ lines, structural changes, or changes spanning multiple locations), describe the issue and suggested fix without a suggestion block
   - Never post a committable suggestion UNLESS committing the suggestion fixes the issue entirely. If follow up steps are required, do not leave a committable suggestion.

   **IMPORTANT: Only post ONE comment per unique issue. Do not post duplicate comments.**

Use this list when evaluating issues in Steps 4 and 5 (these are false positives, do NOT flag):

- Pre-existing issues
- Something that appears to be a bug but is actually correct
- Pedantic nitpicks that a senior engineer would not flag
- Issues that a linter will catch (do not run the linter to verify)
- General code quality concerns (e.g., lack of test coverage, general security issues) unless explicitly required in CLAUDE.md
- Issues mentioned in CLAUDE.md but explicitly silenced in the code (e.g., via a lint ignore comment)

Notes:

- **Important**: For all gh commands, first get the repo name with `GH_REPO=$(git remote get-url origin | sed 's/\.git$//' | grep -oE '[^/]+/[^/]+$')` and use `-R "$GH_REPO"` option (e.g., `gh pr view -R "$GH_REPO" <PR>`). This is required for proxy environments.
- Use gh CLI to interact with GitHub (e.g., fetch pull requests, create comments). Do not use web fetch.
- Create a todo list before starting.
- You must cite and link each issue in inline comments (e.g., if referring to a CLAUDE.md, include a link to it).
- If no issues are found, post a comment with the following format:

---

## Code review

No issues found. Checked for bugs and CLAUDE.md compliance.

---

- When linking to code in inline comments, follow the following format precisely, otherwise the Markdown preview won't render correctly: https://github.com/anthropics/claude-code/blob/c21d3c10bc8e898b7ac1a2d745bdc9bc4e423afe/package.json#L10-L15
  - Requires full git sha
  - You must provide the full sha. Commands like `https://github.com/owner/repo/blob/$(git rev-parse HEAD)/foo/bar` will not work, since your comment will be directly rendered in Markdown.
  - Repo name must match the repo you're code reviewing
  - # sign after the file name
  - Line range format is L[start]-L[end]
  - Provide at least 1 line of context before and after, centered on the line you are commenting about (eg. if you are commenting about lines 5-6, you should link to `L4-7`)

## 10. Next Step Prompt

After completing the review, use AskUserQuestion to prompt for the next workflow step:

```yaml
AskUserQuestion:
  question: "レビュー完了。次のステップに進みますか？"
  header: "次のステップ"
  options:
    - label: "/check-merge を実行"
      description: "マージ前最終チェックを実行"
    - label: "人間/AIレビューを依頼"
      description: "追加のレビュアーを選択"
    - label: "終了"
      description: "レビューのみで終了"
  multiSelect: false
```

If user selects "/check-merge を実行", invoke the Skill tool with `skill: "check-merge"`.

If user selects "人間/AIレビューを依頼", proceed to Step 11.

## 11. Reviewer Selection

Get collaborators and build reviewer candidate list:

```bash
# Get PR author
PR_AUTHOR=$(gh pr view -R "$GH_REPO" <PR番号> --json author -q '.author.login')

# Get collaborators (exclude PR author)
REVIEWERS=$(gh api "repos/$GH_REPO/collaborators" 2>/dev/null | jq -r '.[].login' | grep -v "$PR_AUTHOR")

# Fallback: if collaborators API fails, get from commit history
if [ -z "$REVIEWERS" ]; then
  REVIEWERS=$(git log --format='%aN' -100 | sort -u | grep -v "$PR_AUTHOR" | head -5)
fi
```

**Note**: Use `collaborators` API as `contributors` and `assignees` APIs may return 404. Falls back to git log on failure.

```yaml
AskUserQuestion (multiSelect: true):
  question: "レビュアーを選択してください"
  header: "レビュアー"
  options:
    # AI reviewers (always shown)
    - label: "@copilot"
      description: "GitHub Copilot レビュー"
    - label: "@claude"
      description: "Claude AI レビュー"
    # Dynamically generated from collaborators
    - label: "@contributor1"
      description: "コントリビュータ"
    - label: "@contributor2"
      description: "コントリビュータ"
    # ...
```

After selection, add reviewers to PR:

```bash
# Add human reviewers
gh pr edit -R "$GH_REPO" <PR番号> --add-reviewer <human_reviewers>

# AI reviewers are mentioned via comment
if "@claude" selected:
  gh pr comment -R "$GH_REPO" <PR番号> --body "@claude please review this PR"
if "@copilot" selected:
  gh pr comment -R "$GH_REPO" <PR番号> --body "@copilot please review this PR"
```

Display review request completion message and end.
