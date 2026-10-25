// Fuzzy CRT look for the M314 screen: shimmering grain, scanlines, a rolling bright band and the odd glitch line.
const SIZE = 256;
const TILE = 64;
let tile: HTMLCanvasElement | null = null;

function noiseTile(): HTMLCanvasElement {
  if (tile) return tile;
  const c = document.createElement('canvas');
  c.width = TILE;
  c.height = TILE;
  const ctx = c.getContext('2d');
  if (ctx) {
    const img = ctx.createImageData(TILE, TILE);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 150 + Math.random() * 105;
      img.data[i] = v * 0.7;
      img.data[i + 1] = v * 0.95;
      img.data[i + 2] = v;
      img.data[i + 3] = Math.random() * 120;
    }
    ctx.putImageData(img, 0, 0);
  }
  tile = c;
  return c;
}

/** Draws the CRT effect over the finished radar face. Cheap enough to run at the tracker's 20 Hz redraw. */
export function drawCrtNoise(ctx: CanvasRenderingContext2D): void {
  const grain = noiseTile();
  const ox = -Math.floor(Math.random() * TILE),
    oy = -Math.floor(Math.random() * TILE);
  ctx.save();
  ctx.globalAlpha = 0.42;
  for (let y = oy; y < SIZE; y += TILE) for (let x = ox; x < SIZE; x += TILE) ctx.drawImage(grain, x, y);
  ctx.restore();

  ctx.fillStyle = 'rgba(0, 14, 22, 0.24)';
  for (let y = 0; y < SIZE; y += 3) ctx.fillRect(0, y, SIZE, 1);

  const bandY = ((performance.now() / 2600) % 1) * (SIZE + 80) - 40;
  const band = ctx.createLinearGradient(0, bandY - 30, 0, bandY + 30);
  band.addColorStop(0, 'rgba(150, 225, 255, 0)');
  band.addColorStop(0.5, 'rgba(150, 225, 255, 0.1)');
  band.addColorStop(1, 'rgba(150, 225, 255, 0)');
  ctx.fillStyle = band;
  ctx.fillRect(0, bandY - 30, SIZE, 60);

  if (Math.random() < 0.1) {
    ctx.fillStyle = 'rgba(190, 240, 255, 0.18)';
    ctx.fillRect(0, Math.floor(Math.random() * SIZE), SIZE, 1 + Math.floor(Math.random() * 2));
  }
}
