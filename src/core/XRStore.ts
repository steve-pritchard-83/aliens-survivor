import { createXRStore } from '@react-three/xr';
import { Platform } from './Platform';

export const xrStore = createXRStore({
  controller: false,
  hand: false,
  emulate: false,
  offerSession: false,
  enterGrantedSession: ['immersive-vr'],
  domOverlay: false,
  layers: false,
  meshDetection: false,
  planeDetection: false,
  hitTest: false,
  anchors: false,
  foveation: 1.0,
  frameRate: () => 72,
  // three.js cannot change framebuffer scale mid-session, so pick it once per device class
  frameBufferScaling: (max: number) => Math.min(max, Platform.isQuest3 ? 0.85 : 0.72),
  customSessionInit: {
    requiredFeatures: ['local-floor'],
    optionalFeatures: ['hand-tracking']
  }
});
