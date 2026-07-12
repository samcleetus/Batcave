#!/usr/bin/env python3
"""
Preprocess the static Sketchfab LEGO Batman GLB into an animatable parts hierarchy.

Input : assets_src/batman_original.glb  (7 meshes split by material, no rig)
Output: public/models/batman.glb        (named parts with joint pivots)

Hierarchy (glTF, y-up after root rotation):
  BatmanRoot
    hips            (belt + hip bar, static)
      legL, legR    (pivot at hip pins)
      torso         (printed torso + neck)
        armL, armR  (arms + hands, pivot at shoulders)
        head        (head + cowl, pivot at neck)
        cape        (pivot at shoulders, for sway)

Each part's geometry is baked relative to its pivot; the node carries the
pivot translation, so rotating the node in three.js rotates around the joint.

All coordinates below are in the source meshes' local frame: z-up, -y = front.
"""
import numpy as np
import trimesh
from trimesh.visual.material import PBRMaterial

SRC = 'assets_src/batman_original.glb'
DST = 'public/models/batman.glb'

TOTAL_HEIGHT = 47.16  # source units, feet at z=0

# Joint pivots in source coords (z-up)
PIVOTS = {
    'hips':  np.array([0.0, 0.0, 15.0]),
    'legL':  np.array([-4.0, 0.0, 15.4]),
    'legR':  np.array([4.0, 0.0, 15.4]),
    'torso': np.array([0.0, 0.0, 16.0]),
    'armL':  np.array([-6.8, 0.0, 25.8]),
    'armR':  np.array([6.8, 0.0, 25.8]),
    'head':  np.array([0.0, 0.0, 29.2]),
    'cape':  np.array([0.0, 2.0, 28.5]),
}
PARENTS = {
    'hips': 'BatmanRoot', 'legL': 'hips', 'legR': 'hips', 'torso': 'hips',
    'armL': 'torso', 'armR': 'torso', 'head': 'torso', 'cape': 'torso',
}


def load():
    scene = trimesh.load(SRC, process=False)
    # trimesh names geometries Object_0..Object_6 in node order:
    # 0=belt/hip assembly, 1=cape, 2=head, 3=torso, 4=legs+hipbar+hands, 5=arms, 6=cowl
    g = scene.geometry
    return {
        'belt': g['Object_0'], 'cape': g['Object_1'], 'head': g['Object_2'],
        'torso': g['Object_3'], 'legs': g['Object_4'], 'arms': g['Object_5'],
        'cowl': g['Object_6'],
    }


def classify_legs_mesh(mesh):
    """Split Object_4 (legs + hip bar + hands + misc) into buckets."""
    buckets = {'legL': [], 'legR': [], 'hips': [], 'handL': [], 'handR': [], 'torso': []}
    for comp in mesh.split(only_watertight=False):
        cx, cy, cz = comp.centroid
        lo, hi = comp.bounds
        if hi[2] <= 16.05 and cx < -1.0:
            buckets['legL'].append(comp)
        elif hi[2] <= 16.05 and cx > 1.0:
            buckets['legR'].append(comp)
        elif hi[2] <= 16.05:
            buckets['hips'].append(comp)          # center post / crotch
        elif abs(cx) > 7.0 and cz < 22.5:
            buckets['handL' if cx < 0 else 'handR'].append(comp)  # hands at x≈±9-12
        elif lo[2] >= 13.9 and hi[2] <= 16.05:
            buckets['hips'].append(comp)          # hip bar
        elif hi[2] <= 16.05:
            buckets['hips'].append(comp)
        else:
            # centered small fittings z16-21 → static, keep with torso
            buckets['torso'].append(comp)
    return buckets


def split_arms(mesh):
    l, r = [], []
    for comp in mesh.split(only_watertight=False):
        (l if comp.centroid[0] < 0 else r).append(comp)
    return l, r


def merge(meshes, material=None):
    m = trimesh.util.concatenate(meshes)
    if material is not None:
        m.visual = trimesh.visual.TextureVisuals(material=material)
    return m


def main():
    parts_src = load()
    black = PBRMaterial(name='BatBlack', baseColorFactor=[0.09, 0.09, 0.115, 1.0],
                        metallicFactor=0.0, roughnessFactor=0.5)

    legs_buckets = classify_legs_mesh(parts_src['legs'])
    arms_l, arms_r = split_arms(parts_src['arms'])

    parts = {
        'hips':  merge([parts_src['belt']] + legs_buckets['hips']),
        'legL':  merge(legs_buckets['legL'], black),
        'legR':  merge(legs_buckets['legR'], black),
        'torso': merge([parts_src['torso']] + legs_buckets['torso']),
        'armL':  merge(arms_l + legs_buckets['handL'], black),
        'armR':  merge(arms_r + legs_buckets['handR'], black),
        'head':  merge([parts_src['head'], parts_src['cowl']]),
        'cape':  parts_src['cape'],
    }

    out = trimesh.Scene()
    s = 1.0 / TOTAL_HEIGHT
    # Root: z-up → y-up, feet at origin, height 1.0
    root = np.array([
        [s, 0, 0, 0],
        [0, 0, s, 0],   # y_out = z_src (up)
        [0, -s, 0, 0],  # z_out = -y_src (front becomes +z)
        [0, 0, 0, 1],
    ], dtype=float)
    out.graph.update(frame_to='BatmanRoot', frame_from=out.graph.base_frame, matrix=root)

    for name, mesh in parts.items():
        pivot = PIVOTS[name]
        mesh = mesh.copy()
        mesh.apply_translation(-pivot)  # bake geometry relative to joint
        parent = PARENTS[name]
        parent_pivot = PIVOTS.get(parent, np.zeros(3))
        t = np.eye(4)
        t[:3, 3] = pivot - parent_pivot
        out.add_geometry(mesh, node_name=name, geom_name=name,
                         parent_node_name=parent, transform=t)

    out.export(DST)
    print('wrote', DST)

    # Verify round-trip
    chk = trimesh.load(DST, process=False)
    print('geoms:', sorted(chk.geometry.keys()))
    print('nodes:', sorted(n for n in chk.graph.nodes if n != chk.graph.base_frame))
    print('bounds:', np.round(chk.bounds, 3).tolist())


if __name__ == '__main__':
    main()
