const PROFILE_KEY = 'xuper_local_profile_v1';

class FavoritesService {
  private listeners: Array<() => void> = [];

  private getProfile(): any {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { favs: {} };
  }

  public isFavorite(id: string | number): boolean {
    const profile = this.getProfile();
    return !!(profile.favs && profile.favs[String(id)]);
  }

  public toggleFavorite(id: string | number): boolean {
    const profile = this.getProfile();
    if (!profile.favs) profile.favs = {};
    const key = String(id);
    const newState = !profile.favs[key];
    if (newState) {
      profile.favs[key] = true;
    } else {
      delete profile.favs[key];
    }
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch (e) {}
    this.notify();
    return newState;
  }

  public getFavoriteIds(): string[] {
    const profile = this.getProfile();
    return profile.favs ? Object.keys(profile.favs).filter(k => profile.favs[k]) : [];
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

export const favoritesService = new FavoritesService();
