import type { LevelDefinition } from './LevelDefinition';
import { SULACO } from './sulaco';

export type { LevelDefinition, HallDef, SpawnNode } from './LevelDefinition';
export { validateLevel } from './LevelDefinition';

/** Every registered map. A new map is a new definition file added here (and a scene to match). */
export const LEVELS: Record<string, LevelDefinition> = { [SULACO.id]: SULACO };
export const DEFAULT_LEVEL_ID = SULACO.id;

let active: LevelDefinition = SULACO;

/** The level all navigation, pathing and spawning systems currently read. */
export function getActiveLevel(): LevelDefinition {
  return active;
}

export function setActiveLevel(id: string): void {
  const level = LEVELS[id];
  if (!level) throw new Error(`Unknown level: ${id}`);
  active = level;
}
