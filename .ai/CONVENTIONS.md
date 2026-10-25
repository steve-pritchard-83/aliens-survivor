# Coding Conventions & AI Rules: Aliens Survivor

1. **File Length Limit:** No source file (`src/**/*.{ts,tsx}`) may exceed **250 lines of code**. Keep components modular, split state and helpers into focused files, and never compress logic onto single lines to meet this limit.
2. **TypeScript Strictness:** Always use strict typing. Avoid `any` unless bridging untyped Three.js internals.
3. **Zero Frame-Loop Allocations:** Never instantiate `new THREE.Vector3()`, `new THREE.Euler()`, or `new THREE.Quaternion()` inside `useFrame` callbacks or event handlers. Pre-allocate scratch vectors and matrices at module scope.
4. **Object Pooling & Performance Budget:** Do not mount/unmount Xenomorph entities dynamically during gameplay. Maintain a strict fixed pool of **6 instances** (`POOL_SIZE = 6`) using `SkeletonUtils.clone` and toggle visibility/state in-place to protect the Quest 2 mobile GPU budget.
5. **Mobile GPU Light Cap:** Meta Quest 2 Adreno forward rendering budget permits a maximum of **4 active dynamic lights** in the scene simultaneously. Never dynamically mount/unmount point/spot lights (use `visible = false` or `intensity = 0` to prevent WebGL shader re-compilations).
6. **Cross-Platform Input:** All player movement, aiming, firing, and reloading must flow through `src/core/InputManager.ts` so Desktop (`WASD` + PointerLock), Mobile PWA (dual virtual touch zones), and Meta Quest 2 (`@react-three/xr` controllers) work seamlessly from a single state store.
7. **Centralized Game Balance & Types:** All mission constants, phase thresholds, player attributes, weapon parameters, and upgrade catalogs reside in `src/data/balance.ts`. Store interfaces reside in `src/core/GameTypes.ts`.
8. **Automated Unit Testing:** Every core logic change (game store, phase transitions, weapon state machines, corridor clamping, upgrade math) must maintain passing tests in `tests/`.
9. **Asset Integrity:** Always consult `.ai/ASSET_MANIFEST.md` before referencing `.glb` nodes, animation clips, or audio paths.
