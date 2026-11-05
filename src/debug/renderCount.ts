import { useEffect } from 'react';

/** Development only: counts renders per component in window.__renders to compare before/after optimizations */
export function useRenderCount(name: string): void {
  if (!import.meta.env.DEV) return;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const w = window as any;
    w.__renders = w.__renders || {};
    w.__renders[name] = (w.__renders[name] || 0) + 1;
  });
}
