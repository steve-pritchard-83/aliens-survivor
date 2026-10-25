// 2D drawing for the M314 motion tracker screen (256x256 canvas). Pure canvas code, no React or three.js.
const CX = 128;
const CY = 176;
export const RADIUS_PX = 142;

export interface RadarView {
  px: number;
  pz: number;
  fx: number;
  fz: number;
  rx: number;
  rz: number;
  maxRange: number;
}

export const radarView: RadarView = { px: 0, pz: 0, fx: 0, fz: 0, rx: 0, rz: 0, maxRange: 25 };

export function setRadarView(px: number, pz: number, yaw: number, maxRange: number): void {
  const v = radarView;
  v.px = px;
  v.pz = pz;
  v.fx = -Math.sin(yaw);
  v.fz = -Math.cos(yaw);
  v.rx = Math.cos(yaw);
  v.rz = -Math.sin(yaw);
  v.maxRange = maxRange;
}

export interface RadarPoint {
  x: number;
  y: number;
}

/** Projects a world position onto the radar face (player-centred, heading up). */
export function toRadar(wx: number, wz: number, out: RadarPoint): void {
  const v = radarView;
  const dx = wx - v.px,
    dz = wz - v.pz;
  out.x = CX + ((dx * v.rx + dz * v.rz) / v.maxRange) * RADIUS_PX;
  out.y = CY - ((dx * v.fx + dz * v.fz) / v.maxRange) * RADIUS_PX;
}

// Sulaco figure-8 outline: outer loop plus the two inner courtyards (drawn with the even-odd rule)
const OUTLINE: readonly (readonly (readonly [number, number])[])[] = [
  [
    [0.42, 7.58],
    [0.42, 36.62],
    [-14.22, 36.62],
    [-14.22, 7.58]
  ],
  [
    [-1.05, 9.02],
    [-12.75, 9.02],
    [-12.75, 21.38],
    [-1.05, 21.38]
  ],
  [
    [-1.05, 22.82],
    [-12.75, 22.82],
    [-12.75, 35.18],
    [-1.05, 35.18]
  ]
];
const RING_FRACTIONS = [0.33, 0.66, 1.0] as const;
const SPOKE_DEGREES = [-60, -30, 0, 30, 60] as const;
const FONT = '"AlienLeague", monospace';
const _p: RadarPoint = { x: 0, y: 0 };

export function drawDefeat(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#03120c';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#ff2222';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(16, 128);
  ctx.lineTo(240, 128);
  ctx.stroke();
  ctx.fillStyle = '#ff3333';
  ctx.font = `bold 20px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('SIGNAL LOST', 128, 105);
}

function drawMap(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(4, 32, 248, 188);
  ctx.clip();
  ctx.strokeStyle = 'rgba(0, 255, 160, 0.34)';
  ctx.fillStyle = 'rgba(0, 120, 75, 0.16)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < OUTLINE.length; i++) {
    const poly = OUTLINE[i];
    for (let j = 0; j < poly.length; j++) {
      toRadar(poly[j][0], poly[j][1], _p);
      if (j === 0) ctx.moveTo(_p.x, _p.y);
      else ctx.lineTo(_p.x, _p.y);
    }
    ctx.closePath();
  }
  ctx.fill('evenodd');
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = '#00cc77';
  ctx.lineWidth = 2;
  ctx.strokeRect(3, 3, 250, 250);
}

function drawHeader(ctx: CanvasRenderingContext2D, timeRemaining: number, hp: number): void {
  ctx.fillStyle = '#02100a';
  ctx.fillRect(4, 4, 248, 26);
  ctx.strokeStyle = 'rgba(0, 255, 160, 0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(4, 30);
  ctx.lineTo(252, 30);
  ctx.stroke();
  ctx.font = `bold 14px ${FONT}`;
  ctx.fillStyle = timeRemaining <= 60 ? '#ff3333' : '#00ffaa';
  ctx.textAlign = 'left';
  const m = Math.floor(timeRemaining / 60),
    s = Math.floor(timeRemaining % 60),
    ms = Math.floor((timeRemaining % 1) * 10);
  ctx.fillText(`EVAC ${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${ms}`, 12, 22);
  ctx.textAlign = 'right';
  ctx.fillStyle = hp <= 30 ? '#ff3333' : '#00ffaa';
  ctx.fillText(`HLTH ${Math.ceil(hp)}%`, 244, 22);
}

function drawRings(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = 'rgba(0, 210, 120, 0.45)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < RING_FRACTIONS.length; i++) {
    ctx.beginPath();
    ctx.arc(CX, CY, RADIUS_PX * RING_FRACTIONS[i], Math.PI, 2 * Math.PI);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(CX - RADIUS_PX, CY);
  ctx.lineTo(CX + RADIUS_PX, CY);
  ctx.stroke();
  for (let i = 0; i < SPOKE_DEGREES.length; i++) {
    const rad = ((SPOKE_DEGREES[i] - 90) * Math.PI) / 180;
    ctx.beginPath();
    ctx.moveTo(CX, CY);
    ctx.lineTo(CX + Math.cos(rad) * RADIUS_PX, CY + Math.sin(rad) * RADIUS_PX);
    ctx.stroke();
  }
}

function drawPlayerMarker(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#00ff99';
  ctx.beginPath();
  ctx.moveTo(CX, CY - 6);
  ctx.lineTo(CX - 5, CY + 5);
  ctx.lineTo(CX + 5, CY + 5);
  ctx.closePath();
  ctx.fill();
}

/** Static radar face: map, header, range rings, player marker. */
export function drawRadarBase(ctx: CanvasRenderingContext2D, timeRemaining: number, hp: number): void {
  ctx.fillStyle = '#03160e';
  ctx.fillRect(0, 0, 256, 256);
  drawMap(ctx);
  drawHeader(ctx, timeRemaining, hp);
  drawRings(ctx);
  drawPlayerMarker(ctx);
}

export function drawStandby(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#00ffaa';
  ctx.font = `bold 15px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('M314 STANDBY', 128, 238);
}

/** Expanding sweep wavefront (`progress` is 0..1 across the radar radius). */
export function drawSweep(ctx: CanvasRenderingContext2D, progress: number): void {
  const sweepRadius = progress * RADIUS_PX;
  const grad = ctx.createRadialGradient(CX, CY, Math.max(1, sweepRadius - 22), CX, CY, sweepRadius + 2);
  grad.addColorStop(0, 'rgba(0, 255, 160, 0.0)');
  grad.addColorStop(0.85, 'rgba(0, 255, 170, 0.35)');
  grad.addColorStop(1, 'rgba(160, 255, 220, 0.95)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(CX, CY, sweepRadius, Math.PI, 2 * Math.PI);
  ctx.lineTo(CX, CY);
  ctx.closePath();
  ctx.fill();
}

/** A radar blip at a world position; clamped to the visible face. */
export function drawContact(ctx: CanvasRenderingContext2D, wx: number, wz: number, dist: number, sweep: number): void {
  toRadar(wx, wz, _p);
  const bx = Math.max(14, Math.min(242, _p.x)),
    by = Math.max(14, Math.min(212, _p.y));
  const lit = Math.abs(sweep - Math.min(1.0, dist / radarView.maxRange)) < 0.28;
  ctx.fillStyle = lit ? 'rgba(140, 255, 250, 0.5)' : 'rgba(0, 255, 180, 0.25)';
  ctx.beginPath();
  ctx.arc(bx, by, lit ? 11 : 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = lit ? '#ffffff' : '#66ffee';
  ctx.beginPath();
  ctx.arc(bx, by, lit ? 5.5 : 4.0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawFooter(ctx: CanvasRenderingContext2D, contacts: number, closest: number, maxRange: number): void {
  ctx.fillStyle = '#02100a';
  ctx.fillRect(4, 222, 248, 28);
  ctx.fillStyle = '#00ffaa';
  ctx.font = `bold 15px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(`CONTACTS: ${contacts}`, 12, 241);
  ctx.textAlign = 'right';
  ctx.fillStyle = closest < 6 ? '#ff4444' : '#66ffee';
  ctx.fillText(closest <= maxRange ? `RNG ${closest.toFixed(1)}M` : 'NO SIGNAL', 244, 241);
}
