# Uplift Progress

Plan: [UPLIFT_PLAN.md](./UPLIFT_PLAN.md). Baseline `ffa46eb` (audit score 48/100).

## Phase 0 — Stabilise
- [x] P0.0 (cd96aeb) Progress tracker
- [x] P0.1 (c5cedb3) Mechanical reformat
- [x] P0.2 (1f2dcb4) Run identity / isSimulationFrozen (C5, H2)
- [x] P0.3 (9866bcd) Hit query vs damage separation (C1, C2)
- [x] P0.4 (642acd7) Boss once per phase (H1)
- [x] P0.5 (2862960) VR level-up selection (C3)
- [x] P0.6 (5e02bec) Adaptive quality tiers (C4)
- [x] P0.7 (6923f33) Settings and record persistence
- [x] P0.8 Phase close — gate green: 38 tests, build ok

## Phase 1 — Code health
- [x] P1.1 (65a7ccb) Lint + verify pipeline
- [x] P1.2 (eef0d1d) Balance single source of truth
- [x] P1.3 (f0f62f5) Shared pure systems
- [x] P1.4 (cbe78b8) Restore 250-line limit
- [x] P1.5 (1f33f20) BVH environment raycast — three-mesh-bvh 0.8.x (matches drei) instead of 0.9
- [x] P1.6 (cf0e928) Audio rework
- [x] P1.7 (600d404) Canvas texture throttling — tracker 20 Hz + wrist texture version gate; status panel redraw left per frame while paused (see below)
- [x] P1.8 (9442a80) Code splitting
- [x] P1.9 Phase close — gate green: 77 tests, build ok, precache 10.6 MB, largest chunk 854 kB

## Phase 2 — Tests and gates
- [x] P2.1 (aec7ccc) Pure AI step functions — small/xeno AI extracted as pure step functions with tests (Bishop AI not extracted)
- [x] P2.2 (04605bc) Unit test suite
- [x] P2.3 (04605bc) Coverage gate — thresholds raised to 80/75/65 (actual ~86% lines)
- [x] P2.4 (5ff96c6) Playwright smoke
- [x] P2.5 (134c48a) Budgets
- [x] P2.6 (d3221b6) IWER (optional) — worked: forceInstall needed because Chromium has a native navigator.xr; emulator spoofs a Quest UA so the app auto-enters VR
- [x] P2.7 Phase close — gate green: 128 tests, 86% lines, 3 e2e, budgets ok

## Phase 3 — UX
- [x] P3.1 (97f7dc2) Settings model
- [x] P3.2 (1084784) 2D settings panel
- [x] P3.3 (169bd75) VR pause menu
- [x] P3.4 (3d6cc6b) Comfort vignette
- [x] P3.5 (1b79242) Head-centred turn, clamp
- [x] P3.6 (0794bb7) Haptics handedness
- [x] P3.7 (d473922) VR menu and end screens
- [x] P3.8 (ab28042) PWA prompt
- [x] P3.9 (a7d2721) HUD and viewport
- [x] P3.10 Phase close — gate green: 176 tests, 15 e2e, budgets ok

## Phase 4 — Docs and governance
- [x] P4.1 (a188199) HANDOFF rewrite
- [x] P4.2 (85271a6) Other docs
- [x] P4.3 (a396575) Credits scaffold
- [x] P4.4 (3579c69) Repo hygiene — removed 3 byte-identical files; moving assets/ to LFS is an owner decision (not done)
- [x] P4.5 (61eeb0d) APK pipeline — workflow not run (needs secrets); see disclosure below
- [x] P4.6 Phase close — gate green: 183 tests; decisions listed above

## Phase 5 — Product depth
- [x] P5.1 (d223eb4) Difficulty
- [x] P5.2 (74e60db) Leaderboard
- [x] P5.3 (1046745) Weapon framework
- [x] P5.4 (b99ba2f) Level definition
- [x] P5.5 Phase close — gate green: 226 tests, 18 e2e, budgets ok; owner decisions listed

## Deviations
- Phase boundaries: user instructed "execute all phases", so phases proceed without waiting for approval between them. Manual checklists are still recorded per phase.

- P0.1: the reformat was followed (P3.3) by normalising every file to LF via `.gitattributes` and Prettier `endOfLine: lf`, because a checkout had left one file as CRLF and broke multi-line edits.
- P0.3: the armor-piercing multiplier is applied at the weapon, not inside the target; small aliens still take a flat 30 per hit regardless of weapon damage (balance question left for the owner).
- P0.6: initial framebuffer scale is 0.85 on Quest 3 and 0.72 otherwise; the old 0.58–0.80 runtime scaling was removed because three.js ignores it mid-session.
- P1.2: `registerKill` now takes a kind; small kills award 15 XP (was 25). Boss scale/speed use the values the code ran (0.62 / 3.1), not the stale 0.65 / 3.2 in the old table; `AP_DAMAGE` was removed (it was unused).
- P1.4: the 250-line rule is enforced by ESLint `max-lines` ignoring blank lines and comments, so some files exceed 250 raw lines (for example AudioManager ~282).
- P1.5: three-mesh-bvh is 0.8.x (not 0.9) to match drei's copy and avoid duplicate type declarations.
- P1.6: the background music was also converted (AAC 80 kbps); the duplicate source copy was removed from audio-src because assets/music/bgmusic.mp3 is the same file. Precache ended at ~10.6 MB (limit 11).
- P2.1: Bishop's AI was not extracted into a pure step function; xeno and small-alien AI were.
- P2.3: coverage thresholds are 80 / 75 / 65 (plan said 60 / 60 / 50) because the logic layers sit at about 87% lines; tests are now type-checked by `tsc`.
- P2.4/P2.6: e2e builds set VITE_E2E_XR=1 to include the IWER emulator; IWER needs forceInstall (Chromium has a native navigator.xr with no runtimes) and spoofs a Quest user agent, so the app auto-enters VR in those tests.
- P3.5: **walking speed is now 1.2 m/s and frame-rate independent** (it was effectively 1.2 on Quest at 72 Hz, 1.4 at 60 fps and 2.8 at 30 fps because movement integrated from a position refreshed every 50 ms). The VR rig pivots about the XR viewer pose, not three.js's camera, because the camera is stale inside frame callbacks.
- P3.7: the VR mission no longer starts automatically; it waits in an in-headset menu.
- P4.3: all nine models turned out to be CC BY 4.0, so attribution is required; the app does not yet display it (owner decision).
- P4.5: the keystore password line was printed once in a tool result because a masking command was wrong (see the Phase 4 section). The value never entered git.
- P5.1: one commit (d223eb4) landed with a lint error in a test regex; fixed in 8281d05.
- P5.3: weapon switching costs a reload; VR cycles weapons with the left grip (the right grip stays free); only the M41A is registered.
- Shell note for future sessions: some multi-line shell heredocs and backslash-heavy snippets were mangled by the tool, so edits were made with script files and the Edit/Write tools instead.


## Manual Test Checklists

### Phase 0 (branch uplift/p0-stabilise) — needs device testing
- [ ] Mobile/touch: aim at a drone without firing; it must not die instantly (auto-aim probe no longer damages).
- [ ] Desktop: shoot at a drone standing behind a corridor corner; wall sparks and ricochet only, no damage.
- [ ] Quest: reach level 2 with aliens alive — they must still be there after choosing a card, Bishop must not teleport.
- [ ] Quest: level-up card picking: hold the trigger while levelling, nothing selects; stick left/right moves the highlight; trigger confirms; card 3 reachable.
- [ ] Quest: right stick pushes during the level-up screen do not turn the view after resuming.
- [ ] Phase 3 and 4 each spawn exactly one Praetorian.
- [ ] Quest with the debug flag on (add ?debug=1 to the URL): tier readout drops in heavy fights and recovers; no framebuffer-scale console warnings.
- [ ] Reload the page: snap-turn/flash/handedness persist; BEST kills shows on menu and end screens (2D and VR).

### Phase 1 (branch uplift/p1-code-health) — needs device testing
- [ ] Quest, iOS Safari, desktop: converted AAC sounds play with no clipped starts (reload, flesh hits, xeno hiss, marine pain); BGM (.m4a) starts and loops; BGM loudness feels unchanged.
- [ ] Quest with the debug flag on (add ?debug=1 to the URL): record frame time while firing continuously in phase 4 and compare with the earlier build (wall raycasts are now BVH-accelerated); note any hitch at level load while the corridor BVHs build.
- [ ] Motion tracker (wrist and desktop) still animates smoothly at its new 20 Hz redraw; pings and haptics still fire on each sweep.
- [ ] Preview build (`npm run preview`): menu, play, pause, resume, level-up, victory video all work (vendor chunk split sanity check).
- [ ] Aliens still pursue around corners, leap, and slash on cadence; facehugger/chestburster kills award 15 XP.
- [ ] Settings screens and touch controls look and behave the same after the HUD split (phone and desktop).

### Phase 2 (branch uplift/p2-quality) — needs verification outside this machine
- [ ] Push the branch (or open a PR) and confirm the GitHub Actions CI run is green: `verify` job and the Linux `e2e` job (software WebGL on ubuntu-latest has not been run here).
- [ ] Locally: `npm run e2e` passes on your machine (it passed here on Windows with Chromium).
- [ ] Skim the coverage table from `npm run test:coverage` and confirm the excluded files list in vitest.config.ts is acceptable.

### Phase 3 (branch uplift/p3-ux) — needs device testing (Quest 2/3, phone, desktop)
- [ ] **Movement speed decision:** movement is now frame-rate independent at 1.2 m/s (it previously varied: ~1.2 on Quest, 1.4 at 60 fps, 2.8 at 30 fps, never the 4.2 claimed). Walk the corridor on Quest and confirm the pace feels right; change `BALANCE.PLAYER.MOVE_SPEED` if not.
- [ ] Quest: the mission now waits in an in-headset menu; a fresh trigger press deploys. Check the menu is readable and the trigger doesn't fire a shot on deploy.
- [ ] Quest: pause menu (B/Y): stick up/down selects, left/right adjusts, trigger on Resume resumes. Volumes audibly change music and effects. Check text size/legibility.
- [ ] Quest: comfort vignette during smooth turning and walking at Off/Low/High; snap-turn pulse; confirm it feels comfortable and isn't distracting.
- [ ] Quest: snap turn pivots about your head (no sideways swing); seated mode raises you correctly; walking physically into a wall pushes you back.
- [ ] Quest: left-handed mode swaps weapon/tracker hands for both controls AND haptics.
- [ ] Quest: take the headset off / open the system menu: game pauses and resumes only if you hadn't paused. Defeat/victory screens wait for a trigger press (no auto-restart).
- [ ] Phone (Android Chrome and iOS Safari): install prompt is optional; "Play in browser" works; dismissal persists; pinch-zoom works on menus but not during play; touch status bar readable.
- [ ] Desktop: mouse sensitivity and invert-Y take effect; status bar toggle; settings persist after reload.

### Phase 4 (branch uplift/p4-docs) — owner actions and decisions
- [ ] **Create the four GitHub secrets** (`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`) using `HANDOFF.local.md`, run the APK workflow once, and **back up the keystore and its passwords** in a password manager (losing them means the installed app can never be updated).
- [ ] **Secret handling incident:** while inspecting `quest-build/app/build.gradle`, a masking command was wrong and the *debug/release keystore password line was printed once in this session's tool output*. The value never entered git (checked with `git log -S`), the keystore file is local-only and ignored, and the Gradle file now reads credentials from the environment. If this session transcript is shared, consider changing the keystore password.
- [ ] USER DECISION: IP and licensing (`docs/IP_REVIEW.md`): keep the Vercel deployment public or private, seek permission or rebrand, confirm audio/video/font sources.
- [ ] USER DECISION: add visible attribution for the nine CC BY 4.0 models (credits screen or page); not done because it is a product/legal call.
- [ ] USER DECISION: move the 68 MB `assets/` folder to Git LFS or external storage (not done; needs history/policy choice).
- [ ] The headset serial number remains in git history (history not rewritten, per plan).

### Phase 5 (branch uplift/p5-product) — needs device testing and owner decisions
- [ ] Phone/desktop/Quest: choose each difficulty on the start screen and play a few minutes; confirm Recruit is forgiving, Marine feels as before, Ultimate Badass is clearly harder (tuning numbers live in `src/data/difficulty.ts`).
- [ ] Finish a run (defeat and victory) on each platform: score and rank appear on the end screen (2D and VR), the leaderboard persists after a reload, and the start screen shows the best score.
- [ ] Press Q (desktop) or the left grip (Quest): nothing should happen while only the M41A exists.
- [ ] USER DECISION: supply or approve assets for the Smartgun and Flamethrower (`docs/design/weapons.md`) and say whether a second map is wanted (`docs/design/lv426.md`).
- [ ] USER DECISION: score weights (`BALANCE.SCORE`) and difficulty values are first guesses; adjust after playtesting.
