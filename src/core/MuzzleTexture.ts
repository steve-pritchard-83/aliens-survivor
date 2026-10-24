import * as THREE from 'three';

let cachedMuzzleTexture: THREE.CanvasTexture | null = null;

export function getMuzzleStarTexture(): THREE.CanvasTexture {
  if (cachedMuzzleTexture) return cachedMuzzleTexture;
  const c = document.createElement('canvas'); c.width = 512; c.height = 512;
  const ctx = c.getContext('2d')!, cx = 256, cy = 256;
  const coreGrad = ctx.createRadialGradient(cx, cy, 4, cx, cy, 240);
  coreGrad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  coreGrad.addColorStop(0.18, 'rgba(255, 245, 190, 0.96)');
  coreGrad.addColorStop(0.45, 'rgba(255, 145, 25, 0.55)');
  coreGrad.addColorStop(0.75, 'rgba(255, 60, 0, 0.15)');
  coreGrad.addColorStop(1.0, 'rgba(255, 30, 0, 0.0)');
  ctx.fillStyle = coreGrad; ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4; i++) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate((i * Math.PI) / 2 + Math.PI / 4); ctx.scale(1.0, 0.16);
    const plumeGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 248);
    plumeGrad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    plumeGrad.addColorStop(0.35, 'rgba(255, 210, 95, 0.85)');
    plumeGrad.addColorStop(0.7, 'rgba(255, 110, 15, 0.35)');
    plumeGrad.addColorStop(1.0, 'rgba(255, 50, 0, 0.0)');
    ctx.fillStyle = plumeGrad; ctx.beginPath(); ctx.arc(0, 0, 248, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false; tex.needsUpdate = true;
  cachedMuzzleTexture = tex;
  return tex;
}
