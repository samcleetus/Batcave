"""
Export the navigation graph authored in Blender to the Batcave app.

Run this INSIDE Blender (Scripting tab -> Open -> this file -> Run Script)
with the batcave .blend open.

Authoring convention:
  - Stop spots: Empty objects named  STOP_<id>   (e.g. STOP_computer)
      * position = where the character stands (snap to the floor)
      * rotation = optional; the empty's local -Y axis is the facing
        direction while stopped (rotate around Z to aim it)
      * required ids: computer, dish, westWalk, table, batmobile
  - Paths: one MESH object named  PATHS  containing only vertices+edges.
      * a vertex within SNAP_DIST of a STOP empty binds to that stop
      * every other vertex becomes an unnamed junction
      * edges = permitted walking segments

Output: <repo>/src/state/nav_data.json (app world coords: x*3.2,
(z+1)*3.2 up, -y*3.2 — the cave group transform baked in).
"""
import bpy
import json
import os
from mathutils import Vector

SCALE = 3.2
FLOOR_Z = -1.0     # blender z of the computer-platform floor (app y=0)
SNAP_DIST = 0.3    # blender units: PATHS vertex -> STOP empty binding
REQUIRED = ['computer', 'batmobile']  # other roles fall back by name in src/state/nav.ts


def to_app(v):
    """blender (x, y, z-up) -> app world (x, y-up, z)"""
    return [round(v.x * SCALE, 3), round((v.z - FLOOR_Z) * SCALE, 3), round(-v.y * SCALE, 3)]


def main():
    stops = {}
    for o in bpy.data.objects:
        if o.name.startswith('STOP_') and o.type == 'EMPTY':
            sid = o.name[len('STOP_'):].split('.')[0]
            look = o.matrix_world.to_3x3() @ Vector((0, -1, 0))
            face = o.matrix_world.translation + look * 2.0
            stops[sid] = {
                'pos': o.matrix_world.translation.copy(),
                'face': face,
            }

    paths = next((bpy.data.objects.get(n) for n in ('PATHS', 'WalkPaths', 'WalkPath')
                  if bpy.data.objects.get(n)), None)
    if paths is None or paths.type != 'MESH':
        raise RuntimeError("No mesh named 'PATHS' / 'WalkPaths' found — trace the walk network first.")

    mesh = paths.data
    mw = paths.matrix_world
    verts = [mw @ v.co for v in mesh.vertices]

    # weld coincident vertices (un-merged doubles would split the graph)
    MERGE_DIST = 0.15
    remap = list(range(len(verts)))
    for i in range(len(verts)):
        for j in range(i):
            if remap[j] == j and (verts[i] - verts[j]).length < MERGE_DIST:
                remap[i] = j
                break

    # bind vertices to stops (nearest within SNAP_DIST), else junction
    vid_to_node = {}
    used = set()
    nodes = {}
    for i, v in enumerate(verts):
        if remap[i] != i:
            vid_to_node[i] = vid_to_node[remap[i]]
            continue
        best, bd = None, SNAP_DIST
        for sid, s in stops.items():
            d = (s['pos'] - v).length
            if d < bd:
                best, bd = sid, d
        if best and best not in used:
            used.add(best)
            vid_to_node[i] = best
            nodes[best] = {'pos': to_app(stops[best]['pos']),
                           'face': to_app(stops[best]['face']), 'stop': True}
        else:
            jid = f'j{i}'
            vid_to_node[i] = jid
            nodes[jid] = {'pos': to_app(v), 'stop': False}

    # stops that no path vertex reached — include but warn
    unreached = [s for s in stops if s not in used]
    for sid in unreached:
        nodes[sid] = {'pos': to_app(stops[sid]['pos']),
                      'face': to_app(stops[sid]['face']), 'stop': True}

    edges = sorted({tuple(sorted((vid_to_node[e.vertices[0]], vid_to_node[e.vertices[1]])))
                    for e in mesh.edges
                    if vid_to_node[e.vertices[0]] != vid_to_node[e.vertices[1]]})

    missing = [r for r in REQUIRED if r not in nodes]

    out = {'nodes': nodes, 'edges': [list(e) for e in edges]}
    blend = bpy.data.filepath
    repo = os.path.abspath(os.path.join(os.path.dirname(blend), '..', '..', '..'))
    dst = os.path.join(repo, 'src', 'state', 'nav_data.json')
    if not os.path.isdir(os.path.dirname(dst)):
        raise RuntimeError(f'Expected the repo at {repo} — adjust the path in this script.')
    with open(dst, 'w') as f:
        json.dump(out, f, indent=2)

    print(f'✔ wrote {dst}')
    print(f'  {sum(1 for n in nodes.values() if n["stop"])} stops, '
          f'{sum(1 for n in nodes.values() if not n["stop"])} junctions, {len(edges)} edges')
    if unreached:
        print(f'  ⚠ stops not connected to PATHS (no vertex within {SNAP_DIST}): {unreached}')
    if missing:
        print(f'  ⚠ missing required stops: {missing} — the app expects these ids')


main()
