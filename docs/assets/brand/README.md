# Disco 3D logo

The editable source is [disco-logo.blend](disco-logo.blend). The original suspension stem,
latitude-and-longitude grid and two four-point stars are modelled as polished metal. The ball
uses 648 individually bevelled mirror tiles with silver, blue and lavender studio lighting.

The application assets are in `apps/web/public/brand/`:

- `disco-logo.png`: transparent 2048 × 2048 master still.
- `disco-logo.webp`: transparent 768 × 768 loading poster.
- `disco-logo-animated.webp`: transparent animation used by the web loader.
- `disco-logo.webm`: transparent 768 × 768 VP9 animation, 24 frames per second.
- `disco-logo.mp4`: H.264 version on Disco's `#0f172a` background.

The rotation is linear at one revolution every 24 seconds. The geometry repeats every
10 degrees, so the delivered two-second loop covers 30 degrees and joins seamlessly.
The full revolution remains editable in the Blender timeline. Neither the stem nor the stars
rotate. The still and animation use the same geometry, camera, materials and lights.

The web loader shows only the logo, playing a native animated image before React hydrates.
It honours reduced motion by displaying the still and does not delay the page when content is
ready. Blender is only an asset-authoring dependency.

## Render again

Use Python 3.11 with `bpy==4.5.3` and `imageio-ffmpeg==0.6.0` installed in a local environment.
Run from the repository root:

```sh
python docs/assets/brand/render-logo.py --still --size 2048 --samples 64
python docs/assets/brand/render-logo.py --frames /tmp/disco-logo-frames --size 768 --samples 32 --end 49
python docs/assets/brand/render-logo.py --encode /tmp/disco-logo-frames
```

Frames 1–48 form the loop. Frame 49 is an extra seam-check frame, matching frame 1.
The render script replaces the named outputs. It does not delete frame directories.
