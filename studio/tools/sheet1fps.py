#!/usr/bin/env python3
"""One frame per second (mid-second) on a single contact sheet, for the shot-by-shot review (rule 7).
usage: sheet1fps.py <frames_dir> <out.jpg> [fps=30]"""
import os, sys
from PIL import Image, ImageDraw

d, out = sys.argv[1], sys.argv[2]
fps = int(sys.argv[3]) if len(sys.argv) > 3 else 30
n = len([f for f in os.listdir(d) if f.startswith('f_') and f.endswith('.jpg')])
secs = n // fps; W, H, cols = 216, 384, 10; rows = (secs + cols - 1) // cols
sheet = Image.new('RGB', (cols * W, rows * H))
for s in range(secs):
    im = Image.open(os.path.join(d, f'f_{s * fps + fps // 2:05d}.jpg')).resize((W, H))
    sheet.paste(im, ((s % cols) * W, (s // cols) * H))
    ImageDraw.Draw(sheet).text(((s % cols) * W + 4, (s // cols) * H + 4), f'{s}.5s', fill='yellow')
sheet.save(out, quality=85)
print('sheet', out, secs, 'seconds')
