import { useEffect, useState } from 'react';

/**
 * Card-size copies of portal images.
 *
 * The portal serves every image at full size (1920x1080, up to 2000x3000) with no resized
 * variants, and the TV decodes each one whole for a ~200 px card. A worker downloads the image,
 * decodes it straight at card size and encodes a small JPEG off the main thread; the copy is kept
 * in IndexedDB so the next start shows it at once. When the image host refuses the download
 * (CORS in a desktop browser), the original URL is used as before.
 */

const DB_NAME = 'xuper-img';
const STORE = 'img';
const MAX_ENTRIES = 3000;
const GIVE_UP_AFTER = 6; // consecutive failures before using original URLs for the session

// Classic worker from a blob: no extra build entry, and the packaged app has no module workers issue
const WORKER_SRC = `
var queue = [], busy = 0, MAX = 3;
onmessage = function (e) { queue.push(e.data); pump(); };
function pump() { while (busy < MAX && queue.length) run(queue.shift()); }
function run(job) {
  busy++;
  fetch(job.src).then(function (r) {
    if (!r.ok) throw new Error('http ' + r.status);
    return r.blob();
  }).then(function (blob) {
    return createImageBitmap(blob).then(function (bm) {
      var w = bm.width, h = bm.height;
      var scale = Math.max(job.w / w, job.h / h);
      if (scale >= 0.8) { bm.close(); return { small: true, w: w, h: h }; }
      var tw = Math.round(w * scale), th = Math.round(h * scale);
      var c = new OffscreenCanvas(tw, th);
      var ctx = c.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(bm, 0, 0, tw, th);
      bm.close();
      return c.convertToBlob({ type: 'image/jpeg', quality: 0.82 }).then(function (out) {
        return { blob: out, w: w, h: h };
      });
    });
  }).then(function (res) {
    res.id = job.id;
    postMessage(res);
  }).catch(function (err) {
    postMessage({ id: job.id, error: String(err) });
  }).then(function () { busy--; pump(); });
}
`;

const memory = new Map<string, string>(); // key -> object URL (or the original URL)
const pending = new Map<string, Promise<string>>();
const callbacks = new Map<number, (res: any) => void>();
let worker: Worker | null = null;
let jobId = 0;
let failures = 0;
let disabled = false;
let loggedOk = false;
let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise(resolve => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => {
        const db = req.result;
        // Keep the cache bounded: start over when it gets too big
        try {
          const count = db.transaction(STORE).objectStore(STORE).count();
          count.onsuccess = () => {
            if (count.result > MAX_ENTRIES) db.transaction(STORE, 'readwrite').objectStore(STORE).clear();
          };
        } catch {}
        resolve(db);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

// Stored value: the small JPEG, or ORIGINAL when the image is already card size
const ORIGINAL = 'original';

function dbGet(key: string): Promise<Blob | string | null> {
  return openDb().then(db => new Promise<Blob | string | null>(resolve => {
    if (!db) return resolve(null);
    try {
      const req = db.transaction(STORE).objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result instanceof Blob || req.result === ORIGINAL ? req.result : null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  }));
}

function dbPut(key: string, blob: Blob | string): void {
  openDb().then(db => {
    if (!db) return;
    try { db.transaction(STORE, 'readwrite').objectStore(STORE).put(blob, key); } catch {}
  });
}

function getWorker(): Worker | null {
  if (worker) return worker;
  try {
    worker = new Worker(URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' })));
    worker.onmessage = e => {
      const cb = callbacks.get(e.data.id);
      callbacks.delete(e.data.id);
      if (cb) cb(e.data);
    };
  } catch {
    disabled = true;
  }
  return worker;
}

function shrink(url: string, w: number, h: number): Promise<any> {
  const wk = getWorker();
  if (!wk) return Promise.resolve({ error: 'no worker' });
  // The dev server proxies the download: desktop browsers block it without CORS headers
  const src = import.meta.env.DEV ? `${location.origin}/stream-proxy?url=${encodeURIComponent(url)}` : url;
  return new Promise(resolve => {
    const id = ++jobId;
    callbacks.set(id, resolve);
    wk.postMessage({ id, src, w, h });
  });
}

/** Card-size copy of `url` for a box of w x h px; resolves to the original URL when it cannot be made */
export function optimizedImage(url: string, w: number, h: number): Promise<string> {
  if (!/^https?:/.test(url) || disabled) return Promise.resolve(url);
  const key = `${url}@${w}x${h}`;
  const hit = memory.get(key);
  if (hit) return Promise.resolve(hit);
  const running = pending.get(key);
  if (running) return running;

  const p = dbGet(key).then(cached => {
    if (cached === ORIGINAL) return url;
    if (cached instanceof Blob) return URL.createObjectURL(cached);
    const t0 = Date.now();
    return shrink(url, w, h).then(res => {
      if (res.small) {
        dbPut(key, ORIGINAL);
        return url;
      }
      if (res.error || !res.blob) {
        if (++failures >= GIVE_UP_AFTER && !disabled) {
          disabled = true;
          console.log('[img] card-size copies off for this session:', res.error);
        }
        return url;
      }
      failures = 0;
      if (!loggedOk) {
        loggedOk = true;
        console.log(`[img] card-size copy ${res.w}x${res.h} -> ${Math.round(res.blob.size / 1024)} KB in ${Date.now() - t0} ms`);
      }
      dbPut(key, res.blob);
      return URL.createObjectURL(res.blob);
    });
  }).then(src => {
    memory.set(key, src);
    pending.delete(key);
    return src;
  });
  pending.set(key, p);
  return p;
}

/** Image for a card: null until the card-size copy is ready (show the placeholder meanwhile) */
export function useCardImage(url: string, w: number, h: number, enabled = true): string | null {
  const key = `${url}@${w}x${h}`;
  const [src, setSrc] = useState<string | null>(() => memory.get(key) || null);
  useEffect(() => {
    if (!enabled || !url) return;
    const hit = memory.get(key);
    if (hit) {
      setSrc(hit);
      return;
    }
    let alive = true;
    optimizedImage(url, w, h).then(s => { if (alive) setSrc(s); });
    return () => { alive = false; };
  }, [key, enabled]);
  return enabled ? src : null;
}
