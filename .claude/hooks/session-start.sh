#!/bin/bash
set -euo pipefail

# Only run in remote environments (Claude Code on the web)
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Install Node.js dependencies
if [ -f "package.json" ]; then
  npm install
fi
