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
3. **Original "wow" topics in the reference's format** (owner, 9 Oct 2026: "closer to the one I sent"). One tiny,
   precise change to physics for a few seconds ("What if every radioactive atom decayed at once?", "…for 5 seconds?")
   whose consequences escalate from you and everyday things (your body, a banana, a cloud) to the whole planet, told
   from "you" in a real, famous place. Avoid what every science account already did (gravity, oxygen or friction
   disappearing, the Sun or Moon vanishing, Earth stopping, black holes) and the reference creator's own particle
   series (electrons, neutrons, protons…), so we never look like a copy.
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
10. **The owner approves every idea first.** Before building anything for a new video, pitch it (title, hook,
    the 3–4 big moments) and wait for an explicit OK. Never start a scene, script or render on an unapproved idea.
11. **Number by posting order.** The on-screen tag `WHAT IF · NN` and every "Part N" follow the owner's posts:
    #1 = elevator (ep07, already posted; its tag says 02, made before this rule), #2 = plane window (ep08, tag 02),
    #3 = next approved idea (tag 03), and so on. The Earth video (ep01) is not part of the posted series.
    Only tease the next topic in a caption once it is approved ("Part 3 tomorrow 👀" otherwise).
12. **Worst case, shock first.** Show the worst-case scenario all the way through and make people gasp 😳.
    Never pivot to "but this almost never happens / here's why you're safe" (the owner finds it boring).
    Prove it with real cases ("this happened in 2018…"; for physics premises, a real anchor: a measured fact, a real
   place, a real event such as Goiânia 1987), keep it factual and non-graphic (no gore), end on a
    punchy line that invites comments (e.g. "Still want the window seat?").
13. **Zero clipping.** Nothing may pass through a body or an object: props held or worn (masks and their
    tubes, phones, belts, hair, hands on armrests) must be routed around the body (curved tubes with a control
    point in front of the face, masks dangling in front of faces, hands placed clear of belts). Check every
    close-up at full resolution for intersections before rendering, at several times across each shot.
14. **Hook on frame 1.** Never open calm. The first frame is already the most shocking moment in motion
    (flash-forward, slow motion) with the title fully visible from frame 1 and a hit of sound; then hard-cut to
    the calm start of the story. Data: the elevator post (calm opening) lost 66% of viewers in the first 3 s
    (Instagram ranks skip rate first for reach), while those who stayed watched to the end.
15. **Ask for comments.** End on a direct question in the video itself (e.g. "Still want the window seat?") and
    pin a comment that asks a simple either/or question. The elevator post got 0 comments.
16. **A new main character every video.** "You" must look different in each video (face, skin tone, hair,
    build, outfit). Keep the cast log below up to date and never reuse a look.
17. **Cinematic, like the reference.** The owner's benchmark is a viral "What if neutrons disappeared for 5 seconds?"
    reel (10M views on TikTok; theirs reach ~1,500). Breakdown: `studio/notes/reference.md` (file: Drive › Reel ref ›
    "Famous reel.mp4"; the Drive connector only downloads files under 10 MB: ask for "Anyone with the link").
    Every video now has: a **countdown spine** (a millisecond timer from frame 1 to the event, then a second timer,
    slowed down if needed, to the end); **escalation of scale** every ~10 s; **4–6 long eased takes** instead of many
    shots, hard cuts only on sound hits; golden-hour/dusk light, bloom, particles (no film grain: see rule 18); quiet premium type
    (serif title, small serif-italic one-line captions at ~2/3 height, tiny letter-spaced HUD on the left, all clear of
    the Instagram UI); concrete numbers in the HUD; a score with a mid-range drone, ticks that speed up toward zero,
    riser + downer into every cut, a hit on the cut; a **loop end card** repeating the opening title + the question.
    Animations must be flawless: mocap-driven bodies, blinking/breathing always on, no frozen poses, no pops.
18. **No flicker** (owner, 9 Oct 2026, on post 4 v1: "make sure this doesn't happen again"). Never add per-frame noise
    (film grain, random sparkle): `uGrain` stays 0. Render at 2× supersampling (`ssaa=2`, MSAA off). Particles and
    billboards come from `engine/fx.js` (never smaller than 1.6 px: their alpha drops instead; faded out near the lens);
    procedural detail that can get smaller than a pixel is frequency-clamped (`fwidth`); shadows fade at the frustum edge
    (`fadeShadowBorders`) and the frustum only switches inside a flash or a cut; coplanar layers get a depth bias; the
    picture moves under ~25 px per frame (check camera moves with `tools/camflow.mjs` before rendering) and effect
    fronts are blurred over their per-frame sweep. `encode.sh` runs `tools/flickercheck.py` on the phone file: it must
    print `FLICKER CHECK: OK`; then run `tools/popscan.py` and look at every frame it lists.

19. **A WTF moment and Apple the cat** (owner, 10 Oct 2026: "add some wtf moment so people comment about it, like
    'why tf is there a hand spinner'"). Every video has exactly one absurd detail, rendered as realistically as the rest
    and never in the way of the story (post 5: a hand spinner that keeps spinning through the whole catastrophe). And
    Apple, the recurring mascot: a black-and-white cat with red pupils, in every video. Sometimes he is in the hook with
    an arrow and his name (house typography, the name in brand red), otherwise he is hidden somewhere for viewers to find.
    He mostly sits, lies, turns his head, blinks and flicks his tail (a walking cat is hard to make convincing). He is
    never hurt on screen. The caption can add "Did you spot Apple?"; the pinned comment stays an either/or question.

## Delivery checklist
- `studio/encode.sh <frames> <wav> videos/postN_<slug>`: HQ + `_phone.mp4` (< 30 MB, the chat's send limit).
  (`day1_*` files = the Earth video, outside the series.)
- Cover image with the title (pick a frame where the title doesn't cover a face), `videos/postN_cover.jpg`.
- Send the phone MP4 + cover in the chat, with a caption ready to paste (hook, question, "Part N+1 tomorrow
  👀" naming the topic only if already approved, 5 hashtags) and a comment to pin.
- Update the posting-plan artifact (https://claude.ai/artifact/X86z6ej3oYC7859hXUjTeo).
- Commit and push to branch `claude/whatif-reels` (no pull request unless asked).

## Episodes
| Post | File | Topic | Status |
|---|---|---|---|
| – | `studio/episodes/ep01.js` | Earth stops spinning for 1 s (Paris) | made, not part of the posted series |
| 1 | `studio/episodes/ep07.js` | Elevator cable snaps (16th floor) | posted (53.8 s). 12 h: 1.2K views, skip 66%, avg watch 18 s, likes 5.6%, shares 1.8%, 0 comments |
| 2 | `studio/episodes/ep08.js` | Plane window breaks at 11,000 m | delivered v2 (77.2 s, worst case, hook on frame 1, tag 02; v1 83.4 s replaced after clipping feedback) |
| 3 | `studio/episodes/ep09.js` | A humpback engulfs you (POV, Cape Cod, real cases 2021 and 2025) | delivered (75.2 s, POV, tag 03; render 3 lanes ≈ 2 h 50) |
| 4 | `studio/episodes/ep10.js` | Light becomes instant for 5 s (Paris, Champ de Mars → space → Holmdel 1964) | delivered v2 (75.0 s, tag 04): v1 replaced after the owner saw flicker and wanted it "hella impressive". New effects; SSAA 2, no grain, smooth camera moves, depth bias, no close-spark or smoke-card pops; flicker check clean except 18 s (0.61: star/ember parallax, checked by eye). Render ≈ 10 h in all with re-renders |
| 5 | `studio/episodes/ep11.js` | Every radioactive atom decays at once (Guarapari black-sand beach → your body and banana → granite → continents → Goiânia 1987) | approved 10 Oct (owner's pick); first video with Apple and a WTF moment (rule 19); in progress |
Cast log (rule 16): post 1 elevator = Michelle (dark skin, curly black hair, red headphones); post 2 plane =
Michelle (same); post 3 whale = POV diver, black wetsuit and gloves (body never seen); post 4 light = Male_Adult_17
(beard, black cap, blue-white hoodie; his friend Female_Adult_12, brunette with bangs, black hoodie); post 5 radioactive =
Male_Adult_10 (East Asian, short black hair, red track jacket, black track pants; extras: Female_Adult_01 buried in the
sand, Male_Adult_04 bearded in a hoodie in the 1987 shed). Next video: someone new from the Rocketbox pool (46 realistic
rigged people, MIT). Log the avatar name here once used. Apple (rule 19) is `engine/cat.js` `makeCat()`, the same cat
every video.
Other ideas: 50 km/h crash without a seatbelt; lightning hits your plane; stuck upside down on a roller coaster;
phone battery catching fire in your pocket. Old built-but-unpublished episodes: `ep02`–`ep06` (topics too common).

## Technical lessons (pitfalls already hit)
- This cloud box has no GPU: SwiftShader renders ~10–25 s/frame per worker with 3 workers on 4 cores, so an
  80 s video takes 3–4 h. Shots differ a lot in cost: when a worker finishes early, kill the slowest one and
  relaunch its missing frames split across two workers (`--resume` skips frames that exist).
  Rendering on the owner's PC (Claude Desktop or `claude remote-control`) would be ~10× faster. Owner, 9 Oct 2026:
  "I do have a very good PC but my girlfriend would get mad if it is turned on 24/7": the PC can only be used for
  short render sessions, started by them. Their PC: Windows, AMD RX 6700 XT, Google Drive for desktop.
- PC render kit (`pc/`, instructions in `pc/README.md`): `SETUP.bat` once (winget tools, npm + Chromium, pip, the 3D
  people from `pc/avatars.txt`, a GPU test frame); then `RENDER.bat` per video: `git pull`, soundtrack,
  `tools/renderall.mjs --gpu` (N interleaved workers), `checkframes.py`, `encode.sh` (Git Bash), `sheet1fps.py`, copy to
  Google Drive › DeatAnimation (`<name>_phone.mp4`, cover, `_sheet.jpg`, `_flicker.txt`, `_log.txt`; read them back with
  the Drive connector), wait for the upload, shut down. To hand over a video: finish and check it here with previews,
  set `pc/job.json` (ep, name, cover, workers), add any new avatar to `pc/avatars.txt`, push, then tell the owner to
  double-click RENDER.bat. Keep `pc/*.ps1` ASCII only (PowerShell 5.1) and bash scripts LF (`.gitattributes`); Windows
  tools print `\r\n`, so strip `\r` from every `$(...)` in bash. `render.mjs --gpu` exits 3 if Chromium lands on a
  software renderer; `renderall.mjs` then retries with `--headed`.
- Wait for every texture before the first frame (`TEX_PENDING` in `engine/elevator.js`), or the first
  frame of each worker samples black textures.
- Never `pkill -f`/`pgrep -f` with a pattern that also appears in your own shell command (it kills or
  matches itself). Wait on PIDs (`kill -0 PID`), or watch the frame count instead.
- After a container restart, check render workers are really progressing (one hung silently at 0% CPU).
- `cd dir && nohup node render.mjs ... & echo $!` prints the PID of the backgrounded subshell, not of node: killing it
  leaves the worker running (post 4 v2: two "stopped" lanes kept rendering the same frames as their replacements for
  1.5 h, and everything ran 2-3x slower). Launch `nohup node ... &` as its own command, then check `ps` for the exact
  `--from/--to` arguments before and after any kill.
- Mixamo rigs differ in bone axes: drive the human (`Michelle.glb`) through `makeRetarget` from the Xbot
  driver rig; tuned pose offsets live on the driver. Models are not committed (licence): README has the URLs.
- Motion blur = sub-frames averaged into a 2D canvas over the WebGL canvas (see the plunge in `ep07.js`).
- `AnimationMixer.setTime(sameTime)` does NOT reset bones (the mixer skips values that did not change), so
  `offsetBone` on a still pose piles up frame after frame. Freeze one frame and restore it before posing
  (`captPose` in `ep08.js`). This caused the "broken mannequin" in the first 1990 reconstruction.
- Every frame must be a pure function of t: nothing may read state left by the previous frame (e.g. wind
  streaks projected with the camera before this frame's camera is set). After any code change during a
  render, render a still of an already rendered frame and diff it (must be identical), and re-render the
  first frame of every worker if a shot reads last-frame state.
- Mannequin people (`engine/jetnose.js` `dressPilot`): colour per bone, hair per pixel from the bind pose,
  keep faces turned away or small; captions over white scenery get `{ shade: 1 }`.
- Underwater (`engine/ocean.js`): `waterize(material)` patches any lit material (per-channel absorption, haze
  that depends only on view direction and camera depth, else the horizon shows a seam; caustics on the sun light;
  light dimming with depth). Per-material `wAmb`/`wDir`/`wInner*` uniforms darken the inside of the whale's mouth.
  Canvas noise used by repeated textures must be tileable (`fbmT`), or the seams show on the sand.
- POV (`engine/diver.js`): Michelle with the head hidden by skin weight, body hung behind the camera, arms by IK
  in camera space. Natural gloves = palms turned in, thumbs up, fingers forward, curl 0.35, spread 0.3 (finger
  curl axis is local z, spread y). Palms down with spread fingers reads as claws. Straps/cases are sized from the
  measured forearm section (+2 mm), so they never cut into the sleeve.
- Zero clipping is measured, not eyeballed: `studio/tools/clipcheck.sh <ep> '[times]'` renders those frames and
  prints camera/gloves/diver/kayak distances to every whale triangle and heights above the seabed (0 = clip).
- A torch on surfaces that get close blows out to white: dim it by shot and shade the captions over it.
- New people come from the Microsoft Rocketbox library (MIT): `tools/fetch_rocketbox.sh <Name>` (shallow blob-less
  clone, TGA → JPG/PNG, `avatar.json`), `engine/rocketbox.js` `loadAvatar()` (bones renamed to Mixamo names, metres,
  feet on y = 0, facing +z), `episodes/cast.js` (casting view, `?who=&shot=face|full|three&turn=`). The FBX normals are
  faceted: `creaseNormals` rebuilds them. Hair/lashes use the `_opacity` texture: alpha test 0.5 + a blended pass, and
  no sheen/strong env on hair (it paints a grey veil across the fringe). The plain FBX already has facial bones (eyes,
  blink, jaw, brows) for blinks and a gasp. Their bind pose is an A-pose: put them in the Xbot T-pose before retargeting.
  Careful: the plain FBX is not skinned to the eyelid bones (rotating them does nothing); blinks need the _facial FBX.
- Posing (`engine/poses.js`): `sit()` / `stand()` rebuild the pose from rest every frame with world-space IK (legs up /
  crossed, arms behind / on knees / lap, look-at), then lift the body so its lowest skinned vertex sits 4 mm above the
  ground you pass (pass the blanket top, not the lawn, or they sink into the blanket). Background people use `lod: 512`.
- Paris set (`engine/paris.js`): custom day sky (`makeDaySky`, art-directable; the Preetham Sky washed out under ACES),
  instanced leaf-card trees (radial normals), grass blades near the hero, Haussmann blocks, the tower as a Beams lattice.
  `heatize(material)` adds two effects to any lit material: scorch (charring + ember specks where the sun hits, organic
  materials only, so shadows stay cool) and incandescence (blackbody ramp, stronger on edges). ACES + sRGB turns warm
  HDR colours into pale cream: for an inferno look, push saturated low values and grade with uTint/uContrast/uSat.
- Post 4 v2 effects live in `engine/fx.js`: `Sparks` (points sized in metres, birth/life, velocity, drag, a global
  acceleration such as an upward blast, cooling colour), `SkyStars` (fixed pixel size), `Billboards` (instanced quads
  with atlas tiles: additive flames/fireballs, or lit smoke whose atlas stores a normal map), `Streaks` (screen-space
  motion trails), `Flare` (starburst + anamorphic streak + ghosts placed in screen space), `bakeEquirect` /
  `milkyWayMap` / `cmbMap` (half-float equirect sky maps baked once on the GPU), `fadeShadowBorders()`.
- `DataTexture` row 0 is the bottom of the texture (v = 0): an atlas written top row first comes out upside down
  (the first flames were upside-down candles). Dump generated textures to an image before using them.
- UnrealBloomPass runs before tone mapping: set `bloom.threshold ≈ 0.95 / toneMappingExposure`, or a bright sky
  blooms over the whole frame (the first melt frames were a beige wash).
- `heatize` materials share the `FX` uniforms: set them in every branch of `frame()` (in v1 the Holmdel trees were
  drawn with Paris's scorch and heat values: pale yellow trees).
- 2x supersampling with MSAA off looks the same as with MSAA 4 and renders up to 2x faster.
- Camera moves use `CamPath` (core.js): Catmull-Rom curves with a monotone timing curve, so the camera never stops at a
  key (v1's per-segment easing stopped at every key). New moves use `{ arc: true }`: the default gives every segment
  the same share of time (the speed jumps at a key between a long and a short segment) and turns toward a target point
  that only swings round when the camera gets close (post 4 v2's glide: a 57-degree whip at 95 px per frame in its
  last half second, then a dead stop). `arc` travels by arc length at a C1 speed and turns by heading/pitch at C1 rates.
- Additive puffs pile up into a white haze over a long take: give them a life (fade out after a few seconds).
- Keep camera motion slow on screen: frames have no motion blur, so a background moving faster than ~25 px per frame
  strobes on a phone and reads as flicker (post 4 v2's first orbit swung 180 degrees in 7 s: 40-75 px per frame; the
  fix was a slow 50-degree drift and a hard cut on a sound hit). In a 9:16 frame a turn of 1 degree per frame moves the
  picture ~38 px: keep turns under ~15 degrees a second and spread a big turn over the whole take (the glide's fix: a
  spiral crane-down that turns all the way, 10-19 px per frame). Check every move before rendering with
  `tools/camflow.mjs` (ground plane + sky model, same numbers as the pan column of `flickercheck.py`; it matched the
  rendered frames within a few px), then measure pairs of rendered stills.
- An effect front that sweeps across the frame (a reveal band, a shock front) strobes as separate copies when it moves
  further per frame than its own width: blur it over the distance it travels in one frame, keeping its energy (post 4's
  microwave-sky band moved 127 px per frame and was 100 px wide; `uCMBRd` spreads it over each frame's sweep).
- `tools/lanes.sh` runs a render as a queue of small chunks on up to N workers (`--resume`), and counts lanes started
  by hand (`OTHERS="pid …"`) against N, so a worker starts the moment any lane ends; nobody splits ranges by hand.
- `tools/flickercheck.py` flags on alternation: once t-1 and t+1 are moved onto t by optical flow, flicker goes up then
  down while motion, fades and reveals change one way. `altf` (flat areas, 90th percentile of the second) read 0.72-1.21
  on v1's grain, 0.57-1.08 on the strobing orbit, 0.02-0.46 on clean shots: limit 0.6. `pop` (worst frame) caught the
  vanished lawn (2.9) and the strobing scan band (1.9): limit 1.5. Jf/J are printed for information only (they also rise
  on legitimate transitions). Hard cuts, flashes and near-white or near-black frames are skipped. Thousands of tiny
  points moving with the camera (stars, frozen embers) read up to ~0.6 because the flow cannot follow each one: look at
  the frames before calling it flicker (post 4's 18 s read 0.61; the points glide, none twinkles).
- Pops too small to move a frame-wide average (a thin line, one spark) need `tools/popscan.py <frames> <from> <to>`
  plus your eyes on the frames it lists (it masks the tag, HUD timer and captions, whose digits change every frame).
- Coplanar ground layers z-fight from far away: post 4's ground (y 0), roads (0.02), water (0.03) and lawn tops (0.08)
  with a 5 cm near plane gave horizontal stripes and a lawn that vanished for one frame in the high shots. `paris.js`
  gives each lower layer a depth bias (`polygonOffset`): only the fighting pixels change. Give any new layered ground
  the same, and never leave the near plane at 5 cm without a reason.
- Particles near the lens jump hundreds of px per frame and pop as one-frame blobs: fade sparks out within a few metres
  of the camera (`near` on `Sparks`/`Billboards`; post 4's storm: near 3, full at 7.5 m) and cap their size.
- A camera that flies through big cards (smoke clouds tens of metres wide) sees them darken the frame as it closes in,
  then vanish in two frames at the near fade: give such `Billboards` `nearK: 1` (they fade from one card size away).
- A path whose target jumps from near to far (after a cut: "look ahead" → "look up at the tower") whips round in its
  first frames: post 4's crane after the stars cut started at 80 px per frame. Start such takes with `{ arc: true }`
  (here a separate `crane` path blended into the main one with a smoothstep weight, so later frames stay identical).
- Apple (`engine/cat.js`): body and head are signed-distance sculptures turned into meshes by surface nets, fur = 14-18
  shells drawn as one InstancedMesh (layer = gl_InstanceID + 1, inner first, blended, mipmapped clump texture so far
  strands average out), per-vertex `aWhite` (tuxedo pattern) and `aLen` (fur length). Look-dev in `episodes/catview.js`
  (`?cam=three|front|side|close|eye&glow=1`). Eyelids are shells turning about the eye's horizontal axis (almond opening).
- A NaN in any pixel blooms into a big black rectangle (UnrealBloom blurs it): degenerate triangles give zero normals and
  `normalize(0)` is NaN. Never collapse a mesh edge to a point (stop parametric tips at 97%) and guard normalize.
- Screen-space ribbons (whiskers) need `side: DoubleSide`: their winding flips with the screen direction and back faces
  are culled (the whiskers were invisible). Draw them at least 1.6 px wide, alpha = true width / 1.6 px.
- A low directional light facing the lens glints on wet sand (roughness 0.3) as a huge blob: put fill lights high.
- Post 5's black sand near the hero is a JS-drawn mask texture (`makeStreakMask`) shared with the shader, so particles
  bursting out of the streaks line up with them; elsewhere the streaks are procedural (fwidth-clamped fbm).
- ACES turns bright saturated blue into lavender: the Cherenkov glow keeps its blue below ~2-3 (before exposure) and
  darkens the reflections it outshines instead of adding more light.
- Parallel render workers used to pick a random port and could collide (EADDRINUSE killed one silently): `render.mjs`
  now listens on a free port. Billboard smoke seen from above reads as white blobs: fade it out when the camera rises.
