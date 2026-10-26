# Uplift 2 Progress

Plan: `.ai/UPLIFT_PLAN_2.md`. Baseline `fb94bfb`, score 64/100.

## Working agreement (from the owner)
- Lean testing: unit tests only for extracted pure logic; per-task gate is `npm run check` plus the touched test files; full `npm run verify` once at each phase end; e2e once at the end of a phase that touches VR/HUD flows.
- Added scope: replace the Praetorian with the Alien Queen (`assets/models/alien_queen.glb`) with animations (P6.16).

## Phase 6 (branch uplift/p6-correctness): COMPLETE, awaiting owner review
- [x] P6.0 tracker (083d1e1)
- [x] P6.1 level-up card applied once (613df84)
- [x] P6.2 left-handed VR controls (6c4dd02)
- [x] P6.3 player reset on runId (6c4dd02)
- [x] P6.4 no reload during a run (67ecc0d)
- [x] P6.5 re-enter VR on Quest (67ecc0d)
- [x] P6.6 touch stick release, one pause path, pause on app switch (612f5a1)
- [x] P6.7 hit vignette fades outside PLAYING (612f5a1)
- [x] P6.8 boss scale on death: obsolete, the boss no longer uses the drone clone; hit sphere now sized to the Queen (d6ff26f)
- [x] P6.9 tracker upgrade range + honest upgrade text (5c8e026)
- [x] P6.10 frame-rate independent fire rate (5c8e026)
- [x] P6.11 victory results never wait on the video (d8241da)
- [x] P6.12 VR button only when a headset exists; enter before launching (67ecc0d)
- [x] P6.13 store guards, unbiased shuffle (613df84)
- [x] P6.14 early XR request hardening (d8241da)
- [x] P6.16 Alien Queen replaces the Praetorian (d6ff26f)
- [x] P6.15 phase close: `npm run verify` green (245 unit tests, precache 32.5 of 36 MB). e2e: 17 of 18 pass; the one failure is pre-existing (see Deviations)

## Deviations
- **Lean testing (owner request):** no new e2e tests were written. P6.3 (restart pose), P6.5 (re-enter VR) and P6.14 (`?vr=1` hand-over) have no browser test; they are on the device checklist instead. Unit tests were added only for pure logic (controller roles, update policy, store guards, fire rate at 60/72/90 Hz, Queen pose and slot swap).
- **P6.2:** the field names `rightStickX/Y` now mean "weapon-hand stick" (commented in the code); VR menus accept either stick, so they are unaffected.
- **P6.7:** instead of a local decay in `HitVignette`, the store's `damageFlash` now fades outside PLAYING (in `PlayerController`), which fixes the 2D overlay as well as the VR quad. Rate constant: `DAMAGE_FLASH_DECAY`.
- **P6.12:** the "ENTER VR" check uses `navigator.xr.isSessionSupported`, so on desktop with no headset only the flat button shows.
- **P6.6:** TouchControls releases the stick in an unmount effect; the app-switch pause is a `visibilitychange` listener in `main.tsx`.
- **P6.16 (Alien Queen):**
  - The model has **no skeleton and no animation clips** (one static mesh), so "animations" are whole-body procedural motion from the AI state, not skeletal animation. Real limb animation would need a rigged model.
  - Behaviour and numbers are unchanged from the Praetorian (HP 1100, speed 3.1, 35% resistance, one per phase 3 and 4, leaps as before); only the look, size (about 2.1 m tall), hit sphere and death animation are new. She cannot be dismembered (drone limb gibs do not fit her).
  - The model's licence is **CC BY-NC-ND 4.0**. `tests/credits.test.ts` used to require CC BY 4.0 for every shipped model; it now requires every non-CC-BY licence to be named in `CREDITS.md` (it is). See owner decisions.
  - The skin is brightened like the drones (otherwise near black in the corridor), material set opaque (it was exported as alpha-blended), and darkened while melting.
  - `XenomorphPool.tsx` shrank to ~235 lines by moving the combat provider to `xeno/xenoProvider.ts`.
  - Verified visually in a throwaway viewer (scale, facing +Z, poses) and in the real game via a temporary hook (boss slot shows the Queen, drone clone hidden, no console errors); the hook was removed.
- **Docs:** README, HANDOFF, CONTEXT, IP_REVIEW and CHANGELOG were updated only for the Queen and the phase 6 fixes; the full doc rewrite (encoding repair, counts, stamps) is still phase 10.
- **e2e:** `vr.spec.ts` "walks at the configured speed" measures 1.1 to 1.2 m/s against an expected 1.5 to 2.1 on this machine. It fails identically on the baseline commit `fb94bfb`, so it is not caused by this phase; it looks like a software-rendering artefact (very low frame rate) and was left alone. One other VR test timed out once under load and passed on rerun.
- **Not done in this phase, by plan:** phases 7 to 10 (performance, code health, tests/CI, docs and accessibility).

## Manual Test Checklists

### Phase 6 (needs device testing)
- [ ] **Alien Queen:** reach phase 3 (about 100 s left) on desktop and Quest. She appears once, about 2 m tall, facing you; the stomp, the rear-back before each slash and the death thrash look right; shots land on her body and head; she does not clip the ceiling; the tail may poke through walls at corners (check it is acceptable); she is visible enough in the corridor light; frame rate on Quest 2 holds while she is on screen.
- [ ] Level-up: click a card's button; the upgrade is applied once (max HP +50, not +100).
- [ ] Quest, left-handed mode on: left trigger fires, left face button reloads, left stick turns; right stick moves; right grip cycles weapons.
- [ ] Pause, then Restart from the pause menu: you are back on the start marker facing the corridor, not where you stood.
- [ ] Deploy a new build while a mission is running or in VR: the page does not reload; it updates after you return to a menu outside VR (or on the next launch).
- [ ] Quest: leave VR with the Oculus button; the flat page shows ENTER VR and it re-enters; the in-headset menu appears.
- [ ] Desktop without a headset: no VR button on the start menu. With a headset: the button enters VR first, then the mission starts.
- [ ] Phone: hold the move stick, tap PAUSE, resume: the marine does not keep walking. Switch to another app mid-mission: the game pauses and the music stops.
- [ ] Take a hit, die (flat and VR): the red vignette fades on the defeat screen.
- [ ] Tracker upgrade: a contact between 25 m and 42 m pings and the footer shows the contact.
- [ ] Fire rate: firing feels about 12% faster on Quest 2 than before (this matches the stated rate); retune `fireInterval` if it makes the game too easy.
- [ ] Victory: the score and rank appear after the video, after a tap, or if the video fails (try offline, and iOS Safari).
- [ ] Quest cold start from the installed app: still enters VR by itself; with a deliberately broken bundle it does not strand a black headset (optional).

### Owner decisions raised in this phase
- [ ] **Alien Queen licence (CC BY-NC-ND 4.0):** NonCommercial and NoDerivatives. Decide whether a publicly hosted game showing it (scaled, posed, brightened) is acceptable, or replace it, or ask the author (Quasar3000). Attribution is still not shown in the app (also true of the other seven models).
- [ ] The other open decisions in `.ai/UPLIFT_PLAN_2.md` section 8 are unchanged.
