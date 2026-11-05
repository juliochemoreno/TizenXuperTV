import { kvGet, kvSet } from './kvStore';

/**
 * Channel lists per live category. Reads are synchronous (from memory); the disk copy lives in
 * IndexedDB, loaded once at start and written behind (debounced), so no read or write touches
 * localStorage on the main thread. Lists a previous version left in localStorage are moved over.
 */
export interface ChannelCacheEntry {
  at: number;
  channels: any[];
}

const KEY = 'live_channels_v2';
const OLD_PREFIX = 'xuper_live_ch_cache_v2_';
const WRITE_DELAY_MS = 3000;

const memory = new Map<string, ChannelCacheEntry>();
let writeTimer: ReturnType<typeof setTimeout> | null = null;

function persist(): void {
  if (writeTimer) return;
  writeTimer = setTimeout(() => {
    writeTimer = null;
    const all: Record<string, ChannelCacheEntry> = {};
    memory.forEach((v, k) => { all[k] = v; });
    kvSet(KEY, all);
  }, WRITE_DELAY_MS);
}

function migrateOld(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.indexOf(OLD_PREFIX) === 0) keys.push(k);
    }
    keys.forEach(k => {
      try {
        const parsed = JSON.parse(localStorage.getItem(k) || 'null');
        const id = k.slice(OLD_PREFIX.length);
        if (parsed && Array.isArray(parsed.channels) && !memory.has(id)) memory.set(id, parsed);
      } catch {}
      localStorage.removeItem(k);
    });
    if (keys.length) persist();
  } catch {}
}

/** Resolves when the saved lists are in memory (readers before that just find nothing) */
export const channelCacheReady: Promise<void> = kvGet<Record<string, ChannelCacheEntry>>(KEY).then(saved => {
  if (saved) Object.keys(saved).forEach(id => { if (!memory.has(id)) memory.set(id, saved[id]); });
  migrateOld();
});

export function getChannelEntry(catId: string | number): ChannelCacheEntry | undefined {
  return memory.get(String(catId));
}

export function setChannelEntry(catId: string | number, channels: any[]): void {
  memory.set(String(catId), { at: Date.now(), channels });
  persist();
}

export function allChannelEntries(): ChannelCacheEntry[] {
  return Array.from(memory.values());
}
