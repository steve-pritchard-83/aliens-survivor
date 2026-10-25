export function readGlbJson(buffer: Buffer): Record<string, unknown>;
export function summarise(json: Record<string, unknown>): {
  generator: string | null;
  copyright: string | null;
  author: string | null;
  license: string | null;
  source: string | null;
  title: string | null;
  extensionsUsed: string[];
  meshes: number;
  materials: number;
  animations: number;
};
