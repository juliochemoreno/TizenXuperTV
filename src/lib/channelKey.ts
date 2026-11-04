import { LiveChannel } from '../types/channel';

const EMPTY = ['', 'undefined', 'null', '0'];

/**
 * Stable favorite key of a channel. Never returns "undefined": a channel without id or code
 * falls back to its name, and with nothing usable the key is '' (it cannot be a favorite).
 */
export function channelKey(ch: Partial<LiveChannel> | null | undefined): string {
  if (!ch) return '';
  for (const v of [ch.id, ch.code, ch.name]) {
    const s = String(v === undefined || v === null ? '' : v).trim();
    if (EMPTY.indexOf(s.toLowerCase()) === -1) return s;
  }
  return '';
}

/** Drops invalid entries ("undefined", empty) saved by earlier versions */
export function cleanFavMap(map: Record<string, boolean>): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  Object.keys(map || {}).forEach(k => {
    if (EMPTY.indexOf(k.trim().toLowerCase()) === -1 && map[k]) out[k] = true;
  });
  return out;
}
