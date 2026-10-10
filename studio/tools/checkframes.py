#!/usr/bin/env python3
"""After a render: every frame exists, decodes and has the right size. usage: checkframes.py <frames_dir> <count>"""
import os, sys
from PIL import Image

d, n = sys.argv[1], int(sys.argv[2])
bad = []
for i in range(n):
    f = os.path.join(d, f'f_{i:05d}.jpg')
    try:
        with Image.open(f) as im:
            im.load()
            if im.size != (1080, 1920): bad.append((i, f'size {im.size}'))
    except Exception as e:
        bad.append((i, str(e)[:60]))
print(f'FRAMES {"OK" if not bad else "BAD"}: {n} checked, {len(bad)} missing or broken', bad[:10])
sys.exit(1 if bad else 0)
