#!/usr/bin/env bash
# Stop the Batcave.
cd "$(dirname "$0")/.."
for f in .run/server.pid .run/vite.pid; do
  if [ -f "$f" ]; then
    kill "$(cat "$f")" 2>/dev/null && echo "[batcave] stopped $(basename "$f" .pid)"
    rm -f "$f"
  fi
done
