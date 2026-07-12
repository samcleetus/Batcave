# 🦇 Batcave

A 3D batcave that visualizes Claude Code working in real time. Batman mans the
Batcomputer while your agent codes — he types during tool calls, ponders while
Claude thinks, wanders to the Batmobile when things go quiet, and broods on the
overlook after long silences. When Claude spawns subagents, Robin runs to his
station at the side screens and works until they report back.

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

The **AMBIENT** toggle (top-left) keeps the cave busy with a looping scripted
session even when Claude Code isn't running; switch it off and the characters
only react to real activity. The choice persists across reloads.

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

| Claude Code activity | In the cave |
|---|---|
| Session starts / tool calls | Batman walks to the Batcomputer, types |
| Subagent spawned (Task tool) | Robin mans the side screens until it reports back |
| Quiet 10s while working | Batman steps back, analyzes |
| Quiet 60s | Break down by the Batmobile |
| Quiet 3min | Broods on the overlook |

Movement is constrained to a hand-built navigation graph (`src/state/nav.ts`):
characters only stop at designated spots (Batcomputer, side station, west
walkway, table platform, Batmobile) and only walk along its edges — down the
stairs, around the generator, into the bay. Heights come from per-frame
raycasts against the cave mesh. Add `&fast` to compress the behavior timers
for a demo, and `&nav` to render the graph for tuning.

## Assets

- `public/models/batman.glb` / `robin.glb` — LEGO minifigs, preprocessed from
  static Sketchfab models into animatable parts hierarchies
  (`tools/build_batman.py`, `tools/build_robin.py` split limbs via connected
  components and bake joint pivots; animation is procedural, no rig).
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
