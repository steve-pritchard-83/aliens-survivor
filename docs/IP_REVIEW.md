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
| Characters (names and likeness) | `ripley.glb`, `bishop.glb`, `src/entities/BishopCompanion.tsx`, `PlayerController.tsx` | Ellen Ripley, Bishop (Lance Henriksen likeness in the model title) |
| Creatures | `xenomorph.glb`, `facehugger.glb`, `chestburster.glb`, `egg.glb`, Praetorian mini-boss | Xenomorph drone, Praetorian, Facehugger, Chestburster, Ovomorph |
| Props and weapons | `pulse_rifle.glb` (M41A), `motion_tracker.glb` (M314), `src/entities/MotionTracker.tsx` | Model titles reference *Aliens* and *Alien: Isolation* |
| Audio | `public/audio/*`, `assets/sound effects/**` | Sound effects and speech of unknown origin; some may be from films or games |
| Video | `public/movies/victory.mp4` | Extraction cut-scene of unknown origin |
| Font | `public/fonts/AlienLeague.otf` | Third-party font; licence unconfirmed |

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
