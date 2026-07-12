# 🦇 Batcave

A 3D batcave that visualizes Claude Code working in real time. Batman mans the
Batcomputer while your agent codes — he types during tool calls, ponders while
Claude thinks, wanders to the Batmobile when things go quiet, and broods on the
overlook after long silences.

Inspired by [W17ant/Claude-Office](https://github.com/W17ant/Claude-Office),
rebuilt in 3D (Three.js / react-three-fiber) with a LEGO Batman minifigure and
a Blender batcave scene.

## Quick start

```bash
npm install
npm start            # server (:3334) + frontend (:3333)
npm stop             # shut it down
```

| URL | Mode |
|---|---|
| `localhost:3333` | Live — driven by Claude Code hooks |
| `localhost:3333/?sim` | Simulation — scripted demo session, no setup needed |

## Connect Claude Code

```bash
bash hooks/install-hooks.sh
```

This merges the Batcave hook into `~/.claude/settings.json` (SessionStart,
UserPromptSubmit, PreToolUse, PostToolUse, Stop). The hook fails silently if
the Batcave isn't running — it never interferes with Claude Code.

## How it works

```
Claude Code ──hooks──> Express server (:3334) ──WebSocket──> React + Three.js (:3333)
```

Events map onto a single-character state machine:

| Claude Code activity | Batman |
|---|---|
| Session starts / tool calls | Walks to the Batcomputer, types |
| Quiet 10s while working | Steps back, analyzes |
| Quiet 60s | Break by the Batmobile |
| Quiet 3min | Broods on the overlook |

## Assets

- `public/models/batman.glb` — LEGO Batman, preprocessed from a static
  Sketchfab model into an animatable parts hierarchy (`tools/build_batman.py`
  splits arms/legs and bakes joint pivots; animation is procedural, no rig).
- `public/models/batcave.glb` — exported from the Blender scene via the
  Blender MCP, then optimized with gltf-transform (Draco + WebP: 108 MB → 3 MB).
  The scene's procedural rock/metal materials can't survive glTF export, so
  `Cave.tsx` re-tints them at runtime; the Draco decoder is served locally
  from `public/draco/`.

## Project structure

```
├── src/
│   ├── scene/        Cave, Batman (procedural animation), Scene (camera/lights)
│   ├── state/        BatmanDirector — event → behavior state machine
│   ├── hooks/        useEventSocket — WS client with reconnect
│   ├── ui/           Bat-computer console overlay
│   └── sim.ts        ?sim scripted demo
├── server/           Express + WebSocket event server
├── hooks/            Claude Code hook script
└── tools/            Asset preprocessing (Python / trimesh)
```
