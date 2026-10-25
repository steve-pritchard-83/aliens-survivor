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
- [ ] P1.1 Lint + verify pipeline
- [ ] P1.2 Balance single source of truth
- [ ] P1.3 Shared pure systems
- [ ] P1.4 Restore 250-line limit
- [ ] P1.5 BVH environment raycast
- [ ] P1.6 Audio rework
- [ ] P1.7 Canvas texture throttling
- [ ] P1.8 Code splitting
- [ ] P1.9 Phase close

## Phase 2 — Tests and gates
- [ ] P2.1 Pure AI step functions
- [ ] P2.2 Unit test suite
- [ ] P2.3 Coverage gate
- [ ] P2.4 Playwright smoke
- [ ] P2.5 Budgets
- [ ] P2.6 IWER (optional)
- [ ] P2.7 Phase close

## Phase 3 — UX
- [ ] P3.1 Settings model
- [ ] P3.2 2D settings panel
- [ ] P3.3 VR pause menu
- [ ] P3.4 Comfort vignette
- [ ] P3.5 Head-centred turn, clamp
- [ ] P3.6 Haptics handedness
- [ ] P3.7 VR menu and end screens
- [ ] P3.8 PWA prompt
- [ ] P3.9 HUD and viewport
- [ ] P3.10 Phase close

## Phase 4 — Docs and governance
- [ ] P4.1 HANDOFF rewrite
- [ ] P4.2 Other docs
- [ ] P4.3 Credits scaffold
- [ ] P4.4 Repo hygiene
- [ ] P4.5 APK pipeline
- [ ] P4.6 Phase close

## Phase 5 — Product depth
- [ ] P5.1 Difficulty
- [ ] P5.2 Leaderboard
- [ ] P5.3 Weapon framework
- [ ] P5.4 Level definition
- [ ] P5.5 Phase close

## Deviations
- Phase boundaries: user instructed "execute all phases", so phases proceed without waiting for approval between them. Manual checklists are still recorded per phase.

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
