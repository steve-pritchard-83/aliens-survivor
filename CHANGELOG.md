# Changelog

## Unreleased

### Fixed
- Touch auto-aim no longer damages aliens just by looking at them; bullets from the player and Bishop no longer pass through walls.
- Level-ups no longer wipe live aliens or teleport Bishop; AI and effects freeze while choosing an upgrade.
- VR level-up: stick selects a card, trigger confirms; a held trigger can no longer auto-pick; all three cards reachable.
- Praetorian spawns once in phase 3 and once in phase 4 (previously respawned endlessly).
- VR adaptive quality now works: framebuffer scale is chosen per device at session start, runtime tiers trim effects.
- Settings persist across reloads; best kills saved on victory as well as defeat and shown on menu and end screens.

### Changed
- Small aliens (facehugger, chestburster) now award 15 XP per kill (previously 25, same as a drone).
- `balance.ts` is now the single source of truth for combat numbers (values unchanged unless listed here).
