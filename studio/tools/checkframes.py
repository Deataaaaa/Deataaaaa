#!/usr/bin/env python3
"""After a render: every frame exists, decodes and has the right size, and no frame has a black hole that its
neighbours don't (a NaN pixel blurred by the bloom into a black rectangle: post 8 on the PC). usage: checkframes.py <frames_dir> <count>"""
import os, sys
from PIL import Image

d, n = sys.argv[1], int(sys.argv[2])
bad, dead = [], []
for i in range(n):
    f = os.path.join(d, f'f_{i:05d}.jpg')
    try:
        with Image.open(f) as im:
            im.load()
            if im.size != (1080, 1920): bad.append((i, f'size {im.size}'))
            g = im.convert('L').resize((108, 192), Image.BILINEAR).crop((4, 8, 104, 184))   # skip the vignette corners' edge
            h = g.histogram(); dead.append(sum(h[:3]) / (100 * 176))                        # share of pure-black pixels
    except Exception as e:
        bad.append((i, str(e)[:60])); dead.append(0.0)
# a black area that appears for a few frames, or a big one that appears from one frame to the next
holes = [i for i in range(3, n - 3) if dead[i] - max(dead[i - 3], dead[i + 3]) > 0.04 or dead[i] - dead[i - 1] > 0.25]
print(f'FRAMES {"OK" if not bad else "BAD"}: {n} checked, {len(bad)} missing or broken', bad[:10])
if holes: print(f'BLACK AREAS: {len(holes)} frame(s) to look at (seconds):', sorted({round(i / 30, 1) for i in holes})[:20])
sys.exit(1 if bad else 0)
