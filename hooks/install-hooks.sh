#!/usr/bin/env bash
# Installs the Batcave hook into ~/.claude/settings.json (merges, never clobbers).
# Usage: bash hooks/install-hooks.sh
set -e
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TRACKER="$REPO_DIR/hooks/bat-tracker.sh"
SETTINGS="$HOME/.claude/settings.json"

REPO_TRACKER="$TRACKER" SETTINGS_FILE="$SETTINGS" python3 - <<'PYEOF'
import json, os, sys

tracker = os.environ['REPO_TRACKER']
path = os.environ['SETTINGS_FILE']
cmd = f'bash {tracker}'

os.makedirs(os.path.dirname(path), exist_ok=True)
settings = {}
if os.path.exists(path):
    with open(path) as f:
        try:
            settings = json.load(f)
        except json.JSONDecodeError:
            sys.exit(f'ERROR: {path} is not valid JSON — fix it first, nothing was changed.')

hooks = settings.setdefault('hooks', {})
events = ['SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse', 'Stop']
added, present = [], []
for ev in events:
    matchers = hooks.setdefault(ev, [])
    if any(h.get('command') == cmd for m in matchers for h in m.get('hooks', [])):
        present.append(ev)
        continue
    matchers.append({'hooks': [{'type': 'command', 'command': cmd}]})
    added.append(ev)

with open(path, 'w') as f:
    json.dump(settings, f, indent=2)

if added:   print('installed hook for:', ', '.join(added))
if present: print('already installed:', ', '.join(present))
print(f'→ {path}')
print('Start the cave with `npm start`, then run any Claude Code session.')
PYEOF
