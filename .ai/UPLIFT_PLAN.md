# Aliens Survivor — Uplift Execution Plan

> **Audience:** Claude Sonnet 5.5 (medium reasoning) acting as the implementing engineer.
> **Author:** Audit session, 25 Oct 2026, baseline commit `ffa46eb`. Audit score at baseline: **48 / 100**.
> **Goal:** Deliver every uplift in this file, phase by phase, with verified results.

Read this whole file once before starting. Then work **one task at a time**, in order.

---

## 0. Operating Rules (read first, obey always)

### 0.1 Environment
- Windows 11. Default shell is **PowerShell 5.1**: do **not** use `&&`. Chain with `;` or `; if ($LASTEXITCODE -eq 0) { ... }`. Git Bash is also available via the Bash tool.
- Node 22, npm. `ffmpeg` 9 is installed and on PATH.
- No Quest headset is available to you. You cannot verify VR behaviour by running it. For every VR-affecting task, add steps to the phase's **Manual Test Checklist** (see 0.5) so the user can verify on device.

### 0.2 Hard prohibitions
1. **Never `git push`, never open PRs, never deploy.** Pushing `main` triggers a Vercel production deploy. Commit locally only.
2. **Never rewrite git history** (no `rebase`, `reset --hard` on shared commits, `filter-repo`, LFS migration of history, force-anything).
3. **Never commit, print, or copy** `quest-build/android.keystore`, keystore passwords, or any `storePassword`/`keyPassword` values. Do not `cat` files that contain them; use `grep -l` to detect, not to display.
4. **Never add a 5th dynamic light**, and never mount/unmount lights at runtime (toggle `visible` / `intensity`).
5. **No allocations inside `useFrame`** or per-shot code: no `new THREE.*`, `.clone()`, array literals, spread, `.map/.filter` creating arrays per frame. Use module-scope scratch objects prefixed `_`.
6. **Do not change gameplay numbers** unless a task explicitly says so. When centralising constants, **the value currently used in code wins** over the value currently in `balance.ts`.
7. Do not start work on anything marked **USER DECISION** — stop and ask.

### 0.3 Workflow per task
1. Read every file you will touch **in full** before editing.
2. Make the change. Match surrounding style (single quotes, semicolons, 2-space indent, terse comments only where non-obvious).
3. Run the **Verification Gate** (0.4). Fix failures before moving on. Never skip or disable a failing test to get green — fix the cause or stop and report.
4. Commit with a Conventional Commit message referencing the task ID, e.g. `fix(combat): separate hit query from damage application [P0.1]`.
5. Tick the task in `.ai/UPLIFT_PROGRESS.md` with the commit hash and a one-line note (including anything skipped or deviated).

### 0.4 Verification Gate
Until task P1.1 creates `npm run verify`, run:
```powershell
npm test; if ($LASTEXITCODE -eq 0) { npm run build }
```
After P1.1, run:
```powershell
npm run verify
```
A task is complete only when the gate passes **and** the task's own acceptance criteria are met.

### 0.5 Phase boundaries
- Work on a local branch per phase: `uplift/p0-stabilise`, `uplift/p1-code-health`, etc., branched from the previous phase branch (or `main` for P0).
- At the end of each phase: run the gate, update the progress file, write the phase's **Manual Test Checklist** into `.ai/UPLIFT_PROGRESS.md`, then **stop and report to the user**. Wait for approval before starting the next phase. The user will merge and device-test.

### 0.6 When stuck
If an approach in this plan proves impossible (API doesn't exist, test can't be made deterministic, etc.): time-box to ~30 minutes of investigation, then stop and report what you tried and the options. Do not substitute a large redesign on your own.

---

## 1. Codebase Orientation (verified at `ffa46eb`)

- **Stack:** Vite 6, React 19, TS 5.7 (strict), three 0.174, R3F 9, drei 10, `@react-three/xr` 6.6 (wraps `@pmndrs/xr`), zustand 5, vitest 5.0.5.
- **Entry:** `src/main.tsx` → `src/App.tsx` (Canvas + XR + all entities).
- **State:** `src/core/GameStore.ts` (zustand), types in `src/core/GameTypes.ts`, constants in `src/data/balance.ts`.
- **Frame loop ownership:** `PlayerController` calls `store.tick()` every frame while `PLAYING`. Every entity has its own `useFrame`.
- **Combat bus:** `src/core/CombatEvents.ts` (`CombatSystem`). XenomorphPool registers the main handler, SmallAlienSpawner the aux handler, CorridorLevel the environment raycaster, WallImpactFX the wall-impact handler.
- **VR input:** read directly from `xrSession.inputSources` gamepads in `src/ui/VRHud.tsx`, pushed into `InputManager.setXRState`. Controller poses into `src/core/XRControllerState.ts`.
- **`camera.parent`** is the `XROrigin` group in VR; code relies on this.
- **Status machine:** `'MENU' | 'PLAYING' | 'PAUSED' | 'VICTORY' | 'DEFEAT' | 'LEVEL_UP'`.
- **Light budget (4):** CorridorLevel key point light, CorridorLevel beacon point light, PulseRifle spotlight, PulseRifle muzzle point light.
- **`vite.config.ts` alias** stubbing `@pmndrs/xr` `emulate.js` must remain.

---

## 2. Audit Findings Being Fixed (reference)

| ID | Severity | Finding |
|---|---|---|
| C1 | Critical | Touch auto-aim calls `CombatSystem.fireRay` as a probe; handlers apply damage inside the ray test, so the probe deals damage every frame (`PulseRifle.tsx` `checkAutoTarget`). |
| C2 | Critical | Damage applied before wall occlusion check → player and Bishop shoot through walls. |
| C3 | Critical | VR level-up auto-selects card 1 if trigger held (`VRHud.tsx` LEVEL_UP branch); card 3 unreachable. |
| C4 | Critical | `AdaptiveQuality` calls `gl.xr.setFramebufferScaleFactor` mid-session; three 0.174 ignores it while presenting. No-op. |
| C5 | Critical | Every level-up wipes all live aliens and teleports Bishop to spawn: XenomorphPool / SmallAlienSpawner / BishopCompanion reset when `status === 'PLAYING' && prevStatus !== 'PLAYING'`, and `LEVEL_UP` updates `prevStatus`. |
| H1 | High | Praetorian respawns endlessly in phases 3–4 (`isBoss = phase >= 3 && !pool.some(active boss)`). |
| H2 | High | AI/FX keep simulating during `LEVEL_UP` (only `PAUSED` is gated). |
| H3 | High | `balance.ts` not the source of truth; many hard-coded duplicates and drift (boss scale 0.62 vs 0.65, speed 3.1 vs 3.2); `BASE_DAMAGE`, `AP_DAMAGE`, `SMALL_KILL` unused. |
| H4 | High | Quest APK workflow `cd quest-build` but folder is gitignored; signing passwords live in `quest-build/app/build.gradle`; keystore only on one machine. |
| H5 | High | Environment raycast against full corridor meshes, no BVH, allocates per hit. |
| H6 | High | 250-line rule satisfied by cramming statements; corner-pathing duplicated 3×. |
| M* | Medium | Settings not persisted; record kills saved only on defeat and never shown; snap turn pivots around origin not head; room-scale head not clamped; haptics ignore handedness; VR auto-restarts after 9 s and has no menu; 8.7 MB WAV audio; no volume controls; no voice cap; per-frame canvas texture uploads; mandatory PWA install gate; empty `catch {}` everywhere; `noUnusedLocals: false`; zoom disabled in viewport; 2D/VR snap-angle option mismatch; doc drift (HANDOFF, CONTEXT, ASSET_MANIFEST, manifest.json "10-minute"). |
| L1 | Legal | Franchise IP + third-party assets publicly deployed with no attribution/licence. **USER DECISION** — you only document. |

---

## PHASE 0 — Stabilise (branch `uplift/p0-stabilise`)

### P0.0 Progress tracker
Create `.ai/UPLIFT_PROGRESS.md` with a checklist of every task ID in this plan (`- [ ] P0.1 …`), a "Deviations" section, and a "Manual Test Checklist" section per phase. Commit `chore: add uplift progress tracker [P0.0]`.

### P0.1 Mechanical reformat (behaviour-neutral)
**Why first:** many lines pack 3–10 statements; exact-match edits on them are error-prone. Formatting first makes every later task safer.
1. `npm i -D prettier@^3` (exact current 3.x).
2. Add `.prettierrc.json`: `{ "singleQuote": true, "semi": true, "printWidth": 120, "trailingComma": "none", "tabWidth": 2, "arrowParens": "always" }`.
3. Add `.prettierignore`: `dist`, `node_modules`, `public`, `assets`, `quest-build`, `package-lock.json`, `*.md`.
4. Add script `"format": "prettier --write src tests scripts"` and `"format:check": "prettier --check src tests scripts"`.
5. Run `npm run format`. **Change nothing else in this commit.**
6. Gate. Files will now exceed 250 lines — that is expected and temporary; P1.4 restores the limit. Record this in Deviations.

**Accept:** `git diff --stat` shows only whitespace/line-break changes (spot-check 3 files with `git diff -w --stat` → near-zero). Tests + build pass.

### P0.2 Run identity instead of status-edge resets (fixes C5, prerequisite for H2)
1. Add `runId: number` to `GameState` (init `0`). `startGame` sets `runId: get().runId + 1`.
2. Add to `GameTypes.ts`:
   ```ts
   export function isSimulationFrozen(status: GameStatus): boolean {
     return status === 'PAUSED' || status === 'LEVEL_UP';
   }
   ```
3. In **XenomorphPool, SmallAlienSpawner, BishopCompanion**: replace the `prevStatus !== 'PLAYING'` reset logic with a `lastRunIdRef` (BishopCompanion: field on its `stateRef`). Reset when `state.runId !== lastRunIdRef.current`, then store the new id. Remove the old `prevStatus` refs from these three files.
4. At the top of each of those `useFrame`s (after reading state) replace `if (status === 'PAUSED') return` with `if (isSimulationFrozen(state.status)) return`. Keep the reset check **before** the frozen check only if needed for correctness — reset must happen on the first PLAYING frame of a new run.
5. Apply `isSimulationFrozen` also in: `CorridorAtmosphereFX`, `WallImpactFX`, `XenomorphImpactFX`, `CorridorLevel` (beacon rotation), `MotionTracker` (keep the existing DEFEAT branch first). Read each file to find its frame loop.
6. Tests (`tests/run_lifecycle.test.ts`): `startGame` increments `runId`; `isSimulationFrozen` truth table for all 6 statuses.

**Accept:** No file references `prevStatus` except `HUD.tsx` and `PlayerController.tsx` (UI edge detection, leave them). Gate passes.

### P0.3 Separate hit query from damage (fixes C1, C2)
Rewrite `src/core/CombatEvents.ts` around **target providers** that answer queries without side effects.

```ts
export type TargetKind = 'xeno' | 'small';
export interface DamageSpec { amount: number; source: 'player' | 'bishop'; }
export interface TargetQueryOut { id: number; point: THREE.Vector3; }
export interface TargetProvider {
  /** Pure: returns distance to the nearest target hit (≤ maxDist) or Infinity; on hit writes id + point into `out`. No side effects. */
  query(origin: THREE.Vector3, dir: THREE.Vector3, maxDist: number, out: TargetQueryOut): number;
  applyHit(id: number, point: THREE.Vector3, origin: THREE.Vector3, dir: THREE.Vector3, dmg: DamageSpec): void;
}
export type ShotOutcome =
  | { kind: 'none' }
  | { kind: 'wall'; point: THREE.Vector3; normal: THREE.Vector3 }
  | { kind: 'target'; target: TargetKind; id: number; point: THREE.Vector3 };
```
- `CombatSystem.registerProvider(kind, provider)` / `unregisterProvider(kind)` replace `registerHandler`/`registerAuxHandler`.
- `CombatSystem.queryTarget(origin, dir, maxDist)` → nearest target hit across providers, **no side effects**, and **wall-occluded**: compute env hit distance via the env raycaster; return `null` if the wall is nearer.
- `CombatSystem.resolveShot(origin, dir, dmg)` → runs the same query; if a target is nearest, calls `applyHit` on that provider and returns `target`; else if a wall was hit calls `triggerWallImpact` and returns `wall`; else `none`.
- **Zero allocation:** `queryTarget`/`resolveShot` return objects owned by `CombatSystem` (module-scope mutable results, reused per call; the union above may be implemented as one mutable object with a `kind` field). Each provider gets its own module-scope `TargetQueryOut`. Document in a one-line comment that callers must copy fields they keep.
- **XenomorphPool:** split the current handler into `query` (sphere tests only) and `applyHit` (everything else: HP, flash, knockback, sever, sounds, kill). `applyHit` uses `dmg.amount`; keep the existing SPAWNING (18 vs 24) and boss (×0.65) multipliers inside `applyHit` for now (P1.2 moves them to balance).
- **SmallAlienSpawner:** same split. Keep flat 30 damage for now (ignore `dmg.amount`, note it — P1.2 resolves).
- **PulseRifle:**
  - `checkAutoTarget` uses `CombatSystem.queryTarget` (no side effects). Remove its separate env-ray logic where `queryTarget` now covers occlusion; keep the cone/LOS fallback loop.
  - Firing uses `CombatSystem.resolveShot(origin, dir, { amount: weaponDamage, source: 'player' })` where `weaponDamage = activeUpgrades.includes('ap_ammo') ? 24 * 1.4 : 24` (move the AP check out of XenomorphPool). Call `state.registerHit()` only when outcome is `target`. Ricochet sound only on `wall`.
- **BishopCompanion:** use `resolveShot(..., { amount: 24, source: 'bishop' })`. Bishop never benefits from `ap_ammo`.
- **Tests** (`tests/combat.test.ts`): register fake providers and a fake env raycaster; assert (a) `queryTarget` never calls `applyHit`; (b) wall nearer than target → `wall` outcome, `applyHit` not called; (c) target nearer → `applyHit` called once with given damage; (d) nearest of two providers wins.

**Accept:** `grep -rn "fireRay\|registerAuxHandler\|registerHandler" src` returns nothing. Gate passes. Add to P0 manual checklist: "Mobile: aim at a drone without touching fire — it must not die faster than sustained fire would kill it; desktop: shoot a drone standing behind a corridor corner — no damage, ricochet sparks on wall."

### P0.4 Boss once per phase (fixes H1)
- In XenomorphPool keep a `bossSpawnedPhaseRef` (`Set<number>` created once in `useRef`, cleared on new `runId`).
- `isBoss = phase >= 3 && !bossSpawnedPhase.has(phase) && !pool.some(active boss)`. On boss spawn, add the phase.
- Result: at most one Praetorian in phase 3 and one in phase 4.
- Extract the decision into a pure function `shouldSpawnBoss(phase, spawnedPhases, bossAlive)` in a new `src/systems/waveDirector.ts` and unit test it.

### P0.5 VR level-up selection (fixes C3)
1. Add `src/ui/VRMenuNav.ts`: a small class with edge-detected inputs, zero allocation:
   - `update(dt, stickX, stickY, triggerPressed)`; exposes `consumeLeft()`, `consumeRight()`, `consumeUp()`, `consumeDown()`, `consumeConfirm()`.
   - Stick threshold 0.65 press / 0.25 release (same as snap turn). Confirm fires on trigger **press edge** only.
   - `arm(delaySeconds)`: ignore all input until delay elapsed **and** trigger has been observed released at least once.
2. In `VRHud.tsx`, when status becomes `LEVEL_UP` (edge), call `nav.arm(0.6)` and set `selectedIndexRef = 0`. Each frame: right stick X (either hand's stick is acceptable — use right) moves selection left/right across `offeredUpgrades`; confirm picks `offeredUpgrades[selectedIndex]`. Remove the `firing → [0]` / `anyButton → [1]` logic.
3. Pass `selectedIndex` to `drawVRStatusPanel` and draw a clear highlight (border + brighter fill) on the selected card. Render all offered cards (up to 3). Footer text: `◀ ▶ SELECT  //  TRIGGER CONFIRM`.
4. Desktop `LevelUpModal`: also accept keys `1`/`2`/`3` (keydown listener in a `useEffect`, only while status is LEVEL_UP).
5. Unit test `VRMenuNav` (pure TS, no three): arming blocks input; held trigger at arm time does not confirm; release-then-press confirms once.

### P0.6 Adaptive quality that actually works (fixes C4)
1. **Initial scale at session start:** in `XRStore.ts` set `frameBufferScaling` to a function using UA detection from `Platform`: Quest 3 / 3S (`/Quest 3/i`) → `0.85`; otherwise (Quest 2 / unknown) → `0.72`. Type is `number | ((max: number) => number | undefined)` — clamp to `max`.
2. **Runtime tiers:** create `src/core/QualityState.ts`: `export const quality = { tier: 2 }` (2 = high, 1 = medium, 0 = low) plus `setTier(n)` and a listener set. Rewrite `AdaptiveQuality.tsx` to:
   - Measure FPS over 1.2 s windows (keep current approach).
   - Drop one tier after **2 consecutive** windows below 66 fps; raise one tier after **5 consecutive** windows ≥ 71.5 fps. Never call `setFramebufferScaleFactor`.
   - Remove the foveation call (already set by store).
3. **Consumers** (read `quality.tier` inside `useFrame`; never mount/unmount):
   - `CorridorAtmosphereFX`: tier 0 → skip new spark bursts.
   - `WallImpactFX`: tier ≤1 → halve sparks per impact; tier 0 → no new decals.
   - `XenomorphImpactFX`: tier 0 → halve droplet count per impact.
   - `AlienEggs`: tier 0 → group `visible = false`.
   Read each component first and implement the cheapest equivalent if names differ.
4. Replace the empty `catch {}` blocks in AdaptiveQuality with `catch (e) { console.warn('[AdaptiveQuality]', e); }`.
5. `DebugTelemetry`: show current tier.

**Accept:** `grep -rn setFramebufferScaleFactor src` returns nothing. Manual checklist: "Quest: `?debug=1`, fight in phase 4 — tier drops when FPS < 66 and recovers."

### P0.7 Records and settings persistence
1. Create `src/core/Persistence.ts`:
   - `loadSettings(): GameSettings` / `saveSettings(s)` using key `uscm_settings_v1`.
   - Validate every field's type and fall back to defaults per field. Wrap storage access in try/catch with `console.warn`.
   - Also `loadRecordKills`/`saveRecordKills` (move from GameStore).
2. Store: initial `settings: loadSettings()`; `updateSettings` saves. Save record kills on **both** DEFEAT (existing) and VICTORY (in `tick` when transitioning). Update `recordKills` in state when a new record is set.
3. Show "BEST: N KILLS" on the 2D MENU/DEFEAT screen and on the VR DEFEAT/VICTORY panel.
4. Tests: use `vi.stubGlobal('localStorage', ...)` with an in-memory implementation; corrupted JSON → defaults; victory saves record.

### P0.8 Phase 0 close
Gate, update progress + manual checklist (VR level-up, boss count, aliens persist through level-up, Bishop doesn't teleport, settings survive reload, record shows). Stop and report.

---

## PHASE 1 — Code Health & Data Integrity (branch `uplift/p1-code-health`)

### P1.1 Lint + verify pipeline
1. Install (latest compatible): `eslint@^9`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `@stylistic/eslint-plugin`, `eslint-config-prettier`.
2. `eslint.config.js` (flat config) for `src/**/*.{ts,tsx}` and `tests/**/*.ts`:
   - `@eslint/js` recommended, `typescript-eslint` recommended, `react-hooks` recommended, `eslint-config-prettier` last.
   - `max-lines: ['error', { max: 250, skipBlankLines: true, skipComments: true }]` for `src/**` (warn until P1.4 is done, then switch to error).
   - `@stylistic/max-statements-per-line: ['error', { max: 1 }]`
   - `no-empty: ['error', { allowEmptyCatch: false }]`
   - `@typescript-eslint/no-explicit-any: 'error'` (allow with inline disable + reason comment).
   - `@typescript-eslint/no-unused-vars: ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]` — note module-scope scratch objects start with `_`, so this pattern is required.
3. `tsconfig.app.json`: `noUnusedLocals: true`, `noUnusedParameters: true`. Fix resulting errors (e.g. unused `FIRE_INTERVAL` and `spotLightRef` in PulseRifle).
4. Replace every empty `catch {}` and generic `catch { /* ignore */ }`:
   - Storage / vibrate / haptics failures (expected on some browsers) → stay silent, but the comment must say why, e.g. `catch { /* localStorage blocked (private mode): non-fatal */ }`. ESLint `no-empty` accepts blocks containing a comment.
   - three / XR / audio-decode failures → `console.warn('[ModuleName]', e)`.
   - `.catch(() => {})` on promises → same two rules.
5. Scripts: `"lint": "eslint ."`, `"typecheck": "tsc -b"`, `"verify": "npm run lint && npm run format:check && npm run typecheck && npm test && npm run build && node scripts/check-budgets.mjs"` (`&&` is fine inside npm scripts). Create `scripts/check-budgets.mjs` as a stub that exits 0 now (filled in P2.5).
6. CI (`ci.yml`): replace the test/build steps with `npm run verify`.

### P1.2 Single source of truth for balance (fixes H3)
Restructure `src/data/balance.ts`. Add (values = what the code uses **today**):
```ts
WEAPON: { ..., BASE_DAMAGE: 24, AP_MULTIPLIER: 1.4, SPAWNING_TARGET_DAMAGE_SCALE: 0.75 /* 18/24 */, SPREAD_PER_SEC: 0.007, SPREAD_MAX: 0.03, MAX_RANGE: 32 },
BISHOP: { DAMAGE: 24, FIRE_INTERVAL_MIN: 0.24, FIRE_INTERVAL_JITTER: 0.12, ENGAGE_RANGE: 22, FOLLOW_SPEED: 4.15, CATCHUP_SPEED: 5.2 },
XENO: { MAX_CONCURRENT: 2, SCALE: 0.45, LEAP_DAMAGE: 38, SLASH_DAMAGE: 34, SLASH_INTERVAL: 1.15, LEAP_MIN: 3.2, LEAP_MAX: 8.5, ATTACK_RANGE: 1.75, FIRST_SPAWN_DELAY: 5.0 },
PRAETORIAN: { HP: 1100, SPEED: 3.1, SCALE: 0.62, DAMAGE_TAKEN_MULT: 0.65 },
SMALL: { FACEHUGGER_HP: 72, CHESTBURSTER_HP: 96, DAMAGE_PER_HIT: 30, LEAP_DAMAGE: 26, BITE_DAMAGE: 22, FIRST_SPAWN_DELAY: 7.0 },
PLAYER: { ..., MOVE_SPEED: 4.2 },
```
- Remove the now-wrong `PRAETORIAN.SCALE 0.65 / SPEED 3.2 / DAMAGE_RESISTANCE`, `AP_DAMAGE`.
- Replace every hard-coded copy in XenomorphPool, SmallAlienSpawner, BishopCompanion, PulseRifle, PlayerController, GameStore with `BALANCE.*`. The phase-indexed ternaries become `BALANCE.XENO_POOL.SPAWN_INTERVALS[phase - 1]` etc.
- Upgrade effects: add `UPGRADE_EFFECTS` (e.g. `armor_boost: { maxHpBonus: 50 }`, `acid_proofing: { acidDamageMult: 0.5 }`, `tracker_gain: { trackerRange: 42 }`) and use them in GameStore/MotionTracker. Also move tracker base range 25 to balance.
- **Intentional behaviour change (the only one in P1):** `registerKill(kind: 'drone' | 'small' | 'boss')`; small kills award `BALANCE.XP.SMALL_KILL` (15). Update call sites and tests. Note it in `CHANGELOG.md` (create it now with an "Unreleased" section).
- Small aliens: keep taking `SMALL.DAMAGE_PER_HIT` regardless of `dmg.amount` (preserves behaviour; AP rounds do not affect them). Record this in Deviations as a balance question for the user; do not add TODO comments.
- Tests: cover upgrade effects and damage maths through the pure functions created in P1.3 (write those tests in P1.3).

**Accept:** `grep -rnE "\b(1100|0\.62|38|34|26|22)\b" src/entities` shows no combat constants (inspect manually; geometry numbers may legitimately remain).

### P1.3 Extract shared pure systems
Create `src/systems/` (pure TS, no React, no three where avoidable; three math types are OK):
1. `corridorPathing.ts`: `chooseEntryCorner(hall, fromX, fromZ, goalX, goalZ): number` and `nextCorner(current, goalHall, goalX, goalZ): number` — the logic duplicated in XenomorphPool, SmallAlienSpawner, BishopCompanion. Replace all three copies. Use loops, not `reduce`, and no allocations.
2. `combatMath.ts`: `computeShotDamage(base, hasAp, targetState, isBoss)` and `applyIncomingDamage(amount, isAcid, upgrades)`.
3. `waveDirector.ts` (exists from P0.4): add `spawnInterval(phase)`, `droneStats(phase)`, `pickSpawnNode(...)` (wrap existing visibility filter; make it allocation-free with a reused index buffer).
4. Unit tests for each (`tests/systems/*.test.ts`): pathing picks the shorter corner route for each of the 5 halls; damage maths with/without AP and boss; spawn interval per phase.
5. `CorridorNav.constrainToCorridor`: hoist the `halls` table to a module constant computed per distinct margin (cache by margin in a small `Map<number, Float32Array>`), and add `constrainToCorridorInto(x, z, margin, out: { x: number; z: number })`. Migrate per-frame callers to the `Into` variant; keep the tuple version for tests/back-compat.

### P1.4 Restore the 250-line limit honestly (fixes H6)
Switch `max-lines` to `error`. Split every violating file along responsibility lines. Suggested splits (adjust after reading):
- `XenomorphPool.tsx` → `XenomorphPool.tsx` (component, pool build, provider registration), `xeno/xenoAI.ts` (per-state update functions taking a context object), `xeno/xenoDamage.ts` (applyHit body, sever logic), `xeno/xenoDeath.ts` (melt animation).
- `SmallAlienSpawner.tsx` → component + `small/smallAI.ts` + `small/smallDamage.ts`.
- `PulseRifle.tsx` → component + `rifle/rifleFiring.ts` (fire/jam/reload staging) + `rifle/rifleViewmodel.ts` (recoil/sway/reload pose maths) + `rifle/autoTarget.ts`.
- `HUD.tsx` → `HUD.tsx` + `ui/TouchControls.tsx` + `ui/MainMenu.tsx` + `ui/VictoryScreen.tsx` + `ui/PwaInstallPrompt.tsx` + `ui/styles.ts` (shared style objects).
- `VRHud.tsx` → `VRHud.tsx` + `ui/vrInput.ts` (gamepad polling → a reused snapshot object) + `ui/vrPanels.ts`.
- `InputManager.ts`, `AudioManager.ts`, `PlayerController.tsx`, impact FX, etc. as needed.
Rules: no behaviour change; no new per-frame allocations (pass reused context objects). One commit per file split.

### P1.5 Environment raycast with BVH (fixes H5)
1. `npm i three-mesh-bvh@^0.9` (peer `three >= 0.159` — compatible).
2. In `CorridorLevel.tsx` after `trimSectorWalls`, call `geometry.computeBoundsTree()` on every corridor mesh geometry; set `mesh.raycast = acceleratedRaycast`. Use a module-scope `Raycaster` with `firstHitOnly = true`. Dispose bounds trees on unmount (`disposeBoundsTree`).
3. Make the env raycaster allocation-free: reuse a module-scope intersections array (`raycaster.intersectObjects(meshes, false, _hits)` then `_hits.length = 0` before each call), and write point/normal into module-scope vectors (no `.clone()`, no `new Vector3` fallback).
4. Build the corridor mesh list once on mount, not lazily inside the raycaster.

**Accept:** Manual checklist: "`?debug=1` frame time while firing continuously in phase 4 is not worse than before (record numbers)."

### P1.6 Audio rework
1. **Buses:** in `AudioManager` create `masterGain → destination`, `sfxGain → masterGain`. All SFX connect to `sfxGain`. BGM element volume = `0.32 * music * master`. Add `setVolumes({ master, music, sfx })` (0–1).
2. **Voice cap:** max 24 concurrent sources in `activeSources`; when exceeded, skip new **non-critical** sounds (everything except `pulse_shot*`, `marine_pain`, `marine_death`, `defeat`, `ui_beep`).
3. **Cheaper spatialisation:** keep `HRTF` for `xeno_attack`, `xeno_hiss*`, `xeno_sprint`, `vent_clang`, `small_screech*`; use `equalpower` for the rest.
4. **Compression:** create `scripts/compress-audio.mjs` that converts `public/audio/*.wav` → `.m4a` (AAC, `-c:a aac -b:a 96k -ac 1` for SFX) with ffmpeg via `child_process.execFileSync` (array args, no shell string). **Exclude** latency-critical files that must keep sample-accurate starts: `sfx_pulse*.wav`, `sfx_pulse_tail.wav`, `sfx_empty.wav`, `sfx_tracker_ping.wav`, `sfx_ui_beep.wav`. Move converted originals to `assets/audio-src/` (not served). Update `SOUND_URLS`. Add `m4a` to workbox `globPatterns` and `includeAssets`.
5. Report precache size before/after in the commit message body (from the build output).

**Accept:** precache ≤ 11 MB. Manual checklist: listen for clipped starts on converted sounds (Quest + iOS Safari).

### P1.7 Canvas texture update throttling
- `MotionTracker`: redraw canvas + `needsUpdate` at 20 Hz (accumulator), except the DEFEAT screen (draw once on entry).
- `VRHud`: wrist texture `needsUpdate` only when MotionTracker redrew (expose a `trackerCanvasState.version` counter and compare). Status panel: redraw only when its inputs change or at 10 Hz for the pulse animation.

### P1.8 Code splitting
- `vite.config.ts` `build.rollupOptions.output.manualChunks`: `three` (three, three-stdlib, three-mesh-bvh), `r3f` (@react-three/fiber, drei), `xr` (@react-three/xr, @pmndrs/*), `react` (react, react-dom, scheduler).
- `DebugTelemetry`: `React.lazy` + render only when `?debug=1`.
- Keep the emulate alias intact.

**Accept:** no chunk > 900 kB minified; app works in `npm run preview` (click through menu → play → pause → resume).

### P1.9 Phase 1 close
Gate, checklist, stop and report.

---

## PHASE 2 — Tests & Quality Gates (branch `uplift/p2-quality`)

### P2.1 Pure AI step functions
Ensure the AI state machines split in P1.4 are pure enough to test: `stepXeno(x: XenoSim, ctx: XenoCtx, dt): void` mutating a plain sim object, emitting events into a reused event buffer (`{ type: 'attack' | 'leap' | 'sound', ... }`) that the component consumes for audio/animation. Same for small aliens. Components become adapters (sim → Object3D, events → AudioManager/playClip).
Do this incrementally; keep behaviour identical. If a full extraction becomes too invasive, extract the decision functions (state transitions, target selection) and test those — record the scope in Deviations.

### P2.2 Unit test suite
Target files under `tests/`:
- `combat.test.ts` (from P0.3), `waveDirector.test.ts`, `corridorPathing.test.ts`, `combatMath.test.ts`
- `xenoAI.test.ts`: pursuing→leaping thresholds, attack cooldown damage cadence, severed legs → walk & no leap, death timer deactivates.
- `smallAI.test.ts`: same pattern.
- `store.test.ts` (expand current): pause/resume rules, LEVEL_UP flow, multi-level XP edge (boss kill crossing two thresholds — current code levels once per kill; assert current behaviour), upgrade effects from `UPGRADE_EFFECTS`, jam/reload.
- `inputManager.test.ts`: diagonal normalisation, look clamp, snapshot consumption resets deltas (instantiate the controller class — export the class in addition to the singleton).
- `persistence.test.ts`, `vrMenuNav.test.ts`.

### P2.3 Coverage gate
- `npm i -D @vitest/coverage-v8@5.0.5` (must equal vitest version).
- `vitest.config.ts` (or `test` block in vite config): coverage `include: ['src/core/**', 'src/data/**', 'src/systems/**', 'src/**/xeno/*.ts', 'src/**/small/*.ts']`, exclude `.tsx` and three-heavy adapters; thresholds lines/functions 60, branches 50.
- Script `"test:coverage": "vitest run --coverage"`; `verify` uses it instead of `npm test`.

### P2.4 Browser smoke test (Playwright)
1. `npm i -D @playwright/test`; `npx playwright install chromium`.
2. Test-only hook: in `main.tsx`, when `import.meta.env.DEV || new URLSearchParams(location.search).has('e2e')`, set `(window as any).__game = useGameStore` (typed via a `declare global`).
3. `playwright.config.ts`: `webServer: { command: 'npm run build && npm run preview -- --port 4173', port: 4173 }`, chromium with `launchOptions.args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']`.
4. `e2e/smoke.spec.ts`: open `/?e2e=1`; collect `pageerror` events; click **INITIATE COMBAT DROP**; wait until `__game.getState().status === 'PLAYING'`; wait 3 s; assert `timeRemaining < 300`, a `<canvas>` exists, zero page errors. Then press `P` → status `PAUSED`.
5. Script `"e2e": "playwright test"`. Add a separate CI job (not inside `verify`) running e2e.

### P2.5 Budgets
Fill `scripts/check-budgets.mjs`:
- Largest JS chunk in `dist/assets` ≤ 900 kB; total JS ≤ 1.6 MB.
- Sum of files matching the workbox globPatterns in `dist` ≤ 11 MB.
- Light count: scan `src/**/*.tsx` for `<pointLight`, `<spotLight`, `<directionalLight`, `new THREE.PointLight|SpotLight|DirectionalLight` → total ≤ 4.
- Print a table; exit 1 on any breach.

### P2.6 Optional (time-box 2 h): WebXR input via IWER
Install `iwer`. Behind `?iwer=1` only, dynamically import IWER in `main.tsx` before rendering, install a Quest 3 device, and add one Playwright spec that enters VR, simulates a right-trigger press during LEVEL_UP and asserts the selection rules from P0.5. If it can't be made to work within the time box, remove the dependency and record in Deviations.

### P2.7 Phase 2 close
Gate (now including coverage + budgets), CI file updated, checklist, stop and report.

---

## PHASE 3 — UX, Comfort, Accessibility (branch `uplift/p3-ux`)

### P3.1 Settings model expansion
Extend `GameSettings` (+ Persistence validation/defaults):
`masterVolume 1, musicVolume 0.8, sfxVolume 1, vignette: 'off'|'low'|'high' = 'low', mouseSensitivity 1 (0.3–3), invertY false, showHud2D true, seatedMode false`.
Shared constant `SNAP_ANGLE_OPTIONS = [Math.PI/6, Math.PI/4, Math.PI/2, 0]` used by **both** 2D SettingsPanel and VR menu. Wire volumes to `AudioManager.setVolumes` via a store subscription in `App.tsx` (`useEffect` + `useGameStore.subscribe`).

### P3.2 2D settings panel
Add sliders (`<input type="range">`) for the 3 volumes and mouse sensitivity, toggles for invert Y, vignette (3-way), 2D HUD. Use the shared style objects from P1.4. Labels must be real `<label htmlFor>` elements; buttons keyboard-focusable; visible focus outline. InputManager applies `mouseSensitivity` and `invertY`.

### P3.3 VR pause menu rework
Replace the A/X/grip toggles with a row-based menu driven by `VRMenuNav`:
rows: Resume · Snap Turn · Vignette · Reduced Flash · Handedness · Master · Music · SFX · Seated Mode.
Stick up/down selects row; left/right changes value; trigger on **Resume** resumes; B/Y still resumes. Draw in `VRStatusCanvas` with selection highlight. Arm the nav (0.4 s) on entering PAUSED. Update HANDOFF controls table in P4.

### P3.4 Comfort vignette
- New `src/entities/ComfortVignette.tsx`, rendered only in XR session. A head-locked plane (or ring) positioned each frame 0.3 m in front of the camera (same pattern as VRHud status panel), `depthTest: false`, `renderOrder: 999`, a small fragment shader (`ShaderMaterial`) with radial alpha: transparent centre, black edges; uniform `uStrength`.
- Strength target = `max(turnRate/2.2, moveMagnitude * 0.6)` × (`low` 0.6, `high` 1.0, `off` 0); lerp up fast (dt*8), down slow (dt*3). Snap turns: brief 120 ms pulse at full strength.
- Turn rate and move magnitude come from `InputManager` snapshot (add fields to snapshot if missing).
- Zero allocations; the mesh is always mounted, `visible = strength > 0.01`.

### P3.5 Head-centred snap turn and room-scale clamp
In `PlayerController` XR branch:
1. **Snap/smooth turn about the head:** before rotating the origin, get head world position `_headBefore`; apply rotation to `camera.parent`; `updateMatrixWorld`; get head world position `_headAfter`; translate origin by `_headBefore - _headAfter` (XZ only).
2. **Locomotion + clamp on head position:** compute head world XZ; apply locomotion delta to the origin; recompute head XZ; clamp head XZ via `constrainToCorridorInto(..., margin 0.15)`; shift origin by the clamp delta. This pushes the player back when walking physically into walls.
3. **Player position = head:** call `updatePlayerTransform` with head XZ (not origin) so aliens, Bishop, tracker and audio listener use the head.
4. **Seated mode:** if `seatedMode`, add +0.45 m to origin Y (configurable constant in balance `PLAYER.SEATED_HEIGHT_OFFSET`).
Manual checklist: walk physically into a wall → view is pushed back; snap turn does not swing position.

### P3.6 Haptics follow handedness
Add `leftHanded` to `xrControllerState` (set from settings in VRHud each frame). Change Haptics to semantic hands: `'weapon' | 'tracker' | 'both'`, resolved to physical left/right via `leftHanded`. Update all callers.

### P3.7 VR menu and end screens
- After entering VR via `VRAutoLauncher`, **do not** auto-start the mission. Show a MENU panel ("ALIENS SURVIVOR — PULL TRIGGER TO DEPLOY", best kills, snap/handedness quick hints). Start on armed trigger press. Audio unlock still happens on session entry.
- DEFEAT/VICTORY: remove the 9 s auto-restart. Show stats + best; "TRIGGER: REDEPLOY" armed after 1.5 s.
- `session` `end` event: if status PLAYING → `pauseGame()` and pause audio.
- `visibilitychange` → only auto-resume if *it* caused the pause (track a `pausedByVisibilityRef`), and pause/resume BGM + klaxon consistently.

### P3.8 Optional PWA install prompt
Replace the blocking "PWA INSTALLATION MANDATORY" overlay with a dismissible prompt: primary "PLAY IN BROWSER", secondary "INSTALL APP". Platform-aware instructions: iOS Safari (Share → Add to Home Screen); Android with `deferredPrompt` → native prompt; Android without → "Browser menu → Install app". Remember dismissal in localStorage (not sessionStorage). Remove the "TRIGGER / LAUNCH INSTALLED PWA" redirect button.

### P3.9 Desktop/touch HUD and viewport
- Optional 2D HUD strip (when `showHud2D` and not in XR): HP bar, ammo `NN / MM` (+ RELOADING/JAMMED), timer, phase name. Subscribe with selectors that change ≤ 10 Hz (round values in the selector, e.g. `Math.ceil(hp)`, `Math.floor(timeRemaining)`) to avoid 60 Hz re-renders.
- `index.html`: remove `maximum-scale=1.0, user-scalable=no`; add `touch-action: none` to the game container and touch zones so pinch/double-tap doesn't zoom during play.
- Fix `public/manifest.json` description to "5-minute".

### P3.10 Phase 3 close
Gate, checklist (vignette, menus, clamp, haptics, PWA prompt on Android + iOS, volumes persist), stop and report.

---

## PHASE 4 — Documentation & Governance (branch `uplift/p4-docs`)

### P4.1 HANDOFF rewrite
- Move device serial, ADB path and machine-specific commands to `HANDOFF.local.md` and add it to `.gitignore`. (History still contains the serial — do **not** rewrite history; mention this to the user.)
- Remove the `.gemini` audit link and the "76/100" claim; link `docs/AUDIT.md`.
- Regenerate the directory map from the actual tree (`git ls-files src`), one-line purpose each.
- Rules section: replace the line-count snippet and light-count PowerShell with `npm run verify` (lint enforces lines/statements; budgets script enforces lights).
- Controls tables: update for P0.5 level-up, P3.3 VR menu, P3.7 VR start/end flows.
- Add "Verified at commit <hash>" to the header.

### P4.2 Other docs
- `docs/AUDIT.md`: copy Section 2 of this plan plus the original scorecard (48/100) and a "post-uplift" re-score table you fill honestly from evidence (tests, budgets, what's verified on device vs not).
- `.ai/CONTEXT.md`: phase timings must reference `balance.ts` rather than restating numbers; remove "health bar" claim unless P3.9 added it; reflect new `src/systems/` layout.
- `.ai/CONVENTIONS.md`: add lint/format/verify rules, `systems/` purity rule, `isSimulationFrozen`, runId reset pattern, CombatSystem query vs resolve rule.
- `.ai/ASSET_MANIFEST.md`: actual compressed sizes (`ls -l public/models`), audio format change.
- `docs/adr/0001-light-budget.md`, `0002-object-pooling.md`, `0003-emulate-stub-alias.md`, `0004-asset-compression.md`, `0005-combat-query-resolve.md`, `0006-adaptive-quality-tiers.md` — Context / Decision / Consequences, ≤ 40 lines each.
- `CHANGELOG.md`: fill "Unreleased" with all user-visible changes.
- `README.md`: features list accurate; add Scripts table (`dev`, `verify`, `e2e`, `format`).

### P4.3 Credits scaffold (no legal conclusions)
- Write `scripts/list-asset-metadata.mjs` that reads each `public/models/*.glb` JSON chunk and prints `asset.copyright`, `asset.generator`, `asset.extras` (Sketchfab exports usually include author/licence there).
- Create `CREDITS.md` from that output: one row per asset (models, font, audio, video) with columns Asset · Source/Author · Licence · Notes. Use "UNKNOWN — needs owner confirmation" where not determinable. Do not guess.
- Create `docs/IP_REVIEW.md` listing franchise elements in use (names, characters, ship, corporation, weapons, video clip) as a neutral inventory for the user. **No recommendation beyond "requires owner decision".**

### P4.4 Repository hygiene (safe parts only)
- Remove byte-identical duplicates from `assets/` only if `public/` holds the same bytes (compare SHA-256): `assets/movies/victory.mp4`, `assets/fonts/AlienLeagueRegular-9D3Z.otf` vs `public/fonts/AlienLeague.otf`. If hashes differ, leave both.
- **USER DECISION (do not do):** moving `assets/` (68 MB) to Git LFS or external storage.

### P4.5 Quest APK pipeline (fixes H4) — partially USER DECISION
1. View the signing section of `quest-build/app/build.gradle` **only with passwords masked** (Git Bash):
   `grep -n -A 12 "signingConfigs" quest-build/app/build.gradle | sed -E "s/(Password[^=]*=?[[:space:]]*).*/\1****/"`
   Never open this file with the Read tool or `cat` until step 2 is done (the Edit tool requires a prior Read, so do **not** use Edit for step 2).
2. Replace the secret lines in place with `sed -i -E` in Git Bash so values are never displayed, e.g.
   `sed -i -E 's/^([[:space:]]*)storePassword[[:space:]].*/\1storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD") ?: ""/' quest-build/app/build.gradle`
   and likewise `keyPassword` → `ANDROID_KEY_PASSWORD`, `keyAlias` → `ANDROID_KEY_ALIAS`, `storeFile file(...)` → `storeFile file(System.getenv("ANDROID_KEYSTORE_PATH") ?: "../android.keystore")`.
   (`?:` is Groovy's Elvis operator — valid in `build.gradle`.) Verify with a count only (prints no values): `grep -i -E "password|keyAlias" quest-build/app/build.gradle | grep -v -c getenv` must print `0`. Never pipe `git diff` of this file to the terminal (removed lines would show the old secrets). If the signing block's syntax differs from these patterns (e.g. `storePassword = '...'`), adapt the regex, or stop and ask the user to make this change.
3. Update `.gitignore`: stop ignoring `quest-build/` wholesale; ignore `quest-build/**/build/`, `quest-build/*.keystore`, `quest-build/*.jks`, `quest-build/*.apk`, `quest-build/local.properties`, `quest-build/.gradle/`.
4. Before staging: `git add --dry-run quest-build` and confirm no keystore/apk/build output/password is included; `git grep -n -i "password" -- quest-build` must show only `getenv` lines.
5. Workflow: decode `secrets.ANDROID_KEYSTORE_BASE64` to a temp file, export the env vars from secrets, run `./gradlew assembleRelease`. Remove the `|| assembleDebug` fallback (it hides failures). Keep trigger on tags + `workflow_dispatch`.
6. Tell the user (in the phase report) the exact secrets to create and to back up the keystore + passwords to a password manager. **Do not** create secrets or run the workflow yourself.

### P4.6 Phase 4 close
Gate, stop and report (include the list of USER DECISIONS: IP/licensing, LFS, Vercel visibility, GitHub secrets).

---

## PHASE 5 — Product Depth (branch `uplift/p5-product`)

Start only after the user approves Phase 4.

### P5.1 Difficulty profiles
- `balance.ts`: `DIFFICULTY = { recruit, marine, ultimate_badass }` each overriding a subset: spawn interval multiplier, enemy HP multiplier, enemy damage multiplier, max concurrent drones (2 / 2 / 3), regen rate.
- `GameSettings.difficulty` (persisted, default `marine` = current values exactly). Resolve effective balance once in `startGame` into `state.rules` (a frozen object) and read from it everywhere instead of raw `BALANCE` for the overridden keys.
- Selector on 2D menu and VR MENU panel. Tests: `marine` rules equal current balance; multipliers applied.

### P5.2 Local leaderboard & score
- Score = kills×(drone 100, small 60, boss 1000) + accuracy bonus (accuracy% × 10) + survival seconds × 5. Pure function in `src/systems/scoring.ts` with tests.
- Persist top 10 per difficulty (`uscm_leaderboard_v1`): score, kills, accuracy, survived seconds, date. Show on end screens (2D + VR) and menu.

### P5.3 Weapon framework (no new art)
- `WeaponProfile` type in balance (damage, interval, magazine, reload time, spread, jam threshold, sound keys, viewmodel id). Refactor PulseRifle firing to consume a profile (`M41A` profile = current values).
- Weapon switching scaffolding (`activeWeapon` in store, key `Q` / right grip+A) with only the M41A registered.
- `docs/design/weapons.md`: Smartgun (auto-tracking aim assist within cone, heavier, slower move) and Flamethrower (cone damage over time, fuel, uses existing `assets/sound effects/weapons/human/flamethrower`) designs, listing required models/sounds. **USER DECISION** on assets before implementing those weapons.

### P5.4 Level 2 preparation
- Generalise `CorridorNav` into a data-driven `LevelDefinition` (halls AABBs, corners, adjacency, spawn nodes, player start) with the Sulaco as `levels/sulaco.ts`. All systems take the level definition instead of importing constants. Pathing tests run against the definition.
- `docs/design/lv426.md`: layout sketch and asset needs. **USER DECISION** before building the map.

### P5.5 Phase 5 close
Gate, update `docs/AUDIT.md` re-score, stop and report.

---

## Appendix A — Definition of Done (whole programme)
- `npm run verify` and `npm run e2e` green locally and in CI.
- `grep` checks: no `fireRay`, no `setFramebufferScaleFactor`, no empty catch blocks, no `prevStatus` in entity simulation files.
- Budgets: largest chunk ≤ 900 kB, precache ≤ 11 MB, lights ≤ 4.
- Every phase's Manual Test Checklist handed to the user; device results recorded by the user in the progress file.
- Docs reflect code at the final commit; no machine-specific data in tracked docs.

## Appendix B — Report template (end of each phase)
```
Phase N complete on branch uplift/pN-... (commits: <first>..<last>)
Gate: verify ✅ / e2e ✅|n/a
Done: <task IDs>
Deviations: <list or none>
Needs device testing: <checklist link/section>
USER DECISIONS pending: <list or none>
Next: Phase N+1 — awaiting approval
```
