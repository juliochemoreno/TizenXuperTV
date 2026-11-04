export interface HistoryItem {
  id: string;
  title: string;
  poster: string;
  series: boolean;
  episodeId?: string;
  episodeNumber?: number | string;
  seasonNumber?: number;
  position: number;   // seconds played
  duration: number;   // total seconds
  updatedAt: number;  // timestamp ms
}
