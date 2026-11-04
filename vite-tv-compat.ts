import type { Plugin } from 'vite';

/**
 * Compatibility for older Samsung TVs (Tizen 4.0 = Chromium 56):
 *  - min() / max() / clamp() only exist since Chromium 79. The app renders on a fixed
 *    1920x1080 canvas, so each declaration gets a static px fallback right before it.
 *    Old engines drop the declaration they cannot parse and keep the fallback; modern
 *    engines keep the original.
 *  - <script type="module"> only exists since Chromium 61: the bundle is emitted as a
 *    classic deferred script instead (see build.rollupOptions.output.format = 'iife').
 */

const CANVAS_W = 1920;
const CANVAS_H = 1080;

function toPx(arg: string): number | null {
  const m = /^(-?\d*\.?\d+)(px|vw|vh)?$/.exec(arg.trim());
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (m[2] === 'vw') return (n * CANVAS_W) / 100;
  if (m[2] === 'vh') return (n * CANVAS_H) / 100;
  if (!m[2] && n !== 0) return null; // unitless non-zero (e.g. line-height) is not a length
  return n;
}

function round(n: number): string {
  return `${Math.round(n * 100) / 100}px`;
}

/** Resolves every min()/max()/clamp() in a value, or returns null if any cannot be resolved. */
export function resolveCssFunctions(value: string): string | null {
  let out = value;
  const inner = /\b(min|max|clamp)\(([^()]*)\)/;
  let guard = 0;
  while (inner.test(out)) {
    if (guard++ > 20) return null;
    let failed = false;
    out = out.replace(inner, (_all, fn: string, args: string) => {
      const nums = args.split(',').map(toPx);
      if (nums.some(n => n === null)) {
        failed = true;
        return _all;
      }
      const v = nums as number[];
      if (fn === 'min') return round(Math.min(...v));
      if (fn === 'max') return round(Math.max(...v));
      if (v.length !== 3) {
        failed = true;
        return _all;
      }
      return round(Math.min(Math.max(v[1], v[0]), v[2]));
    });
    if (failed) return null;
  }
  return out;
}

export function addCssFallbacks(css: string): string {
  return css.replace(
    /(^[ \t]*|[;{]\s*)([a-z-]+)(\s*:\s*)([^;{}]*\b(?:min|max|clamp)\([^;{}]*?)(\s*!important)?(\s*;)/gm,
    (all, lead: string, prop: string, colon: string, value: string, important = '', end: string) => {
      const resolved = resolveCssFunctions(value);
      if (!resolved || resolved === value) return all;
      return `${lead}${prop}${colon}${resolved}${important}${end} ${prop}${colon}${value}${important}${end}`;
    }
  );
}

export function tvCompatPlugin(): Plugin {
  return {
    name: 'xuper-tv-compat',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('.css')) return null;
      return { code: addCssFallbacks(code), map: null };
    },
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx.bundle) return html; // dev server keeps ES modules
        return html
          .replace(/<script type="module" crossorigin src=/g, '<script defer src=')
          .replace(/<link rel="modulepreload"[^>]*>\s*/g, '');
      }
    }
  };
}
