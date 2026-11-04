import { useState, useEffect, useCallback, useRef } from 'react';
import { LiveTvFocus, DEFAULT_LIVE_CATEGORIES } from '../views/LiveTvView';
import { LiveChannel, LiveCategory } from '../types/channel';
import { MOCK_CHANNELS_BY_CATEGORY } from '../services/mockLiveChannels';
import { KbState, KB_INITIAL } from '../components/live/OnScreenKeyboard';
import { DrawerArea, LiveLocation } from './types';

/** Live TV state: categories, channels, tuned channel, favorites and the fullscreen player/drawer */
export function useLiveTv() {
  // Focus & State within Live TV (Restores last viewed category & channel!)
  const [liveTvFocus, setLiveTvFocus] = useState<LiveTvFocus>(() => {
    try {
      const savedIdx = localStorage.getItem('xuper_last_live_cat_idx');
      const parsedIdx = savedIdx !== null ? parseInt(savedIdx, 10) : 4;
      const initialIdx = isNaN(parsedIdx) ? 4 : parsedIdx;
      return {
        area: 'channels',
        catIndex: initialIdx,
        selectedCatIndex: initialIdx,
        channelIndex: 0,
        btnIndex: 0
      };
    } catch {
      return {
        area: 'channels',
        catIndex: 4,
        selectedCatIndex: 4,
        channelIndex: 0,
        btnIndex: 0
      };
    }
  });
  const [liveCategories, setLiveCategories] = useState<LiveCategory[]>(DEFAULT_LIVE_CATEGORIES);
  const liveCategoriesRef = useRef<LiveCategory[]>(DEFAULT_LIVE_CATEGORIES);
  useEffect(() => {
    liveCategoriesRef.current = liveCategories;
  }, [liveCategories]);

  const [liveChannels, setLiveChannels] = useState<LiveChannel[]>([]);
  const liveChannelsRef = useRef<LiveChannel[]>([]);
  useEffect(() => {
    liveChannelsRef.current = liveChannels;
  }, [liveChannels]);

  const [tunedLiveChannel, setTunedLiveChannel] = useState<LiveChannel | null>(() => {
    try {
      const raw = localStorage.getItem('xuper_last_live_ch');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [liveFavMap, setLiveFavMap] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('xuper_live_favs_v1');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // Fullscreen Live Player Mode
  const [isFullscreenLive, setIsFullscreenLive] = useState<boolean>(() => {
    return new URLSearchParams(window.location.search).get('fullscreen') === '1';
  });
  const [showFullscreenGuide, setShowFullscreenGuide] = useState<boolean>(() => {
    return new URLSearchParams(window.location.search).get('drawer') === '1';
  });
  const [fullscreenGuideIndex, setFullscreenGuideIndex] = useState<number>(0);
  // Fullscreen drawer is two columns: categories (left) and channels (right)
  const [fullscreenGuideArea, setFullscreenGuideArea] = useState<DrawerArea>('channels');
  const [fullscreenQuery, setFullscreenQuery] = useState<string>('');
  const [fullscreenKb, setFullscreenKb] = useState<KbState>(KB_INITIAL);
  const drawerResultsRef = useRef<LiveChannel[]>([]);
  const [fullscreenCatCursor, setFullscreenCatCursor] = useState<number>(0);
  const [showFullscreenOsd, setShowFullscreenOsd] = useState<boolean>(true);
  const osdTimerRef = useRef<any>(null);

  const triggerOsd = useCallback(() => {
    setShowFullscreenOsd(true);
    if (osdTimerRef.current) clearTimeout(osdTimerRef.current);
    osdTimerRef.current = setTimeout(() => {
      setShowFullscreenOsd(false);
    }, 4500);
  }, []);

  // When entering fullscreen, show OSD banner automatically for 4.5s
  useEffect(() => {
    if (isFullscreenLive) {
      triggerOsd();
      setFullscreenGuideIndex(liveTvFocus.channelIndex);
    } else {
      setShowFullscreenGuide(false);
      if (osdTimerRef.current) clearTimeout(osdTimerRef.current);
    }
  }, [isFullscreenLive, triggerOsd, liveTvFocus.channelIndex]);

  // Toggle Live Favorite
  const toggleLiveFavorite = useCallback((channel: LiveChannel) => {
    const key = String(channel.id || channel.code);
    // TEMPORARY: trace who toggles favorites on the TV (see src/debug/tvDebug.ts)
    console.log('[dbg fav toggle]', key, channel.name, (new Error().stack || '').split('\n').slice(2, 5).join(' | '));
    setLiveFavMap(prev => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem('xuper_live_favs_v1', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  }, []);

  // Finds the live category (index in liveCategories) and position that contain a channel,
  // so a search result can open its own category with the channel selected.
  const locateLiveChannel = useCallback((ch: LiveChannel): LiveLocation | null => {
    const sameChannel = (c: LiveChannel) =>
      String(c.id) === String(ch.id) ||
      (!!c.code && !!ch.code && String(c.code) === String(ch.code)) ||
      (!!c.name && !!ch.name && c.name.trim().toLowerCase() === ch.name.trim().toLowerCase());
    const listFor = (catId: string | number): LiveChannel[] => {
      try {
        const raw = localStorage.getItem('xuper_live_ch_cache_v2_' + catId);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.channels)) return parsed.channels;
        }
      } catch {}
      return MOCK_CHANNELS_BY_CATEGORY[String(catId)] || [];
    };

    let fallback: LiveLocation | null = null;
    for (let i = 0; i < liveCategories.length; i++) {
      const cat = liveCategories[i];
      if (cat.isFav || String(cat.id) === 'favs') continue;
      const pos = listFor(cat.id).findIndex(sameChannel);
      if (pos === -1) continue;
      // Prefer a specific category over an aggregate one ("Todos los canales")
      if (/todos/i.test(cat.name)) {
        if (!fallback) fallback = { catIndex: i, channelIndex: pos };
        continue;
      }
      return { catIndex: i, channelIndex: pos };
    }
    return fallback;
  }, [liveCategories]);

  // Physical keyboard / remote digits typed while the drawer search is active
  useEffect(() => {
    if (!(isFullscreenLive && showFullscreenGuide && fullscreenGuideArea === 'search')) return;
    const onType = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^[A-Za-z0-9\u00C0-\u024F ._\-'&@+]$/.test(e.key)) {
        e.preventDefault();
        setFullscreenQuery(q => (q + e.key).slice(0, 30));
        setFullscreenGuideIndex(0);
      }
    };
    window.addEventListener('keydown', onType);
    return () => window.removeEventListener('keydown', onType);
  }, [isFullscreenLive, showFullscreenGuide, fullscreenGuideArea]);

  return {
    liveTvFocus,
    setLiveTvFocus,
    liveCategories,
    setLiveCategories,
    liveCategoriesRef,
    liveChannels,
    setLiveChannels,
    liveChannelsRef,
    tunedLiveChannel,
    setTunedLiveChannel,
    liveFavMap,
    isFullscreenLive,
    setIsFullscreenLive,
    showFullscreenGuide,
    setShowFullscreenGuide,
    fullscreenGuideIndex,
    setFullscreenGuideIndex,
    fullscreenGuideArea,
    setFullscreenGuideArea,
    fullscreenQuery,
    setFullscreenQuery,
    fullscreenKb,
    setFullscreenKb,
    drawerResultsRef,
    fullscreenCatCursor,
    setFullscreenCatCursor,
    showFullscreenOsd,
    setShowFullscreenOsd,
    triggerOsd,
    toggleLiveFavorite,
    locateLiveChannel
  };
}

export type LiveTvState = ReturnType<typeof useLiveTv>;
