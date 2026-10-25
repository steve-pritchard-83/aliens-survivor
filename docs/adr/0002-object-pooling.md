# ADR 0002: Fixed pools and allocation-free frame loops

**Status:** accepted · **Related:** `src/entities/xeno/xenoPool.ts`, `src/entities/XenoTypes.ts`

## Context
Garbage-collection pauses are the most visible performance problem in VR at 72 Hz, and skinned meshes with animation mixers are expensive to create.

## Decision
- Xenomorph drones come from a **fixed pool of 6** built once (`POOL_SIZE`); spawning toggles state and visibility in place. At most 2 are active at a time (`BALANCE.XENO_POOL.MAX_CONCURRENT`).
- Effects (sparks, decals, gibs, puddles) use fixed pools with index counters.
- Frame loops and per-shot code create no objects: module-scope scratch vectors (`_name`), reused result records (`CombatSystem` outcomes, threat records, event records), index `for` loops instead of `map/filter/reduce`, and no per-frame closures.
- Pure simulation steps (`stepXeno`, `stepSmall`) mutate plain records and write events into reused objects.

## Consequences
- Code is more imperative than idiomatic React; the `*Sim`/`*AI` split keeps it testable.
- New entities should follow the same pattern; reviewers check for allocations in `useFrame`.
