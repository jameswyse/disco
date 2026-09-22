"""Render Disco's editable 3D mark and a seamless, 24-second rotation.

Requires Blender 4.5's bpy Python package. Run with --still for the master PNG,
or --frames DIR to render the animation. The source .blend is saved with the still.
"""
import argparse
import math
import subprocess
import sys
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[3]
parser = argparse.ArgumentParser()
parser.add_argument('--still', action='store_true')
parser.add_argument('--encode', type=Path)
parser.add_argument('--frames', type=Path)
parser.add_argument('--size', type=int, default=768)
parser.add_argument('--samples', type=int, default=32)
parser.add_argument('--start', type=int, default=1)
parser.add_argument('--end', type=int, default=576)
args = parser.parse_args()

if args.encode:
    import imageio_ffmpeg

    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    assets = ROOT / 'apps/web/public/brand'
    frames = str(args.encode / '%04d.png')
    def encode(*parameters):
        subprocess.run([ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', *parameters], check=True)

    encode('-i', str(assets / 'disco-logo.png'), '-vf', 'scale=768:768',
           '-c:v', 'libwebp', '-quality', '90', str(assets / 'disco-logo.webp'))
    encode('-framerate', '24', '-i', frames, '-frames:v', '48', '-c:v', 'libwebp_anim',
           '-quality', '82', '-compression_level', '6', '-loop', '0',
           str(assets / 'disco-logo-animated.webp'))
    # The 36 identical meridians repeat every 10 degrees. Forty-eight frames cover
    # 30 degrees in two seconds, exactly matching the full 24-second revolution.
    encode('-framerate', '24', '-i', frames, '-frames:v', '48', '-c:v', 'libvpx-vp9',
           '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', '24', '-row-mt', '1',
           str(assets / 'disco-logo.webm'))
    encode('-f', 'lavfi', '-i', 'color=c=0x0f172a:s=768x768:r=24',
           '-framerate', '24', '-i', frames, '-filter_complex', '[0:v][1:v]overlay=shortest=1',
           '-frames:v', '48', '-c:v', 'libx264', '-crf', '18', '-preset', 'slow',
           '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(assets / 'disco-logo.mp4'))
    sys.exit(0)

# This scene owns its objects. Remove the default scene objects only.
for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = args.samples
scene.cycles.use_denoising = True
scene.cycles.max_bounces = 5
scene.render.threads_mode = 'FIXED'
scene.render.threads = 12
scene.render.resolution_x = args.size
scene.render.resolution_y = args.size
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.fps = 24
scene.render.use_persistent_data = True
scene.view_settings.view_transform = 'AgX'
scene.view_settings.look = 'AgX - Medium High Contrast'
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.32, 0.37, 0.55, 1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.35


def metal(name, color, roughness):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    shader = material.node_tree.nodes['Principled BSDF']
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Metallic'].default_value = 1
    shader.inputs['Roughness'].default_value = roughness
    return material


mirror = metal('Silver mirrors', (0.8, 0.85, 0.98), 0.16)
edge = metal('Lavender polished edge', (0.45, 0.47, 0.83), 0.21)
core = metal('Deep indigo grout', (0.035, 0.043, 0.083), 0.29)
chrome = metal('Platinum suspension', (0.67, 0.72, 0.91), 0.19)

rotation = bpy.data.objects.new('Disco ball rotation', None)
scene.collection.objects.link(rotation)

bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=32, radius=0.977)
sphere = bpy.context.object
sphere.name = 'Indigo sphere under mirror tiles'
sphere.data.materials.append(core)
sphere.parent = rotation
for face in sphere.data.polygons:
    face.use_smooth = True

# Individually bevelled, planar mirror faces produce moving physical reflections.
rows, columns = 18, 36
for row in range(rows):
    latitude = math.pi * (row + 0.5) / rows
    for column in range(columns):
        longitude = math.tau * column / columns
        normal = Vector((math.sin(latitude) * math.cos(longitude),
                         math.sin(latitude) * math.sin(longitude), math.cos(latitude)))
        bpy.ops.mesh.primitive_cube_add(size=1, location=normal * 0.988)
        tile = bpy.context.object
        tile.name = f'Mirror {row:02d}-{column:02d}'
        tile.rotation_euler = (0, latitude, longitude)
        tile.dimensions = (2 * math.sin(math.pi / (2 * rows)) * 0.958,
                           2 * math.sin(math.pi / columns) * math.sin(latitude) * 0.958, 0.029)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        tile.data.materials.append(mirror)
        tile.data.materials.append(edge)
        bevel = tile.modifiers.new('Polished mirror bevel', 'BEVEL')
        bevel.width = 0.004
        bevel.segments = 3
        bevel.affect = 'EDGES'
        bevel.material = 1
        tile.modifiers.new('Weighted corner normals', 'WEIGHTED_NORMAL')
        tile.parent = rotation


def cylinder(name, radius, depth, z):
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=radius, depth=depth, location=(0, 0, z))
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(chrome)
    bevel = obj.modifiers.new('Soft machined edge', 'BEVEL')
    bevel.width = 0.009
    bevel.segments = 3
    obj.modifiers.new('Weighted normals', 'WEIGHTED_NORMAL')
    return obj


cylinder('Suspension stem', 0.024, 0.36, 1.22)
cylinder('Suspension cap', 0.085, 0.075, 1.025)

# The two four-point glints retain the silhouette of the original mark.
def glint(name, position, size):
    outline = [(0, size), (size * 0.19, size * 0.19), (size * 0.8, 0),
               (size * 0.19, -size * 0.19), (0, -size),
               (-size * 0.19, -size * 0.19), (-size * 0.8, 0),
               (-size * 0.19, size * 0.19)]
    vertices = [(x, 0, z) for x, z in outline] + [(0, -size * 0.18, 0), (0, size * 0.12, 0)]
    faces = [(i, (i + 1) % 8, 8) for i in range(8)] + [((i + 1) % 8, i, 9) for i in range(8)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    obj = bpy.data.objects.new(name, mesh)
    scene.collection.objects.link(obj)
    obj.location = position
    obj.data.materials.append(chrome)
    return obj


glint('Upper star', (1.05, -0.2, 0.98), 0.24)
glint('Lower star', (-1.13, -0.2, -0.78), 0.145)


def area(name, position, power, color, size, ratio=1):
    light = bpy.data.lights.new(name, 'AREA')
    light.energy = power
    light.color = color
    light.shape = 'RECTANGLE'
    light.size = size
    light.size_y = size * ratio
    obj = bpy.data.objects.new(name, light)
    scene.collection.objects.link(obj)
    obj.location = position
    obj.rotation_euler = (Vector((0, 0, 0)) - obj.location).to_track_quat('-Z', 'Y').to_euler()


area('Large pearl key', (-3.5, -4.5, 4.2), 650, (0.84, 0.88, 1), 3.5, 1.6)
area('Violet rim', (3.1, 0.2, 1.6), 500, (0.52, 0.32, 1), 2.4, 1.8)
area('Cool strip', (2.8, -3.2, 0.7), 320, (0.54, 0.76, 1), 0.7, 4)
area('Top silver softbox', (0.5, 0.5, 4.5), 700, (0.91, 0.92, 1), 2.5, 0.5)
area('Low lavender bounce', (-2.2, -1.2, -2), 110, (0.48, 0.4, 0.9), 2, 1)

camera = bpy.data.cameras.new('Orthographic brand camera')
camera_obj = bpy.data.objects.new('Orthographic brand camera', camera)
scene.collection.objects.link(camera_obj)
camera_obj.location = (0, -7, 1.1)
camera_obj.rotation_euler = (Vector((0, 0, 0.12)) - camera_obj.location).to_track_quat('-Z', 'Y').to_euler()
camera.type = 'ORTHO'
camera.ortho_scale = 3.3
scene.camera = camera_obj

scene.frame_start = 1
scene.frame_end = 576
rotation.rotation_euler.z = 0
rotation.keyframe_insert(data_path='rotation_euler', frame=1)
rotation.rotation_euler.z = math.tau
rotation.keyframe_insert(data_path='rotation_euler', frame=577)
for curve in rotation.animation_data.action.fcurves:
    for keyframe in curve.keyframe_points:
        keyframe.interpolation = 'LINEAR'
scene.frame_set(1)

if args.still:
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'docs/assets/brand/disco-logo.blend'))
    scene.render.filepath = str(ROOT / 'apps/web/public/brand/disco-logo.png')
    bpy.ops.render.render(write_still=True)
if args.frames:
    args.frames.mkdir(parents=True, exist_ok=True)
    scene.frame_start = args.start
    scene.frame_end = args.end
    scene.render.filepath = str(args.frames / '') + '/'
    bpy.ops.render.render(animation=True)
