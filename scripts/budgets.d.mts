export const KB: number;
export const MB: number;
export const LIMITS: {
  largestChunkBytes: number;
  totalJsBytes: number;
  precacheBytes: number;
  dynamicLights: number;
};
export function bundleStats(distDir: string): {
  largestChunk: { name: string; bytes: number };
  totalJs: number;
  precache: number;
};
export function countLights(srcDir: string): { file: string; light: string }[];
export function evaluate(
  stats: ReturnType<typeof bundleStats>,
  lights: ReturnType<typeof countLights>,
  limits?: typeof LIMITS
): string[];
