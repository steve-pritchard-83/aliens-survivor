# Project Context & Architecture: Aliens Survivor

## Overview
**Aliens Survivor** is a 10-minute (600-second) first-person survival wave shooter set aboard the *USS Sulaco*. Built with Vite 6, React 19, TypeScript, Three.js, React Three Fiber (`@react-three/fiber`), `@react-three/drei`, `@react-three/xr`, and Zustand.

## Coordinate Space & Level Scaling
- `corridor.glb` has an internal Sketchfab scale of `0.0053374` and raw offset `[-752, -1280, -80]`.
- At `scale = 3.5` on the `<CorridorLevel />` group:
  - `worldX = (rawX - 752) * 0.018681`
  - `worldY = (rawZ - 80) * 0.018681` (Floor is at `Y = 0.0`, ceiling is at `Y = 2.50m`)
  - `worldZ = -(rawY - 1280) * 0.018681`
- Walkable corridor consists of:
  - **Main North-South Spine Corridor:** `X` in `[-2.35, -0.65]` (center `X = -1.50`), `Z` in `[8.8, 22.8]`
  - **North East-West Wing:** `X` in `[-13.5, -0.65]`, `Z` in `[20.6, 22.8]` (center `Z = 21.9`)

## Milestone Checklist
- [x] **Milestone 1:** Scaffolding, Asset Inspection (`.ai/ASSET_MANIFEST.md`) & Corridor Environment with Emergency Lighting
- [x] **Milestone 2:** M41A Pulse Rifle Viewmodel, 99-Round Magazine, 2.5s Reload / Overheat Jam & Raycast Combat
- [x] **Milestone 3:** Xenomorph Object Pool (20 pre-allocated `SkeletonUtils.clone` instances), 6 Spawn Vents & 4-Phase 600s Wave Director
- [x] **Milestone 4:** M314 Motion Tracker (180° forward arc, 30m range, pitch-modulated Web Audio pings)
- [x] **Milestone 5:** Mobile PWA Touch Controls, `manifest.json` + Service Worker, and Meta Quest 2 WebXR Integration
