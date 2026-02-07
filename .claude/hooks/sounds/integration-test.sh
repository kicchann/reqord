#!/bin/bash
# Integration test for complete-sound.sh
# Verifies all requirements are met

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOUND_SCRIPT="${SCRIPT_DIR}/complete-sound.sh"

echo "Complete Sound Script - Integration Test"
echo "=========================================="
echo ""

# Test 1: Platform detection
echo "1. Platform Detection:"
if [ -f /proc/version ] && grep -qi "microsoft\|wsl" /proc/version 2>/dev/null; then
    echo "   Platform: WSL2"
    echo "   Expected behavior: PowerShell beep sounds"
    command -v powershell.exe >/dev/null 2>&1 && echo "   ✓ powershell.exe available" || echo "   ✗ powershell.exe not available"
elif [ "$(uname -s)" = "Darwin" ]; then
    echo "   Platform: macOS"
    echo "   Expected behavior: afplay Glass.aiff or Ping.aiff"
    command -v afplay >/dev/null 2>&1 && echo "   ✓ afplay available" || echo "   ✗ afplay not available"
    [ -f /System/Library/Sounds/Glass.aiff ] && echo "   ✓ Glass.aiff found" || echo "   ✗ Glass.aiff not found"
    [ -f /System/Library/Sounds/Ping.aiff ] && echo "   ✓ Ping.aiff found" || echo "   ✗ Ping.aiff not found"
else
    echo "   Platform: Linux"
    echo "   Expected behavior: Fallback chain (paplay > aplay > beep > speaker-test > silent)"
    command -v paplay >/dev/null 2>&1 && echo "   ✓ paplay available" || echo "   - paplay not available"
    command -v aplay >/dev/null 2>&1 && echo "   ✓ aplay available" || echo "   - aplay not available"
    command -v beep >/dev/null 2>&1 && echo "   ✓ beep available" || echo "   - beep not available"
    command -v speaker-test >/dev/null 2>&1 && echo "   ✓ speaker-test available" || echo "   - speaker-test not available"
    echo "   ✓ Silent fallback always works"
fi
echo ""

# Test 2: Exit status
echo "2. Exit Status Test:"
"$SOUND_SCRIPT" 2>/dev/null
EXIT_CODE=$?
if [ $EXIT_CODE -eq 0 ]; then
    echo "   ✓ Script exits with status 0"
else
    echo "   ✗ Script exits with status $EXIT_CODE (should be 0)"
fi
echo ""

# Test 3: Error suppression
echo "3. Error Suppression Test:"
OUTPUT=$("$SOUND_SCRIPT" 2>&1)
if [ -z "$OUTPUT" ]; then
    echo "   ✓ No output to stdout/stderr"
else
    echo "   ✗ Script produced output: $OUTPUT"
fi
echo ""

# Test 4: Execution time
echo "4. Execution Time Test:"
if command -v date >/dev/null 2>&1; then
    START=$(date +%s)
    "$SOUND_SCRIPT" 2>/dev/null
    END=$(date +%s)
    DURATION=$((END - START))
    echo "   Execution time: ${DURATION}s"
    if [ $DURATION -lt 5 ]; then
        echo "   ✓ Executes in reasonable time (< 5s)"
    else
        echo "   ✗ Execution took too long (> 5s)"
    fi
else
    echo "   - Timing test skipped (date command not available)"
fi
echo ""

# Test 5: File permissions
echo "5. File Permissions Test:"
if [ -x "$SOUND_SCRIPT" ]; then
    echo "   ✓ Script is executable"
else
    echo "   ✗ Script is not executable"
fi
echo ""

# Test 6: Consistency test (multiple runs)
echo "6. Consistency Test (5 runs):"
FAIL_COUNT=0
for i in 1 2 3 4 5; do
    "$SOUND_SCRIPT" 2>/dev/null
    if [ $? -ne 0 ]; then
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
done
if [ $FAIL_COUNT -eq 0 ]; then
    echo "   ✓ All 5 runs succeeded"
else
    echo "   ✗ $FAIL_COUNT out of 5 runs failed"
fi
echo ""

echo "=========================================="
echo "Integration test complete!"
echo ""
echo "Manual verification:"
echo "- Listen for sound when script runs"
echo "- Verify appropriate sound method for your platform"
echo ""
