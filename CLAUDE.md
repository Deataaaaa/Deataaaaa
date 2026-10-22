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
   **Update (owner, 21 Oct 2026: "Do the same ideas as him, he BLEW UP tiktok"):** remake his biggest topics (electrons
   16.2M, oxygen 12.3M, neutrons 5M, pop star 100x taller 4.3M, pi = 3 3.2M, iron 2.5M, atom gains a proton 1.1M) in our own
   realistic style: our own place, numbers, script, visuals and music. Never reuse his footage, scenes or wording.
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
    "Famous reel.mp4"; the Drive connector fails on videos over ~7 MB (its base64 reply is too big) and cannot share publicly: ask the owner for "Anyone with the link", then curl `drive.usercontent.google.com/download?id=ID&export=download&confirm=t`).
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

20. **"Follow for more" on every end card** (owner, 10 Oct 2026, from post 6 on; they said "subscribe for more", Instagram's
    word is Follow, wording to confirm with them). A tiny letter-spaced line at the bottom middle of the end card (y ≈ 1486,
    above the strip Instagram covers with the username and caption), and Apple's tiny head peeking up from behind it for
    about two seconds: he looks at you, blinks, ducks back down. `engine/endtag.js` `makeEndTag({ text })`, then
    `tag.update(t, endFullyIn, endA)` every frame (look-dev: `episodes/endtagview.js`).

21. **Spend as few tokens as possible** (owner, 15 Oct 2026, low on usage). Short replies, no narration, no
    re-reading big files, few low-res stills (contact sheets, not single frames), checks by script output. Final renders
    run on the owner's PC (RENDER.bat), never here. **Caveman style** (owner, 17 Oct 2026): every chat reply in bare fragments, no filler,
    no pleasantries, no recaps ("Fix done. Push ok. Run RENDER.bat."). Code, commits and on-screen text stay normal.

22. **Voiceover on every video, Kokoro `af_heart`** (owner, 16 Oct 2026: Cori felt "too robotic"). A calm, natural female
    narrator reads along with the captions: Kokoro-82M (Apache-2.0, free for commercial use) voice `af_heart`, 8 % under its
    default pace, no deepening, never another voice without the owner's OK. Lines in `studio/audio/vo/epNN_lines.json` (one per
    caption window), `tools/vo.py <lines> kokoro:af_heart <wav>` makes the WAV (committed), the episode's audio script ducks the
    music about 6 dB under it. Send the owner the soundtrack to check before the render.

23. **Small, readable HUD** (owner, 16 Oct 2026: "make this text tinier with an easier and readable font"). The HUD block (label,
    timer, sub lines) is Inter with tabular figures (`.cine #hud` in `player.html`). It is big while the countdown runs (part of
    the hook), then shrinks smoothly, never with a cut: starting 1 s before the event and taking 0.55 s, the timer goes to 62 %
    of its size and the small lines a bit less (`hudK(t, tEvent)` in `core.js`, passed as `hud.k`), and it stays small after.

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
| 5 | `studio/episodes/ep11.js` | Every radioactive atom decays at once (Guarapari black-sand beach → your body and banana → granite → continents → Goiânia 1987) | delivered 10 Oct (68 s, tag 05; first video with Apple and the hand-spinner WTF, rule 19). First render on the owner's PC: 4 min in all (the cloud box needed ~6 h). Covers: `videos/post5_cover.jpg` (burning city), `post5_cover_apple.jpg` |
| 6 | `studio/episodes/ep12.js` | Every atom on Earth stops moving for 1 s (Times Square at blue hour → the frozen second → absolute zero, frost, snow → the sky falls → Earth turns white → Vostok 1983) | built 10 Oct (68 s, tag 06; WTF = a snowman in sunglasses next to you; Apple on the plaza in front of the steps at 8.6-10.6 s; first Follow-for-more end tag). Look approved by the owner ("fine as is"); rendered on the owner's PC via RENDER.bat. Cover `videos/post6_cover.jpg` |
| 7 | `studio/episodes/ep13.js` | The air stops turning with Earth for 30 s (POV on Baker Beach, San Francisco → 1,320 km/h wind, the Golden Gate twists and breaks → space → "then the sea pulls back…" → the biggest tsunami) | built 15 Oct (68 s, tag 07; POV with hands by IK; WTF = a capybara with an orange on its head flying past in the storm at 0:01, 0:13, 0:21, 0:28 and 0:38, small and quick (owner: only the flying one, for "why is there a capybara flying past at x:xx" comments; the hook is the bridge twisting in slow motion); Apple on a rock in the swash, calm part). Owner: the tsunami must be "MEAN ASF": v2 wave 440 → 770 m (dark silt-loaded face, foam lace climbing it, a lip that passes over you at the cut, a mane of spray off the crest, a churning toe, debris and a boat on the face), it swallows the sun (the light dies at 45.4-47.4 s) and both bridge towers (50.6 and 55.3 s, bursts + braams), roar cut 0.3 s before the hit. Owner after the first PC render: "straight cut to the gust, boring, not enough view, not enough destruction": v3 = one take from the walk through the gust (shoved down at 0:11, hands up, look at the houses being ripped off their foundations, junk flying past, then across to the bridge with a push-in to fov 29 while it twists and breaks), houses and trees torn from the Presidio cross the bridge view, much less haze. Cover `videos/post7_cover.jpg` |
| 8 | `studio/episodes/ep14.js` | 1 gram of antimatter appears in front of you (Shibuya Crossing at night → the bead, femtoseconds: atoms annihilating on its surface → the plasma ball in bullet time → milliseconds: the fireball and the shock down the canyon → Tokyo Tower: the mushroom cloud → space → back to the instant it appeared; CERN < 10 ng, $62.5 trillion a gram) | built 16 Oct (68 s, tag 08; new Shibuya set `engine/shibuya.js` with Japanese neon signs from a Noto Sans JP subset; walking crowd `poses.js walk()`; `engine/antimatter.js` fireball/shock/clock; `engine/micro.js` atoms; lens effects in the grade: chroma, shock refraction ring, heat shimmer, punches; WTF = a furry monster plush keychain tumbling intact past the rooftop camera at 0:32-0:33 (`engine/plush.js`); Apple on a vending machine, south-east corner, calm part). Cover `videos/post8_cover.jpg`. v1 PC render (2.4 min): black NaN rectangle at 17.6 s and a "crash" at 19 s (black frames), robotic voice, big HUD. v2: pow/NaN fixes + sanitize pass, Kokoro af_heart, small Inter HUD (rule 23), motes faded 1-2.5 m from the lens in the rewind, new Render Engine CMD UI. (The v1 flicker table tail, 57-67 s, was clean: J/Jf are info only; the 2 flagged seconds were above the tail, most likely the NaN ones) |
| 9 | `studio/episodes/ep15.js` | Air becomes as thick as honey for 5 s (Tower Bridge, London, at the blue hour in the rain → the rain stops dead, no breath, sound dies → birds hang, fuel engines choke, cars roll to a stop → a plane over the bridge: fans wind down, landing lights die, the RAT drops → space: every plane a red dot → second 5: the rain falls, you gasp → the plane glides on with dead engines; BA 9 1982) | built 17 Oct (68 s, tag 09; first video with the Zeigarnik open loop: HUD "Second 5: ???" until it resolves; new `engine/london.js` (Tower Bridge, Thames reflector with rain rings that stop, banks, skyline, aerial street glow), `engine/rain.js` (falling streaks / frozen beads, headlight cones, hide boxes), `engine/airliner.js`, `engine/props15.js`; WTF = a yellow rubber duck hanging in the air beside you (`makeRubberDuck`, v5; the tea, the goldfish ball and the T-rex costume were rejected: "not wtf enough", "ugly and too obvious"); Apple on the east parapet at z 73.4, glide B). Physics kept factual: small things freeze, big things don't (no stopped buses or planes, no frozen hurricanes). Retention pass (owner: "extra, extra visual"): hook pushes in on you with the tea hanging beside you, a gull flock that hangs over the deck for the crane (`makeGull2`), beads streaking past the flying camera (camera motion blur), v3 (owner after the PC render: flicker, blinding glow, engines not attached, a block in the motors, a better WTF, a meme ending): camera motion blur on every moving shot (360-degree shutter) + softer, 30 % fewer streaks; headlights, lamps, plane lights, rain light cones and bloom about halved; nacelles moved aft under the wing on real pylons, nothing inside the inlets; 75 s with the meme ending: "And then the water falls back…" (the Thames drains 4 m, 62-65 s) "…and a GINORMOUS TSUNAMI appears out of nowhere" (post 7's `makeTsunami`, 400 m, shoots up behind Tower Bridge on the hit at 65 s), end card 69.6-75. v4 (owner: "too literal, simplify the speech, longer, POV, scary, realistic as it swallows the city"; umbrella clipped the head): 79 s; 62-74 s is your own eyes at the railing (`povCam`, shaking more and more, backing away): "Then the sea pulls back." (the Thames drains) "And comes back." (the wave rises 1.7 km down river, swallows the banks, HUD counts its distance down, roar, heartbeat to 170 bpm, panicked breaths, the lip closes over you, dark, cut); end card 74-79; umbrella shaft leans out, 42 cm from the head. v5: umbrella upright through the fist, rim 8 cm over the head (`?umbdbg=1` logs it); window shimmer fade from ~8 px, dimmer LED strips, matte lancets, headlight glow as Sparks points; POV brighter, lightning (4 bolts), ~70 bank blocks topple and sink with spray as the toe reaches them |
| 10 | `studio/episodes/ep16.js` | Earth's magnetic field flips in 5 s (Giza at night: your compass swings to south → a pylon arcs → Giza and Cairo flash and go dark, seen from 500 m up → the stars come out → minutes later the radiation belts rain down: auroras over the pyramids → space: two aurora rings per hemisphere, every city dark → your face in the green light; Quebec 1989) | built 19 Oct (68 s, tag 10; new `engine/giza.js` (plateau, pyramids with courses, Khafre's cap, floodlights, city lights with 44 flash events, analytic aurora sheets, Milky Way) and `engine/props16.js` (phone compass app, vending machine); WTF = a lit vending machine in the desert whose cable ends in the sand, still on after the blackout (last take); Apple on a rock ahead of you, 7-11 s). Cover `videos/post10_cover.jpg` |
| 11 | `studio/episodes/ep17.js` | Every sneeze is twice as strong as the last (Venice at golden hour: you on the Molo between the columns → sneeze 1 a puff, the pigeons go at 10, a bang at 20 → from the water: rings, domes and spray over the Basin, sneeze 40 = 7 t of TNT, the Campanile slumps at 45 (it really fell in 1902) → far: fireballs outgrow each other, 51 = Hiroshima, 63 = Tsar Bomba → space: 84 = Chicxulub, 97 boils the oceans → you, invincible, not a scratch; Donna Griffiths' 976 days) | built 20 Oct (68 s, tag 11; owner: invincible hero, non-graphic, no floating objects, zero clipping; new `engine/venice.js` (Piazzetta: Doge's Palace with porticos, loggia and lozenge wall, Library, Campanile, columns, Basilica domes, clock tower; San Giorgio, Salute, Dogana, Giudecca; a city of 14,000 roofs on a grid inside Venice's outline; the lagoon reflector fading into a far plain; gondolas and pali) and `engine/props17.js` (ground pigeon); hook = sneeze 40 in slow motion (4 µs to 0.65 ms, the dome bending the light via the grade's warp ring); WTF = one pigeon that never moves from your feet, through all of it; Apple on the step of St Mark's column, 7-11.5 s). Cover `videos/post11_cover.jpg` |
| 12 | `studio/episodes/ep18.js` | All the ice on Earth melts in 5 s (Diamond Beach, Iceland, at 16:45 → your iced coffee, the beach blocks, the lagoon's icebergs, the glacier, Vatnajökull, one melt that eats into all ice at once, deeper and deeper → the meltwater wall crosses Jökulsárlón → space: Greenland, Antarctica, seas +66 m in three days, the lowlands and their lights go → your eyes as the wall comes over Route 1; the 1996 jökulhlaup, Lituya Bay 1958, Kulp & Strauss 2019) | built 21 Oct (68 s, tag 12; owner picked the topic from my viral pick (after rejecting "twice as many electrons" and the balloon); new `engine/iceland.js` (analytic beach/lagoon/sandur ground in JS + GLSL, low-sun sky with altocumulus, Gerstner sea with surf lines, Reflector lagoon, glacier + ice cap height field with crevasses, moraines and alpenglow, the Route 1 suspension bridge), `engine/ice18.js` (the melt model, instanced convex ice shards with creased normals and parallax bubble veils, puddles, icebergs, the flood bore + torrent), `engine/props18.js` (iced coffee, the polar bear), `engine/space18.js` (ice mask + NASA GEBCO low-land mask `tex/earth_ice18.png`, wave rings, sea rise, lights out); WTF = a polar bear doing the 6-7 meme on a loop the whole video, in front of the wall at the end (owner's idea); Apple on a black rock behind you, 7.4-12 s). Rendered in the cloud at the owner's request (3 lanes, ~6.5 h while post 13 was built); the space swing Greenland → Antarctica (40-42 s) moved 32 px per frame and was re-rendered with a slower cruise (`trap` ease in `space18.js`), and 12-17.2 s again after `popscan` caught your head whipping round at 13.3 s (the look target lerped from your cup, 20 cm away, toward the glacier: now by direction). Delivered 22 Oct. Cover `videos/post12_cover.jpg` |
| 13 | `studio/episodes/ep19.js` | Beauty standards reversed for 5 years (Piccadilly Circus at 11:59 pm on New Year's Eve, you on Eros' steps → midnight: the Lights flip from a flawless beauty ad to "PRO-AGE", your worst selfie goes from 12 to 3.2 million likes → Year 1 ageing cream, Year 2 the clinics undo their work (snow), Year 3 your face on the Lights, Year 4 the 1920s tan → Year 5 midnight: it all flips back, your likes crash → you look into the lens: "Would you finally be a 10?") | built 22 Oct (68 s, tag 13; the first set built from OpenStreetMap: `engine/piccadilly.js` (footprints and levels extruded with one façade shader, road markings and double yellow lines drawn from the road centrelines, kerbs from the mask's contour, wet streets with a planar reflection, the curved Lights screen with wipes and RectAreaLights, Eros with the Xbot posed as the archer), `engine/ads19.js` (the screen's pages, the phone app, products and portraits rendered once in a studio scene), `engine/props19.js` (Westminster bin, the rubbish mound, K6 box); WTF = a man in a suit who drops his rubbish next to an empty bin every time we see him, his pile grows to a 2.5 m mound (owner: ragebait for all viewers); Apple sits on the bin in the hook and the calm). Cover `videos/post13_cover.jpg` |
Cast log (rule 16): post 1 elevator = Michelle (dark skin, curly black hair, red headphones); post 2 plane =
Michelle (same); post 3 whale = POV diver, black wetsuit and gloves (body never seen); post 4 light = Male_Adult_17
(beard, black cap, blue-white hoodie; his friend Female_Adult_12, brunette with bangs, black hoodie); post 5 radioactive =
Male_Adult_10 (East Asian, short black hair, red track jacket, black track pants; extras: Female_Adult_01 buried in the
sand, Male_Adult_04 bearded in a hoodie in the 1987 shed). post 6 atoms = Female_Adult_05 (black bob, pink blazer, white shirt, jeans, a coffee; extras: 14 Rocketbox people on the steps and the plaza plus 150 posed copies of them). post 7 air = Male_Adult_03 (POV: only his hands and sleeves are seen; extras far along the beach: Female_Adult_02, Male_Adult_05, Sports_Female_01). post 8 antimatter = Female_Adult_09 (grey blazer, white top; walking the scramble's diagonal; crowd: the post 6 people plus Sports_Male_01/02, 64 walkers with their own skeletons). post 9 honey = Male_Adult_12 (Black man, denim jacket, white tee, jeans, a black umbrella; extras on the pavements: Female_Adult_02, Business_Male_02, Female_Adult_08, Male_Adult_05, Sports_Female_01, Female_Adult_06). post 10 flip = Female_Adult_04 (short blonde hair in a bun, black leather jacket, cargo trousers, a phone; extras: Male_Adult_06, Female_Party_02, Male_Adult_08, Female_Adult_17, Male_Adult_01). post 11 sneeze = Business_Male_04 (bald, grey shirt, dark waistcoat, brown trousers; no extras). post 12 ice = Female_Adult_07 (brunette with a ponytail, brown belted jacket, red top, jeans, boots, an iced coffee; extras far along the beach: Male_Adult_06, Female_Adult_12, Male_Adult_17, Sports_Female_01). post 13 beauty = Male_Adult_13 (buzz-cut light-brown hair, grey-and-black argyle zip cardigan, jeans; the bin guy Business_Male_03 in a dark suit; the LUMIÈRE model Female_Adult_15, auburn hair, blue blouse; crowd: Female_Adult_01/06/09/12/14, Female_Party_02, Male_Adult_05/08/11/16/18, Sports_Male_02). Next video: someone new from the Rocketbox pool (46 realistic
rigged people, MIT). Log the avatar name here once used. Apple (rule 19) is `engine/cat.js` `makeCat()`, the same cat
every video.
Other ideas: 50 km/h crash without a seatbelt; lightning hits your plane; stuck upside down on a roller coaster;
phone battery catching fire in your pocket. Old built-but-unpublished episodes: `ep02`–`ep06` (topics too common).
Reference 2 (22 Oct 2026): `studio/notes/reference2.md`, a French serial night-drive thriller with real checked safety tips
("6 POINTS", 700K views and 4K follows in 2 videos). The owner is deciding whether to switch formats: ask before changing any rule.

## Technical lessons (pitfalls already hit)
- This cloud box has no GPU: SwiftShader renders ~10–25 s/frame per worker with 3 workers on 4 cores, so an
  80 s video takes 3–4 h. Shots differ a lot in cost: when a worker finishes early, kill the slowest one and
  relaunch its missing frames split across two workers (`--resume` skips frames that exist).
  Rendering on the owner's PC (Claude Desktop or `claude remote-control`) would be ~10× faster. Owner, 9 Oct 2026:
  "I do have a very good PC but my girlfriend would get mad if it is turned on 24/7": the PC can only be used for
  short render sessions, started by them. Their PC: Windows, AMD RX 6700 XT, Google Drive for desktop.
- PC render kit (`pc/`, instructions in `pc/README.md`): `SETUP.bat` once (winget tools, npm + Chromium, pip, the 3D
  people from `pc/avatars.txt`, a GPU test frame); then `RENDER.bat` per video ("DeatAnimation Render Engine (beta)", a CMD
  UI in `render.ps1`; owner, 16 Oct 2026: no Google Drive, a beta look, usage %, never pile up videos): git reset to the
  branch, delete the last run's `videos/*.mp4|txt` and everything in `studio/out`, soundtrack, `tools/renderall.mjs --gpu` in
  the background (its output in `studio/out/render_workers_log.txt`) with a live bar (frames on disk, fps, ETA) and GPU/CPU/
  VRAM/RAM use from WMI perf classes, `checkframes.py` (also flags black areas), `encode.sh` (Git Bash), `sheet1fps.py`, the
  frames deleted, Explorer opened on the phone file, optional shutdown with a key to cancel. Program output only goes to
  `studio/out/pc_render_log.txt`: the owner pastes it in the chat when something fails. To hand over a video: finish and check it here with previews,
  set `pc/job.json` (ep, name, cover, workers), add any new avatar to `pc/avatars.txt`, push, then tell the owner to
  double-click RENDER.bat. The owner's PC has no winget (App Installer missing): `setup.ps1` falls back to direct downloads
  (Node zip, python.org installer, gyan.dev ffmpeg, Git installer); Git itself came from git-scm.com. Keep `pc/*.ps1` ASCII only (PowerShell 5.1) and bash scripts LF (`.gitattributes`); Windows
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
- Rocketbox children (`Female_Child_01/02`, `Male_Child_01/02`) have a `Bip02` skeleton: `rocketbox.js` maps `Bip0N`.
  `sit()` has `legs: 'chair'` (seat height in `pos.y`, feet on `floor`) for benches and plastic chairs.
- Post 5's town (`engine/town5.js`, owner: "the town doesn't have a floor and the buildings are all the same... add
  life"): one ground shader for the mosaic promenade, bike lane, avenue markings, pavements, streets and lots; four rows
  of buildings with per-building window grids, frames, sliding panes, curtains, AC units, ceramic-tile cladding, shops,
  balconies, roofs and water tanks; cars that drive until the decay; benches, a kiosk, umbrellas, a footvolley net;
  hills with houses. Keep children out of the frames where things burn (frame them in the calm part only).
- Every Rocketbox FBX carries an ambient light (#808080 at intensity 1) that FBXLoader adds to the avatar: post 5's 20
  people flooded the beach with flat light 4x stronger than the sun, so no shadow showed anywhere (not even yours on the
  towel) and the town looked like flat CG. `loadAvatar` now strips lights from the FBX. If a scene looks flat, list its
  lights (`scene.traverse(o => o.isLight && ...)`) before touching materials.
- A material patched twice by the same `onBeforeCompile` helper redefines its uniforms and functions: the shader fails
  to compile and the mesh silently vanishes (post 6's coffee cup: `frostize` ran in `props6.js` and again in the episode).
  `frostize` is now idempotent (`userData.frostized`); grep render logs for `Shader Error` after any material change.
- Props held in a hand are fitted, not eyeballed: post 6's cup is placed once by a search (no hand joint inside the cup by
  its skin thickness, then the spot that nestles deepest into the palm and fingers) and rides the hand bone at that offset
  (`cupFit` in `ep12.js`, `?cupdbg=1` logs every joint's clearance). For a right hand, `(Index1 - Pinky1) x (Middle1 - Hand)`
  points OUT of the palm. A cup grip needs the thumb opened (`thumbR: -0.6`), a firm curl (0.75) and the pinky under the base.
- `sit({ arms: 'lap' })` used to sink the palms into the thighs: `fit: true` measures the thigh top under each hand
  (`topYIn`) and rests the palm on it. `curlL`/`curlR`, `thumbL`/`thumbR` set each hand separately.
- Sets that rise behind a seated hero (stairs, bleachers) swallow a camera placed behind them at head height: check a new
  camera position against the set before rendering (post 6's first hook rendered from inside the TKTS steps).
- A hidden Apple must still be findable: project his position along the camera path and keep him 25+ px tall for 1.5 s or
  more, clear of the captions, the HUD and Instagram's bottom strip (post 6's first spot, top of the steps, was 13 px).
- A giant wave only reads giant against references it swallows (towers, boats, containers on its face) and in shade: put the
  low sun behind it (the face goes green-black, light only through the thin crest) and dim the scene as it covers the sun.
- Very bright lights on glossy wet surfaces push specular peaks past half-float range (Inf, then NaN that UnrealBloom smears
  into a black rectangle): ep14 caps every built-in material's output (`ShaderChunk.opaque_fragment`, min 20000) and raises the
  wet ground's minimum roughness while the fireball's light is on. A camera inside an additive halo sphere washes the frame.
- Voiceover (from post 8): `studio/tools/vo.py <lines.json> <voice> <out.wav>` synthesises each line offline, fits it in its
  caption window; the WAV is committed (`studio/audio/vo/`) so the PC needs no TTS; the episode's audio script ducks the music.
  Voice: `kokoro:af_heart` (Kokoro-82M, Apache-2.0: `pip install kokoro-onnx`, `kokoro-v1.0.onnx` + `voices-v1.0.bin` from the
  github.com/thewh1teagle/kokoro-onnx releases in `$KOKORO_DIR`). Piper voices (`.onnx`) still work but sound robotic (Cori was
  dropped for that). Licences: never Piper ryan or hfc_female, XTTS or F5 (non-commercial).
- Black rectangles on the PC only (post 8 v1, 17.6 s): HLSL computes pow(x, y) as exp2(y log2 x), so a base a hair below 0
  (`1.0 - abs(dot(n, v))` when the dot rounds to 1.0000001) gives NaN, and UnrealBloom blurs one NaN pixel into a rectangle
  (or a whole black frame, which the flicker check skips). Clamp every pow base (`pow(max(1.0 - mu, 0.0), k)`); `core.js` now
  also runs a sanitize pass before the bloom (NaN to 0, +Inf and anything above 16000 to 16000, tested on the float's bits so
  fast-math cannot drop it), and `checkframes.py` lists frames with sudden black areas. SwiftShader here does not show it.
- `Sparks` fade in over the first 8 % of their life: static points given life 1e9 (post 8's Tokyo city lights) never show
  (the fade-in lasts 80 million seconds). For points that are always there use birth -1e6, life 1e7.
- Screen-space quads built in a vertex shader (rain streaks, ribbons) flip winding with direction: `side: DoubleSide`, or
  they are culled and the whole system silently draws nothing (post 9's rain took a debug scene to find).
- Camera keys that read a clock at a cut time (`story(3.6)` when the hook ends at 3.6) take the next shot's value: sample just
  before the cut (3.5999). Cameras that fly with a moving object use `PlaneCam` (ep15cams.js: offsets relative to it), never
  CamPath keys at its positions (eased timing runs ahead of the object between keys).
- Under an umbrella the face is in the canopy's shadow: give close-ups a soft fill (post 9: a small point light low in front,
  "bounce off the wet pavement").
- Never append a `// comment` with sed to a line that holds more statements: it comments out the rest of the line (post 9: the
  pigeon's flap/visibility and the flock's userData silently vanished). Put the comment on its own line or at the true end.
- Hanging particles seen from a flying camera jump across the frame: draw them as streaks from the previous frame's camera
  (`Rain.update(..., prevCam)`, a 180-degree shutter) and fade them out within ~2.5 m of the lens, or near ones become long lines.
- `MeshPhysicalMaterial` transmission rendered black inside this composer (post 9's ball of water): use a clear transparent
  skin (opacity ~0.15, clearcoat) plus an additive fresnel rim instead.
- `makeTsunami` (sf7.js) writes world positions without the model matrix: it is always a wall along z travelling -x; any
  scene can use it by passing a `makeDuskSky` (not added to the scene) for its uniforms and setting `S7` fog/time.
- Parallel render workers used to pick a random port and could collide (EADDRINUSE killed one silently): `render.mjs`
  now listens on a free port. Billboard smoke seen from above reads as white blobs: fade it out when the camera rises.
- GLSL traps (post 10): `patch` is a reserved word (the shader fails, the mesh vanishes); `smoothstep(e0, e1)` with edges that are
  equal in float32 (1e9 and 1e9 + 0.8) is NaN, which the sanitize pass turns black: clamp by hand.
- A phone in a hand is fitted from the palm frame ((Index1 - Pinky1) x (Middle1 - Hand) points out of the palm), laid across the
  fingers (curl 0) and checked by logging the finger joints in phone-local cm (`?phdbg=1` in ep16). A compass app's readout is the
  phone's heading, i.e. minus the needle's angle on the dial.
- Analytic aurora (`makeNightSky`, giza.js): sheets solved per pixel by Newton steps. Fade pixels where the residual stays big
  (grazing rays speckle), keep fold slopes low (several crossings make hard-edged slabs), cap the edge-on path factor (~3.5), keep
  rays wider than a few px with fwidth (fine rays read as a barcode, near the zenith as a sunburst), and add sheets behind the hero
  for reverse shots.
- 9:16 frames are narrow (horizontal half-FOV 9-15 degrees): plan who is in frame by angles before rendering. A phone held at the
  chest is hidden by the shoulder from any over-the-shoulder camera; a city carpet seen from the ground is a 1-degree strip (show a
  blackout from a few hundred metres up).
- Lit smoke billboards (`smokeAtlas`) read as lumpy bread dough in bright daylight: use `smokeAtlas(seed, normK ~1.2)` and a
  shade colour close to the lit one (post 11's spray and dust). Put billboards, sparks and domes on layer 1 and keep the
  `Reflector` camera on layer 0, or the water reflects them as blotchy camouflage patches.
- A `Reflector` lagoon can fade into a far plain: make its material transparent and drop the alpha with distance (post 11's
  far shots showed its rectangle against the plain otherwise); give both the same fog colour.
- Camera shake as `sin(t * 61)` flips sign every frame: per-frame jitter that the flicker check reads as alternation. Use
  slow sways (a few Hz) for shocks; let flashes and the grade's warp ring (`uWarp`, `uWarpC`, `uWarpR`) sell the hit.
- A shock dome only reads in daylight through refraction: project its centre and edge into screen space and drive the
  grade's warp ring; a condensation skin alone vanishes against a bright sky. Fade a dome before it reaches the lens.
- Ice that reads as ice (post 12): flat facets look like rock, smooth blobs like river stones; use convex shards with creased normals
  (`toCreasedNormals`, 34 degrees), clear ice nearly black over black sand with mirror reflections (roughness ~0.035, env x2.3), cool
  thin-edge glow, bubble veils sampled a little way in along the view ray (they shift like real depth), light through it only when
  the sun is behind; milky ice blue-white, bluish in its own shade. Floating icebergs must shrink toward their centre, not their lowest
  point, or they sink as they melt.
- A flood bore (post 12): post 7's wave profile with time-varying lumps on the face, mostly dark silty water with sparse billowy foam
  and vertical striations; thin "lacy" foam reads as cracks and too much foam as a snow bank. The torrent sheet behind it starts at
  ~6.2 H behind the front (inside the wall's back slope), never in front of it.
- A 3-degree sun lights almost nothing horizontal: snow and ice need an alpenglow emissive and a brighter environment, black sand
  hides every shadow, and backlit shots near the sun need a lower exposure (0.9) or they wash out.
- Earth maps: NASA's GEBCO elevation PNG (`gebco_08_rev_elev`, 25 m per level) gives the land below a sea-level rise; the Blue Marble's
  high-latitude whites give an ice mask (`tex/earth_ice18.png`, R low land, G ice). `textureLod` on its mips gives "inside / near the
  ice" masks for free. Time-compressed space shots keep the Sun fixed and cut between views: a fast swing strobes the stars.
- Hashing an interpolated attribute in a fragment shader gives per-pixel noise even when the value is the same at every vertex
  (perspective interpolation adds tiny float errors that `fract(sin(x) * 43758)` amplifies): post 13's façades came out as TV
  static. Per-object seeds go through `flat varying` (GLSL3) or get rounded first.
- Plan shots by numbers before rendering: `tools/frame19.mjs` projects key points (hero head, phone, bin, guy, the screen's
  corners) into the 9:16 frame for given times or for a candidate camera (`cam f,r,u target fov`), `tools/flow19.mjs` prints each
  take's camera flow. Each Piccadilly still cost ~4 min to load; the tools answer in a second.
- A 44 m screen overfills a 9:16 frame from anywhere on the plaza: wide lenses (vertical fov 56-62), the screen in the top half,
  the people in the middle band. Ground objects 4 m away and a screen 40 m away and 15 m up only fit together from 5+ m back.
- Over-the-shoulder by a fountain: the basin wall leaves 0.5 m behind the hero; a camera inside the basin footprint below the rim
  sees only bronze. A phone close-up from behind a seated hero is blocked by his head unless the camera sits ~0.3 m to the side.
- A turn from a phone in the lap to a far screen (~50 degrees) needs ~5 s to stay under 25 px per frame: cut on a sound hit instead.
- Render-to-texture portraits (`renderShot` in `engine/ads19.js`): render targets skip tone mapping (do ACES + sRGB in JS), give
  the target an opaque background colour, and `await Promise.all(TEX_PENDING)` first: a portrait rendered before its avatar's
  textures arrived came out with a black face under a veil of hair (random per run). The `_facial` FBX of Female_Adult_15 also
  shaded badly in a studio; use the plain FBX where no blink or expression is needed.
- OpenStreetMap through the proxy: `https://api.openstreetmap.org/api/0.6/map?bbox=...` works (Overpass resets). ODbL: credit
  "Map data © OpenStreetMap contributors" on the end card and in the post caption. `engine/data/piccadilly_osm.json` holds the
  projected data (metres, x east, z south).
- `cloneAvatar` now returns `meshes`; `stand(av, { cache: {} })` measures the lowest vertex once (a standing crowd costs no
  per-frame skinning). Buses take `makeBus({ route, to })` (post 13: real Piccadilly routes 38, 14, 19).
- `flickercheck.py`'s `<-- pan` flag (median flow over 25 px per frame) also fires on space shots: a smoothstep swing peaks at 1.5x its
  average speed. Swings between globe views ease over a quarter of their time at each end and cruise in between (peak 1.33x),
  and get 5+ s for 120 degrees of latitude.
- The same near-to-far trap for `lookAt`: lerping a look target from a point 20 cm away (a cup in your hand) toward one 50 m away
  swings the head through most of the angle in the first 1 % of the lerp. Interpolate the look direction from a fixed eye point.
