import { XRDevice, metaQuest3 } from 'iwer';

/**
 * Installs an emulated Meta Quest 3 (headset + Touch controllers) as navigator.xr so WebXR flows can be
 * driven from a desktop browser. Loaded only for e2e builds (VITE_E2E_XR=1) with ?iwer=1; never shipped.
 */
export function installEmulatedHeadset(): XRDevice {
  const device = new XRDevice(metaQuest3);
  // Chromium ships a native navigator.xr with no runtimes behind it, so the emulator must override it
  device.installRuntime({ forceInstall: true });
  return device;
}
