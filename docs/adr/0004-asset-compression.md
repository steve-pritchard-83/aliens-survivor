# ADR 0004: Compress audio at the source; ship models uncompressed

**Status:** accepted, amended (models) · **Script:** `scripts/compress-audio.mjs`

## Context
The service worker precaches every shipped asset so the game works offline on Quest and phones, and the cache must stay small. Raw GLBs were 40 MB and raw WAV effects 7 MB.

## Decision
- Models: shipped as authored (about 41 MB). An earlier `gltf-transform optimize` pass (meshopt, WebP, and its default flatten/join/simplify steps) broke the skinned models in the live game (invisible xenomorph, Bishop missing his upper body), so it was reverted and the script removed. Any future model compression must keep node hierarchy, bone names and skinning intact (for example `--compress meshopt` only, with `--no-flatten --no-join --no-simplify`) and be checked visually in a production build.
- Audio: effects are **AAC `.m4a`** (mono, 96 kbps), music 80 kbps. Gunfire, dry-fire, tracker ping and UI cues stay **WAV** because AAC adds encoder padding that would delay sample-accurate starts.
- Originals are kept out of the served tree (`assets/audio-src/`, `assets/models/`).
- Budgets are enforced: precache ≤ 36 MB (about 31.5 MB with the original models, after the Bishop and Ripley models were removed).

## Consequences
- Adding an audio asset means running the audio script; every new asset needs a `CREDITS.md` row (a test checks the model rows).
- Decode cost is paid once at load (`AudioManager.unlock`).
