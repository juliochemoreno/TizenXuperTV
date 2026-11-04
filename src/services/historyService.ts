import { HistoryItem } from '../types/history';
import { VodItem, VodEpisode } from '../types/vod';

const PROFILE_KEY = 'xuper_local_profile_v1';

class HistoryService {
  private listeners: Array<() => void> = [];

  private getProfile(): any {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    const fresh = {
      id: 'TV-' + String(Date.now()).slice(-8),
      createdAt: Date.now(),
      history: [],
      favs: {}
    };
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(fresh));
    } catch (e) {}
    return fresh;
  }

  public getHistory(): HistoryItem[] {
    const profile = this.getProfile();
    return (profile && profile.history) ? profile.history : [];
  }

  public savePlayback(
    item: VodItem,
    position: number,
    duration: number,
    episode?: VodEpisode,
    force: boolean = false
  ): void {
    if (!item || !item.id) return;
    
    // Ensure valid position (even for 0 or newly opened)
    const validPos = Math.max(0, Math.floor(position));
    const validDur = Math.max(0, Math.floor(duration));

    const profile = this.getProfile();
    const list: HistoryItem[] = profile.history || [];
    const now = Date.now();
    const itemId = String(item.id);

    const entry: HistoryItem = {
      id: itemId,
      title: item.title || 'Contenido',
      poster: item.landscape || item.poster || item.backdrop || 'assets/placeholder_landscape.png',
      series: !!(item.isSeries || (item.episodes && item.episodes.length > 0) || item.kind === 'serie'),
      episodeId: episode && episode.id ? String(episode.id) : undefined,
      episodeNumber: episode ? (episode.number || episode.seriesNumber) : undefined,
      position: validPos,
      duration: validDur,
      updatedAt: now
    };

    // Filter out existing entry for this item
    const nextList: HistoryItem[] = [entry];
    for (let i = 0; i < list.length && nextList.length < 30; i++) {
      if (String(list[i].id) !== itemId) {
        nextList.push(list[i]);
      }
    }

    profile.history = nextList;
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch (e) {}

    this.notify();
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  private notify() {
    this.listeners.forEach(cb => {
      try { cb(); } catch (e) {}
    });
  }
}

export const historyService = new HistoryService();
