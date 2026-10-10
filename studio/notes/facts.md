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
| 8 minutes of sunlight hit at once (8 min 19 s of sunlight in 1 instant) | 68 J/cm² at the top of the atmosphere | solar constant 1361 W/m² (Kopp & Lean 2011) × 499 s = 6.79e5 J/m². v2 is set at 17:45 on a June afternoon (sun 38° high, azimuth 262°, computed for Paris, lat 48.86°, declination 23.44°): direct beam through 1.62 air masses ≈ 830 W/m² (Meinel: 1353 × 0.7^(AM^0.678)) → 41 J/cm² face-on, × sin 38° = 25.5 J/cm² ≈ 6.1 cal/cm² on the flat lawn; grass blades and leaves facing the sun get up to 41 J/cm² ≈ 9.9 cal/cm² |
| Enough to set the grass on fire | fine grass ignites at 5 cal/cm² | Glasstone & Dolan, *The Effects of Nuclear Weapons* (1977), Table 7.40: fine grass 5 / 8 / 10 cal/cm² for 35 kt / 1.4 Mt / 20 Mt pulses, beech leaves 4 / 6 / 8. Shorter pulses ignite at lower exposures; an instantaneous pulse is shorter than any of them |
| The light of every star lands too / HUD: Milky Way light: up to 80,000 years old | ≈ 77,000 ly | the Sun is 26,700 ly from the galactic centre (GRAVITY Collaboration 2019, 8.18 kpc) and the stellar disk reaches ~50,000 ly from the centre, so the far side of the Milky Way is ~77,000 light-years away: its light, still in transit, is up to ~80,000 years old. (Light from other galaxies, millions to billions of years old, lands too; the HUD only quotes our galaxy) |
| Light from 13.8 billion years ago (the afterglow of the Big Bang) | 13.8 Gyr | the cosmic microwave background was released 380,000 years after the Big Bang; age of the universe 13.787 ± 0.020 Gyr (Planck 2018) |
| HUD: Microwaves · shown in false colour | label | the CMB peaks at 160 GHz (1.9 mm): invisible; the sky shows it with the Planck colour map, as Planck's all-sky maps do (the real temperature differences are ~1 part in 100,000, exaggerated by the colour map, as in every published map) |
| ≥ 1 kiloton of TNT on every square metre | 1.1 kt/m² | CMB energy density u = aT⁴ = 7.566e-16 × 2.7255⁴ = 4.17e-14 J/m³ (0.26 eV/cm³). Photons heading for Earth from a shell at distance r carry u·πR²·dr, so from the observable universe (comoving radius 46.5 Gly = 4.40e26 m) Earth receives u·L·πR²: per m² of surface u·L/4 = 4.59e12 J/m² = 1.10 kt (1 kt = 4.184e12 J). A lower bound: a larger universe gives more (Olbers' paradox) |
| The air gets hotter than the Sun's surface | > 10,000 K | the atmosphere is opaque to much of the CMB spectrum at sea level (the 60 GHz O₂ band, the 118 GHz O₂ and 183 GHz H₂O lines, and most of the ~21 % of CMB energy above 300 GHz); even 20 % absorbed puts 9e11 J/m² into 1.03e4 kg/m² of air = 9e7 J/kg, ~3× the energy to dissociate all N₂ (3.4e7 J/kg) → a partly ionised plasma, far hotter than the photosphere (5,772 K) |
| HUD: Iron boils at 2,862 °C (the tower vaporising) | 2,862 °C | boiling point of iron 3,134 K = 2,861-2,862 °C (CRC Handbook of Chemistry and Physics); the air at > 10,000 K (row above) is far hotter |
| Enough to boil two thirds of the oceans | 66 % | total on Earth 4.59e12 J/m² × 5.10e14 m² = 2.34e27 J; boiling all oceans: 1.335e21 kg × (4.0e3 J/kg/K × 96.5 K + 2.257e6 J/kg) = 3.53e27 J |
| And to blow the air off into space | 7× | escape energy of the whole atmosphere: 5.15e18 kg × GM/R (6.26e7 J/kg) = 3.2e26 J; 2.34e27 / 3.2e26 = 7.3 (energy comparison, not a simulation) |
| Then the Sun goes black for 8 minutes / all its light already arrived | 499 s | when light slows back down, the space between the Sun and Earth holds no light: the next sunlight needs 8 min 19 s to arrive |
| The stars vanish too, for years / Alpha Centauri: back in 4.4 years | 4.37 ly | Alpha Centauri A/B distance 4.37 light-years (Proxima 4.24 ly) |
| 299,792 km/s again | c | 299,792.458 km/s |
| Time slowed down 1,000× / real time / time sped up 50× | — | 28 s on screen for 0.028 s; then 5.0 s for the last 4.97 s; 499 s shown in 9.9 s (×50.4) |
| In 1964, two scientists heard a strange hiss / from everywhere in the sky / they blamed pigeons | May 1964 | Arno Penzias and Robert Wilson, Bell Labs horn antenna, Holmdel, New Jersey: a hiss from every direction; they evicted nesting pigeons and cleaned their droppings, the hiss stayed: the CMB (AMNH; Nokia Bell Labs). Nobel Prize in Physics 1978 |
| End card: the Big Bang's glow is all around you, right now | — | the CMB fills the universe: ~410 photons per cm³ |

Simplifications stated plainly (v2 adds the visual effects below): the tower boils away from the top down over a few slowed seconds, while the air heats everywhere at once (artistic order); the burning lawn, embers and fireballs are frozen in slow motion; the Milky Way is shown blazing in the daylight sky because all of its light in transit lands at once (shown with the camera's exposure adapting); the light front of the black Sun is drawn as a glowing shell, a diagram, since light itself is invisible in empty space; the Earth is shown burning with glowing cracks (artistic). The three kinds of light arrive in the same instant; the video shows them one after the other
(slowed 1,000×) and says "the same instant" in the HUD timer that barely moves. People are shown frozen (time slowed), never hurt
on screen. The 1964 scene is a generic reconstruction (the antenna is simplified, the two figures are not likenesses).

## EP11 (post 5) — What if every radioactive atom decayed at once?

Premise: every radioactive nucleus decays in the same instant, and so does every radioactive daughter it produces, down
to a stable nucleus (each U-238 atom goes all the way to Pb-206, each Th-232 to Pb-208). Energies are the heat each
isotope will still release, neutrinos excluded: heat production per kg of isotope (Turcotte & Schubert, *Geodynamics*:
U-238 9.46e-5, U-235 5.69e-4, Th-232 2.64e-5, K-40 2.92e-5 W/kg) × mean life (half-life / ln 2: 4.468, 0.704, 14.05,
1.248 Gyr) = 1.924e13, 1.824e13, 1.689e13 and 1.659e12 J per kg of isotope. K-40 is 0.01197% of natural potassium by
mass. 1 kg TNT = 4.184e6 J.

| On screen | Value | Source / calculation |
|---|---|---|
| Your body: about 8,000 decays a second | ~4,400 Bq K-40 + ~3,700 Bq C-14 | 140 g of potassium in a 70 kg adult → 0.0168 g K-40 → 4,442 Bq (half-life 1.248 Gyr); C-14 ≈ 3.7 kBq (ICRP 23 reference man; standard background-radiation tables) |
| Your body, all at once: 28 MJ, about 7 kg of TNT | 2.78e7 J | 1.676e-5 kg K-40 × 1.659e12 J/kg = 2.78e7 J = 6.6 kg TNT (C-14 adds a few joules). ≈ 400,000 Gy in 70 kg (a lethal dose is ~5 Gy) |
| Your banana: about 20 g of TNT | 8.3e4 J | a medium banana holds ~0.42 g of potassium ("banana equivalent dose") → 5.0e-8 kg K-40 × 1.659e12 = 8.3e4 J = 20 g TNT |
| Its black sand is radioactive / HUD: up to 20 µSv/h, ~100× normal | 20 µSv/h (spots up to 55-131) | Guarapari's black monazite sand: ~6% rare earths + thorium (Química Nova 28 (2005), doi 10.1590/S0100-40422005000200013); press and travel reports quote ~20 µSv/h on the sand (Idealista 2023, Amusing Planet 2021); normal ground 0.1-0.3 µSv/h |
| People lie in it to feel better | tradition | visitors lie on or cover themselves with the sand for rheumatism, a "therapy" promoted by physician Silva Mello (Amusing Planet 2021, Oddity Central); no proven benefit |
| The sand under your towel: a kiloton | ~1 kt | taking a conservative 0.1% thorium in the black sand (reports up to 0.116% Th-232; ~10% monazite with ~3% Th fits 0.3%): 1e-3 kg Th × 1.689e13 = 1.7e10 J per kg = 4 t TNT per kg; a towel's footprint 10 cm deep (1.8 × 0.9 × 0.1 m at 1,600 kg/m³ = 259 kg) → 1.05 kt |
| A kilo of granite: 80 kg of TNT | 3.4e8 J/kg | typical granite: 4 ppm U, 15 ppm Th, 3.5% K → 7.6e7 + 0.05e7 + 25.3e7 + 0.7e7 = 3.37e8 J/kg = 80.6 kg TNT |
| The sea flashes blue and warms by 36 °C | +36 K | seawater: 0.399 g K and 3.3 µg U per kg → 7.9e4 + 6.3e4 = 1.42e5 J/kg ÷ 3,990 J/(kg·K) = 36 K. The flash: K-40 betas (up to 1.31 MeV) exceed the 0.26 MeV Cherenkov threshold in water: the blue glow of reactor pools |
| The continents flash into rock vapour | 29 kg TNT per kg of crust | bulk continental crust 1.3 ppm U, 5.6 ppm Th, 1.5% K (Rudnick & Gao 2003) → 1.23e8 J/kg, ~8× the ~1.6e7 J/kg needed to heat, melt and boil silicate rock; whole continental crust (2.2e22 kg) 2.7e30 J |
| 1.3 million years of sunlight, in one instant | 7.1e30 J | bulk silicate Earth 20 ppb U, 80 ppb Th, 240 ppm K (McDonough & Sun 1995), 4.0e24 kg → 7.1e30 J; sunlight intercepted by Earth 1.74e17 W → 4.1e13 s = 1.3 Myr. (3% of Earth's gravitational binding energy: the planet stays whole; enough to melt its surface back into a magma ocean) |
| 1987, Goiânia: the powder inside glowed blue / 4 people died | Goiânia accident | 13 Sept 1987, scavengers took a radiotherapy head from the abandoned Instituto Goiano de Radioterapia; the capsule held ~93 g of caesium-137 chloride (50.9 TBq); opened at a scrapyard, it showed "a deep blue light"; 4 deaths, 249 people contaminated, ~112,000 checked (IAEA, *The Radiological Accident in Goiânia*, 1988) |

EP11 on-screen extras (HUD lines and timer):
- "Black sand: ~0.1% thorium": the conservative grade used above (reports up to 0.116% Th-232).
- "Crust: 8× the energy to boil it": 1.23e8 J/kg vs ~1.6e7 J/kg to heat, melt and boil silicate rock (row above).
- "Released: 7 × 10³⁰ joules": the bulk-silicate-Earth total above (7.1e30 J).
- "Your body: 4,400 potassium-40 decays a second" (end card): 4,442 Bq (row above).
- The "time since the decay" timer: slow motion 10⁹× during the blue flash, 10⁶× while the sand heats, 10³× for the blast
  and the coast, then sped up 10³× in space. Time scales: Cherenkov light is emitted while each beta electron slows down
  in water or tissue (picoseconds to nanoseconds); the deposited energy is heat within nanoseconds; hot rock vapour
  expands at a few km/s (about a millimetre per microsecond, metres per millisecond), so the sand only bulges and glows
  at the microsecond scale and erupts at the millisecond scale, as shown.

## EP12 (post 6) — What if every atom on Earth stopped moving for 1 second?

Premise: for one second every atom on Earth is at rest relative to the ground (thermal jiggling, wind, waves, cars, you;
Earth itself keeps turning and orbiting, so this is not "Earth stops"). When the second is over the atoms start again
from rest: the part of the heat that was motion is gone. Temperature measures exactly that motion, so at the restart
everything is at absolute zero. In solids and liquids the bonds between atoms were stretched at that instant and give
part of the energy back within picoseconds (in a harmonic solid, half the thermal energy is potential), so they re-warm
part of the way; a gas has no bonds between molecules and stays at absolute zero until it falls (below).

| On screen | Value | Source / calculation |
|---|---|---|
| Air molecules: about 500 m/s → 0 | 507 m/s rms (467 m/s mean) | N2 at 15 °C: v_rms = √(3RT/M) = √(3 × 8.314 × 288 / 0.028) |
| No sound: sound is atoms moving | definition | a sound wave is a travelling pattern of molecular motion; with every molecule at rest, nothing carries it |
| Everything at −273.15 °C (absolute zero) | 0 K at the restart | temperature is the mean kinetic energy of the atoms' random motion; at the restart it is zero everywhere |
| The water in the air falls as snow: 13 trillion tonnes | 1.27e16 kg | water vapour in the atmosphere ≈ 12,900 km³ of liquid water (USGS / Shiklomanov), 25 mm averaged over Earth; at 0 K it can only condense |
| Nothing holds the sky up | air pressure = molecular impacts | the atmosphere is held up by its own pressure, i.e. by molecules moving; at rest, every molecule simply falls |
| Air from 10 km up hits at up to 1,600 km/h | 443 m/s after 45 s | free fall from 10 km (all the air below falls with it at the same rate, so it falls through near-vacuum): v = √(2gh), t = √(2h/g). "Up to": it lands on the air already piled up near the ground |
| The air's fall: 100 million megatons of heat | 4.3e23 J | potential energy of the atmosphere = surface pressure × scale height per m² = 101,325 Pa × 8.4 km = 8.5e8 J/m² × 5.1e14 m² = 4.3e23 J = 1.0e8 Mt TNT. It turns into heat in the fallen air, which ends up around 80 K (−190 °C): 82.7 kJ/kg ÷ (cv + R) |
| Times Square: 330,000 people a day | Times Square Alliance | pedestrian counts, "more than 330,000 people pass through on a typical day" |
| Earth turns white | qualitative | the snowed-out water vapour, frost on every surface and frozen sea surface (water re-warms only to about its freezing point) |
| Snowball Earth, about 700 million years ago | 717-635 Ma | Sturtian (717-660 Ma) and Marinoan (~650-635 Ma) glaciations: ice reached the tropics (Hoffman et al., Science 1998; Rooney et al. 2015) |
| Coldest temperature ever measured on Earth: −89.2 °C, Vostok, 1983 | 21 July 1983 | WMO Weather and Climate Extremes Archive, Vostok station, Antarctica |
