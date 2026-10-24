# Coding Conventions & AI Rules: Aliens Survivor

1. **File Length Limit:** No source file (`src/**/*.{ts,tsx}`) may exceed **250 lines of code**. Keep components modular and focused.
2. **TypeScript Strictness:** Always use strict typing. Avoid `any` unless bridging untyped Three.js internals.
3. **Zero Frame-Loop Allocations:** Never instantiate `new THREE.Vector3()`, `new THREE.Euler()`, or `new THREE.Quaternion()` inside `useFrame` callbacks. Pre-allocate scratch vectors at module scope.
4. **Object Pooling:** Do not mount/unmount Xenomorph entities dynamically during gameplay. Pre-allocate a fixed pool of 20 instances using `SkeletonUtils.clone` and toggle visibility/state in-place.
5. **Cross-Platform Input:** All player movement, aiming, firing, and reloading must flow through `src/core/InputManager.ts` so Desktop (`WASD` + PointerLock), Mobile PWA (dual virtual touch zones), and Meta Quest 2 (`@react-three/xr` controllers) work seamlessly from a single state store.
6. **Asset Integrity:** Always consult `.ai/ASSET_MANIFEST.md` before referencing `.glb` nodes, animation clips, or audio paths.
