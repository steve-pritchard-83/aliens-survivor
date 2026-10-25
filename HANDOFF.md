# Aliens Survivor — Engineering Handoff

> **Target Audience:** Incoming AI Coding Assistant / Engineering Lead.  
> **Last Updated:** 25 Oct 2026 · Commit `fe1312b` · Production: [https://aliens-survivor.vercel.app](https://aliens-survivor.vercel.app)

---

## 1. Quick Reference & Core Facts

- **App:** 300-second (5-minute) survival wave shooter set aboard the *USS Sulaco*.
- **Tech Stack:** Vite 6, React 19, TypeScript, Three.js, React Three Fiber (`@react-three/fiber`), `@react-three/drei`, `@react-three/xr` v6, Zustand 5, Vitest.
- **Platforms:**
  - **Meta Quest 2 & 3:** WebXR Immersive VR via Horizon OS TWA APK or Quest Browser.
  - **Desktop Web:** WASD locomotion, Pointer Lock mouse look, recoil recovery.
  - **Mobile PWA:** Dual virtual touch thumbsticks with install prompt.
- **Hardware Connected:** Meta Quest 2 (Serial `1WMHH831BS0504`) connected via ADB at `C:\RSL\platform-tools\adb.exe`.
- **Git Repo:** `https://github.com/steve-pritchard-83/aliens-survivor.git` (`main` branch).
- **Audit & Roadmap Scorecard:** Saved at `C:\Users\steve_tzmi3fh\.gemini\antigravity\brain\5a957c35-ad36-4bd3-98b3-b6b20c237f44\audit_and_roadmap.md` (Current verified score: **~76 / 100**, up from baseline 38/100).

---

## 2. Hard Non-Negotiable Rules & Constraints

You **MUST** respect the following architectural invariants at all times:

1. **Strict File Length Limit (`<= 250` LOC):**
   - **No source file in `src/**/*.{ts,tsx}` may exceed 250 lines.**
   - Do **NOT** pack or cram multiple statements onto single lines to beat this limit.
   - Extract cleanly into dedicated modules (e.g. types in `*Types.ts`, canvas draw helpers in `*Canvas.ts`, balance in `balance.ts`).
2. **Meta Quest 2 Mobile GPU Light Budget (Strictly `<= 4` Dynamic Lights):**
   - Forward rendering on the mobile Adreno 650 evaluates dynamic lights per fragment per eye.
   - Total point and spot lights in the entire scene must stay `<= 4`:
     1. Sector Key PointLight (`CorridorLevel.tsx`)
     2. Emergency Beacon PointLight (`CorridorLevel.tsx`)
     3. Pulse Rifle Flashlight SpotLight (`PulseRifle.tsx`)
     4. Momentary Rifle Muzzle PointLight (`PulseRifle.tsx`)
   - **Never dynamically mount/unmount lights at runtime** (causes a visible Three.js WebGL shader re-compilation hitch). Use `visible={false}` or `intensity = 0`.
3. **Zero Frame-Loop Allocations:**
   - Never call `new THREE.Vector3()`, `new THREE.Quaternion()`, or `.clone()` inside `useFrame` callbacks or frequent event handlers.
   - Declare scratch vectors at module scope with an underscore prefix (e.g. `_camPos`, `_hitVec`).
4. **Compressed 3D Asset Pipeline (Meshopt + WebP):**
   - All models in `public/models/` are pre-compressed with `npx @gltf-transform/cli optimize --compress meshopt --texture-compress webp` (reduced from 40.5 MB down to 6.3 MB).
   - `@react-three/drei`'s `useGLTF` automatically decodes Meshopt and Draco. Do not commit uncompressed 10MB+ raw GLBs.
5. **Centralized Data & Types:**
   - All balance constants, mission durations, damage values, weapon parameters, and upgrade catalogs reside in `src/data/balance.ts`.
   - Zustand state interfaces reside in `src/core/GameTypes.ts`.
6. **Automated Vitest Coverage:**
   - Always run `npm test` before committing. Ensure all test suites pass.

---

## 3. Directory Layout & Module Responsibilities

```
src/
├── core/
│   ├── AdaptiveQuality.tsx   # Dynamic foveation (1.0) & framebuffer scale (0.58-0.80) for 72 FPS
│   ├── AudioManager.ts       # 44 Web Audio sound effects with buffer caching & 3D spatial panning
│   ├── CombatEvents.ts       # Central raycast bus between weapons and enemy collision spheres
│   ├── CorridorNav.ts        # Sulaco figure-8 corridor bounding boxes, hall IDs & corner waypoints
│   ├── GameStore.ts          # Zustand store (tick, fireRound, reload, damage, XP, level, upgrades)
│   ├── GameTypes.ts          # State interfaces, threat structures, and WavePhase definitions
│   ├── Haptics.ts            # WebXR controller dual-frequency vibration pulses
│   ├── InputManager.ts       # Unified aggregator for Desktop, Touch PWA, and WebXR gamepad input
│   ├── Platform.ts           # Browser, Quest, and PWA detection utilities
│   ├── TrackerState.ts       # Canvas buffer reference for the M314 Motion Tracker display
│   ├── XRControllerState.ts  # Tracked 6DoF controller positions, rotations, and haptic actuators
│   └── XRStore.ts            # @react-three/xr store (72 FPS, foveation, custom local-floor init)
├── data/
│   └── balance.ts            # Single source of truth for game constants, phases, and 6 upgrade cards
├── entities/
│   ├── AdaptiveQuality.tsx   # Dynamic resolution controller
│   ├── AlienEggs.tsx         # Static Ovomorph egg hazards with frozen matrices
│   ├── BishopCompanion.tsx   # Autonomous synthetic companion with procedural walking & covering fire
│   ├── BishopRig.ts          # Procedural bone-rigging and inverse kinematics for Bishop
│   ├── CorridorAtmosphereFX.tsx # Ceiling electrical spark showers (additive particles)
│   ├── CorridorLevel.tsx     # Static figure-8 level geometry with matrixAutoUpdate=false
│   ├── MotionTracker.tsx     # 3D wrist-mounted CRT radar with 180°/360° sweep shader & audio pings
│   ├── PlayerController.tsx  # First-person character controller with corridor wall clamping
│   ├── PulseRifle.tsx        # M41A viewmodel with recoil, LED ammo readout, flashlight, and hitscan
│   ├── SmallAlienSpawner.tsx # Facehugger / Chestburster procedural crawling swarmers
│   ├── WallImpactFX.tsx      # Additive ricochet sparks and fading bullet hole decals
│   ├── XenomorphImpactFX.tsx # Acid blood droplet bursts, limb gibs, and melting acid floor pools
│   ├── XenomorphPool.tsx     # 6-slot object pool of Xenomorph Drones and Phase 3 Praetorian Boss
│   └── XenoTypes.ts          # Xenomorph pool interfaces, bone identifiers, and animation helpers
├── ui/
│   ├── DebugTelemetry.tsx    # Real-time ?debug=1 HUD (FPS, frame time, draw calls, triangles, memory)
│   ├── HUD.tsx               # 2D screen overlay for desktop/mobile (crosshair, health, touch sticks)
│   ├── LevelUpModal.tsx      # 2D tactical 3-card Field Promotion selection modal
│   ├── SettingsPanel.tsx     # 2D pause and accessibility modal
│   ├── VRAutoLauncher.tsx    # Auto-entry into WebXR on Quest launch
│   ├── VRHud.tsx             # 3D world-space floating UI (health, ammo, pause, level-up choices)
│   └── VRStatusCanvas.ts     # 2D canvas drawing routine for floating holographic VR panels
scripts/
└── compress-models.mjs       # gltf-transform optimization runner for all GLBs in public/models/
tests/
└── balance_and_store.test.ts # Vitest unit tests verifying corridor math, store state, XP, and weapons
```

---

## 4. Key Gameplay & Controls Mapping

### Meta Quest 2 / 3 Controllers
| Action | Right Hand Controller | Left Hand Controller |
|---|---|---|
| **Fire M41A Rifle** | Index Trigger (`buttons[0]`) | — |
| **Steady Aim / Grip** | Hand Grip (`buttons[1]`) | Hand Grip (`buttons[1]`) |
| **Reload (2.5s cycle)** | Button [A] (`buttons[4]`) | — |
| **Locomotion** | — | Left Thumbstick (Axes 0, 1) |
| **Turning** | Right Thumbstick (Snap / Smooth) | — |
| **Flashlight Toggle** | — | Button [X] (`buttons[4]`) |
| **Motion Tracker** | — | Look at Left Wrist (swaps if left-handed) |
| **Pause / Resume** | Button [B] (`buttons[5]`) OR Stick Click (`buttons[3]`) | Button [Y] (`buttons[5]`) OR Stick Click (`buttons[3]`) |

### In-VR Pause Menu Controls
When paused, a holographic panel appears 1.7m in front of the player:
- **Button [A]**: Cycle Snap Turn (`30° → 45° → 90° → Smooth Continuous`).
- **Button [X]**: Toggle Reduced Flash Mode (`ON / OFF`).
- **Squeeze [Grip]**: Toggle Handedness (`Right-Handed / Left-Handed`).
- **Pull Trigger OR Press [B]/[Y]**: Resume Mission.

---

## 5. Developer Cheat Sheet & Commands

### Running Development Server
```bash
npm run dev
```

### Running Automated Tests
```bash
npm test
```

### Building for Production
```bash
npm run build
```
*(Notice: PWA precache should remain under ~16 MB).*

### Enforcing the `<= 250` Line Rule
Run this snippet to check if any file exceeds 250 lines:
```bash
node -e "const fs = require('fs'), path = require('path'); function walk(d){let r=[];for(const f of fs.readdirSync(d)){const p=path.join(d,f);if(fs.statSync(p).isDirectory())r=r.concat(walk(p));else if(f.endsWith('.ts')||f.endsWith('.tsx'))r.push(p);}return r;} const bad=walk('src').map(f=>({f,l:fs.readFileSync(f,'utf8').split('\n').length})).filter(x=>x.l>250); console.log(bad.length?'VIOLATIONS:':'ALL OK (<= 250 lines)', bad);"
```

### Verifying Dynamic Light Count (`<= 4`)
```powershell
Select-String -Path src\**\*.tsx -Pattern "<pointLight|<spotLight|<directionalLight" | ForEach-Object { "$($_.Filename):$($_.LineNumber) $($_.Line.Trim())" }
```

### Deploying & Relaunching on Meta Quest 2 via ADB
```powershell
# Sideload / Relaunch PWA on Quest 2 (Serial: 1WMHH831BS0504)
& "C:\RSL\platform-tools\adb.exe" -s 1WMHH831BS0504 shell am force-stop app.vercel.aliens_survivor.twa
& "C:\RSL\platform-tools\adb.exe" -s 1WMHH831BS0504 shell am force-stop com.oculus.browser
& "C:\RSL\platform-tools\adb.exe" -s 1WMHH831BS0504 shell am start -n app.vercel.aliens_survivor.twa/.LauncherActivity
```

---

## 6. Known Gotchas & Historical Context

1. **Powershell Syntax:** When executing commands in this workspace environment, do NOT use `&&`. Use `;` or `; if ($LASTEXITCODE -eq 0) { ... }`.
2. **`@pmndrs/xr` Emulator Stub:** `@pmndrs/xr` contains large default 3D room environments that bloated the bundle by 6 MB. `vite.config.ts` aliases `/.*\/emulate\.js$/` to `/src/core/emulate-stub.js`. Keep this alias intact.
3. **Bullet Impact Light:** Never re-introduce dynamic point lights on bullet impacts or alien hits. Alien hits use a subtle white emissive flash (`0xffffff` @ 0.45) in `XenomorphPool.tsx` and particle sparks in `WallImpactFX.tsx`.
4. **Static Mesh Freezing:** `CorridorLevel.tsx` loops through static meshes and sets `child.matrixAutoUpdate = false` and `child.updateMatrix()`. If modifying corridor geometry, ensure world matrices are updated before disabling auto updates.

---

## 7. Open Roadmap Items (Recommended Next Priorities)

1. **Comfort Vignette (FOV Reduction):** Implement dynamic camera peripheral darkening during high-speed smooth turning for motion sickness reduction.
2. **Additional Weapons:** Smartgun with auto-tracking gimbal and flamethrower secondary fire.
3. **Audio Sliders in VR Menu:** Volume sliders for BGM, SFX, and Voice inside `VRStatusCanvas.ts`.
4. **Second Level / Colony Ops:** Expanding beyond the Sulaco into an LV-426 colony map using the existing `CorridorNav` pathing graph.
