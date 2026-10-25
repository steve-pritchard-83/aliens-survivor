# ADR 0006: Choose resolution once, adapt effects at runtime

**Status:** accepted · **Where:** `src/core/XRStore.ts`, `AdaptiveQuality.tsx`, `QualityState.ts`

## Context
The original governor called `setFramebufferScaleFactor` every second, but three.js 0.174 ignores that call while a session is presenting (it only logs a warning), so adaptation never happened.

## Decision
- The framebuffer scale is chosen **once** when the session starts, by device class (`0.85` Quest 3, `0.72` Quest 2/unknown), via the XR store's `frameBufferScaling` option.
- `AdaptiveQuality` measures FPS in 1.2 s windows and moves a **tier** (2 → 0) down after two slow windows (< 66 fps) and up after five fast ones (≥ 71.5 fps). Effects read `quality.tier` in their frame loops: sparks, decals, acid droplets and eggs. Nothing is mounted or unmounted.

## Consequences
- Effect cost scales with load without touching resolution, lights or shaders.
- The tier is shown with `?debug=1`. Any new effect with a variable cost should honour `quality.tier`.
- The IWER e2e harness (VITE_E2E_XR) is covered in ADR 0003.
