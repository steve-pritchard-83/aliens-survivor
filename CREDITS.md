# Credits and Asset Provenance

This file records where every shipped asset comes from, **as far as can be determined from the files themselves**.
Where provenance is not recorded in the asset, it says `UNKNOWN: needs owner confirmation` rather than guessing.
Regenerate the model rows with `node scripts/list-asset-metadata.mjs`.

## 3D models (`public/models/*.glb`)

All nine shipped models carry their Sketchfab attribution in the glTF `asset.extras`, and all are licensed
**CC BY 4.0** (https://creativecommons.org/licenses/by/4.0/). That licence **requires visible attribution** to
the author, a link to the licence and a note of any changes. The files are shipped as authored.

| File | Title | Author | Source |
|---|---|---|---|
| `chestburster.glb` | ChestBurster | Love me pls (LoveMeToo) | https://sketchfab.com/3d-models/chestburster-ab7af0d34ee84e2db1b7576326a3a314 |
| `corridor.glb` | Sci-Fi Corridors | SRFstudio | https://sketchfab.com/3d-models/sci-fi-corridors-e91df3be5acf4ad29d664f6fc20c125c |
| `egg.glb` | Face Hugger Egg | by.antihrist | https://sketchfab.com/3d-models/face-hugger-egg-cbb1b8b38c1d49359ec36fbb2bb3020c |
| `facehugger.glb` | Facehugger | Love me pls (LoveMeToo) | https://sketchfab.com/3d-models/facehugger-7a8c0a476c3845a48b73d9b94cbf0809 |
| `motion_tracker.glb` | Alien Isolation Motion Tracker | letsteach1979 | https://sketchfab.com/3d-models/alien-isolation-motion-tracker-a2d468175c574939bb93a8c667e96c92 |
| `pulse_rifle.glb` | Aliens Pulse Rifle | sirsaugsage | https://sketchfab.com/3d-models/aliens-pulse-rifle-70201c6c5c024b418110903c5bfa4046 |
| `xenomorph.glb` | Realistic Xenomorph Rig | NO DONT EAT ME CASEOH (Ferris wheel) | https://sketchfab.com/3d-models/realistic-xenomorph-rig-9b84acf1f7bf4ada867408a8d05c60d0 |

Note: a CC BY licence covers the 3D artist's work only. It does not license the underlying film, game or
character IP depicted (see `docs/IP_REVIEW.md`).

Unused source model: `assets/models/alien_queen.glb` is not shipped.

## Font

| Asset | Details | Licence |
|---|---|---|
| `public/fonts/AlienLeague.otf` | "Alien League Regular" (2013), file metadata names **Iconian Fonts** (www.iconian.com) | UNKNOWN: needs owner confirmation. Iconian fonts are often distributed for personal use only; commercial use may need a licence. |

## Audio

| Asset | Details | Licence |
|---|---|---|
| `public/audio/sfx_*` (effects: weapons, alien and marine vocals, impacts, UI, ambience) | Derived from the `assets/sound effects/` source library. The files carry no author or licence metadata. The folder structure (`character/alien/vocals`, `speech/en/ai/male_marine_01`, `weapons/human/pulse_rifle`) suggests a game or commercial sound-pack origin. | UNKNOWN: needs owner confirmation |
| `public/audio/bgm_sulaco.m4a` | Encoded from `assets/music/bgmusic.mp3` (200 s). No tags. | UNKNOWN: needs owner confirmation |
| `public/audio/defeat.mp3` | Identical to `assets/sound effects/defeat.mp3`. No tags. | UNKNOWN: needs owner confirmation |

## Video

| Asset | Details | Licence |
|---|---|---|
| `public/movies/victory.mp4` | Extraction cut-scene. The only embedded tag is `encoder=Google`; no source or rights information. | UNKNOWN: needs owner confirmation |

## Icons

`public/icon.svg`, `icon-192.png`, `icon-512.png`: created for this project. UNKNOWN whether any third-party
artwork was used; confirm with the owner.

## Software

Runtime dependencies are listed in `package.json` (React, three.js, `@react-three/*`, zustand, three-mesh-bvh,
`vite-plugin-pwa`) and are used under their own open-source licences (MIT).
