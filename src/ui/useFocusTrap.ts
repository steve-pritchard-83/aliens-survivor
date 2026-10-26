import { RefObject, useEffect } from 'react';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea, [tabindex]';

/** The index Tab (or Shift+Tab) moves to, wrapping at both ends; -1 means nothing is focused yet. */
export function nextFocusIndex(current: number, count: number, backwards: boolean): number {
  if (count <= 0) return -1;
  if (current < 0) return backwards ? count - 1 : 0;
  return backwards ? (current - 1 + count) % count : (current + 1) % count;
}

/**
 * Keeps keyboard focus inside a modal dialog while it is open: focus moves to its first control, Tab and Shift+Tab
 * wrap within it, and focus returns to where it was when the dialog closes. Call it before any early return, with
 * `active` true while the dialog is shown.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean): void {
  useEffect(() => {
    const root = ref.current;
    if (!active || !root) return;
    const previous = document.activeElement as HTMLElement | null;
    const items = () => Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((e) => e.tabIndex >= 0);
    items()[0]?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const list = items();
      if (list.length === 0) return;
      e.preventDefault();
      list[nextFocusIndex(list.indexOf(document.activeElement as HTMLElement), list.length, e.shiftKey)].focus();
    };
    root.addEventListener('keydown', onKeyDown);
    return () => {
      root.removeEventListener('keydown', onKeyDown);
      previous?.focus?.();
    };
  }, [ref, active]);
}
