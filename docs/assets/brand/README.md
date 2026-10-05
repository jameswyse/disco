# Regenerate the logo

Edit [render-logo.py](render-logo.py) for reproducible changes. The still-render command regenerates
[disco-logo.blend](disco-logo.blend), overwriting manual Blender edits.

Use Python 3.11 with `bpy==4.5.3` and `imageio-ffmpeg==0.6.0`. From the repository root:

```sh
python docs/assets/brand/render-logo.py --still --size 2048 --samples 64
python docs/assets/brand/render-logo.py --frames /tmp/disco-logo-frames --size 768 --samples 32 --end 49
python docs/assets/brand/render-logo.py --encode /tmp/disco-logo-frames
```

The repeating geometry lets two seconds of rotation form a seamless loop. Frames 1–48 are encoded;
frame 49 matches frame 1 for checking the seam. Keep both endpoints when checking, not when encoding.
