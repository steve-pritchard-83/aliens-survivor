# Weapons: framework and proposed additions

## What exists

`src/data/weapons.ts` defines a `WeaponProfile` per weapon (damage, fire interval, magazine, reload time, spread,
jam threshold, range, shot sounds, viewmodel key). The store tracks `activeWeapon` (reset to the M41A each run),
`cycleWeapon()` switches to the next weapon in `WEAPON_ORDER` (switching costs one reload cycle so it cannot refill a
magazine instantly) and the rifle firing module reads the active profile. Input: **Q** on desktop, **left grip** in VR.
Only the **M41A** is registered, so cycling is currently a no-op.

Adding a weapon that works like a hitscan rifle needs only a profile, an entry in `WEAPON_ORDER`, a viewmodel and
sounds. Weapons with different mechanics (below) need a small firing module beside `rifle/rifleFiring.ts`.

## Proposed: Smartgun

| Aspect | Design |
|---|---|
| Role | Heavy suppressive weapon with aim assist; slower to handle |
| Fire | Hitscan, `fireInterval ≈ 0.055`, damage ≈ 14 per round (high volume), `magazine ≈ 250`, `reloadTime ≈ 4.0` |
| Aim assist | Within a 12° cone and 20 m, nudge the aim ray toward the nearest unoccluded target using `CombatSystem.queryTarget` (side-effect free) and the threat list; strength scales with a new `aimAssist` profile field |
| Handling | Movement multiplier 0.7 while firing (a `moveSpeedMult` profile field read by `velocityDelta`) |
| Jamming | None; heat shown on the viewmodel only |
| Upgrades | Armor-piercing and extended drum apply as for the M41A |

Needs from the owner: a Smartgun 3D model with a muzzle node (none exists in `assets/models/`), and sounds. The
library has `assets/sound effects/weapons/human/minigun/` that could serve as a stand-in (confirm licensing: see
`CREDITS.md`).

## Proposed: Flamethrower

| Aspect | Design |
|---|---|
| Role | Short-range crowd control with damage over time |
| Fire | No hitscan: a cone (about 25° wide, 6 m long) tested each frame against pooled aliens; 40 damage per second to targets inside, plus a burn status (10 DPS for 3 s) on `PooledXenomorph` |
| Resource | Fuel tank instead of rounds: 100 units, 20 per second; refuel on reload (2.0 s) |
| Safety | Never ignites the player; blocked by walls through `queryTarget`/the environment raycast |
| Lights | **None added** (the four-light cap, ADR 0001): use additive particles and an emissive cone; optionally brighten the existing muzzle light while firing |
| Audio | Loop while the trigger is held, with on/off one-shots |

Existing sound sources: `assets/sound effects/weapons/human/flamethrower/` (flame loop, flame on/off, fluid
movement, reload bottle and latch). Provenance is unknown (see `CREDITS.md`), so confirm the licence before shipping.
Needs from the owner: a flamethrower model and a flame particle texture.

## Decision needed before implementing

Both weapons depend on art (models, textures) and sounds whose rights are not confirmed. **Owner decision:** supply or
approve assets (or choose placeholder primitives), then implement the Smartgun first (it reuses the hitscan path),
followed by the Flamethrower (it needs the cone-damage and burn systems).
