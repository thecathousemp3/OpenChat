#!/bin/bash
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 22 or later is required. Install it from https://nodejs.org/ and try again." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm was not found. Install Node.js 22 or later from https://nodejs.org/ and try again." >&2
  exit 1
fi

if ! node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 22 ? 0 : 1)'; then
  echo "Node.js 22 or later is required. Install the current LTS release from https://nodejs.org/ and try again." >&2
  exit 1
fi

if [ ! -f node_modules/ws/package.json ]; then
  echo "Installing OpenChat dependencies..."
  npm ci --no-audit --no-fund || exit 1
fi

echo "Starting OpenChat at http://localhost:3000"
echo "Keep this terminal open while using OpenChat. Press Ctrl+C to stop."
npm start
