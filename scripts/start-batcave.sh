#!/usr/bin/env bash
# Start the Batcave: event server + Vite frontend.
set -e
cd "$(dirname "$0")/.."

mkdir -p .run

node server/index.js > .run/server.log 2>&1 &
echo $! > .run/server.pid
echo "[batcave] server started (pid $(cat .run/server.pid))"

npx vite --port 3333 > .run/vite.log 2>&1 &
echo $! > .run/vite.pid
echo "[batcave] frontend started (pid $(cat .run/vite.pid))"

echo ""
echo "  🦇  http://localhost:3333        — live (needs Claude Code hooks)"
echo "  🦇  http://localhost:3333/?sim   — simulation demo"
