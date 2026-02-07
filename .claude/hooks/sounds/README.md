# Complete Sound Script

Cross-platform sound playback script for Claude Code completion notifications.

## Overview

`complete-sound.sh` plays a completion sound when Claude Code finishes a task. It automatically detects the platform (WSL2, macOS, or Linux) and uses the appropriate sound playback method.

## Platform Support

### WSL2

**Detection**: Checks if `/proc/version` contains "microsoft" or "WSL"

**Playback**: Uses PowerShell's `[console]::beep()` to play a 4-tone sequence:
- C5 (523 Hz) - 80ms
- E5 (659 Hz) - 80ms
- G5 (783 Hz) - 80ms
- C6 (1046 Hz) - 120ms

### macOS

**Detection**: Checks if `uname -s` returns "Darwin"

**Playback**: Uses `afplay` with system sounds:
1. `/System/Library/Sounds/Glass.aiff` (primary)
2. `/System/Library/Sounds/Ping.aiff` (fallback)

### Linux

**Detection**: Default if not WSL2 or macOS

**Playback**: Tries multiple methods in order:
1. **paplay** (PulseAudio) - Freedesktop/Ubuntu sound files
2. **aplay** (ALSA) - WAV sound files
3. **beep** (PC speaker) - Same 4-tone sequence as WSL2
4. **speaker-test** (ALSA test) - 1000 Hz sine wave
5. **Silent fallback** - Always succeeds, no error

## Design Principles

1. **Fail-safe**: Always exits with status 0, never blocks Claude Code
2. **Silent on error**: All errors redirected to `/dev/null`
3. **Graceful degradation**: Falls back through multiple methods
4. **No dependencies**: Works even if all sound commands are missing

## Testing

### Automated Tests

```bash
# Run all tests
./.claude/hooks/sounds/test-complete-sound.sh
```

### Manual Testing

```bash
# Test the script directly
./.claude/hooks/sounds/complete-sound.sh

# Should hear a sound (or silent success if no audio available)
# Should always exit with status 0
```

### Platform Detection

```bash
# On WSL2
$ cat /proc/version
Linux version ... microsoft-standard-WSL2 ...

# On macOS
$ uname -s
Darwin

# On Linux
$ uname -s
Linux
```

## Implementation Details

### Function Structure

```bash
detect_platform()  # Returns: wsl2 | macos | linux
play_wsl2()        # PowerShell beep
play_macos()       # afplay system sounds
play_linux()       # Fallback chain
main()             # Entry point
```

### Exit Behavior

- Always exits with status 0
- No output to stdout/stderr (all redirected to `/dev/null`)
- Execution time: < 5 seconds typical, < 1 second on most systems

## Future Enhancements

Potential improvements for consideration:

- Custom sound file support via environment variable
- Volume control
- Different sounds for different event types
- Configuration file support

## Related Files

- `complete-sound.sh` - Main script
- `test-complete-sound.sh` - Automated test suite
- `test-platform-detection.sh` - Platform detection tests
- `README.md` - This file
