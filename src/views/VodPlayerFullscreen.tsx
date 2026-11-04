import React, { useState, useEffect, useRef, useCallback } from 'react';
import { VodItem, VodEpisode } from '../types/vod';
import { historyService } from '../services/historyService';

interface VodPlayerFullscreenProps {
  item: VodItem;
  episode?: VodEpisode;
  isTrailer?: boolean;
  onClose: () => void;
}

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

export const VodPlayerFullscreen: React.FC<VodPlayerFullscreenProps> = ({
  item,
  episode,
  isTrailer,
  onClose
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showOsd, setShowOsd] = useState(true);
  const [osdMessage, setOsdMessage] = useState<string | null>(null);
  const osdTimerRef = useRef<any>(null);

  // Audio & Sub preferences from storage
  const audioTrack = localStorage.getItem('xuper_audio_pref') || 'Español Latino';
  const subTrack = localStorage.getItem('xuper_sub_pref') || 'Desactivados';

  // Resolved stream state
  const [resolvedStreamUrl, setResolvedStreamUrl] = useState<string | null>(null);
  const [streamInfoText, setStreamInfoText] = useState<string>('');

  const title = isTrailer
    ? `${item.title} — Tráiler Oficial`
    : item.title;

  const subtitle = !isTrailer && episode
    ? `Episodio ${episode.number || 1}: ${episode.title || episode.name || 'Capítulo'}`
    : (!isTrailer ? `${item.year || '2024'} · ${item.duration || 'Película'}` : 'Avance cinematográfico');

  // Trigger OSD visibility timeout (4 seconds)
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

  // Resolve VOD stream via MagisClient
  useEffect(() => {
    const isBrowserEnv = typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      (typeof (window as any).tizen === 'undefined' && typeof (window as any).webOS === 'undefined')
    );

    if (isTrailer) {
      setResolvedStreamUrl(item.streamUrl || 'https://media.w3.org/2010/05/bunny/movie.mp4');
      return;
    }

    const contentId = String(episode?.id || item.id || '');
    const seriesId = item.isSeries ? String(item.id || '') : null;

    if (window.MagisClient && typeof window.MagisClient.resolve === 'function' && contentId) {
      window.MagisClient.resolve(contentId, seriesId, {}, (err: any, res: any) => {
        if (!err && res && res.url) {
          const auth = res.headers?.['Content-Auth'] || '';
          const license = res.headers?.['Content-License'] || '';
          const finalUrl = isBrowserEnv && res.url.startsWith('http')
            ? `/stream-proxy?url=${encodeURIComponent(res.url)}&auth=${encodeURIComponent(auth)}&license=${encodeURIComponent(license)}`
            : res.url;
          setResolvedStreamUrl(finalUrl);
          setStreamInfoText(`${res.quality || 'HD'} · ${res.codec || 'H265'} · Audio: ${res.audio || 'SPA'}`);
        } else {
          // Fallback if portal resolve fails or offline
          setResolvedStreamUrl(episode?.streamUrl || item.streamUrl || 'https://media.w3.org/2010/05/bunny/movie.mp4');
        }
      });
    } else {
      setResolvedStreamUrl(episode?.streamUrl || item.streamUrl || 'https://media.w3.org/2010/05/bunny/movie.mp4');
    }
  }, [item, episode, isTrailer]);

  // Video playback initialization
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !resolvedStreamUrl) return;

    video.src = resolvedStreamUrl;
    video.load();

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      // Periodically record watch history for non-trailers
      if (!isTrailer && video.duration > 0 && Math.floor(video.currentTime) % 10 === 0) {
        historyService.savePlayback(
          item,
          Math.floor(video.currentTime),
          Math.floor(video.duration),
          episode
        );
      }
    };
    const onLoadedMetadata = () => {
      setDuration(video.duration || 0);
      video.play().catch(() => {
        // Fallback to muted play if browser blocks unmuted autoplay
        video.muted = true;
        video.play().catch(() => {});
      });
    };
    const onError = () => {
      console.warn('[VodPlayer] Stream error, trying fallback MP4');
      if (video.src !== 'https://media.w3.org/2010/05/bunny/movie.mp4') {
        video.src = 'https://media.w3.org/2010/05/bunny/movie.mp4';
        video.load();
        video.play().catch(() => {});
      }
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('error', onError);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('error', onError);
      try {
        video.pause();
        video.removeAttribute('src');
      } catch {}
    };
  }, [resolvedStreamUrl, isTrailer, item, episode]);

  // Handle TV Remote Keys during full playback
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const code = e.keyCode;
      const key = e.key;
      const video = videoRef.current;

      // RETURN / BACK
      if (code === 10009 || code === 27 || key === 'Escape' || key === 'Backspace') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      // PLAY / PAUSE / ENTER
      if (code === 13 || code === 32 || code === 19 || code === 415 || code === 10252) {
        e.preventDefault();
        if (video) {
          if (video.paused) {
            video.play().catch(() => {});
            setOsdMessage('▶ Reanudado');
          } else {
            video.pause();
            setOsdMessage('⏸ Pausa');
          }
        }
        triggerOsd();
        return;
      }

      // LEFT: Rewind 10s
      if (code === 37 || key === 'ArrowLeft') {
        e.preventDefault();
        if (video) {
          video.currentTime = Math.max(0, video.currentTime - 10);
          setOsdMessage('⏪ -10s');
        }
        triggerOsd();
        return;
      }

      // RIGHT: Fast Forward 10s
      if (code === 39 || key === 'ArrowRight') {
        e.preventDefault();
        if (video) {
          video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
          setOsdMessage('⏩ +10s');
        }
        triggerOsd();
        return;
      }

      // UP / DOWN: Toggle OSD
      if (code === 38 || code === 40 || key === 'ArrowUp' || key === 'ArrowDown') {
        e.preventDefault();
        setShowOsd(prev => !prev);
        return;
      }
    };

    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', onKeyDown, { capture: true });
    };
  }, [onClose, triggerOsd]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="vod-fullscreen-player">
      <video
        ref={videoRef}
        className="vod-fullscreen-video"
        playsInline
        autoPlay
      />

      {/* Center Feedback Indicator on Seek / Pause */}
      {osdMessage && (
        <div className="player-center-toast" key={osdMessage}>
          {osdMessage}
        </div>
      )}

      {/* Apple TV-style Cinema OSD Overlay */}
      <div className={`vod-player-osd ${showOsd ? 'is-visible' : 'is-hidden'}`}>
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
              <span>◀ / ▶ 10s · [OK] Pausa · [VOLVER] Salir</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
