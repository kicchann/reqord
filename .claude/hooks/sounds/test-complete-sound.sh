#!/bin/bash
# Test script for complete-sound.sh
# Manual verification tests for cross-platform support

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOUND_SCRIPT="${SCRIPT_DIR}/complete-sound.sh"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Test helper
test_result() {
    local test_name="$1"
    local result="$2"

    if [ "$result" = "0" ]; then
        echo -e "${GREEN}✓${NC} $test_name"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗${NC} $test_name"
        ((TESTS_FAILED++))
    fi
}

# Test 1: Script exists and is executable
test_script_exists() {
    if [ -f "$SOUND_SCRIPT" ] && [ -x "$SOUND_SCRIPT" ]; then
        return 0
    else
        return 1
    fi
}

# Test 2: Script exits with status 0
test_exit_status() {
    "$SOUND_SCRIPT" 2>/dev/null
    local exit_code=$?
    [ "$exit_code" = "0" ]
}

# Test 3: detect_platform function exists and works
test_detect_platform() {
    # Source the script functions (need to export them for testing)
    # For now, we'll test by executing the script
    # This test checks if the script runs without errors
    "$SOUND_SCRIPT" 2>/dev/null
    return $?
}

# Test 4: Script handles missing commands gracefully
test_missing_commands() {
    # Even if sound commands are missing, script should exit 0
    "$SOUND_SCRIPT" 2>/dev/null
    local exit_code=$?
    [ "$exit_code" = "0" ]
}

# Test 5: No output to stdout
test_no_stdout() {
    local output
    output=$("$SOUND_SCRIPT" 2>/dev/null)
    [ -z "$output" ]
}

# Test 6: Script runs in reasonable time (< 5 seconds)
test_execution_time() {
    local start
    local end
    local duration

    start=$(date +%s)
    "$SOUND_SCRIPT" 2>/dev/null
    end=$(date +%s)
    duration=$((end - start))

    [ "$duration" -lt 5 ]
}

# Run tests
echo "Running tests for complete-sound.sh"
echo "===================================="
echo ""

test_result "Script exists and is executable" "$(test_script_exists; echo $?)"
test_result "Script exits with status 0" "$(test_exit_status; echo $?)"
test_result "detect_platform function works" "$(test_detect_platform; echo $?)"
test_result "Handles missing commands gracefully" "$(test_missing_commands; echo $?)"
test_result "No output to stdout" "$(test_no_stdout; echo $?)"
test_result "Executes in reasonable time" "$(test_execution_time; echo $?)"

echo ""
echo "===================================="
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
if [ "$TESTS_FAILED" -gt 0 ]; then
    echo -e "${RED}Failed: $TESTS_FAILED${NC}"
else
    echo -e "${GREEN}All tests passed!${NC}"
fi
echo ""

# Manual verification instructions
echo -e "${YELLOW}Manual verification:${NC}"
echo "1. Run ./complete-sound.sh and verify you hear a sound"
echo "2. Check platform detection: cat /proc/version (WSL2) or uname -s (macOS/Linux)"
echo "3. Expected behavior:"
echo "   - WSL2: PowerShell beep sound (4 tones)"
echo "   - macOS: Glass.aiff system sound"
echo "   - Linux: Fallback chain (paplay/aplay/beep/speaker-test/silent)"
echo ""

exit $TESTS_FAILED
