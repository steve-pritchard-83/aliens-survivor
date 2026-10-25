# ADR 0005: Separate hit queries from damage

**Status:** accepted · **Where:** `src/core/CombatEvents.ts`

## Context
Hit handlers used to apply damage inside the ray test. The touch auto-aim "probe" therefore damaged aliens every frame, and damage was applied before walls were considered, so bullets from the player and Bishop passed through walls.

## Decision
Targets register a **`TargetProvider`** with two methods: `query` (pure: distance and hit point, no side effects) and `applyHit` (damage, effects, sounds, kills). `CombatSystem` offers:
- `queryTarget(origin, dir)` for probes: reports `target`, `wall` or `none`, walls occluding targets, no side effects;
- `resolveShot(origin, dir, damage)` for real shots: applies damage to the nearest unoccluded target, otherwise triggers a wall impact.
Results are written into reused records (no allocation); callers copy anything they keep.

## Consequences
- Weapons pass a `DamageSpec` (amount, source) so upgrades such as armour-piercing are applied at the weapon, not inside the target.
- New target types implement `TargetProvider`; new weapons call `resolveShot`.
