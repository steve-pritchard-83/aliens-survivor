# Aliens Survivor: Engineering Handoff

> **Audience:** the next engineer or AI coding assistant.
> **Verified against code at commit `b99ba2f`** (end of uplift phase 5). Audit and scoring: [`docs/AUDIT.md`](docs/AUDIT.md).
> Machine-specific details (headset serial, ADB paths, keystore location) live in `HANDOFF.local.md`, which is gitignored.

---

## 1. Quick reference

- **App:** a 300-second first-person survival wave shooter aboard the *USS Sulaco*.
- **Stack:** Vite 6, React 19, TypeScript 5.7 (strict), three.js 0.174, React Three Fiber 9, drei 10, `@react-three/xr` 6, Zustand 5, three-mesh-bvh, Vitest 5, Playwright.
- **Platforms:** Meta Quest 2/3 (WebXR, via the Quest Browser or the Horizon OS TWA APK), desktop web (WASD + pointer lock), mobile PWA (dual touch zones).
- **Repo:** `https://github.com/steve-pritchard-83/aliens-survivor` (`main`). **Production:** `https://aliens-survivor.vercel.app`.
- **Caution:** pushing `main` triggers a Vercel production deploy. Work on branches and open PRs.

## 2. Invariants (enforced by `npm run verify`)

`npm run verify` runs lint, format check, type-check, tests with coverage, a production build and the budget gate. CI runs the same command, plus the Playwright suite in a separate job. A change is done only when `verify` passes.

| Rule | Enforced by |
|---|---|
| No source file over **250 lines** (blank lines and comments excluded), **one statement per line**, no empty `catch` blocks, no unused locals or parameters | ESLint (`max-lines`, `max-statements-per-line`, `no-empty`), `tsc` |
| At most **4 dynamic lights** (key light + beacon in `CorridorLevel`, the pale end-of-corridor glow in `EndGlow`, muzzle flash in the rifle; the budget is now full). Never mount or unmount a light at runtime: toggle `visible` or `intensity` | `scripts/check-budgets.mjs` and `tests/budgets.test.ts` |
| Largest JS chunk ≤ 900 kB, total JS ≤ 1.6 MB, service-worker precache ≤ 48 MB | `scripts/check-budgets.mjs` |
| Logic-layer coverage ≥ 80% lines / 75% functions / 65% branches | `vitest.config.ts` |
| `CREDITS.md` lists every shipped model with its author and source | `tests/credits.test.ts` |

Rules that tooling cannot fully check, so reviewers must:

1. **No allocations in frame loops.** Never create `THREE.Vector3`/`Quaternion`/arrays/closures inside `useFrame` or per-shot code. Use module-scope scratch objects (prefix `_`), reused result records and index loops.
2. **`src/data/balance.ts` is the only source of game numbers** (damage, speeds, HP, timings, upgrade effects). Entities import from it.
3. **Pure logic lives in `src/systems/` and the `*Sim`/`*AI` modules** and must not import React. Components are thin adapters (simulation to three.js objects, events to audio).
4. **Simulation freezing:** use `isSimulationFrozen(status)` (PAUSED and LEVEL_UP). Reset entities when `state.runId` changes, **not** on status edges (level-ups must not wipe the field).
5. **Combat:** `CombatSystem.queryTarget` is side-effect free (auto-aim probes); `CombatSystem.resolveShot` applies damage and wall impacts. Walls occlude targets. Never apply damage inside a query.
6. **Frame-rate independence:** integrate movement and timers with `dt`, never from throttled store values.
7. **All input flows through `src/core/InputManager.ts`** (desktop, touch, XR) or the VR controller poll (`src/ui/vrControllers.ts`).
8. **Assets:** models ship uncompressed as authored (a gltf-transform optimize pass broke the skinned models, see ADR 0004); SFX are AAC `.m4a` except gunfire and UI cues (`scripts/compress-audio.mjs`). Update `CREDITS.md` when adding assets.
9. **Line endings are LF** (`.gitattributes`, Prettier). Run `npm run format` before committing.

## 3. Commands

```bash
npm run dev            # Vite dev server
npm run verify         # the full gate (use before every commit)
npm test               # unit tests (npm run test:coverage adds the coverage gate)
npm run e2e            # Playwright: desktop, mobile (Pixel 7 emulation) and emulated-Quest VR tests
npm run lint | typecheck | format | format:check
npm run build          # tsc -b && vite build
node scripts/list-asset-metadata.mjs   # provenance embedded in the shipped GLBs
```

URL flags: `?debug=1` shows FPS, draw calls, triangles and the quality tier; `?vr=1` forces the Quest flow; `?e2e=1` exposes test hooks (`window.__game`, `__xr`, `__headPosition`).

## 4. Layout

```
src/
├── main.tsx, App.tsx          Entry, canvas + XR + scene composition
├── core/                      Engine services and state
│   ├── GameStore.ts / GameTypes.ts   Zustand store, status machine, runId, settings
│   ├── Persistence.ts         Validated localStorage for settings and best kills
│   ├── SettingsBinding.ts     Pushes settings into audio, input and haptics
│   ├── MissionLauncher.ts     launchMission(): start a run and bring up audio
│   ├── runState.ts / runSummary.ts   Per-run reset fields; scoring a finished run onto the leaderboard
│   ├── CombatEvents.ts        Target providers, queryTarget / resolveShot, wall impacts
│   ├── CorridorNav.ts         Hall rectangles, corners, spawn nodes, allocation-free clamping
│   ├── InputManager.ts        Keyboard, mouse, touch and XR input aggregation
│   ├── AudioManager.ts / AudioCatalog.ts / AmbienceLoop.ts   Web Audio buses, voice cap, sound table
│   ├── AdaptiveQuality.tsx / QualityState.ts   FPS governor and effect tiers (0..2)
│   ├── XRStore.ts, XRControllerState.ts, Haptics.ts, ComfortState.ts   XR session and controllers
│   └── Platform.ts, e2e.ts, iwerHarness.ts, TrackerState.ts, MuzzleTexture.ts, SevenSegment.ts
├── data/
│   ├── balance.ts             Game numbers, score weights, upgrade catalogue and effects
│   ├── difficulty.ts          Recruit / Marine / Ultimate Badass profiles and per-run GameRules
│   └── weapons.ts             WeaponProfile registry (M41A only), cycling order
├── levels/                    LevelDefinition (halls, junctions, spawns, starts, radar outline), validateLevel,
│   └── sulaco.ts              the Sulaco map; index.ts holds the registry and the active level
├── systems/                   Pure logic: corridorPathing, combatMath, waveDirector, comfort, scoring
├── entities/                  three.js / R3F world objects
│   ├── XenomorphPool.tsx + xeno/{xenoAI,xenoDamage,xenoDeath,xenoPool}.ts
│   ├── SmallAlienSpawner.tsx + small/{smallSim,smallAssets}.ts
│   ├── PulseRifle.tsx + rifle/{RifleState,rifleFiring,rifleViewmodel,autoTarget}.ts
│   ├── PlayerController.tsx + player/{playerMotion,xrRig}.ts
│   ├── CorridorLevel.tsx + level/{envRaycast,trimSectorWalls}.ts
│   ├── MotionTracker.tsx + tracker/trackerCanvas.ts
│   ├── BishopCompanion.tsx, BishopRig.ts, ComfortVignette.tsx, AlienEggs.tsx
│   └── WallImpactFX, XenomorphImpactFX, CorridorAtmosphereFX + fx/*
└── ui/                        2D overlays and VR menus
    ├── HUD.tsx → MainMenu, VictoryScreen, Leaderboard, StatusBar, TouchControls, PwaInstallPrompt, SettingsPanel, LevelUpModal
    └── VRHud.tsx → VRStatusPanel, vrControllers, vrPauseMenu, vrMenuModel, VRMenuNav, vrSessionEvents, VRAutoLauncher
tests/   Vitest suites (logic, systems, UI models, budgets, credits)
e2e/     Playwright (smoke, mobile, vr)
scripts/ compress-audio, check-budgets, list-asset-metadata, tick-progress
docs/    AUDIT.md, IP_REVIEW.md, adr/, design/ (weapons, LV-426)
.ai/     Context, conventions, asset manifest, uplift plan and progress
```

## 5. Controls

| Platform | Controls |
|---|---|
| Desktop | WASD move, mouse look (pointer lock), left click fire, R reload, Q cycle weapon, Tab tracker, P/Esc pause, 1/2/3 pick upgrade |
| Touch | Left half: move stick. Right half: look; the rifle auto-fires when a threat is in the crosshair. PAUSE button |
| Quest | Left stick move · right stick turn (snap or smooth) · right trigger fire · A reload · left grip cycle weapon · B/Y or stick click pause · look at the left wrist for the tracker |

**VR menus.** On entering VR the mission waits in a start menu: stick left/right picks the difficulty and a fresh trigger press deploys. **Pause (B/Y):** right or left stick up/down selects a row, left/right adjusts (snap turn, comfort vignette, reduced flash, handedness, seated mode, master/music/effects volume), trigger on *Resume* resumes. **Level-up:** stick left/right selects a card, trigger confirms (input is ignored for 0.6 s and until the trigger has been released). **Defeat/victory:** a fresh trigger press redeploys; nothing restarts automatically.

## 6. Architecture notes

- **Status machine:** `MENU → PLAYING ⇄ PAUSED / LEVEL_UP → VICTORY | DEFEAT`. `startGame()` increments `runId`; pools and companions reset when they see a new `runId` while PLAYING.
- **Frame ownership:** `PlayerController` ticks the store (`tick(dt, now)`) each frame and integrates movement into a local position ref; the store copy of the player position is throttled to 20 Hz for other systems.
- **VR rig:** the head (XR viewer pose) is the player. Turns pivot about the head, locomotion and room-scale movement are clamped to the corridor with a 15 cm margin, and seated mode raises the origin. See `entities/player/xrRig.ts`.
- **Quality:** `XRStore` picks the framebuffer scale once per device class (three.js ignores scale changes mid-session). `AdaptiveQuality` then adjusts effect tiers from measured FPS (sparks, decals, droplets, eggs).
- **Audio:** master/SFX gain buses, a 24-voice cap (gunfire, damage and UI are exempt), HRTF only for key cues, music through an `<audio>` element.
- **Settings:** stored under `uscm_settings_v1` (validated per field); `SettingsBinding` applies them live.
- **Difficulty:** the chosen profile is resolved once per run into `state.rules` (spawn interval, enemy HP and damage, concurrent drones, regen); marine equals the original balance, and it cannot change mid-run.
- **Scoring:** `systems/scoring.ts` computes a score (kills by kind, accuracy, survival, weights in `BALANCE.SCORE`); `runSummary.ts` ranks each finished run on a top-10 board per difficulty (`uscm_leaderboard_v1`).
- **Weapons:** `data/weapons.ts` holds a profile per weapon; the store tracks `activeWeapon` and switching costs a reload. Only the M41A exists; see `docs/design/weapons.md`.
- **Levels:** navigation, pathing, spawns, starts and the radar outline come from the active `LevelDefinition` (`src/levels`); the 3D scene of a map is still its own component. See `docs/design/lv426.md`.

## 7. Release and deployment

- **Web:** Vercel builds `main`. Iterate with `npm run check` (types and lint, seconds); run `npm run verify` before pushing. `npm run e2e` is optional and CI runs it only when started by hand (Actions, "Run workflow").
- **Quest APK:** `.github/workflows/build-quest-apk.yml` (tag `v*` or manual run) builds the signed TWA wrapper in `quest-build/`. It needs four repository secrets: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`. The signing certificate fingerprint must match `public/.well-known/assetlinks.json`. Back up the keystore and passwords somewhere safe: if they are lost the installed app can never be updated.
- **Local APK builds** read the same environment variables (see `quest-build/app/build.gradle`).

## 8. Gotchas and decisions

1. **`@pmndrs/xr` emulator stub.** `vite.config.ts` aliases the library's `emulate.js` to `src/core/emulate-stub.js`; it otherwise adds ~6 MB. Keep the alias.
2. **No impact lights.** Alien hits use an emissive flash and particle sparks; do not add lights for impacts.
3. **Static meshes are frozen** (`matrixAutoUpdate = false`) in `CorridorLevel`; update world matrices before freezing if you change geometry.
4. **Walking speed** is frame-rate independent: 3.0 m/s on desktop and touch (`BALANCE.PLAYER.MOVE_SPEED`) and 1.8 m/s in VR (`XR_MOVE_SPEED`). 1.2 m/s was tried and judged too slow; both values are untuned guesses until tested on a headset.
5. **three-mesh-bvh is pinned to 0.8.x** to match drei's copy (two versions cause duplicate type declarations).
6. **e2e builds include the IWER headset emulator** (`VITE_E2E_XR=1`, set by `playwright.config.ts`); production builds do not. IWER spoofs a Quest user agent, so the app auto-enters VR in those tests. Software-rendered XR runs at a few frames per second, so VR tests hold inputs for about a second.
7. **PowerShell:** do not chain with `&&`; use `;`. Bash tool and npm scripts are fine.
8. **Provenance and IP:** see `CREDITS.md` (CC BY attribution is required for all models and is not yet shown in the app) and `docs/IP_REVIEW.md` (owner decisions pending).

## 9. Open items

- **Owner decisions pending** (assets and legal): Smartgun and Flamethrower art and sounds (`docs/design/weapons.md`), a second map (`docs/design/lv426.md`), IP and licensing and visible CC BY attribution (`docs/IP_REVIEW.md`, `CREDITS.md`), Git LFS for `assets/`.
- **Device verification:** the manual checklists in `.ai/UPLIFT_PROGRESS.md` have not been run on a headset or phone yet.
- See `docs/AUDIT.md` for the scorecard and remaining findings.
