# ADR 0003: Alias the XR emulator out of the bundle

**Status:** accepted · **Where:** `vite.config.ts`, `src/core/emulate-stub.js`

## Context
`@pmndrs/xr` ships a desktop headset emulator (`emulate.js`) that pulls in large default 3D room environments. It added about 6 MB to the bundle and the offline cache, and is useless on a real Quest.

## Decision
`vite.config.ts` aliases `@pmndrs/xr/dist/emulate.js` and `./emulate.js` to a tiny stub. The store is created with `emulate: false`.

## Consequences
- The alias must stay or the bundle and precache budgets fail.
- End-to-end VR tests use Meta's separate IWER runtime instead (`src/core/iwerHarness.ts`), included only when `VITE_E2E_XR=1` (see ADR 0006 notes and `playwright.config.ts`). Production builds never contain it.
