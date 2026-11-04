import React, { useState, useEffect, useRef, useCallback } from 'react';
import { VodItem, VodEpisode } from '../types/vod';
import { historyService } from '../services/historyService';
import { playerService } from '../services/playerService';

interface VodPlayerFullscreenProps {
  item: VodItem;
  episode?: VodEpisode;
  isTrailer?: boolean;
  /** Seconds to resume from */
  startAt?: number;
  /** Season content id the episode belongs to */
  seriesId?: string;
  seasonNumber?: number;
  /** Episodes of the season, for "next episode" */
  episodes?: VodEpisode[];
  onPlayEpisode?: (episode: VodEpisode) => void;
  onClose: () => void;
}

// Demo video only for local development; a real TV build never plays it
const DEV_FALLBACK_URL = 'https://media.w3.org/2010/05/bunny/movie.mp4';
const SAVE_EVERY_MS = 15000;
const NEXT_EPISODE_SECONDS = 10;

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

/** AVPlay (hardware player) is only available on the Samsung TV */
function hasAvPlay(): boolean {
  return !!(window.XuperAVPlay && window.webapis && window.webapis.avplay);
}

export const VodPlayerFullscreen: React.FC<VodPlayerFullscreenProps> = ({
  item,
  episode,
  isTrailer,
  startAt = 0,
  seriesId,
  seasonNumber,
  episodes = [],
  onPlayEpisode,
  onClose
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isBuffering, setIsBuffering] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showOsd, setShowOsd] = useState(true);
  const [osdMessage, setOsdMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  const [nextCountdown, setNextCountdown] = useState<number | null>(null);
  const osdTimerRef = useRef<any>(null);
  const useAvPlayRef = useRef<boolean>(false);
  const requestIdRef = useRef<number>(0);
  const timeRef = useRef({ t: 0, d: 0 });
  const startedAtRef = useRef<number>(startAt);

  // Audio & Sub preferences from storage
  const audioTrack = localStorage.getItem('xuper_audio_pref') || 'Español Latino';
  const subTrack = localStorage.getItem('xuper_sub_pref') || 'Desactivados';

  const [streamInfoText, setStreamInfoText] = useState<string>('');
  const [browserUrl, setBrowserUrl] = useState<string | null>(null);
  const [avMode, setAvMode] = useState(false);

  const epIndex = episode ? episodes.findIndex(ep => String(ep.id) === String(episode.id)) : -1;
  const nextEpisode = epIndex !== -1 && epIndex + 1 < episodes.length ? episodes[epIndex + 1] : undefined;
  const epNumber = episode ? (episode.number || epIndex + 1 || 1) : 0;

  const title = isTrailer ? `${item.title} — Tráiler Oficial` : item.title;
  const subtitle = !isTrailer && episode
    ? `${seasonNumber ? `T${seasonNumber}:` : ''}E${epNumber} · ${episode.title || episode.name || 'Capítulo'}`
    : (!isTrailer ? [item.year, item.duration].filter(v => v && v !== '—').join(' · ') : 'Avance cinematográfico');

  // Trigger OSD visibility timeout (4.5 seconds)
  const triggerOsd = useCallback(() => {
    setShowOsd(true);
    if (osdTimerRef.current) clearTimeout(osdTimerRef.current);
    osdTimerRef.current = setTimeout(() => {
      setShowOsd(false);
    }, 4500);
  }, []);

  useEffect(() => {
    triggerOsd();
    return () => {
      if (osdTimerRef.current) clearTimeout(osdTimerRef.current);
    };
  }, [triggerOsd]);

  // ---------------------------------------------------------------------------
  // Progress saving: every 15 s while playing, and when leaving the player
  // ---------------------------------------------------------------------------
  const saveProgress = useCallback(() => {
    if (isTrailer) return;
    const { t, d } = timeRef.current;
    if (t < 1) return;
    historyService.savePlayback(item, t, d, episode, false, { id: seriesId, number: seasonNumber });
  }, [isTrailer, item, episode, seriesId, seasonNumber]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (isPlaying) saveProgress();
    }, SAVE_EVERY_MS);
    return () => clearInterval(timer);
  }, [isPlaying, saveProgress]);

  const handleEnded = useCallback(() => {
    if (!isTrailer) {
      timeRef.current.t = timeRef.current.d || timeRef.current.t;
      saveProgress();
    }
    if (nextEpisode && onPlayEpisode && !isTrailer) {
      setNextCountdown(NEXT_EPISODE_SECONDS);
    } else {
      onClose();
    }
  }, [isTrailer, nextEpisode, onPlayEpisode, onClose, saveProgress]);

  // Latest callbacks for listeners registered once (AVPlay handlers, unmount)
  const handleEndedRef = useRef(handleEnded);
  handleEndedRef.current = handleEnded;
  const saveProgressRef = useRef(saveProgress);
  saveProgressRef.current = saveProgress;

  // Next-episode countdown
  useEffect(() => {
    if (nextCountdown === null) return;
    if (nextCountdown <= 0) {
      setNextCountdown(null);
      if (nextEpisode && onPlayEpisode) onPlayEpisode(nextEpisode);
      return;
    }
    const t = setTimeout(() => setNextCountdown(c => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(t);
  }, [nextCountdown, nextEpisode, onPlayEpisode]);

  // ---------------------------------------------------------------------------
  // Resolve the stream and start playback
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const requestId = ++requestIdRef.current;
    const isCurrent = () => requestId === requestIdRef.current;

    setError(null);
    setIsBuffering(true);
    setBrowserUrl(null);
    startedAtRef.current = retryTick > 0 ? timeRef.current.t : startAt;

    // The live preview shares the single AVPlay instance: stop it first
    playerService.stop();

    const failed = (msg: string) => {
      if (!isCurrent()) return;
      if (import.meta.env.DEV) {
        console.warn('[VodPlayer] ' + msg + ' — using the demo video (development only)');
        setBrowserUrl(episode?.streamUrl || item.streamUrl || DEV_FALLBACK_URL);
      } else {
        setIsBuffering(false);
        setError(msg);
      }
    };

    const playOnTv = (res: any) => {
      useAvPlayRef.current = true;
      setAvMode(true);
      // AVPlay draws below the page: everything above it must be transparent
      document.documentElement.classList.add('xuper-vod-avplay');
      console.log('[VodPlayer] AVPlay open', res.mime, String(res.url).slice(0, 60), 'startAt=' + startedAtRef.current);
      // tizen-bridge reads backup CDNs from here when a stream fails
      window.__xuperCurrentStreamMeta = res;
      video.onloadedmetadata = () => {
        console.log('[VodPlayer] AVPlay prepared, duration=' + window.XuperAVPlay.durationSec);
        if (!isCurrent()) return;
        const d = window.XuperAVPlay.durationSec || res.duration || 0;
        timeRef.current.d = d;
        setDuration(d);
        if (startedAtRef.current > 5) window.XuperAVPlay.seekTo(startedAtRef.current);
      };
      video.ontimeupdate = () => {
        if (!isCurrent()) return;
        const t = window.XuperAVPlay.currentTimeSec || 0;
        timeRef.current.t = t;
        setCurrentTime(t);
      };
      video.onwaiting = () => isCurrent() && setIsBuffering(true);
      video.onplaying = () => {
        console.log('[VodPlayer] AVPlay playing');
        if (!isCurrent()) return;
        setIsBuffering(false);
        setIsPlaying(true);
      };
      video.onended = () => isCurrent() && handleEndedRef.current();
      video.onerror = () => {
        console.log('[VodPlayer] AVPlay error');
        if (isCurrent()) {
          setIsBuffering(false);
          setError('No se pudo reproducir este contenido.');
        }
      };
      const ok = window.XuperAVPlay.playStream(res.url, res.headers, video);
      console.log('[VodPlayer] playStream returned', ok);
      if (!ok) failed('No se pudo iniciar el reproductor de la TV.');
    };

    if (isTrailer) {
      const trailerUrl = item.streamUrl || (import.meta.env.DEV ? DEV_FALLBACK_URL : '');
      if (trailerUrl) {
        setBrowserUrl(trailerUrl);
      } else {
        setIsBuffering(false);
        setError('Este título no tiene tráiler disponible.');
      }
      return;
    }

    const contentId = String(episode?.id || item.id || '');
    const seasonId = episode ? String(seriesId || item.id || '') : null;

    if (!window.MagisClient || typeof window.MagisClient.resolve !== 'function' || !contentId) {
      failed('El portal no está disponible.');
      return;
    }

    window.MagisClient.resolve(contentId, seasonId, {}, (err: any, res: any) => {
      if (!isCurrent()) return; // the user already left or chose another episode
      if (err || !res || !res.url) {
        failed((err && err.message) || 'No se pudo obtener el video del portal.');
        return;
      }
      setStreamInfoText([res.quality, res.codec, res.audio && `Audio: ${res.audio}`].filter(Boolean).join(' · '));
      if (hasAvPlay()) {
        playOnTv(res);
      } else if (res.mime === 'video/mp2t' || /\.ts(\?|$)/i.test(res.url)) {
        // Desktop Chrome cannot play MPEG-TS files; the TV plays them with AVPlay
        setIsBuffering(false);
        setError('Este video (.ts) solo se reproduce en la TV. En el navegador no es compatible.');
      } else {
        // Desktop browser (development): the dev server proxy adds the portal headers
        const auth = res.headers?.['Content-Auth'] || '';
        const license = res.headers?.['Content-License'] || '';
        setBrowserUrl(`/stream-proxy?url=${encodeURIComponent(res.url)}&auth=${encodeURIComponent(auth)}&license=${encodeURIComponent(license)}`);
      }
    });

    return () => {
      requestIdRef.current++;
    };
  }, [item, episode, isTrailer, seriesId, retryTick]);

  // Browser <video> playback (development / trailers)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !browserUrl) return;
    useAvPlayRef.current = false;

    video.src = browserUrl;
    video.load();

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => {
      timeRef.current.t = video.currentTime;
      setCurrentTime(video.currentTime);
    };
    const onLoadedMetadata = () => {
      timeRef.current.d = video.duration || 0;
      setDuration(video.duration || 0);
      if (startedAtRef.current > 5 && startedAtRef.current < (video.duration || 0)) {
        video.currentTime = startedAtRef.current;
      }
      video.play().catch(() => {
        video.muted = true;
        video.play().catch(() => {});
      });
    };
    const onPlaying = () => setIsBuffering(false);
    const onWaiting = () => setIsBuffering(true);
    const onEnded = () => handleEnded();
    const onError = () => {
      if (import.meta.env.DEV && video.src.indexOf(DEV_FALLBACK_URL) === -1) {
        video.src = DEV_FALLBACK_URL;
        video.load();
        return;
      }
      setIsBuffering(false);
      setError('No se pudo reproducir este contenido.');
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('ended', onEnded);
    video.addEventListener('error', onError);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('error', onError);
      try {
        video.pause();
        video.removeAttribute('src');
      } catch {}
    };
  }, [browserUrl, handleEnded]);

  // Leaving the player: save the position and release the TV player
  useEffect(() => {
    const video = videoRef.current;
    return () => {
      saveProgressRef.current();
      if (useAvPlayRef.current && window.XuperAVPlay) {
        try { window.XuperAVPlay.stop(); } catch {}
        // AVPlay stop paints the page black; give the theme background back
        document.documentElement.style.backgroundColor = '';
        document.body.style.backgroundColor = '';
      }
      window.__xuperCurrentStreamMeta = null;
      document.documentElement.classList.remove('xuper-vod-avplay');
      if (video) {
        video.onloadedmetadata = null;
        video.ontimeupdate = null;
        video.onwaiting = null;
        video.onplaying = null;
        video.onended = null;
        video.onerror = null;
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Controls (AVPlay on the TV, <video> in the browser)
  // ---------------------------------------------------------------------------
  const togglePause = () => {
    const video = videoRef.current;
    if (useAvPlayRef.current && window.XuperAVPlay) {
      if (window.XuperAVPlay.isPaused) {
        window.XuperAVPlay.play();
        setIsPlaying(true);
        setOsdMessage('▶ Reanudado');
      } else {
        window.XuperAVPlay.pause();
        setIsPlaying(false);
        setOsdMessage('⏸ Pausa');
        saveProgress();
      }
      return;
    }
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
      setOsdMessage('▶ Reanudado');
    } else {
      video.pause();
      setOsdMessage('⏸ Pausa');
      saveProgress();
    }
  };

  const seekBy = (delta: number) => {
    const d = timeRef.current.d;
    const target = Math.max(0, Math.min(d > 0 ? d - 5 : Infinity, timeRef.current.t + delta));
    if (useAvPlayRef.current && window.XuperAVPlay) {
      window.XuperAVPlay.seekTo(target);
    } else if (videoRef.current) {
      videoRef.current.currentTime = target;
    }
    timeRef.current.t = target;
    setCurrentTime(target);
    setOsdMessage(delta < 0 ? `⏪ ${delta}s` : `⏩ +${delta}s`);
  };

  // Handle TV Remote Keys during full playback
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const code = e.keyCode;
      const key = e.key;
      const isBack = code === 10009 || code === 27 || code === 461 || key === 'Escape' || key === 'Backspace';
      const isEnter = code === 13 || code === 32 || code === 19 || code === 415 || code === 10252;

      // "Next episode" card
      if (nextCountdown !== null) {
        e.preventDefault();
        e.stopPropagation();
        if (isEnter && nextEpisode && onPlayEpisode) {
          setNextCountdown(null);
          onPlayEpisode(nextEpisode);
        } else if (isBack) {
          setNextCountdown(null);
          onClose();
        }
        return;
      }

      if (isBack) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      if (error) {
        if (isEnter) {
          e.preventDefault();
          setRetryTick(t => t + 1);
        }
        return;
      }

      if (isEnter) {
        e.preventDefault();
        togglePause();
        triggerOsd();
        return;
      }

      // Hold ◄ / ► to jump faster (30 s steps while the key repeats)
      if (code === 37 || key === 'ArrowLeft') {
        e.preventDefault();
        seekBy(e.repeat ? -30 : -10);
        triggerOsd();
        return;
      }
      if (code === 39 || key === 'ArrowRight') {
        e.preventDefault();
        seekBy(e.repeat ? 30 : 10);
        triggerOsd();
        return;
      }

      if (code === 38 || code === 40 || key === 'ArrowUp' || key === 'ArrowDown') {
        e.preventDefault();
        triggerOsd();
      }
    };

    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', onKeyDown, { capture: true });
    };
  }, [onClose, triggerOsd, nextCountdown, nextEpisode, onPlayEpisode, error]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`vod-fullscreen-player ${avMode ? 'is-avplay' : ''}`}>
      <video
        ref={videoRef}
        className="vod-fullscreen-video"
        playsInline
        autoPlay
      />

      {isBuffering && !error && <div className="vod-player-spinner" />}

      {/* Center Feedback Indicator on Seek / Pause */}
      {osdMessage && (
        <div className="player-center-toast" key={osdMessage + currentTime}>
          {osdMessage}
        </div>
      )}

      {error && (
        <div className="vod-player-error">
          <div className="vod-player-error-title">{error}</div>
          <div className="vod-player-error-hint">OK Reintentar · VOLVER Salir</div>
        </div>
      )}

      {nextCountdown !== null && nextEpisode && (
        <div className="vod-next-episode">
          <div className="vod-next-label">Siguiente episodio en {nextCountdown} s</div>
          <div className="vod-next-title">
            {seasonNumber ? `T${seasonNumber}:` : ''}E{nextEpisode.number || epIndex + 2} · {nextEpisode.title || nextEpisode.name || 'Capítulo'}
          </div>
          <div className="vod-next-hint">OK Ver ahora · VOLVER Salir</div>
        </div>
      )}

      {/* Apple TV-style Cinema OSD Overlay */}
      <div className={`vod-player-osd ${showOsd || !isPlaying || error ? 'is-visible' : 'is-hidden'}`}>
        {/* Top Header Bar */}
        <div className="vod-osd-top">
          <div className="vod-osd-info">
            <span className="vod-osd-badge">{isTrailer ? 'TRÁILER OFICIAL' : 'REPRODUCIENDO'}</span>
            {streamInfoText && !isTrailer && (
              <span className="vod-osd-badge" style={{ marginLeft: 8, background: 'rgba(0, 229, 255, 0.2)', color: '#00e5ff', borderColor: 'rgba(0, 229, 255, 0.4)' }}>
                {streamInfoText}
              </span>
            )}
            <h1 className="vod-osd-title">{title}</h1>
            <p className="vod-osd-subtitle">{subtitle}</p>
          </div>
          <button className="vod-osd-close-btn" onClick={onClose}>
            <span>✕ Salir</span>
          </button>
        </div>

        {/* Bottom Playback Bar */}
        <div className="vod-osd-bottom">
          <div className="vod-osd-time-row">
            <span className="vod-time-elapsed">{formatTime(currentTime)}</span>
            <div className="vod-seekbar-track">
              <div
                className="vod-seekbar-fill"
                style={{ width: `${progressPercent}%` }}
              />
              <div
                className="vod-seekbar-thumb"
                style={{ left: `${progressPercent}%` }}
              />
            </div>
            <span className="vod-time-duration">{formatTime(duration)}</span>
          </div>

          <div className="vod-osd-meta-controls">
            <div className="vod-osd-pill">
              <span className="pill-dot">●</span>
              <span>Audio: {audioTrack}</span>
            </div>
            <div className="vod-osd-pill">
              <span>Subs: {subTrack}</span>
            </div>
            <div className="vod-osd-hint">
              <span>◀ / ▶ 10s (mantener: 30s) · [OK] Pausa · [VOLVER] Salir</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
