# Project Context & Architecture: Aliens Survivor

## 1. Overview
**Aliens Survivor** is a 5-minute (300-second) first-person survival wave shooter set aboard the *USS Sulaco*. Stack: Vite 6, React 19, TypeScript (strict), three.js, React Three Fiber, `@react-three/xr`, Zustand. Platforms: Meta Quest 2/3 (Horizon OS WebXR), desktop web, mobile PWA. Full engineering detail is in `HANDOFF.md`; this file is the short map.

## 2. Directory Architecture
- `src/core/`: engine services and state. `GameStore`/`GameTypes` (Zustand store, status machine, `runId`, settings), `Persistence` (validated localStorage), `SettingsBinding`, `MissionLauncher`, `CombatEvents` (target providers, `queryTarget`/`resolveShot`), `CorridorNav`, `InputManager`, `AudioManager`/`AudioCatalog`, `AdaptiveQuality`/`QualityState`, `XRStore`/`XRControllerState`/`Haptics`/`ComfortState`, `Platform`.
- `src/data/`: `balance.ts` is **the** source of game numbers (mission timers, player, Bishop, xeno pool, Praetorian, small aliens, XP, tracker, score weights, upgrade effects); `difficulty.ts` holds the difficulty profiles and per-run rules; `weapons.ts` holds weapon profiles. Do not restate their values elsewhere; read them from the files.
- `src/levels/`: `LevelDefinition` (halls, junctions, adjacency, spawn nodes, starts, radar outline), `validateLevel` and the Sulaco map. Systems read the active level; do not hard-code map coordinates.
- `src/systems/`: pure logic with no React: corridor pathing, combat maths, wave director (boss rule, spawn picking, difficulty scaling), comfort vignette, scoring.
- `src/entities/`: three.js / R3F world objects, each a thin adapter over pure modules (`xeno/`, `small/`, `rifle/`, `player/`, `level/`, `tracker/`, `fx/`).
- `src/ui/`: 2D overlays (`HUD`, `MainMenu`, `SettingsPanel`, `StatusBar`, `TouchControls`, `PwaInstallPrompt`, `VictoryScreen`, `LevelUpModal`) and VR menus (`VRHud`, `VRStatusPanel`, `vrControllers`, `vrPauseMenu`, `vrMenuModel`, `VRMenuNav`, `vrSessionEvents`).
- `tests/` (Vitest), `e2e/` (Playwright, including an emulated Quest 3), `scripts/` (asset compression, budgets, metadata), `docs/` (audit, IP inventory, ADRs).

## 3. Coordinate Space & Level Geometry
- Floor `Y = 0`, ceiling `Y = 2.50 m`.
- Double-size figure-8 sector (hall rectangles, junctions and spawn nodes are defined in `src/levels/sulaco.ts`):
  - East spine `X ≈ -0.32`, `Z ∈ [8.3, 35.9]`; west spine `X ≈ -13.48`.
  - Transverse connectors at `Z = 35.9` (north), `22.1` (centre) and `8.3` (south).
- Player start `(-0.32, 13.0)` facing +Z. In VR the head (XR viewer pose) is the player position.

## 4. Quest 2 performance rules
Dynamic light cap, fixed alien pool, allocation-free frame loops, frozen static transforms, throttled store updates, a precache of at most 48 MB and the chunk budgets are described and enforced as listed in `HANDOFF.md` section 2 and the ADRs in `docs/adr/`.

## 5. Mission phases (300-second wave director)
Phase boundaries come from `BALANCE.PHASES`; spawn intervals, speeds and HP per phase come from `BALANCE.XENO_POOL`. Roughly: phase 1 *Awakening* (lone drones), phase 2 *The Swarm* (faster drones plus facehuggers/chestbursters), phase 3 *Hull Breach* (one Praetorian boss), phase 4 *Extraction* (one more Praetorian, fastest spawns until the timer reaches 0:00). A Praetorian appears at most once per phase (`shouldSpawnBoss`).
