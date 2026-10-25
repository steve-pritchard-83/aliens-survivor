export const Platform = {
  get isQuest(): boolean {
    return typeof navigator !== 'undefined' && /OculusBrowser|Quest/i.test(navigator.userAgent);
  },

  /** ?debug=1 (or a session flag) enables the telemetry overlay. */
  get isDebug(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      return new URLSearchParams(window.location.search).has('debug') || sessionStorage.getItem('uscm_debug') === '1';
    } catch {
      /* sessionStorage unavailable: fall back to the query string only */
      return new URLSearchParams(window.location.search).has('debug');
    }
  },

  get isQuest3(): boolean {
    return typeof navigator !== 'undefined' && /Quest 3/i.test(navigator.userAgent);
  },

  get isVrApp(): boolean {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('vr') === '1' || this.isQuest;
  },

  get isStandalone(): boolean {
    if (typeof window === 'undefined') return true;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      window.location.search.includes('source=pwa') ||
      this.isQuest
    );
  },

  get isMobile(): boolean {
    if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;
    if (this.isQuest) return false;
    return (
      /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent) ||
      ('ontouchstart' in window && (navigator.maxTouchPoints > 1 || window.innerWidth < 1024))
    );
  },

  get isTouch(): boolean {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);
  }
};
