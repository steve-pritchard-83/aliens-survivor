# Project Context & Architecture: Aliens Survivor

## 1. Overview
**Aliens Survivor** is a 5-minute (300-second) first-person survival wave shooter set aboard the *USS Sulaco*. Built with Vite 6, React 19, TypeScript, Three.js, React Three Fiber (`@react-three/fiber`), `@react-three/drei`, `@react-three/xr`, and Zustand. Designed for cross-platform play across Meta Quest 2/3 (Horizon OS WebXR), Desktop Web, and Mobile PWA.

## 2. Directory Architecture
- `src/core/`: Engine foundations, input management, Web Audio, WebXR session handling, and platform detection.
  - `GameStore.ts`: Global Zustand state store (status, HP, ammo, kills, XP, level, upgrades, settings).
  - `GameTypes.ts`: Type definitions for state, threat tracking, and settings.
  - `InputManager.ts`: Unified cross-platform input aggregator (keyboard/mouse, touch, WebXR controllers).
  - `AudioManager.ts`: Web Audio API spatial audio player with buffer preloading.
  - `Platform.ts`: Device detection (Quest, mobile, VR app TWA).
  - `XRStore.ts`: `@react-three/xr` controller and session store.
- `src/data/`:
  - `balance.ts`: Centralized balance constants (mission timers, player stats, weapons, alien stats, upgrade catalog).
- `src/entities/`: Three.js / R3F world meshes and systems.
  - `CorridorLevel.tsx`: Static Sulaco figure-8 corridor geometry with baked matrices and sector lighting.
  - `PulseRifle.tsx`: M41A viewmodel with recoil, LED ammo readout, muzzle flash, and hitscan raycasting.
  - `MotionTracker.tsx`: Wrist-mounted M314 radar with sweep shader, sweep audio, and target pings.
  - `XenomorphPool.tsx`: Pre-allocated 6-slot pool of Xenomorph drones, Praetorian mini-boss, and dismemberment.
  - `SmallAlienSpawner.tsx`: Procedural Facehugger/Chestburster swarmers.
  - `BishopCompanion.tsx`: Synthetic marine companion offering covering fire and corridor navigation.
  - `PlayerController.tsx`: First-person character locomotion, corridor collision clamping, and head height.
- `src/ui/`:
  - `HUD.tsx`: 2D desktop/mobile HUD (crosshair, health bar, timer, touch controls, install gate).
  - `VRHud.tsx`: 3D in-VR world-space HUD (floating health/ammo, field promotion cards, pause menu).
  - `LevelUpModal.tsx`: Tactical 3-card upgrade selection screen.
  - `SettingsPanel.tsx`: VR comfort and accessibility settings (snap angle, reduced flash, left-handed mode).
  - `DebugTelemetry.tsx`: Real-time performance overlay (`?debug=1`).
- `tests/`:
  - `balance_and_store.test.ts`: Automated Vitest test suite for game logic, math, and state.

## 3. Coordinate Space & Level Geometry
- Floor: `Y = 0.0m`, Ceiling: `Y = 2.50m`.
- Double-Size Figure-8 corridor sector:
  - **East Spine Corridor:** `X ≈ -0.32`, `Z ∈ [8.3, 35.9]`
  - **West Spine Corridor:** `X ≈ -13.48`, `Z ∈ [8.3, 35.9]`
  - **Transverse Connectors:** North `Z = 35.9`, Central `Z = 22.1`, South `Z = 8.3`

## 4. Meta Quest 2 Hardware Performance Rules
- **4 Active Dynamic Lights Maximum:** Mobile Adreno 650 forward shading limits.
- **Fixed Pool of 6 Xenomorphs:** Prevents GC spikes and animation mixer overloads.
- **Zero Vector Allocations in Frame Loops:** Scratch vectors declared at module scope.
- **Transform Freezing:** Static environment meshes have `matrixAutoUpdate = false`.
- **Throttled State Updates:** Store updates throttled to 10-20Hz to prevent React re-renders.

## 5. Mission Phases (300-Second Wave Director)
- **Phase 1: Awakening (300s - 225s):** Lone drones, slow spawn interval (3.5s).
- **Phase 2: The Swarm (225s - 135s):** Fast drones + facehuggers, increased aggression (2.8s).
- **Phase 3: Hull Breach (135s - 45s):** Praetorian Guard mini-boss (1,100 HP, 35% DR) + swarm (2.2s).
- **Phase 4: Extraction (45s - 0s):** Relentless assault until timer reaches 0:00 (1.6s).
