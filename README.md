# Aliens Survivor: USS Sulaco

A 5-minute (300-second) first-person survival wave shooter set aboard the *USS Sulaco*, built with React 19, three.js, React Three Fiber, `@react-three/xr` and Zustand. Plays on Meta Quest 2/3 (WebXR), desktop web (WASD + pointer lock) and mobile (PWA with dual touch zones).

> Engineering detail: [`HANDOFF.md`](./HANDOFF.md). Audit and roadmap: [`docs/AUDIT.md`](./docs/AUDIT.md). Credits and IP inventory: [`CREDITS.md`](./CREDITS.md), [`docs/IP_REVIEW.md`](./docs/IP_REVIEW.md).

---

## Features

- **Three ways to play**
  - **Meta Quest 2/3:** 6DoF controller aiming, an in-headset start/pause/level-up menu, snap or smooth turning, comfort vignette, seated mode, left-handed mode, haptics and a wrist-mounted M314 motion tracker.
  - **Desktop:** WASD, mouse look with adjustable sensitivity and invert-Y, status bar.
  - **Mobile:** left-half move stick, right-half look with auto-fire on targets; installable PWA (optional).
- **Arsenal and gear:** M41A pulse rifle (digital ammo counter, 2.5 s reload, overheat jams), underslung flashlight, muzzle strobe, M314 motion tracker (sweep radar with pitch-modulated pings).
- **Enemies:** pooled Xenomorph drones with five-zone dismemberment, facehuggers and chestbursters, and a Praetorian boss once in each of the last two phases.
- **Progression and scoring:** XP from kills, Field Promotion level-ups with six upgrade cards, three difficulty levels (Recruit, Marine, Ultimate Badass) and a local top-10 leaderboard per difficulty (score from kills, accuracy and survival time).
- **Comfort and accessibility:** snap-turn angles (30°, 45°, 90°) or smooth turning, comfort vignette (off/low/high), reduced-flash mode, seated mode, left-handed mode, master/music/effects volumes, keyboard-focusable settings with labels, zoomable menus on mobile.

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
```

| Script | Purpose |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run check` | Quick loop: type-check and lint only |
| `npm run verify` | The full gate: lint, format check, type-check, tests with coverage, production build, budgets |
| `npm test` | Unit tests (`npm run test:coverage` adds the coverage gate) |
| `npm run e2e` | Playwright browser tests: desktop, mobile emulation and an emulated Quest 3 |
| `npm run format` | Prettier |
| `npm run build` | Type-check and production build |

Append `?debug=1` to the URL for FPS, draw calls, triangles and the adaptive-quality tier.

---

## CI/CD

- **CI (`.github/workflows/ci.yml`):** `npm run verify` on every push and pull request to `main`, followed by the Playwright suite in a separate job.
- **Quest APK (`.github/workflows/build-quest-apk.yml`):** builds the signed Trusted Web Activity wrapper in `quest-build/` on `v*` tags or manual runs. It needs the signing secrets listed in the workflow header and in `HANDOFF.md`.

## Deployment

- **Production:** `https://aliens-survivor.vercel.app` (Vercel builds `main`).
- **Quest:** open the URL in the Quest Browser, or sideload the APK. The game enters VR automatically on Quest; pull the trigger in the start menu to deploy.
