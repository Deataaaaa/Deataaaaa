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

## EP02 — What if you fell into a black hole? (Sagittarius A*)

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
