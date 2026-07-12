#!/usr/bin/env python3
"""
Preprocess the static Sketchfab LEGO Robin GLB into an animatable parts
hierarchy (same output convention as build_batman.py: named nodes legL/legR/
armL/armR/head/cape/torso/hips, geometry baked relative to joint pivots,
y-up, feet at origin, height 1.0).

Robin ships as one welded body mesh + cape + face decal; the body separates
into LEGO parts via connected components, classified by position.
Source frame: z-up, front = -y, height ~5.3.
"""
import numpy as np
import trimesh

SRC = 'assets_src/lego_robin.glb'
DST = 'public/models/robin.glb'

TOTAL_HEIGHT = 5.3

PIVOTS = {
    'hips':  np.array([0.0, 0.0, 1.6]),
    'legL':  np.array([-0.5, 0.0, 1.75]),
    'legR':  np.array([0.5, 0.0, 1.75]),
    'torso': np.array([0.0, 0.0, 1.9]),
    'armL':  np.array([-1.05, 0.0, 3.3]),
    'armR':  np.array([1.05, 0.0, 3.3]),
    'head':  np.array([0.0, 0.0, 3.7]),
    # pivot at the neck clasp: the cape plane extends backward (+y) from here,
    # so the app's drape rotation (capeBase ≈ -1.45) folds all of it down
    'cape':  np.array([0.0, -0.55, 3.55]),
}
PARENTS = {
    'hips': 'RobinRoot', 'legL': 'hips', 'legR': 'hips', 'torso': 'hips',
    'armL': 'torso', 'armR': 'torso', 'head': 'torso', 'cape': 'torso',
}


def classify_body(mesh):
    buckets = {k: [] for k in ('head', 'torso', 'armL', 'armR', 'legL', 'legR', 'hips')}
    for comp in mesh.split(only_watertight=False):
        cx, cy, cz = comp.centroid
        lo, hi = comp.bounds
        if lo[2] >= 3.65:
            buckets['head'].append(comp)
        elif abs(cx) > 0.9 and cz < 2.4:
            buckets['armL' if cx < 0 else 'armR'].append(comp)   # hands
        elif abs(cx) > 0.45 and lo[2] >= 1.75:
            buckets['armL' if cx < 0 else 'armR'].append(comp)   # arms
        elif lo[2] >= 1.75:
            buckets['torso'].append(comp)
        elif hi[2] >= 1.55 and abs(cx) < 0.2:
            buckets['hips'].append(comp)                          # hip bar / crotch
        elif cx < -0.1:
            buckets['legL'].append(comp)
        elif cx > 0.1:
            buckets['legR'].append(comp)
        else:
            buckets['hips'].append(comp)
    return buckets


def main():
    scene = trimesh.load(SRC, process=False)
    geoms = list(scene.geometry.values())  # [body, cape, face]
    body, cape, face = geoms[0], geoms[1], geoms[2]

    b = classify_body(body)
    parts = {
        'hips':  trimesh.util.concatenate(b['hips']),
        'legL':  trimesh.util.concatenate(b['legL']),
        'legR':  trimesh.util.concatenate(b['legR']),
        'torso': trimesh.util.concatenate(b['torso']),
        'armL':  trimesh.util.concatenate(b['armL']),
        'armR':  trimesh.util.concatenate(b['armR']),
        'head':  trimesh.util.concatenate([h for h in b['head']] + [face]),
        'cape':  cape,
    }
    for k, v in parts.items():
        print(f'{k}: {len(v.vertices)}v')

    out = trimesh.Scene()
    s = 1.0 / TOTAL_HEIGHT
    root = np.array([
        [s, 0, 0, 0],
        [0, 0, s, 0],
        [0, -s, 0, 0],
        [0, 0, 0, 1],
    ], dtype=float)
    out.graph.update(frame_to='RobinRoot', frame_from=out.graph.base_frame, matrix=root)

    for name, mesh in parts.items():
        pivot = PIVOTS[name]
        mesh = mesh.copy()
        mesh.apply_translation(-pivot)
        parent = PARENTS[name]
        parent_pivot = PIVOTS.get(parent, np.zeros(3))
        t = np.eye(4)
        t[:3, 3] = pivot - parent_pivot
        out.add_geometry(mesh, node_name=name, geom_name=name,
                         parent_node_name=parent, transform=t)

    out.export(DST)
    chk = trimesh.load(DST, process=False)
    print('wrote', DST)
    print('nodes:', sorted(n for n in chk.graph.nodes if n != chk.graph.base_frame))
    print('bounds:', np.round(chk.bounds, 3).tolist())


if __name__ == '__main__':
    main()
