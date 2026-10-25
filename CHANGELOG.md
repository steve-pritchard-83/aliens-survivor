# Changelog

## Unreleased

### Added
- **Difficulty:** Recruit, Marine (the original balance) and Ultimate Badass, chosen on the start and end screens (2D and VR). **Scoring:** a score from kills, accuracy and survival time with a ranked local top-10 board per difficulty, shown on the menus and end screens.
- **Weapon framework:** weapon profiles, an active-weapon state and weapon cycling (Q, left grip); only the M41A exists until assets for new weapons are supplied. **Level framework:** maps are data (`LevelDefinition`), with the Sulaco as the first.
- **Settings:** master/music/effects volume, comfort vignette (off/low/high), seated mode, mouse sensitivity, invert-Y and an optional status bar (health, ammo, clock, phase). All are validated and persisted.
- **VR menus:** an in-headset start menu (the mission waits for a trigger press), a stick-driven pause menu with all settings, and a stick-driven level-up screen.
- **Comfort vignette** in VR that darkens the periphery while turning or walking.
- Best-kills record shown on the menu and end screens (2D and VR), saved on victory as well as defeat.
- Credits and provenance file (`CREDITS.md`), IP inventory (`docs/IP_REVIEW.md`), architecture decision records and the audit record.
- Quality tooling: ESLint, Prettier, a `verify` gate, coverage thresholds, bundle/precache/light budgets, 226 unit tests and 18 Playwright tests (including an emulated Quest 3).

### Changed (look)
- Faint blue-teal grade over the picture, thick close teal fog (1.5 to 15 m), and a light teal-blue M314 tracker with a fuzzy CRT effect (grain, scanlines, rolling band, glitch lines).

### Changed (film look)
- A pale glowing opening at the end of the east spine seen through the haze (card, light beam and one light), a cold fresnel rim glow on drones, facehuggers, chestbursters, eggs and Bishop, wet reflective skin on the creatures from a small teal environment map, and on flat screens a teal grade with vignette and animated film grain.

### Removed
- **The rifle torch** (flashlight): the spotlight, the F key, the Quest controller button and the `flashlightOn` state.

### Fixed
- Acid pools left on the deck by dying enemies are now very dark green instead of bright lime.
- **Models:** restored the original GLB files. The compressed set (flattened, merged and simplified by `gltf-transform optimize`) made the xenomorph invisible and Bishop show only his lower half.
- Touch auto-aim no longer damages aliens just by looking at them, and bullets from the player and Bishop no longer pass through walls.
- Level-ups no longer wipe live aliens or teleport Bishop; AI and effects freeze while you choose an upgrade.
- VR level-up: a held trigger can no longer auto-pick a card, and all three cards are reachable.
- Praetorian spawns once in phase 3 and once in phase 4 (it used to respawn endlessly).
- VR quality scaling works: the framebuffer scale is chosen per device at session start and runtime tiers trim effects.
- VR: snap and smooth turns pivot about the head, walking into a wall (stick or room-scale) is clamped with a 15 cm margin, haptics follow handedness, the mission starts with the head on the start marker, and the headset removal, system menu and session end pause the game safely.
- VR end screens no longer restart automatically after 9 seconds.
- Mobile: the PWA install screen is optional, menus can be pinch-zoomed, and the manifest describes the real 5-minute game.

### Changed
- **Walking speed is now frame-rate independent:** 3.0 m/s on desktop and touch, 1.8 m/s in VR (`BALANCE.PLAYER.MOVE_SPEED`, `XR_MOVE_SPEED`). It used to integrate from a position refreshed only every 50 ms, so the real speed varied with frame rate (about 1.4 m/s at 60 fps, 2.8 at 30 fps). A first attempt at 1.2 m/s was too slow.
- Facehugger and chestburster kills now award 15 XP (previously 25, the same as a drone).
- `balance.ts` is the single source of truth for combat numbers (values unchanged unless listed here).
- Sound effects and music are AAC and the largest script chunk dropped from 1.44 MB to 834 kB. Models are back to their original uncompressed files, so the offline cache is about 46 MB.
- Wall hit tests use a BVH and no longer allocate per shot; the motion tracker redraws at 20 Hz.
- The Quest APK workflow now signs from repository secrets and fails clearly if they are missing; no credentials are stored in the repository.
