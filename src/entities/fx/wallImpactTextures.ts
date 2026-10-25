import * as THREE from 'three';

// Procedural canvas textures for wall impacts: bullet scorch mark and spark sprite
export function createBulletMarkTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!,
    cx = 64,
    cy = 64;
  const outerGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 60);
  outerGrad.addColorStop(0.0, 'rgba(10, 8, 8, 0.95)');
  outerGrad.addColorStop(0.25, 'rgba(28, 18, 14, 0.85)');
  outerGrad.addColorStop(0.55, 'rgba(45, 30, 22, 0.55)');
  outerGrad.addColorStop(0.8, 'rgba(20, 18, 16, 0.2)');
  outerGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
  ctx.fillStyle = outerGrad;
  ctx.fillRect(0, 0, 128, 128);

  ctx.strokeStyle = 'rgba(15, 12, 10, 0.65)';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 8; i++) {
    const ang = (i * Math.PI) / 4 + (Math.random() - 0.5) * 0.4,
      len = 22 + Math.random() * 26;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
    ctx.stroke();
  }

  const rimGrad = ctx.createRadialGradient(cx, cy, 4, cx, cy, 20);
  rimGrad.addColorStop(0.0, 'rgba(8, 6, 6, 1.0)');
  rimGrad.addColorStop(0.55, 'rgba(255, 110, 25, 0.75)');
  rimGrad.addColorStop(0.85, 'rgba(120, 35, 10, 0.65)');
  rimGrad.addColorStop(1.0, 'rgba(40, 15, 10, 0.0)');
  ctx.fillStyle = rimGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 20, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#050404';
  ctx.beginPath();
  ctx.arc(cx, cy, 8.5, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

export function createSparkTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d')!,
    cx = 32,
    cy = 32;
  const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, 28);
  g.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  g.addColorStop(0.25, 'rgba(255, 220, 100, 0.95)');
  g.addColorStop(0.65, 'rgba(255, 110, 15, 0.65)');
  g.addColorStop(1.0, 'rgba(255, 40, 0, 0.0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}
