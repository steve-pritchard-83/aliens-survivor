import { UpgradeCard } from '../data/balance';
import { GameSettings } from '../core/GameTypes';
import { VR_MENU_ROWS, valueText } from './vrMenuModel';

export type VRPanelStatus = 'DEFEAT' | 'VICTORY' | 'LEVEL_UP' | 'PAUSED';

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60),
    s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export interface VRPanelData {
  status: VRPanelStatus;
  kills: number;
  shotsFired: number;
  shotsHit: number;
  timeRem: number;
  pulse: number;
  offered: UpgradeCard[];
  settings?: GameSettings;
  selectedIndex: number;
  recordKills: number;
}

const MENU_TOP = 128;
const MENU_ROW_HEIGHT = 36;

/** Row-based pause menu: the selected row is highlighted, settings show their current value. */
function drawPausedPanel(ctx: CanvasRenderingContext2D, d: VRPanelData): void {
  const { settings, selectedIndex, kills, timeRem, pulse } = d;
  ctx.clearRect(0, 0, 1024, 512);
  ctx.fillStyle = 'rgba(2, 14, 8, 0.96)';
  ctx.fillRect(20, 20, 984, 472);
  ctx.strokeStyle = '#00ff88';
  ctx.lineWidth = 6;
  ctx.strokeRect(20, 20, 984, 472);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#00ff88';
  ctx.font = 'bold 34px Courier New, monospace';
  ctx.fillText('MISSION PAUSED', 512, 68);
  ctx.fillStyle = '#88ffaa';
  ctx.font = '16px Courier New, monospace';
  ctx.fillText(`ELIMINATIONS: ${kills}   |   TIME REMAINING: ${fmtTime(timeRem)}`, 512, 98);

  for (let i = 0; i < VR_MENU_ROWS.length; i++) {
    const row = VR_MENU_ROWS[i];
    const y = MENU_TOP + i * MENU_ROW_HEIGHT;
    const selected = i === selectedIndex;
    if (selected) {
      const a = 0.22 + Math.sin(pulse * 6.0) * 0.05;
      ctx.fillStyle = `rgba(0, 255, 136, ${a})`;
      ctx.fillRect(110, y - 25, 804, 32);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(110, y - 25, 804, 32);
    }
    ctx.font = 'bold 21px Courier New, monospace';
    ctx.fillStyle = selected ? '#ffffff' : '#aaffcc';
    ctx.textAlign = 'left';
    ctx.fillText((selected ? '▶ ' : '  ') + row.label, 130, y);
    if (settings && row.kind !== 'action') {
      ctx.textAlign = 'right';
      const showArrows = selected && row.kind !== 'toggle';
      ctx.fillText((showArrows ? '◀ ' : '') + valueText(row, settings) + (showArrows ? ' ▶' : ''), 894, y);
    }
  }
  ctx.fillStyle = '#88ffaa';
  ctx.textAlign = 'center';
  ctx.font = '15px Courier New, monospace';
  ctx.fillText('STICK: SELECT / ADJUST    TRIGGER: CONFIRM    [B] / [Y]: RESUME', 512, 470);
}

export function drawVRStatusPanel(canvas: HTMLCanvasElement, d: VRPanelData): void {
  const { status, kills, shotsFired, shotsHit, timeRem, pulse, offered, selectedIndex, recordKills } = d;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  if (status === 'PAUSED') {
    drawPausedPanel(ctx, d);
    return;
  }

  if (status === 'LEVEL_UP') {
    ctx.clearRect(0, 0, 1024, 512);
    ctx.fillStyle = 'rgba(2, 14, 8, 0.96)';
    ctx.fillRect(20, 20, 984, 472);
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 6;
    ctx.strokeRect(20, 20, 984, 472);
    ctx.fillStyle = '#88ffaa';
    ctx.font = 'bold 24px Courier New, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('WEYLAND-YUTANI // USCM FIELD PROMOTION', 512, 70);
    for (let i = 0; i < Math.min(3, offered.length); i++) {
      const c = offered[i],
        cx = 80 + i * 300,
        cw = 265,
        selected = i === selectedIndex;
      ctx.fillStyle = selected ? 'rgba(0, 70, 36, 0.95)' : 'rgba(0, 32, 16, 0.85)';
      ctx.fillRect(cx, 100, cw, 320);
      ctx.strokeStyle = selected ? '#ffffff' : '#00ff88';
      ctx.lineWidth = selected ? 7 : 3;
      ctx.strokeRect(cx, 100, cw, 320);
      ctx.textAlign = 'center';
      ctx.font = '40px monospace';
      ctx.fillText(c.icon, cx + cw / 2, 165);
      ctx.fillStyle = '#00ff88';
      ctx.font = 'bold 18px Courier New, monospace';
      ctx.fillText(c.title.slice(0, 18), cx + cw / 2, 215);
      ctx.fillStyle = '#ffffff';
      ctx.font = '13px Courier New, monospace';
      ctx.fillText(c.desc.slice(0, 26), cx + cw / 2, 270);
      if (selected) {
        ctx.fillStyle = 'rgba(0, 255, 136, 0.3)';
        ctx.fillRect(cx + 15, 340, cw - 30, 60);
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 2;
        ctx.strokeRect(cx + 15, 340, cw - 30, 60);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 17px Courier New, monospace';
        ctx.fillText('▶ SELECTED ◀', cx + cw / 2, 377);
      }
    }
    ctx.fillStyle = '#aaffd4';
    ctx.font = 'bold 18px Courier New, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('◀ ▶  STICK: SELECT   //   TRIGGER: CONFIRM', 512, 462);
    return;
  }

  const isDefeat = status === 'DEFEAT';
  const mainColor = isDefeat ? '#ff3333' : '#00ff88';
  const bgColor = isDefeat ? 'rgba(22, 6, 6, 0.94)' : 'rgba(4, 22, 12, 0.94)';
  const acc = shotsFired > 0 ? Math.round((shotsHit / shotsFired) * 100) : 0;
  const dur = isDefeat ? fmtTime(300 - timeRem) : '05:00';

  ctx.clearRect(0, 0, 1024, 512);
  ctx.fillStyle = bgColor;
  ctx.fillRect(20, 20, 984, 472);
  ctx.strokeStyle = mainColor;
  ctx.lineWidth = 6;
  ctx.strokeRect(20, 20, 984, 472);

  ctx.fillStyle = isDefeat ? '#ff8866' : '#88ffaa';
  ctx.font = 'bold 22px Courier New, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('WEYLAND-YUTANI // USCM TACTICAL LINK', 512, 80);

  ctx.fillStyle = mainColor;
  ctx.font = 'bold 50px Courier New, monospace';
  ctx.fillText(isDefeat ? 'MIA // BIO-SIGNALS FLATLINED' : 'EXTRACTION SUCCESSFUL', 512, 160);

  ctx.fillStyle = '#cceecc';
  ctx.font = '24px Courier New, monospace';
  ctx.fillText(isDefeat ? 'SECTOR 4 OVERRUN — CASUALTY CONFIRMED' : 'SECTOR 4 PURGED — DROPSHIP DOCKED', 512, 215);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px Courier New, monospace';
  ctx.fillText(`SURVIVAL: ${dur}   |   KILLS: ${kills}   |   ACCURACY: ${acc}%`, 512, 290);
  ctx.fillStyle = '#ffcc66';
  ctx.font = 'bold 20px Courier New, monospace';
  ctx.fillText(`BEST: ${Math.max(recordKills, kills)} KILLS`, 512, 325);

  const btnAlpha = 0.75 + Math.sin(pulse * 6.0) * 0.25;
  ctx.fillStyle = isDefeat ? `rgba(255, 51, 51, ${btnAlpha * 0.25})` : `rgba(0, 255, 136, ${btnAlpha * 0.25})`;
  ctx.fillRect(162, 350, 700, 80);
  ctx.strokeStyle = isDefeat ? `rgba(255, 51, 51, ${btnAlpha})` : `rgba(0, 255, 136, ${btnAlpha})`;
  ctx.lineWidth = 4;
  ctx.strokeRect(162, 350, 700, 80);

  ctx.fillStyle = isDefeat ? '#ff8888' : '#00ff88';
  ctx.font = 'bold 32px Courier New, monospace';
  ctx.fillText('▶ PULL TRIGGER TO REDEPLOY ◀', 512, 402);
}
