import { createXRStore } from '@react-three/xr';

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
  frameBufferScaling: 0.7,
  customSessionInit: {
    requiredFeatures: ['local-floor'],
    optionalFeatures: ['hand-tracking']
  }
});
