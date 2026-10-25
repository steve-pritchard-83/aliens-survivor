# Aliens Survivor: USS Sulaco

A 300-second (5-minute) survival wave shooter set aboard the *USS Sulaco*, built with React 19, Three.js, React Three Fiber, `@react-three/xr`, and Zustand. Designed for cross-platform play across Meta Quest 2/3 (WebXR TWA), Desktop Web (WASD + Pointer Lock), and Mobile PWA (Dual Virtual Joysticks).

---

## Features

- **Cross-Platform Dual-Mode Input**:
  - **Meta Quest 2/3**: Stereoscopic 3D 6DoF with Touch Controller aiming, 45°/90°/smooth snap turn options, haptics, and wrist-mounted M314 Motion Tracker.
  - **Desktop Web**: First-person WASD corridor locomotion with mouse look and smooth recoil recovery.
  - **Mobile PWA**: Dual-zone touch controls (left stick locomotion, right stick aiming & auto-engagement).
- **Iconic USCM Arsenal**:
  - M41A Pulse Rifle (canonical 76cm prop scale, 99-round digital counter, 2.5s reload, overheat jamming).
  - Tactical Underslung Spotlight & Muzzle Strobe.
  - M314 Motion Tracker (180° / 360° radar sweep, pitch-modulated audio pings).
- **Xenomorph Threat & Dismemberment**:
  - Object-pooled Xenomorph Drones with 5-zone limb dismemberment (arms, legs, head decapitation).
  - Facehuggers and Chestbursters with serpentine procedural locomotion.
  - Phase 3/4 Praetorian Guard mini-boss (1.35x scale, armored DR, heavy charge attack).
- **Survivor RPG Progression**:
  - XP from hostile eliminations with Field Promotion Level-Ups.
  - 6 Upgrade Cards (Overclocked Actuator, 150-Round Drum, Chitin Armor, Armor Piercing Rounds, 360° Scanner, Hazmat Acid Resistance).
- **Comfort & Accessibility Settings**:
  - VR Snap Turn angles (30°, 45°, 90°, or smooth continuous turning).
  - Reduced-Flash Mode for photosensitive comfort.
  - Left-Handed Mode (swaps weapon and motion tracker hands).

---

## Quick Start

### Development
```bash
npm install
npm run dev
```

### Run Unit Tests
```bash
npm test
```

### Production Build
```bash
npm run build
```

---

## Automated CI/CD & Build Pipelines

- **CI Pipeline (`.github/workflows/ci.yml`)**: Automated Node 22 TypeScript type-checking, Vitest suite execution, and production Vite compilation on every commit and PR to `main`.
- **Quest APK Pipeline (`.github/workflows/build-quest-apk.yml`)**: Automated Gradle compilation for Meta Quest Horizon OS APKs on release tags.

---

## Deployment & Quest Sideloading

- **Production URL**: `https://aliens-survivor.vercel.app`
- **Quest 2 Launch**: Launch via Quest Browser or sideloadable Horizon OS TWA APK at `https://aliens-survivor.vercel.app/?vr=1`.
- **Debug Telemetry**: Append `?debug=1` to display real-time FPS, frame time, draw calls, triangles, and memory counters.
