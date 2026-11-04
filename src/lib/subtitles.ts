export interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

export interface SubtitleTrack {
  lang: string;
  url: string;
  format?: string;
}

const LANG_NAMES: Record<string, string> = {
  es: 'Español', spa: 'Español', esp: 'Español',
  en: 'Inglés', eng: 'Inglés',
  pt: 'Portugués', por: 'Portugués', pob: 'Portugués',
  fr: 'Francés', fre: 'Francés', fra: 'Francés',
  it: 'Italiano', ita: 'Italiano',
  de: 'Alemán', ger: 'Alemán', deu: 'Alemán',
  ja: 'Japonés', jpn: 'Japonés',
  ko: 'Coreano', kor: 'Coreano',
  zh: 'Chino', chi: 'Chino', zho: 'Chino',
  ru: 'Ruso', rus: 'Ruso',
  tr: 'Turco', tur: 'Turco'
};

/** "es" / "spa" / "es-MX" -> "Español"; unknown codes are shown upper-cased */
export function languageName(code: string | undefined): string {
  const c = String(code || '').trim().toLowerCase();
  if (!c) return 'Original';
  return LANG_NAMES[c] || LANG_NAMES[c.split(/[-_]/)[0]] || c.toUpperCase();
}

/** Order of the language preference stored in the profile settings */
export const PREF_LANG_CODES = ['es', 'pt', 'en'];

export function sameLanguage(code: string | undefined, pref: string): boolean {
  return languageName(code) === languageName(pref);
}

function toSeconds(stamp: string): number {
  const m = /(?:(\d+):)?(\d{1,2}):(\d{1,2})[,.](\d{1,3})/.exec(stamp.trim());
  if (!m) return 0;
  return (parseInt(m[1] || '0', 10) * 3600) + parseInt(m[2], 10) * 60 + parseInt(m[3], 10) + parseInt(m[4], 10) / 1000;
}

/** Parses SRT and WebVTT text into cues */
export function parseSubtitles(text: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  const blocks = text.replace(/\r/g, '').replace(/^﻿/, '').split(/\n\s*\n/);
  for (const block of blocks) {
    const lines = block.split('\n');
    const timing = lines.findIndex(l => l.indexOf('-->') !== -1);
    if (timing === -1) continue;
    const [a, b] = lines[timing].split('-->');
    const body = lines.slice(timing + 1).join('\n').replace(/<[^>]+>/g, '').replace(/\{\\[^}]*\}/g, '').trim();
    if (body) cues.push({ start: toSeconds(a), end: toSeconds(b), text: body });
  }
  return cues;
}

export function cueAt(cues: SubtitleCue[], t: number): string {
  for (const c of cues) {
    if (t >= c.start && t <= c.end) return c.text;
  }
  return '';
}

/** Downloads a subtitle file (the dev server proxy is used when the browser blocks it) */
export async function loadSubtitle(url: string): Promise<SubtitleCue[]> {
  try {
    const res = await fetch(url);
    return parseSubtitles(await res.text());
  } catch (e) {
    if (!import.meta.env.DEV) throw e;
    const res = await fetch(`/stream-proxy?url=${encodeURIComponent(url)}`);
    return parseSubtitles(await res.text());
  }
}
