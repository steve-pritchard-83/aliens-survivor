export type PwaInstallMode = 'native' | 'ios' | 'android-menu';

const DISMISSED_KEY = 'uscm_pwa_prompt_dismissed';

/** Which install instructions fit this browser: the native prompt if the browser offered one, else by platform. */
export function pwaInstallMode(userAgent: string, hasNativePrompt: boolean): PwaInstallMode {
  if (hasNativePrompt) return 'native';
  return /iphone|ipad|ipod/i.test(userAgent) ? 'ios' : 'android-menu';
}

export function readPwaDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === 'true';
  } catch {
    /* storage unavailable: show the prompt each visit */
    return false;
  }
}

export function writePwaDismissed(): void {
  try {
    localStorage.setItem(DISMISSED_KEY, 'true');
  } catch {
    /* storage unavailable: prompt will show again next visit */
  }
}

export const INSTALL_STEPS: Record<Exclude<PwaInstallMode, 'native'>, readonly string[]> = {
  ios: ['Tap the Share button in Safari', 'Choose "Add to Home Screen"', 'Launch from the new home screen icon'],
  'android-menu': [
    'Open the browser menu (⋮)',
    'Choose "Install app" or "Add to Home screen"',
    'Launch from the home screen'
  ]
};
