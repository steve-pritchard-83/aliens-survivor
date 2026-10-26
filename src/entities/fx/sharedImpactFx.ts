import type { ImpactFXHandle } from '../XenomorphImpactFX';

/**
 * The one XenomorphImpactFX instance in the scene (mounted in App). The drone pool and the small aliens both use
 * it: it builds its textures, limb templates and gib and puddle pools once, which two instances would duplicate.
 */
export const sharedImpactFx: { current: ImpactFXHandle | null } = { current: null };
