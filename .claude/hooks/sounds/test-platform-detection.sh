#!/bin/bash
# Unit test for platform detection function

# Source the main script functions
source "$(dirname "$0")/complete-sound.sh"

# Test platform detection
echo "Testing platform detection..."
platform=$(detect_platform)
echo "Detected platform: $platform"

# Verify based on current environment
if [ -f /proc/version ] && grep -qi "microsoft\|wsl" /proc/version 2>/dev/null; then
    expected="wsl2"
elif [ "$(uname -s)" = "Darwin" ]; then
    expected="macos"
else
    expected="linux"
fi

echo "Expected platform: $expected"

if [ "$platform" = "$expected" ]; then
    echo "✓ Platform detection test PASSED"
    exit 0
else
    echo "✗ Platform detection test FAILED"
    exit 1
fi
