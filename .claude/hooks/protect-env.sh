#!/bin/bash
# Pre-edit hook: Block edits to sensitive files
# Exit 0 = allow, Exit 2 = block with message to Claude

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Block sensitive files
BASENAME=$(basename "$FILE_PATH")
case "$BASENAME" in
  .env|.env.local|.env.production|credentials.json|secrets.*)
    echo "Cannot edit sensitive file: $BASENAME. These files contain secrets and should be edited manually." >&2
    exit 2
    ;;
esac

exit 0
