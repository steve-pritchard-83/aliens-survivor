/** Shared handle to the M314 radar canvas; `version` increments on every redraw so consumers upload only when changed. */
export const trackerCanvasState: { canvas: HTMLCanvasElement | null; version: number } = {
  canvas: null,
  version: 0
};
