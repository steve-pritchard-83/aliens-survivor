import * as THREE from 'three';
import type { GameState } from '../core/GameTypes';
import { drawVRStatusPanel, VRPanelData, VRPanelStatus } from './VRStatusCanvas';

const REDRAW_SECONDS = 0.1;
const DISTANCE = 1.7;
const _fwd = new THREE.Vector3(),
  _pos = new THREE.Vector3(),
  _quat = new THREE.Quaternion();

/** Floating holographic panel (pause, level-up, victory, defeat) drawn to a canvas texture. */
export class VRStatusPanel {
  public readonly canvas: HTMLCanvasElement;
  public readonly texture: THREE.CanvasTexture;
  private timer = 0;
  private lastStatus: VRPanelStatus | null = null;
  private lastSelected = -1;
  private lastSettings: unknown = null;
  private lastOffered: unknown = null;
  private lastKills = -1;
  private lastRunRef: unknown = null;
  private lastBoard: unknown = null;
  private readonly data: VRPanelData = {
    status: 'PAUSED',
    kills: 0,
    shotsFired: 0,
    shotsHit: 0,
    timeRem: 0,
    pulse: 0,
    offered: [],
    selectedIndex: 0,
    recordKills: 0,
    lastRun: null,
    bestScore: 0
  };

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1024;
    this.canvas.height = 512;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
  }

  /** Redraws when the inputs change, otherwise every REDRAW_SECONDS to keep the pulse animation alive. */
  public render(status: VRPanelStatus, pulse: number, dt: number, selectedIndex: number, st: GameState): void {
    this.timer += dt;
    const changed =
      this.lastStatus !== status ||
      this.lastSelected !== selectedIndex ||
      this.lastSettings !== st.settings ||
      this.lastOffered !== st.offeredUpgrades ||
      this.lastKills !== st.kills ||
      this.lastRunRef !== st.lastRun ||
      this.lastBoard !== st.leaderboard;
    if (!changed && this.timer < REDRAW_SECONDS) return;
    this.timer = 0;
    this.lastStatus = status;
    this.lastSelected = selectedIndex;
    this.lastSettings = st.settings;
    this.lastOffered = st.offeredUpgrades;
    this.lastKills = st.kills;
    this.lastRunRef = st.lastRun;
    this.lastBoard = st.leaderboard;
    const d = this.data;
    d.status = status;
    d.kills = st.kills;
    d.shotsFired = st.shotsFired;
    d.shotsHit = st.shotsHit;
    d.timeRem = st.timeRemaining;
    d.pulse = pulse;
    d.offered = st.offeredUpgrades;
    d.settings = st.settings;
    d.selectedIndex = selectedIndex;
    d.recordKills = st.recordKills;
    d.lastRun = st.lastRun;
    d.bestScore = st.leaderboard[st.settings.difficulty][0]?.score ?? 0;
    drawVRStatusPanel(this.canvas, d);
    this.texture.needsUpdate = true;
  }

  /** Shows the mesh 1.7 m in front of the player's head, facing them. */
  public static place(mesh: THREE.Mesh, camera: THREE.Camera): void {
    camera.getWorldDirection(_fwd);
    camera.getWorldPosition(_pos);
    camera.getWorldQuaternion(_quat);
    mesh.visible = true;
    mesh.position.copy(_pos).addScaledVector(_fwd, DISTANCE);
    mesh.quaternion.copy(_quat);
  }
}
