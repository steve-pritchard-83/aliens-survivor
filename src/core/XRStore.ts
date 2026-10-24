import { createXRStore } from '@react-three/xr';

export const xrStore = createXRStore({
  controller: false,
  hand: false,
  emulate: false
});
