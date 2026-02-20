#!/usr/bin/env bash
# lint-yaml-hash.sh
# Detect unquoted ' #' patterns in .reqord YAML files that would be
# silently truncated by js-yaml's plain scalar parser.
#
# YAML spec: In a plain (unquoted) scalar, ' #' (space + hash) starts
# an inline comment. js-yaml silently strips everything after it.
# This causes data loss on read→write roundtrip.
#
# Safe patterns (not flagged):
#   - Quoted strings: '...（Feedback #169）' or "...(Issue #263)"
#   - Block scalars (lines after >- or |, in key-value or list items): continuation lines are safe
#   - Comment lines starting with #
#   - Key-value lines where # appears in the key part

set -euo pipefail

REQORD_DIR="${1:-.reqord}"
EXIT_CODE=0

if [ ! -d "$REQORD_DIR" ]; then
  echo "Directory $REQORD_DIR not found, skipping YAML hash lint"
  exit 0
fi

# Find YAML files
files=$(find "$REQORD_DIR" -name "*.yaml" -type f 2>/dev/null || true)

if [ -z "$files" ]; then
  echo "No YAML files found in $REQORD_DIR"
  exit 0
fi

in_block_scalar=false

while IFS= read -r file; do
  line_num=0
  in_block_scalar=false

  while IFS= read -r line; do
    line_num=$((line_num + 1))

    # Skip empty lines
    [ -z "$line" ] && continue

    # Skip comment-only lines
    [[ "$line" =~ ^[[:space:]]*# ]] && continue

    # Detect block scalar indicators (>- or | or > or |- etc.)
    # Matches after ': ' (key-value) or '- ' (list item)
    if [[ "$line" =~ :[[:space:]]+([\>|]) ]] || [[ "$line" =~ :[[:space:]]+[\>|]- ]] \
    || [[ "$line" =~ ^[[:space:]]*-[[:space:]]+([\>|]) ]] || [[ "$line" =~ ^[[:space:]]*-[[:space:]]+[\>|]- ]]; then
      in_block_scalar=true
      block_indent=-1
      continue
    fi

    # If in block scalar, check indentation to detect end
    if $in_block_scalar; then
      # Get current line's leading whitespace count
      stripped="${line#"${line%%[![:space:]]*}"}"
      current_indent=$(( ${#line} - ${#stripped} ))

      if [ "$block_indent" -eq -1 ]; then
        # First line of block scalar - set reference indent
        block_indent=$current_indent
        continue
      fi

      if [ "$current_indent" -ge "$block_indent" ] && [ "$block_indent" -gt 0 ]; then
        # Still in block scalar
        continue
      else
        # Left block scalar
        in_block_scalar=false
      fi
    fi

    # Skip lines that don't contain ' #' with digits
    if ! echo "$line" | grep -qE ' #[0-9]'; then
      continue
    fi

    # Skip if the value part is quoted (single or double)
    # Extract value part (after first ': ')
    if [[ "$line" =~ :[[:space:]]+(\'.*\'|\".*\") ]]; then
      continue
    fi

    # Skip lines that are fully quoted values (e.g., "  - 'some text #123'")
    if [[ "$line" =~ ^[[:space:]]*-[[:space:]]+(\'.*\'|\".*\") ]]; then
      continue
    fi

    # This line has an unquoted ' #NNN' pattern - flag it
    echo "::error file=${file},line=${line_num}::Unquoted ' #' in YAML plain scalar will be truncated by js-yaml parser. Quote the string value."
    echo "  ${file}:${line_num}: ${line}"
    EXIT_CODE=1

  done < "$file"
done <<< "$files"

if [ "$EXIT_CODE" -eq 0 ]; then
  echo "YAML hash lint: all files OK"
else
  echo ""
  echo "Fix: Wrap the affected string value in single quotes, e.g.:"
  echo "  summary: 'Fixed issue（Feedback #169）'"
fi

exit $EXIT_CODE
