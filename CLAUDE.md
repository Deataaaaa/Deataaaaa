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
    shots, hard cuts only on sound hits; golden-hour/dusk light, bloom, particles, light grain; quiet premium type
    (serif title, small serif-italic one-line captions at ~2/3 height, tiny letter-spaced HUD on the left, all clear of
    the Instagram UI); concrete numbers in the HUD; a score with a mid-range drone, ticks that speed up toward zero,
    riser + downer into every cut, a hit on the cut; a **loop end card** repeating the opening title + the question.
    Animations must be flawless: mocap-driven bodies, blinking/breathing always on, no frozen poses, no pops.

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
| 4 | – | new pitches in the reference's format: every radioactive atom decays at once (recommended) / hydrogen bonds vanish for 5 s / light becomes instant for 5 s / Earth's magnetic field off for 1 s / chemical bonds vanish for 1 s; character from `studio/notes/casting_post4.jpg` | waiting for the owner's OK |
Cast log (rule 16): post 1 elevator = Michelle (dark skin, curly black hair, red headphones); post 2 plane =
Michelle (same); post 3 whale = POV diver, black wetsuit and gloves (body never seen). Next video: a new person from
the Rocketbox pool (46 realistic rigged people, MIT; post 4 candidates: Female_Adult_12, Male_Adult_10, Male_Adult_17,
Female_Adult_04). Log the avatar name here once used.
Other ideas: 50 km/h crash without a seatbelt; lightning hits your plane; stuck upside down on a roller coaster;
phone battery catching fire in your pocket. Old built-but-unpublished episodes: `ep02`–`ep06` (topics too common).

## Technical lessons (pitfalls already hit)
- This cloud box has no GPU: SwiftShader renders ~10–25 s/frame per worker with 3 workers on 4 cores, so an
  80 s video takes 3–4 h. Shots differ a lot in cost: when a worker finishes early, kill the slowest one and
  relaunch its missing frames split across two workers (`--resume` skips frames that exist).
  Rendering on the owner's PC (Claude Desktop or `claude remote-control`) would be ~10× faster.
- Wait for every texture before the first frame (`TEX_PENDING` in `engine/elevator.js`), or the first
  frame of each worker samples black textures.
- Never `pkill -f`/`pgrep -f` with a pattern that also appears in your own shell command (it kills or
  matches itself). Wait on PIDs (`kill -0 PID`), or watch the frame count instead.
- After a container restart, check render workers are really progressing (one hung silently at 0% CPU).
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
