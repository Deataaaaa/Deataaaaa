#!/usr/bin/env python3
"""Flicker check for a rendered video (owner's note on post 4 v1: "flickering at the beginning").

Each frame is predicted from the previous one moved by the optical flow (OpenCV Farneback): what the motion explains
is fine, what is left over is change that does not belong to any motion: grain, aliasing sparkle, blinking particles,
encoder pumping. Per second of video it prints:
  Jf   mean residual (luma 0-255) on flat areas (sky, walls): grain and encoder pumping show up here
  J    mean residual where the flow is reliable (forward-backward check): sparkle on detail shows up here, but so do
       caption fades, timer digits and fine parallax the flow cannot follow, so its limit is loose
  PSNR (with --ref) the worst frame of the encode against the source frames
Frames at a hard cut or a flash (big jump in mean brightness) are skipped: those changes are intended.
Seconds over the limits are flagged; exit code 1 if any is (encode.sh fails loudly).
Calibration (source frames): post 4 v1 with film grain 0.035 read Jf 1.1-1.3 on the hook and J 4.2-6.2 on the drone
shot (the flicker the owner saw); v2, grain-free at 2x supersampling, reads Jf 0.2-0.7 and J 1.4-3.1 on the same shots.

usage: flickercheck.py <video.mp4 | frames_dir> [--ref frames_dir] [--fps 30] [--from N --to M]"""
import sys, os, glob, subprocess, argparse
import numpy as np
import cv2

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('--ref'); ap.add_argument('--fps', type=float, default=30)
ap.add_argument('--scale', type=float, default=0.5, help='analysis scale (0.5 = 540x960, a phone screen)')
ap.add_argument('--jf', type=float, default=0.9); ap.add_argument('--j', type=float, default=4.0); ap.add_argument('--psnr', type=float, default=30.0)
ap.add_argument('--from', dest='frm', type=int, default=0); ap.add_argument('--to', type=int, default=10 ** 9)
a = ap.parse_args()
W, H = int(1080 * a.scale), int(1920 * a.scale)


def frames_from_dir(d):
    for f in sorted(glob.glob(os.path.join(d, 'f_*.jpg')))[a.frm:a.to]:
        im = cv2.imread(f, cv2.IMREAD_GRAYSCALE)
        yield cv2.resize(im, (W, H), interpolation=cv2.INTER_AREA).astype(np.float32)


def frames_from_video(p):
    cmd = ['ffmpeg', '-v', 'error', '-i', p, '-vf', f'scale={W}:{H}:flags=area', '-f', 'rawvideo', '-pix_fmt', 'gray', '-']
    pr = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    n = 0
    while True:
        b = pr.stdout.read(W * H)
        if len(b) < W * H: break
        if a.frm <= n < a.to: yield np.frombuffer(b, np.uint8).reshape(H, W).astype(np.float32)
        n += 1
    pr.wait()


def flow(p, c):   # dense flow p -> c at half the analysis scale, returned at the analysis scale
    ps, cs = cv2.resize(p, (W // 2, H // 2)).astype(np.uint8), cv2.resize(c, (W // 2, H // 2)).astype(np.uint8)
    f = cv2.calcOpticalFlowFarneback(ps, cs, None, 0.5, 4, 21, 3, 5, 1.1, 0)
    return cv2.resize(f, (W, H)) * 2.0


gx_, gy_ = np.meshgrid(np.arange(W, dtype=np.float32), np.arange(H, dtype=np.float32))
src = frames_from_dir(a.src) if os.path.isdir(a.src) else frames_from_video(a.src)
ref = frames_from_dir(a.ref) if a.ref else None
prev = None; rows = {}; i = a.frm
for f in src:
    sec = int(i / a.fps)
    r = rows.setdefault(sec, {'j': [], 'jf': [], 'psnr': []})
    if ref is not None:
        g = next(ref, None)
        if g is not None:
            mse = float(np.mean((f - g) ** 2)); r['psnr'].append(99.0 if mse < 1e-6 else 10 * np.log10(255 ** 2 / mse))
    cut = prev is not None and (abs(float(f.mean()) - float(prev.mean())) > 6.0 or float(np.abs(f - prev).mean()) > 30.0)
    if cut: r.setdefault('cuts', 0); r['cuts'] = r.get('cuts', 0) + 1   # hard cuts and flashes are intended: skipped
    if prev is not None and not cut:
        fw = flow(prev, f); bw = flow(f, prev)
        # predict f from prev: sample prev at x - fw(x) (backward warp using the backward flow)
        pred = cv2.remap(prev, gx_ + bw[..., 0], gy_ + bw[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
        res = np.abs(f - pred)
        # forward-backward consistency: where following bw then fw comes back home, the flow is trusted
        fwb = cv2.remap(fw, gx_ + bw[..., 0], gy_ + bw[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
        ok = np.hypot(fwb[..., 0] + bw[..., 0], fwb[..., 1] + bw[..., 1]) < 0.6
        grad = cv2.blur(np.abs(cv2.Sobel(f, cv2.CV_32F, 1, 0)) + np.abs(cv2.Sobel(f, cv2.CV_32F, 0, 1)), (5, 5))
        flat = ok & (grad < 12.0)
        r['j'].append(float(res[ok].mean()) if ok.mean() > 0.05 else 0.0)
        r['jf'].append(float(res[flat].mean()) if flat.mean() > 0.02 else 0.0)
    prev = f; i += 1

bad = 0
print(f'{"sec":>4} {"Jf":>6} {"J":>6} {"PSNR":>6}')
for sec in sorted(rows):
    r = rows[sec]
    if not r['j']: print(f'{sec:4d}   (cut or flash)'); continue
    J = float(np.mean(r['j'])); Jf = float(np.mean(r['jf'])); P = float(np.min(r['psnr'])) if r['psnr'] else None
    flag = Jf > a.jf or J > a.j or (P is not None and P < a.psnr)
    bad += flag
    print(f'{sec:4d} {Jf:6.2f} {J:6.2f} {("%6.1f" % P) if P is not None else "     -"}{"  <-- FLICKER?" if flag else ""}')
print('FLICKER CHECK:', 'OK' if not bad else f'{bad} second(s) flagged')
sys.exit(1 if bad else 0)
