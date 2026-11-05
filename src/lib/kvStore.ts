/**
 * Small async key-value store on IndexedDB, for big values (the live catalog is ~1 MB):
 * localStorage reads and writes block the main thread and are synchronous; IndexedDB does the
 * disk work off it. Every call resolves (null / false on failure), never rejects.
 */
const DB_NAME = 'xuper-kv';
const STORE = 'kv';
let dbPromise: Promise<IDBDatabase | null> | null = null;

function open(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise(resolve => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

export function kvGet<T>(key: string): Promise<T | null> {
  return open().then(db => new Promise<T | null>(resolve => {
    if (!db) return resolve(null);
    try {
      const req = db.transaction(STORE).objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result === undefined ? null : (req.result as T));
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  }));
}

export function kvSet(key: string, value: unknown): Promise<boolean> {
  return open().then(db => new Promise<boolean>(resolve => {
    if (!db) return resolve(false);
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch {
      resolve(false);
    }
  }));
}
