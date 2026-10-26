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
- Quality tooling: ESLint, Prettier, a `verify` gate, coverage thresholds, bundle/precache/light budgets, 263 unit tests and 18 Playwright tests (including an emulated Quest 3).

### Changed (performance)
- The HUD no longer re-renders on every hit flash or shot; the input snapshot is reused; small-alien animation, kills and spawns allocate nothing per frame; menus stop redrawing the tracker; one shared impact-effect instance serves drones and small aliens; the service worker registers after the first scene loads (the first visit no longer downloads the models twice); audio loading starts before the audio context resumes.
- VR panels open in front of you and stay put (they used to follow your head), redraw at 4 Hz, and level-up card text wraps instead of being cut off.

### Changed (accessibility, build and hosting)
- The pause dialog traps focus and closes on Escape; the level-up screen is a labelled dialog; hint text and the build id have higher contrast.
- CI runs the browser tests on every push and pull request, uses a read-only token, cancels superseded runs, pins third-party actions in the signing job and validates the Gradle wrapper. `vercel.json` adds cache and security headers and 404s missing files instead of serving the app.
- Cleanup: the torch, companion, gyro and other dead code are gone; game numbers and map layout (spark emitters, egg spots, lights) moved to `balance.ts` and the level definition; GPU resources are freed on unmount.

### Changed (boss)
- **The Praetorian is replaced by the Alien Queen** (`alien_queen.glb`). Same behaviour and numbers (HP, speed, damage resistance, one per phase 3 and 4); the model is a single static mesh, so she is animated procedurally: breathing, a heavy stomping gait with tail swing, a rear-back and lunge for each slash, and a thrash, rear-up and slump when killed. She cannot be dismembered and her hit sphere now matches her size. **Licence note:** the model is CC BY-NC-ND 4.0; see `CREDITS.md`.

### Changed (look)
- Faint blue-teal grade over the picture, thick close teal fog (1.5 to 15 m), and a light teal-blue M314 tracker with a fuzzy CRT effect (grain, scanlines, rolling band, glitch lines).

### Changed (gameplay)
- **Level-ups no longer freeze the game mid-fight.** If a hostile is within 14 m when the XP line is crossed, the upgrade is held back (a "FIELD PROMOTION READY" hint shows on flat screens) and the cards open after 1.5 s of calm, or after 60 s at the latest.

### Added (audio)
- **Metal deck footsteps** for the player and for drones and the Praetorian (heavier and deeper), one every stride actually walked, from four new sounds, `stepmetal1.wav` to `stepmetal4.wav`.

### Changed (Quest)
- **Faster entry into VR from the installed app:** the VR session is now requested by a tiny script at the very start of page load, before the bundles download, so a slow first load after an update can no longer lose the browser's click allowance and strand you on the 2D page.

### Changed (clarity and feedback)
- **Render resolution 70% -> 80%** on flat screens, and Quest 2 in VR 72% -> 80% (Quest 3 stays at 85%). Costs some frame rate; `dpr` in `App.tsx` and `frameBufferScaling` in `core/XRStore.ts` are the two numbers.
- **Sharper VR panels:** the level-up cards, pause menu and start menu are drawn at 1.5x and sampled without mipmaps, so their text is no longer soft.
- **Red hit effect:** a blood-red vignette with a faint wash now shows when you are hit, in VR as well as on flat screens, and a bigger hit flashes harder. Reduced-flash mode keeps it gentle.

### Removed
- **Bishop and the Ripley player model.** The AI companion (patrol, covering fire, rig) and the hidden first-person body are gone, along with their two models (about 14 MB less to download).
- **The rifle torch** (flashlight): the spotlight, the F key, the Quest controller button and the `flashlightOn` state.

### Fixed
- A level-up card is applied once (clicking its button used to apply it twice); kills outside PLAYING are ignored; the card shuffle is unbiased.
- Left-handed VR: fire, reload, turn, move and weapon-cycle now follow the weapon hand.
- Restart from the pause menu puts the player back on the start marker.
- A downloaded update no longer reloads the page mid-mission or in VR; it waits for a menu or end screen outside VR.
- On Quest the flat page now shows an ENTER VR button after you leave VR; elsewhere the VR button appears only when a headset is available, and the mission starts only after VR is entered.
- The touch stick releases when you pause; the phone pauses (with sound) when you switch apps; one pause path stops music and klaxon everywhere.
- The red hit effect fades on the defeat and pause screens; the motion tracker upgrade pings out to its full range; upgrade texts match what they do.
- Rifle fire rate no longer depends on frame rate (about 12% faster on Quest 2 at 72 Hz, matching the stated rate).
- The victory score no longer waits on the extraction video (tap to skip; shown on error, blocked playback or timeout).
- Early VR request: exact `vr=1` match, a session that ended is not reused, an unclaimed session is ended after 20 s.
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
- Sound effects and music are AAC and the largest script chunk dropped from 1.44 MB to 834 kB. Models are back to their original uncompressed files, so the offline cache is about 31.5 MB (after removing Bishop and Ripley).
- Wall hit tests use a BVH and no longer allocate per shot; the motion tracker redraws at 20 Hz.
- The Quest APK workflow now signs from repository secrets and fails clearly if they are missing; no credentials are stored in the repository.
