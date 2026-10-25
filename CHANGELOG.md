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

### Fixed
- Touch auto-aim no longer damages aliens just by looking at them, and bullets from the player and Bishop no longer pass through walls.
- Level-ups no longer wipe live aliens or teleport Bishop; AI and effects freeze while you choose an upgrade.
- VR level-up: a held trigger can no longer auto-pick a card, and all three cards are reachable.
- Praetorian spawns once in phase 3 and once in phase 4 (it used to respawn endlessly).
- VR quality scaling works: the framebuffer scale is chosen per device at session start and runtime tiers trim effects.
- VR: snap and smooth turns pivot about the head, walking into a wall (stick or room-scale) is clamped with a 15 cm margin, haptics follow handedness, the mission starts with the head on the start marker, and the headset removal, system menu and session end pause the game safely.
- VR end screens no longer restart automatically after 9 seconds.
- Mobile: the PWA install screen is optional, menus can be pinch-zoomed, and the manifest describes the real 5-minute game.

### Changed
- **Walking speed is now frame-rate independent at 1.2 m/s.** It used to integrate from a position refreshed only every 50 ms, so the real speed varied with frame rate (about 1.2 m/s on Quest at 72 Hz, 1.4 at 60 fps, 2.8 at 30 fps) and was never the 4.2 the constant claimed. 1.2 keeps the Quest feel; change `BALANCE.PLAYER.MOVE_SPEED` for a different pace.
- Facehugger and chestburster kills now award 15 XP (previously 25, the same as a drone).
- `balance.ts` is the single source of truth for combat numbers (values unchanged unless listed here).
- Sound effects and music are AAC; the offline cache dropped from 15.9 MB to 10.6 MB and the largest script chunk from 1.44 MB to 834 kB.
- Wall hit tests use a BVH and no longer allocate per shot; the motion tracker redraws at 20 Hz.
- The Quest APK workflow now signs from repository secrets and fails clearly if they are missing; no credentials are stored in the repository.
