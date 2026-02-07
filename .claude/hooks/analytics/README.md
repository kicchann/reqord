# Custom Command Analytics

Automatic custom command usage tracking and reporting system for Claude Code.

## Overview

This hook system collects statistics on custom command usage via the SessionEnd hook and provides detailed analytics reports. Data is collected automatically when Claude Code sessions end, with zero manual intervention required.

## Directory Structure

```
.claude/hooks/analytics/
├── README.md                           # This file
├── analyze-custom-commands.js          # SessionEnd hook script
├── generate-command-report.js          # Report generation script
└── __tests__/                          # Test suite
    ├── analyze-custom-commands.test.js # Unit tests (15 tests)
    └── fixtures/                       # Test data
        ├── transcript-sample.jsonl
        └── stats-sample.json
```

## Features

### Phase 1: Automatic Tracking
- **SessionEnd Hook**: Automatically triggered when Claude Code sessions end
- **Transcript Analysis**: Parses session transcripts to detect custom command usage
- **Error Detection**: Tracks command failures and error messages
- **Statistics Storage**: Saves data to `.claude/tool-usage/personal/{username}/`
- **Data Retention**: 90-day automatic cleanup

### Phase 2: Reporting
- **Usage Report**: View statistics with `/command-report` command
- **TOP 5 Commands**: Most frequently used commands
- **Error Analysis**: Commands with >5% error rate
- **Unused Detection**: Identifies never-used commands
- **Statistical Summary**: Total, active, average usage

## Configuration

### 1. SessionEnd Hook

Add to `.claude/settings.json`:

```json
{
  "hooks": {
    "SessionEnd": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "node ./.claude/hooks/analytics/analyze-custom-commands.js",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

### 2. Privacy Protection

Add to `.claude/tool-usage/.gitignore`:

```gitignore
# Personal analytics data (never commit)
personal/

# Logs
*.log
```

## Usage

### View Report

Run the custom command:

```bash
/command-report
```

Or directly:

```bash
node ./.claude/hooks/analytics/generate-command-report.js
```

### Run Tests

```bash
node .claude/hooks/analytics/__tests__/analyze-custom-commands.test.js
```

Expected output: `15 passed, 0 failed`

### Debug Mode

To see SessionEnd hook execution logs:

```bash
claude --debug
```

## Data Files

### Statistics File

Location: `.claude/tool-usage/personal/{username}/commands.json`

Contains:
- Command usage counts
- Error rates and recent errors
- Session statistics
- Usage insights

### Session History

Location: `.claude/tool-usage/personal/{username}/sessions.jsonl`

JSONL format with one session per line:
```jsonl
{"sessionId":"abc","start":"...","end":"...","commands":["list-issues"]}
```

## Technical Details

### Fail-Safe Design
- Always exits with code 0 (never blocks Claude Code)
- Graceful error handling for all failure scenarios
- Non-blocking even on disk full or permission errors

### Privacy-First
- Personal data gitignored by default
- No PII collected (only command names, counts, timestamps)
- Error messages truncated to 200 characters

### Performance
- Runs only on session end (low overhead)
- Async processing (doesn't block)
- Automatic old data cleanup (90 days)

### Cross-Platform
- Node.js stdlib only (no dependencies)
- Works on Linux, macOS, Windows
- Uses platform-agnostic path handling

## Troubleshooting

### Hook Not Firing

1. **Verify configuration**: Check `.claude/settings.json` has SessionEnd hook
2. **Check script path**: Ensure `node` command works and script exists
3. **Debug mode**: Run `claude --debug` to see hook execution logs
4. **Test manually**: 
   ```bash
   echo '{"transcript_path":"/path/to/transcript.jsonl"}' | \
     node ./.claude/hooks/analytics/analyze-custom-commands.js
   ```

### No Data Collected

1. **Check directory**: Verify `.claude/tool-usage/personal/{username}/` exists
2. **Check permissions**: Ensure directory is writable
3. **Check commands**: Run `ls .claude/commands/` to see defined commands
4. **Verify transcript**: Ensure custom commands were actually used in session

### Tests Failing

1. **Check Node version**: Requires Node.js 14+
2. **Verify fixtures**: Ensure test fixtures exist in `__tests__/fixtures/`
3. **Check permissions**: Ensure test files are readable

## Development

### Adding Tests

Add new tests to `__tests__/analyze-custom-commands.test.js`:

```javascript
suite.test('description', () => {
  const mod = loadModule();
  const result = mod.functionToTest(input);
  assert.strictEqual(result, expected);
});
```

### Modifying Scripts

After modifying scripts:
1. Run tests: `node .claude/hooks/analytics/__tests__/analyze-custom-commands.test.js`
2. Test manually with sample data
3. Verify SessionEnd hook still works with `claude --debug`

## Future Enhancements (Phase 3)

- [ ] Improvement suggestions based on usage data
- [ ] Team statistics aggregation (opt-in)
- [ ] Trend analysis over time
- [ ] Command recommendation engine
- [ ] CSV export for external analysis

## License

Part of claude-code-config project.
