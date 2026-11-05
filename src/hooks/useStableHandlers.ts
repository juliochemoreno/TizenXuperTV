import { useRef } from 'react';

/**
 * Returns an object with the same callbacks but a stable identity: each wrapper calls the
 * latest version. Lets memoized children skip renders when only the parent's closures changed.
 */
export function useStableHandlers<T extends Record<string, (...args: any[]) => any>>(handlers: T): T {
  const latest = useRef(handlers);
  latest.current = handlers;
  const stable = useRef<T | null>(null);
  if (!stable.current) {
    const out: Record<string, (...args: any[]) => any> = {};
    Object.keys(handlers).forEach(name => {
      out[name] = (...args: any[]) => latest.current[name](...args);
    });
    stable.current = out as T;
  }
  return stable.current;
}
