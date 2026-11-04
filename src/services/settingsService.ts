const KEY = 'xuper_global_playback_v1';

export interface PlaybackSettings {
  display: number;   // 0 = fit (letterbox), 1 = fullscreen, 2 = auto
  audio: number;     // 0 = Español, 1 = Portugués, 2 = Inglés
  subtitle: boolean;
  subLang: number;
  size: number;      // 0 = Normal, 1 = Grande, 2 = Pequeño
  style: number;
}

const DEFAULTS: PlaybackSettings = {
  display: 0,
  audio: 0,
  subtitle: true,
  subLang: 0,
  size: 0,
  style: 0
};

class SettingsService {
  private listeners: Array<() => void> = [];

  public get(): PlaybackSettings {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch (e) {}
    return { ...DEFAULTS };
  }

  public set(patch: Partial<PlaybackSettings>): PlaybackSettings {
    const next = { ...this.get(), ...patch };
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch (e) {}
    this.listeners.forEach(cb => {
      try { cb(); } catch (e) {}
    });
    return next;
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }
}

export const settingsService = new SettingsService();
