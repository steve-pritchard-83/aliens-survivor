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
  // Medium fixed foveation: the maximum (1.0) made the edges of the view shimmer against the fog and lights
  foveation: 0.5,
  frameRate: () => 72,
  // three.js cannot change framebuffer scale mid-session, so pick it once per device class
  frameBufferScaling: (max: number) => Math.min(max, Platform.isQuest3 ? 0.85 : 0.8),
  customSessionInit: {
    requiredFeatures: ['local-floor'],
    optionalFeatures: ['hand-tracking']
  }
});
