# Fact sheet (sources & math behind every on-screen claim)

## EP01 — What if Earth stopped spinning for 1 second?

| Claim on screen | Number used | How it was checked |
|---|---|---|
| Paris moves at 1,104 km/h | 306.6 m/s | ω·N(φ)·cos φ with ω = 7.2921e-5 rad/s, WGS84 ellipsoid, φ = 48.858° (Eiffel Tower) |
| Equator 1,674 km/h, poles 0 | 465.1 m/s | same formula, φ = 0° and 90° |
| Earth has been spinning for 4.5 billion years | 4.54 Gyr | age of the Earth (radiometric dating) |
| Everything not bolted down keeps going east at 1,104 km/h | inertia | objects keep their velocity; ground friction (μ≈0.6) only removes ~6 m/s per second |
| The Eiffel Tower is ripped off its feet | 10,100 t moving at 307 m/s | kinetic energy ≈ 4.7e11 J ≈ 113 t of TNT; the legs cannot stop it |
| Wind twice as fast as any tornado ever recorded | 1,104 km/h vs ~486 km/h | Bridge Creek–Moore 1999 Doppler measurement (~135 m/s) |
| The Atlantic pulls away from New York and slams into Europe | water keeps moving east | east coasts of the Americas lose water, west-facing coasts (France, Iberia, Africa) get hit |
| A kid mid-jump feels nothing / lands 300 m away | 307 m | airborne objects share the air's motion; 1 s × 306.6 m/s. Needs ≥1.23 m jump height (≥1 s airtime) |
| Planes don't feel a thing | — | the plane and the air around it keep the same velocity; airspeed unchanged |
| Everything that crashed gets hit a second time | — | when the ground restarts, stopped objects are again 307 m/s slower than the ground |
| Earth is now 1 second late / leap second | UT1 − UTC jumps by 1 s | leap seconds keep UTC within 0.9 s of Earth's rotation (UT1); shown as 23:59:60 |

## EP02 — What if you fell into a black hole? (Sagittarius A*) — built, not published

| Claim on screen | Number used | How it was checked |
|---|---|---|
| Center of our galaxy, 27,000 light-years away | 8.18 kpc ≈ 26,700 ly | GRAVITY collaboration (2019–2022) |
| Weighs as much as 4 million Suns | 4.3 × 10⁶ M☉ | GRAVITY / EHT 2022 |
| Event horizon 18× wider than the Sun | 2r_s = 25.4 million km; Sun 1.39 million km | r_s = 2GM/c² = 2.95 km × 4.3e6 |
| Gravity bends light into rings | — | rendered with real null-geodesic tracing (Schwarzschild metric) |
| No wall, no flash, you feel nothing at the horizon | tidal stretch ≈ 0.0001 g over 2 m | Δa = 2GM·L/r³ at r = r_s |
| 28 seconds left after crossing | (4/3)·GM/c³ = 28.2 s | proper time from horizon to singularity, falling from rest far away |
| The center is a moment in your future | — | inside r_s the radial coordinate is timelike; all future paths reach r = 0 |
| Friends see you slow down, freeze, redden, fade | — | gravitational time dilation + redshift seen by distant observers |
| A small black hole shreds you far outside the edge | 10 M☉: 1 g of stretch at ~8,000 km, horizon 30 km | Δa formula |
| This one waits until the last tenth of a second | 10 g of stretch ≈ 0.1 s before the end | τ from r to 0 = (2/3) r^{3/2} / (c √r_s) |

Simplifications stated plainly: Sgr A* is treated as non-spinning; the accretion disk is brighter than the real (dim) one for visibility; the "inside" visuals are artistic.

## EP07 (posted as Day 2) — What if your elevator's cable snapped?

| Claim on screen | Number used | How it was checked |
|---|---|---|
| 16th floor, 50 m above the ground | 15 storeys × ~3.1–3.3 m + pit ≈ 50 m | typical floor-to-floor height of offices/apartments; the fall is modelled as exactly 50 m |
| Free fall: you weigh nothing for 3 seconds | t = √(2h/g) = 3.19 s | h = 50 m, g = 9.81 m/s²; air drag on the car over 50 m is negligible |
| You'd hit the bottom at 113 km/h | v = √(2gh) = 31.3 m/s = 112.8 km/h | same numbers; the real-time plunge shot uses this exact curve (16 floors in 3.19 s) |
| Your phone floats out of your hand | — | in free fall everything accelerates together; the arm was still pushing up, so the phone drifts up relative to you |
| Jumping at the last second doesn't help: no floor to push off | — | while floating you have no contact force to push against |
| Even a perfect jump only takes off ~10% of the speed | ~3 m/s vs 31 m/s | a 0.45 m vertical jump gives √(2·9.81·0.45) ≈ 3.0 m/s |
| Elevators hang from 4 to 8 steel ropes; any one can usually hold the car | safety factor ≥ 12 on the rope set (EN 81-20) | with 6 ropes each rope alone breaks at ≥ 2× the full static load |
| Brakes clamp onto the rails if the car falls too fast | overspeed governor + progressive safety gear | governor trips at ~115–125% of rated speed and pulls the safety gear's wedges up against the guide rail |
| You'd drop a meter or two, then stop | 1.2 m in the simulation | trips at 3 m/s (0.46 m of free fall) then brakes at 0.6 g (0.77 m); codes cap the average deceleration at 1 g |
| Elisha Otis showed this off in 1854 by having his own rope cut | Crystal Palace exhibition, New York, 1854 | his ratchet-and-spring safety catch held the platform; it dropped a few centimetres |
| Longest elevator fall survived: 75 floors, 1945 | Betty Lou Oliver, Empire State Building, 28 July 1945 | B-25 crash damaged the cables; Guinness World Records lists it as the longest survived elevator fall |

Simplifications stated plainly: the time-slowed sections run 8× slower than reality (the HUD says so); the
real-time plunge is the "no brakes" hypothetical; the 1854 tower is a reconstruction from period engravings.

## EP08 (post 2) — What if your plane's window broke at 11,000 m?

| Claim on screen | Number used | How it was checked |
|---|---|---|
| Cruising at 11,000 m, 880 km/h | FL360, Mach ~0.8 | typical narrow-body cruise (A320/737) |
| Outside −56 °C, air 22% of sea level | −56.5 °C, 22.7 kPa | International Standard Atmosphere at 11 km |
| ≈ 500 kg on your window | Δp ≈ 0.52 bar × ~0.09 m² ≈ 4.7 kN | cabin kept at ~2,400 m (75 kPa) vs 22.7 kPa outside; window ~25 × 36 cm |
| The cabin fills with fog in a split second | adiabatic cooling | rapid decompression makes the cabin air expand and cool below its dew point |
| The masks drop | above ~4,300 m cabin altitude | masks deploy automatically before the cabin passes 14,000–15,000 ft |
| 15 to 30 s before you stop thinking clearly | TUC at FL350–400 | FAA: 30–60 s at 35,000 ft, 15–20 s at 40,000 ft; rapid decompression can halve it |
| Put your own mask on first | — | standard safety briefing, because of the time above |
| Each mask: about 12 minutes of oxygen | chemical generators, 12–15 min | enough to cover the emergency descent |
| Windows have three layers; the middle one holds if the outer breaks | outer + middle (fail-safe) + inner scratch pane | the middle pane is designed to take the full pressure load |
| The tiny hole keeps the middle layer as a spare | breather (bleed) hole | equalises pressure so the outer pane carries the load in normal flight; also stops fogging |
| Pilots dive to air you can breathe, ~4 minutes | to ~3,000 m (10,000 ft) | emergency descent procedure |
| 1990: a pilot sucked halfway out of his window; held for 20 minutes; survived | British Airways 5390, 10 June 1990, ~5,300 m | cockpit windscreen fitted with wrong bolts; captain Tim Lancaster survived |
| v2: the air rushes out at the speed of sound (≈ 1,100 km/h) | choked flow | cabin/outside pressure ratio 0.75/0.23 ≈ 3.3 > 1.89, so the flow through the hole is sonic at first (≈ 310 m/s ≈ 1,100 km/h at the throat) |
| v2: that half ton now pushes you into the hole (≈ 500 kg) | Δp × area | the same ≈ 0.52 bar over ≈ 0.09 m², as soon as a body blocks the opening |
| v2: masks drop, ~7.6 s after the break in the cut | cabin altitude passes ~4,300 m | timing chosen inside the few seconds a window-size hole takes |
| v2: countdown 0:18 → 0:00 | TUC 15–30 s | shown 3× fast (labelled "shown fast") |
| v2: the pilots dive toward air you can breathe, ~4 minutes | to ~3,000 m | emergency descent; shown fast (labelled) |
| v2: 2018, Southwest 1380, 9,800 m | 17 April 2018, ~32,000 ft (9,750 m), climbing | fan blade fatigue failure; the inlet cowl hit the fuselage and broke the row 14 window (NTSB AAR-19/03, press coverage) |
| v2: a passenger was pulled partly out of the window; she didn't survive | window seat, row 14, lap belt on | others pulled her back in; blunt impact trauma (coroner) |
| Pinned comment: back flying less than 5 months later | frostbite, broken arm, wrist and thumb | accounts of the AAIB report (e.g. migflug.com, Wikipedia); first officer Alastair Atchison landed at Southampton |

Simplifications stated plainly: the break is shown 6× slowed then 2×; the countdown and the dive are shown sped up ("shown fast");
the 1990 scene is a reconstruction (generic livery, mannequin-style figures); the sequence after the break is compressed for time.

## EP09 (post 3) — What if a whale swallowed you? (point of view)

| Claim on screen | Number used | How it was checked |
|---|---|---|
| Diving off Cape Cod, 14 meters down | ~45 ft ≈ 14 m | Michael Packard's own account of his dive depth off Provincetown (WBZ-TV, AP); other accounts say ~30 ft, so "you" are placed at his figure |
| Catching lobsters | commercial lobster diving | Packard is a commercial lobster diver (AP, NPR, Provincetown Independent) |
| Thousands of tiny fish | sand lance (Ammodytes) | the Center for Coastal Studies suggested the whale was feeding on sand lance; sand lance and striped bass were around Packard on his descent |
| A 30-tonne humpback | adults 25–40 t, 12–16 m | NOAA Fisheries (up to ~60 ft / 40 tons), NPS (males ~46 ft / 25 tons, females ~49 ft / 35 tons); HUD "14 m long" |
| Charging at 11 km/h | ≈ 3 m/s lunge | tag studies: humpbacks reach ~3 m/s at the start of a lunge (Simon, Johnson & Madsen 2012, J. Exp. Biol.) |
| Its mouth is open so wide, it can't see you | forward view blocked when the mouth is open | Jooke Robbins (Center for Coastal Studies): with its mouth open a lunging whale can't see what is in front of it; she called Packard's case "a mistake and an accident" |
| In one gulp: 20 tonnes of water | engulfed water up to ~70% of body mass | tag-based studies of humpback lunges; 0.7 × 30 t ≈ 21 t ≈ 20,000 litres; HUD "70% of its weight" |
| Everything goes black, you're inside its mouth | engulfed, mouth closed | Packard: "it was completely black", he could feel the whale squeezing with its mouth muscles |
| It squeezes the water out | ventral pouch contracts, water forced out through the baleen | how rorquals filter-feed after every lunge |
| Up or down? | it rose to the surface | Packard: the whale rose to the surface and shook its head; his crewmate Josiah Mayo saw it come up |
| Timer 0:00 → 0:38, "shown 3× fast" | 30–40 s inside | Packard's own estimate (Facebook post, AP, NPR) |
| Then it surfaces… and spits you out | thrown out, landed in the water | Packard's account; Mayo pulled him into the boat |
| 2021, off Cape Cod; 30 to 40 seconds in a humpback's mouth | 11 June 2021, off Herring Cove, Provincetown | AP / NPR / Boston Globe / Smithsonian coverage |
| He survived (bruised, dislocated knee, no broken bones) | soft-tissue damage, no broken bones | NBC News, AP; early "broken leg" reports were corrected |
| And went back to diving | back to lobster diving | NYT (he planned to return once healed); Cape Cod Times feature about three years later |
| 2025, a whale engulfed a kayaker in Chile, on camera | 8 February 2025, Bahía El Águila, Strait of Magellan | Adrián Simancas, 24, engulfed with his yellow kayak for ~3 s, filmed by his father Dell (NPR, CNN, Reuters) |

Simplifications stated plainly: the gulp is shown slowed (0.45×) and the time inside is shown 3× fast (labelled); "swallowed" is the
everyday word the news used: a humpback's throat is far too narrow to swallow a person, the video shows it holding you in its mouth.
The reconstructions are generic (the real whale and boats are not modelled from footage).

## EP10 (post 4) — What if light became instant for 5 seconds?

Premise: only the travel speed of light changes (c → ∞ for 5 s); everything else is left as it is. Consequence used: every
photon already on its way arrives at once, and while light is instant, new light arrives at once too.

| On screen | Value | Source / calculation |
|---|---|---|
| Sunlight needs 8 min 19 s to get here / this light left the Sun 8 minutes ago | 499 s | 1 AU / c = 1.496e11 m / 2.998e8 m/s = 499.0 s |
| 8 minutes of sunlight hit at once (8 min 19 s of sunlight in 1 instant) | 68 J/cm² at the top of the atmosphere | solar constant 1361 W/m² (Kopp & Lean 2011) × 499 s = 6.79e5 J/m²; at the ground (clear sky, direct ≈ 850 W/m², sun 45° high, horizontal lawn) ≈ 30 J/cm² ≈ 7 cal/cm², ≈ 10 cal/cm² on skin facing the sun |
| Enough to set the grass on fire | fine grass ignites at 5 cal/cm² | Glasstone & Dolan, *The Effects of Nuclear Weapons* (1977), Table 7.40: fine grass 5 / 8 / 10 cal/cm² for 35 kt / 1.4 Mt / 20 Mt pulses, beech leaves 4 / 6 / 8. Shorter pulses ignite at lower exposures; an instantaneous pulse is shorter than any of them |
| The light of every star lands too | qualitative | the starlight still in transit from the whole galaxy (up to ~100,000 years old) arrives in the same instant |
| Light from 13.8 billion years ago (the afterglow of the Big Bang) | 13.8 Gyr | the cosmic microwave background was released 380,000 years after the Big Bang; age of the universe 13.787 ± 0.020 Gyr (Planck 2018) |
| ≥ 1 kiloton of TNT on every square metre | 1.1 kt/m² | CMB energy density u = aT⁴ = 7.566e-16 × 2.7255⁴ = 4.17e-14 J/m³ (0.26 eV/cm³). Photons heading for Earth from a shell at distance r carry u·πR²·dr, so from the observable universe (comoving radius 46.5 Gly = 4.40e26 m) Earth receives u·L·πR²: per m² of surface u·L/4 = 4.59e12 J/m² = 1.10 kt (1 kt = 4.184e12 J). A lower bound: a larger universe gives more (Olbers' paradox) |
| The air gets hotter than the Sun's surface | > 10,000 K | the atmosphere is opaque to much of the CMB spectrum at sea level (the 60 GHz O₂ band, the 118 GHz O₂ and 183 GHz H₂O lines, and most of the ~21 % of CMB energy above 300 GHz); even 20 % absorbed puts 9e11 J/m² into 1.03e4 kg/m² of air = 9e7 J/kg, ~3× the energy to dissociate all N₂ (3.4e7 J/kg) → a partly ionised plasma, far hotter than the photosphere (5,772 K) |
| Enough to boil two thirds of the oceans | 66 % | total on Earth 4.59e12 J/m² × 5.10e14 m² = 2.34e27 J; boiling all oceans: 1.335e21 kg × (4.0e3 J/kg/K × 96.5 K + 2.257e6 J/kg) = 3.53e27 J |
| And to blow the air off into space | 7× | escape energy of the whole atmosphere: 5.15e18 kg × GM/R (6.26e7 J/kg) = 3.2e26 J; 2.34e27 / 3.2e26 = 7.3 (energy comparison, not a simulation) |
| Then the Sun goes black for 8 minutes / all its light already arrived | 499 s | when light slows back down, the space between the Sun and Earth holds no light: the next sunlight needs 8 min 19 s to arrive |
| The stars vanish too, for years / Alpha Centauri: back in 4.4 years | 4.37 ly | Alpha Centauri A/B distance 4.37 light-years (Proxima 4.24 ly) |
| 299,792 km/s again | c | 299,792.458 km/s |
| Time slowed down 1,000× / real time / time sped up 50× | — | 28 s on screen for 0.028 s; then 5.0 s for the last 4.97 s; 499 s shown in 9.9 s (×50.4) |
| In 1964, two scientists heard a strange hiss / from everywhere in the sky / they blamed pigeons | May 1964 | Arno Penzias and Robert Wilson, Bell Labs horn antenna, Holmdel, New Jersey: a hiss from every direction; they evicted nesting pigeons and cleaned their droppings, the hiss stayed: the CMB (AMNH; Nokia Bell Labs). Nobel Prize in Physics 1978 |
| End card: the Big Bang's glow is all around you, right now | — | the CMB fills the universe: ~410 photons per cm³ |

Simplifications stated plainly: the three kinds of light arrive in the same instant; the video shows them one after the other
(slowed 1,000×) and says "the same instant" in the HUD timer that barely moves. People are shown frozen (time slowed), never hurt
on screen. The 1964 scene is a generic reconstruction (the antenna is simplified, the two figures are not likenesses).
