# One-frame pops for review (flickercheck.py only sees what spreads over the frame): with t-1 and t+1 moved onto t by
# optical flow, a pop goes up then down (or down then up) over a patch. Prints frames where a 32x32 block (at 540x960)
# has a mean alternation above the limit; the series tag, HUD and caption band are masked. Busy shots (sparks, fire)
# read 7-25 everywhere, so look at the frames it lists: post 4 v2's z-fight stripes and close sparks read 23-26 next
# to neighbours at 8, the vanished lawn 26 next to 6.
# usage: popscan.py <frames_dir> <from> <to> [limit=6]
import sys, cv2, numpy as np
d = sys.argv[1]; a0, a1 = int(sys.argv[2]), int(sys.argv[3]); lim = float(sys.argv[4]) if len(sys.argv) > 4 else 6.0
W, H, B = 540, 960, 32
gx, gy = np.meshgrid(np.arange(W, dtype=np.float32), np.arange(H, dtype=np.float32))
ld = lambda i: cv2.resize(cv2.imread(f'{d}/f_{i:05d}.jpg', 0), (W, H), interpolation=cv2.INTER_AREA).astype(np.float32)
def flow(p, c):
    ps, cs = cv2.resize(p, (W // 2, H // 2)).astype(np.uint8), cv2.resize(c, (W // 2, H // 2)).astype(np.uint8)
    return cv2.resize(cv2.calcOpticalFlowFarneback(ps, cs, None, 0.5, 4, 21, 3, 5, 1.1, 0), (W, H)) * 2.0
warp = lambda im, fl: cv2.remap(im, gx + fl[..., 0], gy + fl[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
prev2, prev = ld(a0 - 1), ld(a0)
for t in range(a0, a1):
    try: nxt = ld(t + 1)
    except Exception: break
    da = prev - warp(prev2, flow(prev, prev2)); db = warp(nxt, flow(prev, nxt)) - prev
    al = np.sqrt(np.maximum(0, -da * db))
    al[:80] = 0; al[300:510, :310] = 0; al[570:665] = 0      # overlays: series tag, HUD timer (digits change every frame), caption band
    blk = al[:H // B * B, :W // B * B].reshape(H // B, B, W // B, B).mean(axis=(1, 3))
    j = np.unravel_index(np.argmax(blk), blk.shape)
    if blk.max() > lim: print(t, f'{t/30:.2f}s', 'block max', round(float(blk.max()), 1), 'at', (int(j[1] * B * 2), int(j[0] * B * 2)), 'mean', round(float(al.mean()), 2), flush=True)
    prev2, prev = prev, nxt
print('scan done', a0, a1)
