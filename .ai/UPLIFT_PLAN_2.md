# Aliens Survivor — Re-audit and Uplift Plan 2

> **Audience:** Claude Sonnet 5.5 acting as the implementing engineer.
> **Author:** re-audit session, 27 Oct 2026, baseline commit `fb94bfb` (`main`, clean). **Score at baseline: 64 / 100.**
> **Predecessor:** `.ai/UPLIFT_PLAN.md` (phases 0–5, done). This plan continues the numbering at phase 6.
> **Goal:** deliver every task below, phase by phase, with verified results.

Read this whole file once before starting. Then work **one task at a time**, in order.

---

## 0. Operating rules (obey always)

### 0.1 Environment
- Windows 11. The PowerShell tool is 5.1: **no `&&`**; chain with `;` or `; if ($LASTEXITCODE -eq 0) { ... }`. The Bash tool (Git Bash) is also available and accepts `&&`.
- Node 22, npm. No Quest headset or phone is available to you: for every VR- or device-affecting task, add a line to the phase's **Manual Test Checklist** (0.5) so the owner can verify on device.
- Multi-line heredocs and backslash-heavy shell snippets have been mangled by tools before; make file edits with the Edit/Write tools.

### 0.2 Hard prohibitions
1. **Never `git push`, never open PRs, never deploy.** Pushing `main` triggers a Vercel production deploy. Commit locally only.
2. **Never rewrite git history** (no rebase of shared commits, `reset --hard`, `filter-repo`, LFS migration, force-anything).
3. **Never print, copy or commit** `quest-build/android.keystore`, keystore passwords or `HANDOFF.local.md` contents. Use `grep -l` to detect, never to display.
4. **Never add a 5th dynamic light**; never mount/unmount lights at runtime (toggle `visible`/`intensity`).
5. **No allocations in `useFrame` or per-shot code** (no `new THREE.*`, `.clone()`, array/object literals, spreads, closures, `.map/.filter/.forEach` with fresh closures). Module-scope scratch objects prefixed `_`.
6. **Do not change gameplay numbers** unless a task says so. When moving a constant into `src/data/balance.ts`, **the value currently used in code wins**.
7. Do not start anything marked **USER DECISION**; list it in the progress file and move on.
8. Respect every rule in `.ai/CONVENTIONS.md` and `HANDOFF.md` §2 (250-line files, one statement per line, no empty `catch`, reset on `runId` not on status edges, `isSimulationFrozen`, `queryTarget` vs `resolveShot`, `dt` integration).

### 0.3 Workflow per task
1. **Re-verify the finding first.** Line numbers below are from `fb94bfb` and will drift. Read every file you will touch **in full**. If a finding turns out to be wrong, record it under Deviations and skip it; do not invent a fix.
2. Make the change; match the surrounding style (Prettier: single quotes, semicolons, 2-space indent; terse "why" comments only).
3. Add or update unit tests for every logic change. Prefer extracting the rule into a pure function (no React, no three.js) and testing that.
4. Run the gate (0.4). Fix the cause of failures; never skip, weaken or delete a test or threshold to get green.
5. Commit with a Conventional Commit message ending in the task ID, e.g. `fix(ui): apply a level-up card once [P6.1]`. End every commit message with the attribution trailer the harness gives you.
6. Tick the task in `.ai/UPLIFT_PROGRESS_2.md` with the short hash and a one-line note (deviations included).

### 0.4 Gate
```powershell
npm run verify
```
Fast inner loop: `npm run check` (types + lint). Run `npm run e2e` at the end of any task that touches VR menus, input, HUD flow or `index.html`. A task is done only when `verify` passes **and** its acceptance criteria hold.

### 0.5 Phase boundaries
- One local branch per phase, each branched from the previous: `uplift/p6-correctness`, `uplift/p7-performance`, `uplift/p8-code-health`, `uplift/p9-tests-ci`, `uplift/p10-docs-polish` (P6 branches from `main`).
- At each phase end: run the gate, write that phase's **Manual Test Checklist** into the progress file, then **stop and report** to the user. Wait for approval before the next phase.

### 0.6 When stuck
Time-box ~30 minutes, then stop and report what you tried and the options. Do not substitute a large redesign.

---

## 1. Re-audit scorecard (baseline `fb94bfb`)

Same rubric and weights as `docs/AUDIT.md`, so the numbers are comparable. The previous record claimed ≈ 76 after phase 4. Two things explain the drop: post-phase-5 feature commits (footsteps, hit vignette, level-up gate, PWA update timer, early XR request, Bishop/torch removal) landed without tests or doc updates, and this review read the UI and XR paths more deeply, finding defects the earlier audit missed.

| Area | Weight | Previous | Now | Main reasons |
|---|---|---|---|---|
| Gameplay correctness | 15 | 8.0 | 6.5 | Double-applied upgrades, left-handed controls not swapped, pause-restart keeps old player pose, boss shrinks on death, tracker upgrade half-wired, frame-quantised fire rate |
| Performance (Quest 2) | 15 | 8.0 | 7.0 | HUD re-renders per frame/shot, per-frame allocations in store/input/animation, impact FX built twice, assets downloaded twice on first visit |
| Architecture | 10 | 8.5 | 8.0 | Many game numbers and map coordinates drifted back into entities |
| Code quality | 10 | 8.5 | 7.5 | Dead code and leftovers from removed features; four files at the 250-line limit |
| Testing | 10 | 8.5 | 7.0 | New features untested (`xenoSteps` 0%, footsteps playback, update check, vignette, early XR); coverage include list narrower than the tests; sleep-based e2e |
| CI/CD | 8 | 7.0 | 6.0 | e2e only on manual dispatch; no `permissions`, `concurrency` or failure artifacts; CI run never observed |
| Documentation | 8 | 8.5 | 6.0 | HANDOFF.md double-encoded (mojibake), stale commit stamp and counts, README says e2e runs on every push, Bishop items still open |
| UX and accessibility | 10 | 8.0 | 6.5 | No way back into VR on Quest after leaving it, possible mid-run reload from SW update, victory results gated on a video, VR card text truncated, focus not trapped in dialogs |
| Security | 4 | 8.0 | 6.5 | No security or cache headers; unpinned third-party action in the signing job. `npm audit`: 0 vulnerabilities |
| Legal / IP | 10 | 3.0 | 3.0 | Unchanged: CC BY attribution still not shown; owner decisions in `docs/IP_REVIEW.md` still open |
| **Total** | 100 | ≈ 76 | **64** | |

**Target after this plan:** ≈ 80 without the owner's IP decisions, ≈ 85+ once attribution ships and the IP questions are settled.

**What is genuinely good** (keep it): allocation-free combat query/resolve with reused results; pure, tested `systems/` and `*AI`/`*Sim` modules; `runId` resets and `isSimulationFrozen` in the enemy pools; validated persistence; edge-detected, armed VR menu input; test hooks compiled out of production; per-device framebuffer scale with tiered effects; budgets enforced in CI.

---

## 2. Findings index

Severity: **H** high, **M** medium, **L** low. Every H and most M items were confirmed by reading the code at `fb94bfb`.

| ID | Sev | Finding | Task |
|---|---|---|---|
| F1 | H | Clicking a level-up card's button applies the upgrade twice (button `onClick` bubbles to the card `onClick`; `chooseUpgrade` has no guard). `src/ui/LevelUpModal.tsx:57,78`, `src/core/GameStore.ts:182` | P6.1 |
| F2 | H | Left-handed mode moves the rifle to the left hand but fire/reload/turn stay on the right controller and the left grip (now the gun hand) cycles weapons. `src/ui/vrControllers.ts:123-141` | P6.2 |
| F3 | H | Restart from the pause menu (PAUSED→PLAYING) skips the player reset, which is keyed on status edges, not `runId`. `src/entities/PlayerController.tsx:68-88` | P6.3 |
| F4 | H | `registerType: 'autoUpdate'` reloads the page when a new SW installs; the status guard only covers *starting* a check, so an update can reload mid-mission or mid-VR. `vite.config.ts:26`, `src/main.tsx:14-28` | P6.4 |
| F5 | H | On Quest, after leaving VR (Oculus button, system end) there is no way back in without reloading: the button condition `!isVrApp && isQuest` is always false because `isVrApp` includes `isQuest`. `src/ui/HUD.tsx:166,205`, `src/core/Platform.ts:21-23`, `src/ui/VRAutoLauncher.tsx` | P6.5 |
| F6 | M | Touch stick keeps its last value after pause/level-up (TouchControls unmounts before `touchend`). `src/ui/HUD.tsx:165` | P6.6 |
| F7 | M | 2D game never pauses on `visibilitychange`; touch PAUSE and VR pause leave music/klaxon running. `src/main.tsx`, `src/ui/HUD.tsx:165`, `src/ui/vrControllers.ts:88-91`, `src/ui/vrPauseMenu.ts:39` | P6.6 |
| F8 | M | Red hit vignette freezes on screen when status leaves PLAYING (flash decays only in `tick`), including over the VR defeat panel. `src/entities/HitVignette.tsx:48-53` | P6.7 |
| F9 | M | Praetorian pops to drone scale on death; boss hit sphere is drone-sized. `src/entities/xeno/xenoDamage.ts:47`, `src/entities/XenomorphPool.tsx:114-115` | P6.8 |
| F10 | M | `tracker_gain` draws blips beyond 25 m but ping/haptic/footer still use base `MAX_RANGE`; upgrade text claims "360° coverage" (it only extends range) and "+25% rate of fire" (it is +31%). `src/entities/MotionTracker.tsx:120-125,143`, `src/data/balance.ts:105-106` | P6.9 |
| F11 | M | Fire rate is frame-quantised: `fireCooldown = fireInterval` discards the remainder (≈12% under nominal DPS at 72 Hz). `src/entities/rifle/rifleFiring.ts:71` | P6.10 |
| F12 | M | Victory banner and leaderboard appear only on the video's `onEnded`; the 4.7 MB video is not precached and unmuted autoplay is blocked on iOS. `src/ui/VictoryScreen.tsx:42`, `vite.config.ts:31` | P6.11 |
| F13 | M | "ENTER META QUEST XR" shows on every non-Quest browser and starts the mission before `enterVR` resolves, so a failed entry leaves a flat run with no pointer lock. `src/ui/HUD.tsx:78-86` | P6.12 |
| F14 | L | `registerKill` can set `status: 'PLAYING'` from any status; card shuffle uses biased `sort(() => Math.random() - 0.5)`. `src/core/GameStore.ts:144-176` | P6.13 |
| F15 | L | Early XR request (`index.html:11-37`): session never ended if the bundle fails; a session that ended before hand-over is passed on; `indexOf('vr=1')` also matches `xvr=1`. | P6.14 |
| F16 | M | HUD subscribes to `damageFlash`, `kills`, `shotsFired`, `shotsHit` → whole HUD re-renders per frame while flashing and per shot (also in VR where it renders null). Per-frame allocations: `InputManager.ts:227` (`consumeSnapshot`), `GameStore.ts:227` (`updatePlayerTransform`), `GameStore.ts:84` (`tick` spread). | P7.1 |
| F17 | M | Per-frame arrays/closures in small-alien animation. `src/entities/SmallAlienAnim.ts:30,85,91,130,175` | P7.2 |
| F18 | M | `XenomorphImpactFX` mounted twice (`XenomorphPool.tsx:229`, `SmallAlienSpawner.tsx:209`): textures, limb templates, 16 puddle materials and 12 gibs built twice. | P7.3 |
| F19 | L | Allocations on kill/spawn paths (`XenomorphImpactFX.tsx:48,53,92`, `XenomorphPool.tsx:170`, `waveDirector.ts:61`); tracker canvas builds strings/gradients at 20 Hz and redraws during MENU (`trackerCanvas.ts`, `trackerNoise.ts:41`). | P7.4 |
| F20 | M | VR panels re-placed every frame (head-locked), redrawn/uploaded at 10 Hz while a menu is up, card text cut at 26 chars at 13 px. `src/ui/VRHud.tsx:94,102,120`, `src/ui/VRStatusCanvas.ts:182,185` | P7.5 |
| F21 | M | First visit downloads ~32 MB twice (page fetches GLBs while the uncontrolled SW precaches them). `src/main.tsx:14` | P7.6 |
| F22 | M (plausible) | On Quest the audio context resume is awaited before `preloadAll` starts, outside a gesture; if resume stalls, nothing loads until the mission starts. `src/core/AudioManager.ts:51`, `src/ui/VRAutoLauncher.tsx:23` | P7.7 |
| F23 | L | Removed-feature leftovers: `torch_on/off` in `AudioCatalog.ts:39-40,89-90` plus shipped/precached `public/audio/sfx_torch_*.m4a`; `companionStart` in `LevelDefinition.ts:37,100`, `sulaco.ts:86`, `tests/levels.test.ts`; dead `gyroEnabled`/`deviceorientation` and `setTouchFire` in `InputManager.ts`; unused `beacon2-4` refs (`CorridorLevel.tsx:19-21,82-84`), `preferCW`, `SeveredGib.rx/rz`, `AcidPuddle.maxTimer`; duplicated `LIMB_NAMES`/`LIMB_BONE_ROOTS` and FH/CB emissive colours. | P8.1 |
| F24 | M | Game numbers outside `balance.ts`: `xenoAI.ts` ranges/cooldowns/leap rate; `smallSim.ts:96,168-205`; `SmallAlienSpawner.tsx:177` respawn; `levelUpGate.ts:5-9`; `waveDirector.ts:7`; `xenoDamage.ts:79`; hit spheres `XenomorphPool.tsx:114-115`, `SmallAlienSpawner.tsx:86-87`; ranges disagree (`envRaycast.ts:5` 52, `autoTarget.ts:34,42,56` 55/24/18, `weapon.maxRange` 32); `300` s hard-coded in `MainMenu.tsx:46`, `VRStatusCanvas.ts:208`, `VictoryScreen.tsx:124`. | P8.2 |
| F25 | M | Map coordinates hard-coded in entities: `CorridorAtmosphereFX.tsx:9-22`, `AlienEggs.tsx:8-16`, `CorridorLevel.tsx:101,111-113,119`, `trimSectorWalls.ts:10-15,45`, `endCaps.ts:4,10-13`; `App.tsx:50,56` start at x = -0.8 vs `playerStart.x` -0.32. | P8.3 |
| F26 | L | Files at the 250-line limit (`XenomorphPool.tsx` 247, `PlayerController.tsx` 234, `XenomorphImpactFX.tsx` 229, `AudioManager.ts`); no disposal of cloned materials/textures/geometries on unmount. | P8.4 |
| F27 | M | Untested new code: `xenoSteps.ts` 0%, `footsteps.ts:47-62`, update-check guard, HitVignette, early XR; coverage `include` omits tested modules (`src/ui/*.ts`, `src/entities/player/**`, `src/levels/**`) and `fx/*.ts`, `tracker/*.ts`; `endCaps.ts`, `ComfortState.ts`, `TrackerState.ts`, `audioLeveller.ts` at 0%. | P9.1 |
| F28 | H | e2e never runs on push/PR (`ci.yml:31` `if: workflow_dispatch`) while README says it does; 20+ fixed `waitForTimeout` sleeps make it flaky. | P9.2 |
| F29 | M | CI: no `permissions` block in `ci.yml`, no `concurrency`, no failure artifacts, no Gradle wrapper validation, third-party `android-actions/setup-android@v3` unpinned in the signing job; no `engines`/`.nvmrc`. | P9.3 |
| F30 | M | `vercel.json`: no cache headers (sw.js/index/manifest should be `no-cache`; hashed `/assets/*` immutable), catch-all rewrite turns missing `.glb`/`.m4a` into 200 `index.html`, no security headers. | P9.4 |
| F31 | H | `HANDOFF.md` has a BOM and 37 double-encoded lines (`â‰¤`, `â”œâ”€â”€`); `CHANGELOG.md` has a BOM. | P10.1 |
| F32 | M | Doc drift: HANDOFF stamp `b99ba2f`; "226 tests"/"87% coverage" (now 234 / 83.6%); README claims e2e runs on push; Bishop items open in `docs/AUDIT.md:55` and `.ai/UPLIFT_PROGRESS.md`; `CREDITS.md:9` says nine shipped models (seven); `.ai/ASSET_MANIFEST.md:92` lists torch clicks; HitVignette and level-up gate undocumented. | P10.2 |
| F33 | L | Accessibility: SettingsPanel `aria-modal` without focus move/trap; LevelUpModal lacks `role="dialog"`; hint text and build id at ~3:1 contrast (`uiStyles.ts:47`); intro copy says "META QUEST 2 DETECTED" on Quest 3. | P10.4 |
| L1 | Legal | CC BY 4.0 attribution for seven shipped models still not shown; franchise IP questions open (`docs/IP_REVIEW.md`). | **USER DECISION** (see §8) |

---

## PHASE 6 — Correctness (branch `uplift/p6-correctness`)

### P6.0 Progress tracker
Create `.ai/UPLIFT_PROGRESS_2.md`: a checklist of every task ID in this file, a **Deviations** section, and a **Manual Test Checklists** section with one heading per phase. Commit `chore: add uplift 2 progress tracker [P6.0]`.

### P6.1 Apply a level-up card exactly once (F1)
1. `LevelUpModal.tsx`: keep **one** click handler per card. Keep the card-level `onClick` (whole card is the target) and make the inner element a non-interactive visual, *or* keep the button and remove the card handler; either way keep keyboard access (the 1/2/3 keys and a focusable button).
2. `GameStore.chooseUpgrade`: return immediately unless `status === 'LEVEL_UP'` **and** `offeredUpgrades` contains `id`.
3. Tests: calling `chooseUpgrade` twice applies once; calling it outside LEVEL_UP or with an id not offered is a no-op.

**Accept:** `armor_boost` from a fresh run raises `maxHp` by exactly its `balance.ts` amount; `activeUpgrades` has no duplicates.

### P6.2 Left-handed VR controls (F2)
1. In `vrControllers.ts`, derive the role of each `inputSource` from `handedness` **and** `xrControllerState.leftHanded`: the *weapon hand* gets trigger-fire, primary-button reload and the turn stick; the *off hand* gets the move stick and the grip weapon-cycle. Pause (secondary/stick click) stays on both. Use the existing semantic helpers in `XRControllerState.ts` (line ~30 already computes `weaponLeft`) rather than a second mapping.
2. Extract the mapping into a pure function (e.g. `controllerRole(handedness, leftHanded): 'weapon' | 'off'`) and unit test the four combinations.
3. Check `VRHud.tsx:137` (tracker hand) and haptics still agree with the new mapping.

**Accept:** with `leftHanded = true`, a left trigger fires and a right grip cycles weapons. Add both to the manual checklist.

### P6.3 Reset the player on a new run, not on a status edge (F3)
1. In `PlayerController.tsx`, replace the `prev === 'MENU' | 'DEFEAT' | 'VICTORY'` reset with a `lastRunIdRef` compared to `state.runId` (exactly as `XenomorphPool` does), run on the first PLAYING frame of a new run. Keep the separate pointer-lock edge logic (that is UI edge detection and is allowed).
2. Make sure the reset also resets `xrYawRef`, `wasXrRef` and the XR origin, and writes the start pose into the store so the 20 Hz sync cannot overwrite it with the old pose.
3. Test: if the reset logic is extracted (recommended: a pure `resetPlayerPose(start, refs)`), unit test it; add an e2e step in `smoke.spec.ts`: start, move, pause, Restart → `__game.getState().playerPos` equals the level's `playerStart`.

### P6.4 Never reload during a run (F4)
1. `vite.config.ts`: `registerType: 'prompt'`.
2. `main.tsx`: keep the timer/visibility checks. Keep `updateSW = registerSW({ onNeedRefresh() { pending = true; tryApply(); } , ... })`. `tryApply()` calls `updateSW(true)` only when status is `MENU`, `DEFEAT` or `VICTORY` **and** `xrStore.getState().session` is null; otherwise it subscribes to the store and applies at the next safe moment.
3. Extract the "is it safe to apply an update" rule into a pure function in `src/core/` and unit test it (all statuses × session present/absent).
4. Optional: show a small "Update ready: restart to apply" line on the 2D menu when `pending` is true.

**Accept:** `dist/sw.js` no longer calls `skipWaiting` unconditionally (inspect the build) and nothing in `src/` reloads the page while PLAYING/LEVEL_UP/PAUSED or in XR.

### P6.5 A way back into VR on Quest (F5)
1. In `HUD.tsx`, show an "ENTER VR" button whenever the device supports immersive VR (Quest or `?vr=1`) **and** there is no active XR session, on every status (MENU, PAUSED, DEFEAT, VICTORY), not only when `!isVrApp`.
2. On click: `xrStore.enterVR()`; on failure `console.warn` and keep the button.
3. Remove the now-dead `vrCapable` branch in `MainMenu.tsx` or make it the place the button lives; do not keep both.
4. e2e (IWER): enter VR, end the session via `__xr`, assert the button appears, click it, assert a session exists again.

### P6.6 Input and audio consistency on pause (F6, F7)
1. `TouchControls`: in its unmount cleanup call `InputManager.setTouchMove(0, 0)` (and clear any look state). Unit test via `InputManager` if possible.
2. Add one helper, e.g. `pauseMission()` in `MissionLauncher.ts`, that does `pauseGame()` + `AudioManager.pauseBGM()` + `setKlaxonActive(false)`, and its inverse `resumeMission()`. Route the touch PAUSE button, the VR B/Y pause, the VR pause-menu Resume, the desktop paths and the XR session-event pause through them. Read the existing desktop pause path first and match what it already does.
3. In `main.tsx` (or a small `core/visibilityPause.ts`), on `document.visibilityState === 'hidden'` while PLAYING, call `pauseMission()`. Do not auto-resume.

### P6.7 Hit vignette decays everywhere (F8)
In `HitVignette.tsx` keep a local `flashRef` that follows `damageFlash` upward and decays with `dt` locally (same rate as `tick`), and force it to 0 when status is not PLAYING. Extract the decay into a pure function and test it. Check the 2D overlay path in `HUD.tsx` for the same freeze and fix it the same way.

### P6.8 Praetorian scale (F9)
1. Store the spawn scale on the pooled record (e.g. `t.scale`) when spawning; `killXeno` uses it instead of `BALANCE.XENO_POOL.SCALE`.
2. Scale the hit-sphere centre and radius by `t.scale / BALANCE.XENO_POOL.SCALE`. Move the base sphere numbers into `balance.ts` (value in code wins).
3. Unit test: a boss record keeps its scale on death; boss hit radius is larger than a drone's.

### P6.9 Tracker upgrade and honest upgrade text (F10)
1. `MotionTracker.tsx`: use the upgraded `maxRange` for the ping test, the proximity calculation and the footer.
2. `balance.ts` upgrade descriptions: make them describe what the code does (e.g. tracker: "+68% tracker range"; fire rate: compute the real percentage from the two intervals). **Do not change the numbers.**
3. Test: a contact between 25 m and the upgraded range produces a ping when `tracker_gain` is active (extract the ping decision if needed).

### P6.10 Frame-rate independent fire rate (F11)
In `rifleFiring.ts`, accumulate: `rs.fireCooldown += state.fireInterval` when a shot fires (allowing at most one shot per frame, so the carry is never more than one interval), and clamp `fireCooldown` to `>= 0` when the trigger is released so a fresh pull fires immediately. Unit test: over 1 s of 72 Hz frames the shot count is `floor(1 / fireInterval)` ± 1; same at 60 Hz and 90 Hz.
**Note for the changelog:** this raises effective DPS by ~12–15% to match the stated rate. Record it under "Changed (gameplay)" and add it to the manual checklist so the owner can judge difficulty.

### P6.11 Victory screen without the video (F12)
1. Set "video finished" on `onEnded`, `onError`, a rejected `play()` promise, a "Skip" button/tap, and a timeout of the video's duration + 2 s (or 15 s if unknown).
2. Try `play()` muted as a fallback if unmuted play is rejected.
3. Do **not** add the video to the precache (precache budget); it is fine for it to be missing offline now that the results no longer depend on it.

### P6.12 Desktop "enter VR" only when VR exists (F13)
1. Show the "ENTER META QUEST XR" button only if `navigator.xr?.isSessionSupported('immersive-vr')` resolves true (check once on mount; store in component state).
2. In `handleLaunch('VR')`, await `enterVR()` first; call `launchMission()` only after it resolves. On rejection, warn and stay on the menu.

### P6.13 Store guards (F14)
1. `registerKill`: return early unless `status === 'PLAYING'` (keep it legal during LEVEL_UP only if the code currently relies on it; check callers).
2. Replace the biased sort shuffle with a Fisher–Yates over a reused array. Test the guard; test that the shuffle returns the right count with no duplicates.

### P6.14 Early XR request hardening (F15)
In `index.html`'s inline script: parse with `new URLSearchParams(location.search).get('vr') === '1'`; listen for the early session's `end` event and drop the handle if it ends before hand-over; if the app has not claimed the session within ~20 s (bundle failed), call `session.end()`. In the app side that claims it, ignore a session whose `ended` flag is set. Keep the script tiny and dependency-free; it runs before the bundle. Add the IWER e2e from P9.2 step 4 now if it is simple, otherwise there.

### P6.15 Phase close
Gate + `npm run e2e`. Write the manual checklist (at least: card applied once; left-handed fire/reload/turn/cycle; restart from pause starts at the marker; no reload mid-run after deploying a new build; leave VR with the Oculus button and re-enter from the 2D page; touch stick stops after pause; phone app-switch pauses and silences music; vignette clears on defeat in VR; boss keeps its size dying; tracker pings beyond 25 m with the upgrade; fire rate feels right; victory results show on iOS and offline). Stop and report.

---

## PHASE 7 — Performance (branch `uplift/p7-performance`)

### P7.1 Stop HUD re-renders and per-frame store/input allocations (F16)
1. Split `HUD.tsx` so high-frequency values (`damageFlash`, `kills`, `shotsFired`, `shotsHit`) are read only by small leaf components (`DamageFlashOverlay`, end-of-run stats) with their own selectors. The HUD root must not subscribe to them. In VR, the 2D HUD subtree should not mount at all.
2. Prefer driving the flash overlay's opacity through a ref in `requestAnimationFrame`/`useFrame` instead of React state.
3. `InputManager.consumeSnapshot`: return a reused module-scope snapshot object (document that callers must copy what they keep).
4. `GameStore.updatePlayerTransform`: mutate a stable tuple or compare before `set`; `tick`: no `{}` spread per frame — build the patch only when something changed.
5. Verify with React DevTools Profiler mentally is not possible here; instead add a unit test that `tick()` called twice with no change does not call the store listener (subscribe a spy).

### P7.2 Allocation-free small-alien animation (F17)
Pre-build flat bone arrays per rig in `buildFaceRig` (or equivalent) and replace `forEach` closures and `reset([..])` array literals with index loops over those arrays.

### P7.3 One impact-FX instance (F18)
Mount `XenomorphImpactFX` once (e.g. in `App.tsx` or `XenomorphPool`) and expose its handle to `SmallAlienSpawner` through a module-level handle or a tiny context. The small-alien path must keep its current visuals (acid bursts/puddles). Check the shader warm-up list (`fx/ShaderWarmup.tsx`) still covers everything.

### P7.4 Kill/spawn path and tracker allocations (F19)
1. Use `constrainToCorridorInto` and direct field assignment instead of tuple returns and `Object.assign({...})`.
2. Replace `pool.find(cb)` and the `at` closure in `waveDirector.ts` with index loops (the doc comment there already promises "allocation-free").
3. Tracker canvas: cache the font string and gradients, avoid template strings when the text has not changed (compare numbers, format only on change), skip redraw/upload while status is MENU.

### P7.5 VR panels: place once, redraw on change, legible text (F20)
1. Place the pause/level-up/end panel when it opens (in front of the head at a comfortable distance); after that, only lazy-follow if the head turns more than ~35° away. Do not re-place every frame.
2. Redraw and set `needsUpdate` only when the drawn content changes (selection, values, timer second).
3. Card descriptions: word-wrap within the card at ≥ 18 px (canvas px at the 1.5× scale) instead of truncating at 26 chars. Add a pure word-wrap helper with tests.

### P7.6 No double download on first visit (F21)
Register the service worker after the first scene and models have loaded (e.g. after the corridor GLB `useGLTF` resolves, or on `window.load` + `requestIdleCallback`), so the precache fills from the HTTP cache instead of the network. Keep the precache content and budgets unchanged. Record before/after numbers from `npm run preview` with DevTools' network panel in the progress notes if you can measure; otherwise add it to the manual checklist.

### P7.7 Start audio loading before resume (F22)
In `AudioManager.unlock`, start `preloadAll()` (decoding works on a suspended context) and then `resume()`, without awaiting resume before preloading. Make the music start path robust if `resume()` stays pending.

### P7.8 Phase close
Gate + budgets unchanged or better. Manual checklist: Quest `?debug=1` frame time in phase 4 vs the previous build; first-visit network total on a phone; VR panels readable and not head-locked; sounds ready when the mission starts on Quest.

---

## PHASE 8 — Code health and data (branch `uplift/p8-code-health`)

### P8.1 Remove leftovers (F23)
Remove: `torch_on`/`torch_off` from `AudioCatalog.ts` and delete `public/audio/sfx_torch_on.m4a`, `sfx_torch_off.m4a`; `companionStart` from `LevelDefinition`, `sulaco.ts`, `validateLevel` and tests; dead `gyroEnabled`/`deviceorientation` and `setTouchFire` in `InputManager.ts`; `beacon2-4` refs; `preferCW`, `SeveredGib.rx/rz`, `AcidPuddle.maxTimer`; dedupe `LIMB_NAMES`/`LIMB_BONE_ROOTS` and the FH/CB emissive colours. `grep -rni "torch\|flashlight\|bishop\|ripley\|companion" src tests scripts public` must return nothing except intentional history notes. **Do not delete** `assets/models/bishop.glb` / `ripley.glb` (USER DECISION, §8).

### P8.2 Centralise numbers (F24)
Move every number listed in F24 into `src/data/balance.ts` under clear groups (`XENO_AI`, `SMALL_AI`, `LEVEL_UP_GATE`, `RANGES`, `MISSION.DURATION_SECONDS` if not already present). **Values currently in code win.** For the inconsistent ranges, do not unify values silently: name each one for its purpose (`ENV_RAY_MAX`, `AUTO_AIM_PROBE`, `AUTO_AIM_CONE_NEAR/FAR`, weapon `maxRange`) and add a one-line comment on why they differ; list the inconsistency for the owner in the progress file. Replace the three hard-coded `300` values with the mission duration constant. Existing tests must pass unchanged.

### P8.3 Level scene data on the level (F25)
Add an optional `scene` block to `LevelDefinition` (spark emitters, egg spots, key-light and beacon positions, end caps, trim walls) and move the Sulaco values from the entities into `sulaco.ts`. `App.tsx` reads the camera/XROrigin start from `getActiveLevel().playerStart` (fixes the -0.8 vs -0.32 mismatch). Extend `validateLevel` for the new fields and test it. Geometry must render identically: compare screenshots from `npm run e2e` smoke before/after if feasible, otherwise add to the manual checklist.

### P8.4 Headroom and disposal (F26)
1. Split `XenomorphPool.tsx` (move `applyEvents`/ambient hiss and the target provider into `xeno/`), `PlayerController.tsx` and `AudioManager.ts` so each is ≤ ~200 lines.
2. Add `useEffect` cleanups that dispose cloned materials, canvas textures and generated geometries in `MotionTracker`, `WallImpactFX`, `MistFX`, acid FX and `CorridorLevel`. Low risk today, required before a second level can be swapped in.

### P8.5 Phase close
Gate. Manual checklist: one full run on desktop and Quest to confirm nothing changed visually or in feel.

---

## PHASE 9 — Tests and CI (branch `uplift/p9-tests-ci`)

### P9.1 Coverage where it matters (F27)
1. `vitest.config.ts` `include`: add `src/ui/*.ts`, `src/entities/player/**`, `src/levels/**`, `src/entities/fx/**/*.ts`, `src/entities/tracker/**/*.ts`. Keep thresholds; if the new files pull coverage under the gate, add tests, do not lower the thresholds.
2. New tests: `xenoSteps` (mock `AudioManager`; teleport/hearing-range/state gating), `footsteps` playback functions, `endCaps`, and any pure functions extracted in phases 6–7 (if not already tested there).

### P9.2 Make e2e reliable, then run it on every PR (F28)
1. Replace fixed `waitForTimeout` calls with `expect.poll` / `page.waitForFunction` on the `?e2e=1` hooks (`window.__game`, `__xr`). Keep the deliberate 11 s "no auto-restart" wait in `vr.spec.ts`.
2. Run the suite locally 3 times in a row; all green.
3. `ci.yml`: run e2e on `pull_request` and `push` to `main` (remove the `workflow_dispatch`-only `if`, keep `workflow_dispatch` as a trigger), `retries: 1` on CI in `playwright.config.ts`, upload `playwright-report/` with `actions/upload-artifact` when it fails.
4. Add a VR test that loads with `?vr=1` and asserts the early session from `index.html` is handed to the app (a session exists without a click, and only one).

### P9.3 CI hardening (F29)
Add `permissions: contents: read` and a `concurrency` group (cancel in progress for the same ref) to `ci.yml`; add `gradle/actions/wrapper-validation` to the APK workflow; pin `android-actions/setup-android` to a full commit SHA with the version in a comment (look the SHA up with `gh api repos/android-actions/setup-android/git/ref/tags/v3...`; if `gh` is not authenticated, leave a `TODO(owner)` comment and note it). Add `"engines": { "node": ">=22" }` and an `.nvmrc` containing `22`.

### P9.4 Vercel headers and rewrite (F30)
In `vercel.json`:
- `Cache-Control: no-cache` for `/sw.js`, `/index.html`, `/manifest.json`, `/registerSW.js`, `/workbox-*.js`; `public, max-age=31536000, immutable` for `/assets/(.*)`.
- Restrict the SPA rewrite to paths without a file extension (e.g. source `/((?!.*\\.).*)`), so a missing `.glb` returns 404. `/.well-known/assetlinks.json` must still be served as `application/json` (the Quest TWA depends on it; add a header for it).
- Baseline headers: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` that **allows** `xr-spatial-tracking=(self)` and fullscreen. **No enforcing CSP** in this plan (the inline XR script in `index.html` would need a hash); add `Content-Security-Policy-Report-Only` only if you can keep it accurate, otherwise leave it for the owner.
Add a small test in `tests/` that parses `vercel.json` and asserts these entries exist.

### P9.5 Phase close
Gate + `npm run e2e` ×3. Manual checklist: push the branch (owner), confirm both CI jobs are green on Linux; confirm the deployed site still installs as a PWA and the Quest APK still opens full-screen (asset links).

---

## PHASE 10 — Docs and polish (branch `uplift/p10-docs-polish`)

### P10.1 Fix HANDOFF.md encoding (F31)
Re-decode the double-encoded text (read as UTF-8, encode as Windows-1252, decode as UTF-8) and save as UTF-8 **without** BOM; strip the BOM from `CHANGELOG.md`. Use a small Node script in the scratchpad, not a shell one-liner. Verify by eye that ≤, ─, ├ and · render. Extend `tests/docs.test.ts` to fail on a BOM or on mojibake markers (`/â[”‰€]/`, `/Ã./`) in any tracked `*.md`.

### P10.2 Bring the docs back in step with the code (F32)
Update `HANDOFF.md` (stamp to the new HEAD, test counts, layout incl. `HitVignette`, `levelUpGate`, footsteps, SW update policy, VR re-entry), `README.md` (CI section matches `ci.yml`), `.ai/CONTEXT.md`, `.ai/ASSET_MANIFEST.md` (no torch), `CREDITS.md` (seven shipped models; note unshipped sources in `assets/models/`), `CHANGELOG.md` (everything from phases 6–10 under Unreleased), and close or strike the Bishop items in `docs/AUDIT.md` and `.ai/UPLIFT_PROGRESS.md`. Reference `balance.ts` instead of copying numbers.

### P10.3 Re-score in `docs/AUDIT.md`
Add a "Re-audit 2" section with the §1 table above as "baseline 64" and an "after" column justified only by evidence (tests, lint rules, budgets, CI). Mark anything not verified on device as such.

### P10.4 Accessibility polish (F33)
`SettingsPanel`: move focus into the dialog on open, trap Tab inside, restore focus on close, Esc closes. `LevelUpModal`: `role="dialog"`, `aria-modal`, labelled by its heading, initial focus on the first card. Raise the hint text and build id to ≥ 4.5:1 contrast. Intro copy: "META QUEST DETECTED" (or 2/3 from `Platform.isQuest3`). Unit test the focus-trap helper if extracted.

### P10.5 Close
Gate + e2e. Final report to the user: score before/after with evidence, the combined manual checklists, deviations, and the open owner decisions.

---

## 8. Owner decisions (do not act; list them in the progress file)

1. **CC BY attribution (recommended to do soon).** The licence requires visible credit for the seven shipped models and the app shows none. A small "Credits" screen reading from a generated list (or a link to a hosted `CREDITS.md`) is ~1 task. Build it only once the owner says yes.
2. **IP and public deployment** (`docs/IP_REVIEW.md`): unchanged and still the largest score item.
3. **Delete unshipped source models** `assets/models/bishop.glb`, `ripley.glb` (and decide on `corridors.glb`, `alien_queen.glb`) from the working tree. History stays as is; LFS or history rewrite remains a separate owner decision.
4. **Fire-rate fix (P6.10)** raises effective DPS to the stated rate; the owner may want `fireInterval` or difficulty retuned after playtesting.
5. **Dependency majors** (vite 8, vite-plugin-pwa 2, three 0.186 with `@react-three/*`, TypeScript 7, ESLint 10): out of scope here; plan as a separate upgrade with device testing.
6. **Local clutter:** ~13 MB of old APKs at the repo root (ignored, not tracked) can be deleted by the owner.
