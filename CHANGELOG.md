# Changelog

## Unreleased

### Fixed
- VR: snap and smooth turns pivot about the head instead of the play-space centre, and walking into a wall (stick or room-scale) is clamped with a 15 cm margin. Aliens, Bishop, the tracker and audio now track the head position.
- VR mission start places the head on the start marker.
- Touch auto-aim no longer damages aliens just by looking at them; bullets from the player and Bishop no longer pass through walls.
- Level-ups no longer wipe live aliens or teleport Bishop; AI and effects freeze while choosing an upgrade.
- VR level-up: stick selects a card, trigger confirms; a held trigger can no longer auto-pick; all three cards reachable.
- Praetorian spawns once in phase 3 and once in phase 4 (previously respawned endlessly).
- VR adaptive quality now works: framebuffer scale is chosen per device at session start, runtime tiers trim effects.
- Settings persist across reloads; best kills saved on victory as well as defeat and shown on menu and end screens.

### Added
- Settings: master/music/effects volume, comfort vignette (off/low/high), seated mode, mouse sensitivity, invert Y, optional status bar; all persisted. VR pause menu rebuilt as a stick-driven list.
- Comfort vignette in VR (darkens the periphery during turning and movement).

### Changed
- **Player movement is now frame-rate independent at 1.2 m/s.** It used to integrate from a position refreshed only every 50 ms, so real speed varied with frame rate (about 1.2 m/s on Quest at 72 Hz, 1.4 at 60 fps, 2.8 at 30 fps) and was never the 4.2 the constant claimed. 1.2 keeps the Quest feel; change `BALANCE.PLAYER.MOVE_SPEED` if a different pace is wanted.
- Small aliens (facehugger, chestburster) now award 15 XP per kill (previously 25, same as a drone).
- `balance.ts` is now the single source of truth for combat numbers (values unchanged unless listed here).
