# Coding Conventions & AI Rules: Aliens Survivor

Run `npm run verify` before every commit; it enforces most of this list.

1. **File length:** no `src/**/*.{ts,tsx}` file over **250 lines** (blank lines and comments excluded), one statement per line. Split by responsibility (pure module + thin component); never compress code to fit. Enforced by ESLint.
2. **Formatting and style:** Prettier (`npm run format`), single quotes, semicolons, LF line endings. Match the surrounding code's naming and comment density. Comments explain why, not what.
3. **TypeScript strictness:** strict mode, `noUnusedLocals`/`noUnusedParameters` on, no `any` (justify any exception inline).
4. **Error handling:** no empty `catch`. Expected failures (storage blocked, vibration unsupported) get a catch with a specific reason comment; unexpected ones log with `console.warn('[Module]', e)`.
5. **Zero frame-loop allocations:** no `new THREE.*`, array literals, spreads, `.map/.filter/.reduce` or closures inside `useFrame` or per-shot code. Use module-scope scratch objects (`_name`), reused records and index loops (ADR 0002).
6. **Pure logic first:** game rules live in `src/systems/` and the `*Sim`/`*AI` modules (no React imports) and are unit-tested; components adapt them to three.js, audio and UI.
7. **Run lifecycle and freezing:** reset on `runId` changes, never on status edges. Gate simulation with `isSimulationFrozen(status)`.
8. **Combat:** `CombatSystem.queryTarget` for side-effect-free probes, `resolveShot` for shots; target types implement `TargetProvider` (ADR 0005).
9. **Frame-rate independence:** integrate movement and timers with `dt` and local state, never from throttled store values.
10. **Light cap:** at most 4 dynamic lights; never mount/unmount lights at runtime (ADR 0001). Variable-cost effects honour `quality.tier` (ADR 0006).
11. **Cross-platform input:** all player input goes through `InputManager` (desktop, touch, XR) or `vrControllers`; VR menus use `VRMenuNav` (edge-detected, armed after a delay).
12. **Centralised data:** every game number lives in `src/data/` (`balance.ts`, `difficulty.ts`, `weapons.ts`); settings shape and validation live in `GameTypes.ts` and `Persistence.ts`. Per-run values are reset in one place (`core/runState.ts`) and difficulty rules are read from `state.rules`, never recomputed mid-run.
12a. **Levels and weapons are data:** map layout, spawns and starts come from the active `LevelDefinition` (validate new ones with `validateLevel`); weapons are `WeaponProfile` entries read through the active weapon. Do not hard-code corridor coordinates or weapon numbers in entities.
13. **Testing:** every logic change needs unit tests (coverage gate 80/75/65 on the logic layers); behaviour that spans the browser or XR gets a Playwright test. The IWER-based VR tests hold inputs for about a second because software rendering is slow.
14. **Assets:** compress per ADR 0004, consult `.ai/ASSET_MANIFEST.md` for node/clip/audio names, and update `CREDITS.md` (a test checks models).
15. **Docs:** keep `HANDOFF.md` and these files in step with the code; reference `balance.ts` instead of copying numbers.
