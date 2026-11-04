import { VodItem, VodEpisode } from '../types/vod';
import { HistoryItem } from '../types/history';

export interface ResumeTarget {
  episode?: VodEpisode;
  startAt: number;
  label: string;
}

/** A title counts as watched once 90% of it has been played (unknown duration: never) */
export function isFinished(position: number, duration: number): boolean {
  return duration > 0 && position / duration >= 0.9;
}

function episodeNumber(ep: VodEpisode, index: number): number {
  return parseInt(String(ep.number ?? ep.seriesNumber ?? ''), 10) || index + 1;
}

function episodeLabel(ep: VodEpisode, index: number, seasonNumber?: number): string {
  const e = `E${episodeNumber(ep, index)}`;
  return seasonNumber ? `T${seasonNumber}:${e}` : e;
}

function remaining(position: number, duration: number): string {
  if (!(duration > 0)) return '';
  return ` · ${Math.max(1, Math.round((duration - position) / 60))} min`;
}

/**
 * What the primary "Reproducir / Continuar" button plays for a title:
 *  - unfinished history entry  -> resume it
 *  - finished episode with a next one in the same season -> next episode from 0
 *  - otherwise -> start (first episode for series)
 */
export function getResumeTarget(
  item: VodItem,
  episodes: VodEpisode[],
  entry?: HistoryItem,
  seasonNumber?: number,
  seasonId?: string
): ResumeTarget {
  // History of another season (e.g. watched T10, now showing T9) does not apply to this list
  const sameSeason = !entry || !entry.seasonId || !seasonId || String(entry.seasonId) === String(seasonId);
  if (entry && String(entry.id) === String(item.id) && sameSeason) {
    if (episodes.length > 0) {
      let idx = entry.episodeId ? episodes.findIndex(ep => String(ep.id) === String(entry.episodeId)) : -1;
      // Number matching only for old entries saved without an episode id
      if (idx === -1 && !entry.episodeId && entry.episodeNumber !== undefined) {
        idx = episodes.findIndex((ep, i) => episodeNumber(ep, i) === parseInt(String(entry.episodeNumber), 10));
      }
      if (idx !== -1) {
        if (!isFinished(entry.position, entry.duration)) {
          return {
            episode: episodes[idx],
            startAt: entry.position,
            label: `Continuar ${episodeLabel(episodes[idx], idx, seasonNumber)}${remaining(entry.position, entry.duration)}`
          };
        }
        if (idx + 1 < episodes.length) {
          return {
            episode: episodes[idx + 1],
            startAt: 0,
            label: `Reproducir ${episodeLabel(episodes[idx + 1], idx + 1, seasonNumber)}`
          };
        }
      }
    } else if (!entry.series && !isFinished(entry.position, entry.duration) && entry.position > 0) {
      return { startAt: entry.position, label: `Continuar${remaining(entry.position, entry.duration)}` };
    }
  }

  if (episodes.length > 0) {
    return { episode: episodes[0], startAt: 0, label: `Reproducir ${episodeLabel(episodes[0], 0, seasonNumber)}` };
  }
  return { startAt: 0, label: 'Reproducir' };
}

/** Start position for a specific episode chosen from the list */
export function startAtForEpisode(ep: VodEpisode, entry?: HistoryItem): number {
  if (entry && entry.episodeId && String(entry.episodeId) === String(ep.id) && !isFinished(entry.position, entry.duration)) {
    return entry.position;
  }
  return 0;
}
