import { createXRStore } from '@react-three/xr';

export const xrStore = createXRStore({
  controller: false,
  hand: false,
  emulate: false,
  offerSession: false,
  enterGrantedSession: false,
  domOverlay: false,
  layers: false,
  meshDetection: false,
  planeDetection: false,
  hitTest: false,
  anchors: false,
  foveation: 1.0,
  frameRate: () => 72,
  frameBufferScaling: 1.0,
  customSessionInit: {
    requiredFeatures: ['local-floor'],
    optionalFeatures: ['hand-tracking']
  }
});
