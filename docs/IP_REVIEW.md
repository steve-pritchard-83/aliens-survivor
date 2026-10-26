# Intellectual Property Inventory

> **Status: inventory only.** This is a neutral list of third-party intellectual property visible in the
> project, prepared so the owner can decide what to do. It is **not legal advice** and makes no determination
> about permission, fair use or risk. Every item below **requires an owner decision**.

## Why this exists

The game is deployed publicly (https://aliens-survivor.vercel.app) and distributed as a sideloadable Quest APK.
It depicts and names elements of the *Alien* / *Aliens* franchise. Publicly distributed works that use another
party's characters, names and audiovisual material generally need the rights holder's permission; this file lists
what is in use so that question can be answered deliberately.

## Franchise elements in use

| Category | Where it appears | Notes |
|---|---|---|
| Titles and settings | `README.md`, `index.html` title, `manifest.json`, menus, `src/ui/*` | "Aliens Survivor", "USS Sulaco", "LV-426" (roadmap), "Sector 4" |
| Corporations and organisations | `src/ui/PwaInstallPrompt.tsx`, `LevelUpModal.tsx`, `VRStatusCanvas.ts` | "Weyland-Yutani", "USCM" (United States Colonial Marines) |
| Characters (names and likeness) | none shipped: the Ripley and Bishop models were removed from the game | (formerly Ellen Ripley and Bishop; the source files remain in `assets/models/`) |
| Creatures | `xenomorph.glb`, `facehugger.glb`, `chestburster.glb`, `egg.glb`, `alien_queen.glb`, Alien Queen boss | Xenomorph drone, Alien Queen, Facehugger, Chestburster, Ovomorph |
| Props and weapons | `pulse_rifle.glb` (M41A), `motion_tracker.glb` (M314), `src/entities/MotionTracker.tsx` | Model titles reference *Aliens* and *Alien: Isolation* |
| Audio | `public/audio/*`, `assets/sound effects/**` | Sound effects and speech of unknown origin; some may be from films or games |
| Video | `public/movies/victory.mp4` | Extraction cut-scene of unknown origin |
| Font | `public/fonts/AlienLeague.otf` | Third-party font; licence unconfirmed |

## Restrictive licence: the Alien Queen model

`public/models/alien_queen.glb` is **CC BY-NC-ND 4.0** (NonCommercial, NoDerivatives), unlike the other seven
models (CC BY 4.0). Decision needed: whether showing it scaled, posed, brightened and melted in a publicly hosted
game is acceptable under that licence, or whether to replace it or ask the author (Quasar3000) for permission.

## Third-party assets requiring attribution

Nine models are CC BY 4.0 and **must be credited**; see `CREDITS.md`. At the time of writing the application
does not display those credits anywhere (neither in the UI nor on the website).

## Decisions needed from the owner

1. Is this a private/personal project, or is it intended for public distribution?
2. If distributed publicly, does the owner hold, or intend to obtain, permission for the franchise elements above?
3. Alternatively, should the franchise elements be replaced with original names, characters and art?
4. Confirm the source and licence of the audio, the cut-scene and the font (`CREDITS.md` lists them as UNKNOWN).
5. Whether the Vercel deployment should remain publicly accessible while these questions are open.
6. Add visible attribution for the CC BY models (an in-app credits screen or a linked credits page).

No code or deployment change has been made on the basis of this inventory.
