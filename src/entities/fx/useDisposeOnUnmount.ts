import { useEffect, useRef } from 'react';

interface Disposable {
  dispose(): void;
}

/**
 * Frees GPU resources (textures, geometries, materials) when the component unmounts. three.js never does this on
 * its own, so without it a map or scene swap leaks them. The latest items are kept in a ref so the cleanup runs
 * only on unmount, never on a re-render.
 */
export function useDisposeOnUnmount(...items: Disposable[]): void {
  const ref = useRef(items);
  ref.current = items;
  useEffect(
    () => () => {
      for (let i = 0; i < ref.current.length; i++) ref.current[i].dispose();
    },
    []
  );
}
