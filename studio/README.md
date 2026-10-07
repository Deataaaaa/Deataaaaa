# What If — reel studio

Code that renders the six "What if…?" Instagram reels (1080×1920, 30 fps) from scratch: 3D scenes in Three.js,
captions and HUD in HTML, a synthesized soundtrack, and ffmpeg for the final MP4.

## Episodes

| Day | File | Topic |
|---|---|---|
| 1 | `episodes/ep01.js` | Earth stops spinning for 1 second (Paris) |
| 2 | `episodes/ep02.js` | Falling into a black hole (Sagittarius A*) |
| 3 | `episodes/ep03.js` | The atmosphere disappears for 5 seconds (beach) |
| 4 | `episodes/ep04.js` | A hole through the Earth (PREM density table in `ep04_fall.json`) |
| 5 | `episodes/ep05.js` | The Moon stops moving |
| 6 | `episodes/ep06.js` | The Sun disappears |

Every number shown on screen is listed with its source or calculation in `notes/facts.md`.

## How it fits together

- `engine/player.html` loads one episode module and exposes `renderFrame(t)`; every frame is a pure function of time.
- `engine/core.js`: renderer, post-processing (bloom, grade, grain, vignette), captions, HUD, helpers.
- `engine/assets.js`: shared low-poly assets (sky, people, trees, Eiffel Tower, buildings, airliner, globe…).
- `engine/beach.js`, `engine/blackhole.js`: the beach set and the black-hole ray tracer.
- `render.mjs`: serves the folder, drives headless Chromium (software WebGL) and writes JPEG frames.
- `audio/synth.py` + `audio/epXX.py`: offline synth that builds each soundtrack on the episode's cue times.

## Render an episode

```bash
npm install                                   # three.js (playwright is preinstalled globally here)
node render.mjs --ep ep03 --stills 1.5,12,30 --out /tmp/prev   # a few preview frames
node render.mjs --ep ep03 --out /tmp/frames --from 0 --to 774  # frames (split ranges across workers)
python3 audio/ep03.py out/ep03.wav                              # soundtrack (numpy + scipy)
ffmpeg -framerate 30 -i /tmp/frames/f_%05d.jpg -i out/ep03.wav -c:v libx264 -crf 22 \
  -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart -shortest day3.mp4
node render.mjs --ep ep03 --cover 18 --out .   # cover image with the title
```

Rendering is CPU-only here (about 2–5 s per frame per worker), so a 55-second episode takes roughly 40 minutes with two workers.

## Making a new episode

Copy an episode file, keep the structure (`CAPTIONS`, `TITLE`, shot list, HUD block), change the scenes and
the script, fact-check every number, then write a matching `audio/epXX.py` with the same cue times.
