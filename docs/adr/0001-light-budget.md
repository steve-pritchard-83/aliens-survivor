# ADR 0001: Cap dynamic lights at four

**Status:** accepted · **Enforced by:** `scripts/check-budgets.mjs`, `tests/budgets.test.ts`

## Context
Quest 2 (Adreno 650) renders forward-shaded stereo. Every dynamic light is evaluated per fragment per eye, and adding or removing a light at runtime recompiles shaders, which shows up as a visible hitch.

## Decision
The whole scene may declare at most **four** point/spot/directional lights: the sector key light and the emergency beacon (`CorridorLevel`), and the rifle flashlight and muzzle flash (`PulseRifle`). Lights are always mounted; they are switched with `visible` or `intensity`. Impact feedback uses emissive flashes and particles instead of lights.

## Consequences
- Lighting detail comes from baked/emissive materials, ambient and hemisphere lights (which are cheap).
- A fifth light fails `npm run verify`. Raising the cap needs a measured Quest 2 frame-time budget.
- Bullet impacts and alien hits must not add lights, even briefly.
