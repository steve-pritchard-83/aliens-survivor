# Project Context & Architecture: Aliens Survivor

## Overview
**Aliens Survivor** is a 5-minute (300-second) first-person survival wave shooter set aboard the *USS Sulaco*. Built with Vite 6, React 19, TypeScript, Three.js, React Three Fiber (`@react-three/fiber`), `@react-three/drei`, `@react-three/xr`, and Zustand.

## Coordinate Space & Level Scaling
- `corridor.glb` has an internal Sketchfab scale of `0.0053374` and raw offset `[-752, -1280, -80]`.
- At `scale = 3.5` on the `<CorridorLevel />` group:
  - Floor is at `Y = 0.0`, ceiling is at `Y = 2.50m`.
- Double-Size Figure-8 corridor sector consists of:
  - **East Spine Corridor:** `X` around `-0.32`, `Z` in `[8.3, 35.9]`
  - **West Spine Corridor:** `X` around `-13.48`, `Z` in `[8.3, 35.9]`
  - **Transverse Connectors:** North `Z = 35.9`, Central `Z = 22.1`, South `Z = 8.3`

## Milestone & Feature Checklist
- [x] **Milestone 1:** Scaffolding, Asset Inspection & Corridor Environment with Emergency Lighting
- [x] **Milestone 2:** M41A Pulse Rifle Viewmodel, 99-Round Magazine, 2.5s Reload / Overheat Jam & Raycast Combat
- [x] **Milestone 3:** Xenomorph Object Pool (6 pre-allocated instances), Phase 3/4 Praetorian Mini-Boss & 4-Phase 300s Wave Director
- [x] **Milestone 4:** M314 Motion Tracker (180° / 360° radar sweep, pitch-modulated Web Audio pings)
- [x] **Milestone 5:** Mobile PWA Touch Controls, `manifest.json` + Service Worker, and Meta Quest 2 WebXR Integration
- [x] **Milestone 6:** Survivor RPG Progression (Kill XP, Field Promotion Level-Ups & 6 Upgrade Cards)
- [x] **Milestone 7:** VR Comfort Settings (30°/45°/90°/Smooth Turn, Reduced Flash, Left-Handed Mode) & Vitest Test Suite
