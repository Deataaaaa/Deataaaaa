# DeatAnimation: "What if…?" reels (project memory)

Daily Instagram Reels (1080×1920, 30 fps) rendered entirely in code from `studio/`: Three.js scenes in headless
Chromium, captions/HUD in HTML, a synthesized soundtrack, ffmpeg for the MP4. The owner posts from their phone,
often while at work, so every deliverable has to be ready to post straight from the chat.

## STRICT RULES for every new video (the owner asked for these explicitly; never relax them)

1. **Longer than one minute.** Total duration > 60 s (aim for 62–75 s) for engagement. `render.mjs` refuses
   to render a full video that breaks this or rule 2 (`--force` exists only for re-rendering old episodes).
2. **Every caption readable.** Each caption is fully visible for at least `max(2.2 s, characters / 12)`
   (12 characters per second is a calm phone reading pace) and captions never overlap. Split long sentences
   into two captions instead of cramming. Same idea for HUD lines: short, and on screen long enough to read.
3. **Original, relatable, "wow" topics.** Situations a viewer can imagine living through (elevator, plane,
   car, lightning…) with a spectacular moment. Avoid what every science account already did (black holes,
   the Sun or Moon vanishing, Earth stopping, etc.).
4. **Realism first.** PBR materials, real lighting, a real-looking human ("you"), never a glowing or blown-out
   mannequin. Check exposure on every shot: nothing should be blinding on a phone screen.
5. **Brand.** Accent colour is the logo red `#ff2e2e` (titles' key word, warnings); everything else white/
   neutral. Logo/brand name: DeatAnimation. Series tag on screen: `WHAT IF · NN`.
6. **Sound always there and loud on phones.** Phone-first master (`render_phone(..., target=-10.5, tp=-1.5,
   limit=True)`): mid-range instruments, sub turned into audible harmonics, look-ahead limiter + static gain.
   Never use loudnorm's dynamic mode (it rides the gain). `encode.sh` must report the audio check as OK.
   The Claude app's preview player plays videos muted: tell the owner to play from Photos with volume up.
7. **No bugs.** Before the final render: stills of every shot, then a 1-frame-per-second contact sheet of the
   whole video, checked shot by shot (framing, text over faces, overlaps, timing, exposure). After the render:
   check every frame exists and decodes, and compare frames across worker boundaries.
8. **Facts checked.** Every number on screen goes in `studio/notes/facts.md` with its source or calculation.
9. **One video at a time.** Finish, deliver, then start the next one.

## Delivery checklist
- `studio/encode.sh <frames> <wav> videos/dayN_<slug>`: HQ + `_phone.mp4` (< 30 MB, the chat's send limit).
- Cover image with the title (pick a frame where the title doesn't cover a face), `videos/dayN_cover.jpg`.
- Send the phone MP4 + cover in the chat, with a caption ready to paste (hook, question, "Part N+1 tomorrow:
  …", 5 hashtags) and a comment to pin.
- Update the posting-plan artifact (https://claude.ai/artifact/X86z6ej3oYC7859hXUjTeo).
- Commit and push to branch `claude/whatif-reels` (no pull request unless asked).

## Episodes
| Day | File | Topic | Status |
|---|---|---|---|
| 1 | `studio/episodes/ep01.js` | Earth stops spinning for 1 s (Paris) | delivered (60 s) |
| 2 | `studio/episodes/ep07.js` | Elevator cable snaps (16th floor) | delivered (53.8 s, made before rules 1–2) |
| 3 | `studio/episodes/ep08.js` | Plane window breaks at 11,000 m | rendering (83.4 s, rules 1–2 enforced) |
Ideas lined up: lightning strikes you; 50 km/h crash without a seatbelt; falling through ice (1-10-1 rule);
lightning hits your plane. Old built-but-unpublished episodes: `ep02`–`ep06` (topics too common).

## Technical lessons (pitfalls already hit)
- This cloud box has no GPU: SwiftShader renders ~3–15 s/frame, so a full video takes 1–2 h on 3–4 workers.
  Rendering on the owner's PC (Claude Desktop or `claude remote-control`) would be ~10× faster.
- Wait for every texture before the first frame (`TEX_PENDING` in `engine/elevator.js`), or the first
  frame of each worker samples black textures.
- Never `pkill -f`/`pgrep -f` with a pattern that also appears in your own shell command (it kills or
  matches itself). Wait on PIDs, or watch the frame count instead.
- After a container restart, check render workers are really progressing (one hung silently at 0% CPU).
- Mixamo rigs differ in bone axes: drive the human (`Michelle.glb`) through `makeRetarget` from the Xbot
  driver rig; tuned pose offsets live on the driver. Models are not committed (licence): README has the URLs.
- Motion blur = sub-frames averaged into a 2D canvas over the WebGL canvas (see the plunge in `ep07.js`).
