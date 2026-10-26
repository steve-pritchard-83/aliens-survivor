# Audit and Uplift Record

Baseline audit: 25 Oct 2026 at commit `ffa46eb` (**48 / 100**). Re-scored after the uplift programme (phases 0–4) from evidence in the repository. The earlier "~76/100" figure in the old HANDOFF.md could not be reproduced and has been removed.

> **How to read the "after" scores.** They are based on code, automated tests (unit, coverage, browser, emulated-Quest), budgets and CI configuration. **Nothing has been verified on a physical headset or phone yet**, and the GitHub Actions run has not been observed. The device checklists in `.ai/UPLIFT_PROGRESS.md` are the remaining evidence.

## 1. Scorecard

| Area | Weight | Before | After | Evidence for the change |
|---|---|---|---|---|
| Gameplay correctness | 15 | 4.5 | 8.0 | C1–C5 and H1–H2 fixed with unit and e2e tests; frame-rate dependent movement fixed |
| Performance (Quest 2) | 15 | 6.0 | 8.0 | BVH wall raycasts, allocation-free hot paths, 15.9 → 10.6 MB precache, chunk split, tiers; not yet measured on device |
| Architecture | 10 | 6.5 | 8.5 | Query/resolve combat, pure `systems/`, `*Sim`/`*AI` modules, single balance source |
| Code quality | 10 | 5.0 | 8.5 | Lint-enforced size and style, unpacked code, shared pathing, no empty `catch` |
| Testing | 10 | 3.0 | 8.5 | 8 → 264 unit tests, 86.5% line coverage on the logic layers, 18 browser tests including emulated Quest 3 |
| CI/CD | 8 | 5.0 | 7.0 | `verify` gate, e2e job, budgets, signed-APK workflow (not yet run on GitHub) |
| Documentation | 8 | 5.0 | 8.5 | HANDOFF/CONTEXT/CONVENTIONS rewritten from the code, ADRs, credits, audit record |
| UX and accessibility | 10 | 5.0 | 8.0 | VR menus, volumes, vignette, seated mode, optional PWA prompt, labelled settings, zoomable menus |
| Security | 4 | 8.0 | 8.0 | 0 npm vulnerabilities; signing credentials removed from the Gradle file; secrets only via CI |
| Legal / IP | 10 | 2.0 | 3.0 | Provenance recorded (`CREDITS.md`), neutral inventory (`docs/IP_REVIEW.md`); **decisions still open** |
| **Total** | 100 | **48** | **≈ 76** | |

## 2. Findings and status

| ID | Finding | Status | How it was closed / evidence |
|---|---|---|---|
| C1 | Touch auto-aim probe damaged aliens every frame | Fixed | `CombatSystem.queryTarget` is side-effect free (`tests/combat.test.ts`, `tests/rifle.test.ts`) |
| C2 | Bullets passed through walls (player and the since-removed Bishop) | Fixed | `resolveShot` applies damage only to the nearest unoccluded target (`tests/combat.test.ts`) |
| C3 | VR level-up auto-picked card 1 | Fixed | Stick selection, edge-detected confirm, arm delay (`tests/vrMenuNav.test.ts`, emulated-Quest e2e) |
| C4 | Adaptive quality never worked in VR | Fixed | Scale chosen once per device; effect tiers adapt (`tests/qualityState.test.ts`); **verify on device** |
| C5 | Level-ups wiped aliens and teleported the since-removed Bishop | Fixed | `runId`-based resets; e2e checks aliens persist through a level-up |
| H1 | Praetorian respawned endlessly | Fixed | `shouldSpawnBoss` once per phase (`tests/waveDirector.test.ts`) |
| H2 | AI kept simulating during level-up | Fixed | `isSimulationFrozen` in all loops |
| H3 | `balance.ts` was not the source of truth | Fixed | Values moved and centralised; small kills now award 15 XP (changelog) |
| H4 | APK workflow could not work; credentials in Gradle file | Fixed in repo, **owner action needed** | Wrapper tracked, signing from env, workflow rewritten; secrets must be created and the keystore backed up |
| H5 | Wall raycasts tested every triangle and allocated | Fixed | three-mesh-bvh, reused results (`tests/envRaycast.test.ts`) |
| H6 | 250-line rule met by cramming; duplicated pathing | Fixed | ESLint `max-lines` + `max-statements-per-line`; shared `corridorPathing` |
| M | Settings not persisted; record only on defeat | Fixed | `Persistence`, validated; record saved on victory too |
| M | Snap turn about origin; room-scale not clamped; aliens aimed at origin | Fixed | Head-centred rig (`xrRig`), emulated-Quest e2e |
| M | Haptics ignored handedness | Fixed | Semantic weapon/tracker hands (`tests/haptics.test.ts`) |
| M | VR auto-restart after 9 s, no menu | Fixed | In-headset start menu, redeploy on a fresh trigger press |
| M | 8.7 MB WAV audio, no volume, no voice cap | Fixed | AAC, buses, 24-voice cap, cheaper panners |
| M | Per-frame canvas texture uploads | Fixed | Tracker 20 Hz with version gate; status panel 10 Hz or on change |
| M | Mandatory PWA install gate | Fixed | Optional, platform-aware, remembered |
| M | Empty `catch` blocks, unused-code checks off | Fixed | Lint rule, `noUnusedLocals/Parameters` on |
| M | Zoom disabled; 2D/VR snap options differed | Fixed | Viewport allows zoom; shared option list |
| M | Documentation drift | Fixed | Rewritten from the code; credits test; budgets in CI |
| L1 | Franchise IP and third-party assets published without attribution or licence | **Open** | Nine CC BY 4.0 models need visible attribution (not yet shown in the app); audio, video and font provenance unknown; see `docs/IP_REVIEW.md` |

## 3. Remaining risks and recommendations

1. **Legal / IP (highest priority).** Owner decisions listed in `docs/IP_REVIEW.md` are still pending; consider keeping the deployment private until they are made, and add visible CC BY attribution (a credits screen) regardless.
2. **Device verification.** Run the manual checklists (headset, phone, desktop), especially the walking-speed decision (1.2 m/s), VR menu legibility, comfort vignette feel, AAC sound starts and BVH load time.
3. **CI on GitHub.** Push a branch and confirm both jobs (`verify`, `e2e`) pass on Linux, then create the four APK signing secrets and back up the keystore.
4. **Residual quality items.** The 68 MB `assets/` source folder lives in the repo (LFS or external storage is an owner decision); Alien Queen and small-alien balance have not been re-tuned (the companion Bishop that this item once covered was removed).
5. **Repository history.** An earlier version of `HANDOFF.md` containing the headset serial number remains in git history (history was deliberately not rewritten).

## 4. Product depth added in phase 5

Beyond fixing findings, the programme added the structure for future content: difficulty profiles and a ranked local leaderboard (both tested and shown in 2D and VR), a weapon-profile framework with weapon cycling (one weapon registered), and a data-driven `LevelDefinition` with validation (the Sulaco is the first map; a second synthetic map proves the systems are level-agnostic). Designs for the Smartgun, Flamethrower and an LV-426 map are in `docs/design/`; building them needs art and sound assets and owner decisions, which are listed in `HANDOFF.md` section 9.

## 5. Method

Baseline: read all source and docs, ran the tests, build, `npm audit` and `npm outdated`. After: every claim above maps to a test, lint rule, budget or a documented manual check. See `.ai/UPLIFT_PLAN.md` (the execution plan) and `.ai/UPLIFT_PROGRESS.md` (commit-by-commit record, deviations, checklists).

## 6. Re-audit 2 (27 Oct 2026)

A second audit at commit `fb94bfb` scored **64 / 100** on the same ten areas (each out of 10; the weight column above is nominal). The earlier ≈ 76 had slipped because feature work after phase 5 (footsteps, hit vignette, level-up gate, update timer, early XR request, removing Bishop and the torch) landed without tests or documentation, and a deeper read of the UI and VR paths found defects the first audit missed. The findings, fixes and evidence are in `.ai/UPLIFT_PLAN_2.md` and `.ai/UPLIFT_PROGRESS_2.md`.

| Area | Baseline | After | Evidence for the change |
|---|---|---|---|
| Gameplay correctness | 6.5 | 8.5 | Cards applied once, left-handed controls, restart pose, no mid-run reload, VR re-entry, fire rate, tracker range, victory without the video (unit tests; device checks pending) |
| Performance (Quest 2) | 7.0 | 7.5 | HUD re-render fix, allocation-free hot paths, one FX instance, single service-worker download, VR panel redraw at 4 Hz; **not measured on a device** |
| Architecture | 8.0 | 8.5 | Numbers in `balance.ts`, map dressing on the level, pool provider and music split out |
| Code quality | 7.5 | 8.5 | Dead code and duplicates removed, resources freed on unmount, size limit restored |
| Testing | 7.0 | 8.0 | 264 unit tests, widened coverage include list, footstep and hosting-config tests; the browser suite still relies on documented holds and one loosened bound |
| CI/CD | 6.0 | 7.5 | e2e on every PR and push, read-only token, concurrency, pinned actions, wrapper validation, Node pinned (**not yet observed on GitHub**) |
| Documentation | 6.0 | 8.0 | Encoding repaired and guarded by a test, stamps, counts and layout updated |
| UX and accessibility | 6.5 | 8.0 | Focus trap, dialog roles, contrast, wrapped VR card text, ENTER VR button |
| Security | 6.5 | 7.5 | Cache and security headers, stricter rewrite; no CSP (the inline XR script would need a hash) |
| Legal / IP | 3.0 | 2.5 | **Worse:** the Alien Queen model is CC BY-NC-ND 4.0; attribution still not shown; decisions open |
| **Total** | **64** | **≈ 77** | |

Still open: the owner decisions in `docs/IP_REVIEW.md` and `.ai/UPLIFT_PLAN_2.md` section 8, device verification of every checklist, the GitHub run, and the dependency majors (three, vite, TypeScript, ESLint).
