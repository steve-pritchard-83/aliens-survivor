# ADR 0004: Compress models and audio at the source

**Status:** accepted · **Scripts:** `scripts/compress-models.mjs`, `scripts/compress-audio.mjs`

## Context
The service worker precaches every shipped asset so the game works offline on Quest and phones, and the cache must stay small. Raw GLBs were 40 MB and raw WAV effects 7 MB.

## Decision
- Models: `gltf-transform optimize` with **meshopt** geometry and **WebP** textures (40.5 MB → ~5.7 MB). drei's `useGLTF` decodes both.
- Audio: effects are **AAC `.m4a`** (mono, 96 kbps), music 80 kbps. Gunfire, dry-fire, tracker ping and UI cues stay **WAV** because AAC adds encoder padding that would delay sample-accurate starts.
- Originals are kept out of the served tree (`assets/audio-src/`, `assets/models/`).
- Budgets are enforced: precache ≤ 11 MB (currently ~10.6 MB).

## Consequences
- Adding an asset means running the matching script and updating `CREDITS.md` (a test checks the model rows).
- Decode cost is paid once at load (`AudioManager.unlock`).
