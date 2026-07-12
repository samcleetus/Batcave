#!/usr/bin/env bash
# =============================================================================
# bat-tracker.sh — Claude Code hook → Batcave bridge
# (adapted from Claude-Office's agent-tracker.sh)
#
# Claude Code passes hook event JSON on stdin. This script maps it to a
# Batcave event and POSTs it to the local server. Fails silently — it must
# never break a Claude Code session.
#
# Wire up in ~/.claude/settings.json for these hooks:
#   SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, Stop
# =============================================================================

SERVER_URL="http://127.0.0.1:3334/event"
PAYLOAD=$(cat)

AUTH_HEADER=""
TOKEN_FILE="$HOME/.batcave/auth-token"
if [ -f "$TOKEN_FILE" ]; then
    TOKEN=$(cat "$TOKEN_FILE" 2>/dev/null)
    [ -n "$TOKEN" ] && AUTH_HEADER="Authorization: Bearer $TOKEN"
fi

EVENT_JSON=$(HOOK_PAYLOAD="$PAYLOAD" python3 - <<'PYEOF'
import json, os, sys

try:
    d = json.loads(os.environ.get('HOOK_PAYLOAD', '{}'))
except Exception:
    sys.exit(0)

hook = d.get('hook_event_name', '')
tool = d.get('tool_name', '')
ti   = d.get('tool_input', {}) or {}

def out(type_, tool=None, detail=None):
    e = {'type': type_}
    if tool: e['tool'] = tool
    if detail: e['detail'] = str(detail)[:200]
    print(json.dumps(e))
    sys.exit(0)

if hook == 'SessionStart':
    out('session_start')
elif hook == 'UserPromptSubmit':
    out('prompt', detail=(d.get('prompt') or '')[:120])
elif hook == 'Stop':
    out('session_end')
elif hook in ('PreToolUse', 'PostToolUse'):
    if not tool:
        sys.exit(0)
    # a hint of what's being touched, for the Bat-computer log
    detail = ti.get('file_path') or ti.get('command') or ti.get('pattern') \
        or ti.get('description') or ti.get('prompt') or ''
    if tool in ('Task', 'Agent'):
        out('agent_spawn' if hook == 'PreToolUse' else 'agent_done',
            tool='Agent', detail=detail)
    out('tool_start' if hook == 'PreToolUse' else 'tool_end',
        tool=tool, detail=detail)
sys.exit(0)
PYEOF
)

[ -z "$EVENT_JSON" ] && exit 0

if [ -n "$AUTH_HEADER" ]; then
    curl -s -m 2 -X POST "$SERVER_URL" \
        -H "Content-Type: application/json" \
        -H "$AUTH_HEADER" \
        -d "$EVENT_JSON" >/dev/null 2>&1
fi

exit 0
