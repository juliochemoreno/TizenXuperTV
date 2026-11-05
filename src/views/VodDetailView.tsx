import React, { useState, useEffect, useRef, useMemo } from 'react';
import { VodItem, VodEpisode, VodSeason } from '../types/vod';
import { catalogService } from '../services/catalogService';
import { PosterCard } from '../components/vod/PosterCard';
import { scrollHorizontalSlider } from '../utils/scrollHelper';
import { historyService } from '../services/historyService';
import { settingsService, PREFERRED_LANGUAGES, SUBTITLE_CHOICES, subtitleChoiceIndex } from '../services/settingsService';
import { getResumeTarget } from '../lib/vodResume';

export type DetailFocusArea = 'back' | 'actions' | 'seasons' | 'episodes' | 'related' | 'audioModal';

export interface VodDetailFocus {
  area: DetailFocusArea;
  actionIndex: number;
  seasonIndex: number;
  episodeIndex: number;
  relatedIndex: number;
  modalCol?: 'audio' | 'subs';
  modalIndex?: number;
}

const NO_EPISODES: VodEpisode[] = [];

export const AUDIO_OPTIONS = PREFERRED_LANGUAGES;
export const SUB_OPTIONS = SUBTITLE_CHOICES;

interface VodDetailViewProps {
  item: VodItem;
  focus: VodDetailFocus;
  isFavorite: boolean;
  relatedItems?: VodItem[];
  onBack: () => void;
  onPlay: (item: VodItem, episode?: VodEpisode, isTrailer?: boolean) => void;
  onToggleFavorite: (item: VodItem) => void;
  onSelectSeason?: (seasonIndex: number) => void;
  onSelectRelated?: (item: VodItem) => void;
  onDetailLoaded?: (counts: { seasonsCount: number; episodesCount: number; relatedCount: number; isSeries: boolean }) => void;
  onEpisodesChange?: (data: { episodes: VodEpisode[]; seasonId: string; seasonNumber?: number }) => void;
  onOpenAudioModal?: () => void;
  onCloseAudioModal?: () => void;
  onSelectAudioOption?: (audio: string) => void;
  onSelectSubOption?: (sub: string) => void;
}

export const VodDetailView: React.FC<VodDetailViewProps> = ({
  item,
  focus,
  isFavorite,
  relatedItems = [],
  onBack,
  onPlay,
  onToggleFavorite,
  onSelectSeason,
  onSelectRelated,
  onDetailLoaded,
  onEpisodesChange,
  onOpenAudioModal,
  onCloseAudioModal,
  onSelectAudioOption,
  onSelectSubOption
}) => {
  const [detailData, setDetailData] = useState<{
    item: VodItem;
    episodes: VodEpisode[];
    seasons: VodSeason[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  // Episodes of a season other than the opened one (portal: every season is its own content id)
  const [seasonEps, setSeasonEps] = useState<{ seasonId: string; episodes: VodEpisode[] } | null>(null);
  const [seasonLoading, setSeasonLoading] = useState(false);
  const [historyTick, setHistoryTick] = useState(0);

  useEffect(() => historyService.subscribe(() => setHistoryTick(t => t + 1)), []);

  // Audio & subtitle preferences: the same ones as the profile (Configuración global)
  const prefs = settingsService.get();
  const currentAudio = AUDIO_OPTIONS[prefs.audio] || AUDIO_OPTIONS[0];
  const currentSub = SUB_OPTIONS[subtitleChoiceIndex(prefs)] || SUB_OPTIONS[0];
  const audioShortName = currentAudio;

  const episodesSliderRef = useRef<HTMLDivElement>(null);
  const relatedSliderRef = useRef<HTMLDivElement>(null);
  const rootScrollRef = useRef<HTMLDivElement>(null);

  // Fetch full details (episodes, seasons, cast, synopsis)
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setLoadError(false);
    setSeasonEps(null);

    catalogService.getVodDetail(item).then(data => {
      if (!isMounted) return;
      setDetailData(data);
      setIsLoading(false);
      // Open on the season of this item
      const ownIdx = data.seasons.findIndex(s => String(s.id) === String(item.id));
      if (ownIdx > 0 && onSelectSeason) onSelectSeason(ownIdx);
    }).catch(err => {
      if (!isMounted) return;
      console.warn('[VodDetailView] Detail load failed:', err);
      setLoadError(true);
      setDetailData({
        item,
        episodes: [],
        seasons: []
      });
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [item]);

  const currentItem = detailData?.item || item;
  const seasons = detailData?.seasons || [];
  // Memoized so effects below only run when the list really changes
  const episodes = useMemo<VodEpisode[]>(
    () => (seasonEps ? seasonEps.episodes : (detailData?.episodes || NO_EPISODES)),
    [seasonEps, detailData]
  );
  const currentSeasonId = seasonEps ? seasonEps.seasonId : String(item.id);
  const currentSeasonNumber = (seasons.find(s => String(s.id) === currentSeasonId) || seasons[0])?.number;

  // Load the episodes of the season selected in the season pills
  useEffect(() => {
    if (!detailData || seasons.length < 2) return;
    const target = seasons[focus.seasonIndex];
    if (!target || String(target.id) === currentSeasonId) return;
    let alive = true;
    setSeasonLoading(true);
    catalogService.getVodDetail({ ...item, id: String(target.id) })
      .then(d => { if (alive) setSeasonEps({ seasonId: String(target.id), episodes: d.episodes }); })
      .catch(() => { if (alive) setSeasonEps({ seasonId: String(target.id), episodes: [] }); })
      .then(() => { if (alive) setSeasonLoading(false); });
    return () => { alive = false; };
  }, [focus.seasonIndex, detailData]);

  // Tell the parent which episodes are on screen (used by the remote: OK on an episode, Continuar)
  useEffect(() => {
    if (onEpisodesChangeRef.current) {
      onEpisodesChangeRef.current({ episodes, seasonId: currentSeasonId, seasonNumber: currentSeasonNumber });
    }
  }, [episodes, currentSeasonId, currentSeasonNumber]);

  const resume = getResumeTarget(item, episodes, historyService.getEntry(item.id), currentSeasonNumber, currentSeasonId);
  void historyTick;
  const isSeries = Boolean(currentItem.isSeries || currentItem.kind === 'serie' || seasons.length > 0 || episodes.length > 0);

  // Parent callbacks are new functions on every render: keep the latest in refs so the
  // effects below only fire when the data changes (otherwise they loop forever)
  const onDetailLoadedRef = useRef(onDetailLoaded);
  onDetailLoadedRef.current = onDetailLoaded;
  const onEpisodesChangeRef = useRef(onEpisodesChange);
  onEpisodesChangeRef.current = onEpisodesChange;

  // Notify parent of counts for remote D-pad navigation
  useEffect(() => {
    if (onDetailLoadedRef.current) {
      onDetailLoadedRef.current({
        seasonsCount: seasons.length || (isSeries ? 1 : 0),
        episodesCount: episodes.length,
        relatedCount: relatedItems.length,
        isSeries
      });
    }
  }, [seasons.length, episodes.length, relatedItems.length, isSeries]);

  // Auto-scroll horizontal episode slider with comfortable threshold
  useEffect(() => {
    if (focus.area === 'episodes' && episodesSliderRef.current) {
      const container = episodesSliderRef.current;
      const target = container.children[focus.episodeIndex] as HTMLElement;
      scrollHorizontalSlider(container, target, focus.episodeIndex, 48, 180);
    }
  }, [focus.area, focus.episodeIndex]);

  // Auto-scroll horizontal related slider with comfortable threshold
  useEffect(() => {
    if (focus.area === 'related' && relatedSliderRef.current) {
      const container = relatedSliderRef.current;
      const target = container.children[focus.relatedIndex] as HTMLElement;
      scrollHorizontalSlider(container, target, focus.relatedIndex, 48, 160);
    }
  }, [focus.area, focus.relatedIndex]);

  // Auto-scroll vertical page when navigating between top actions and bottom rows
  useEffect(() => {
    if (!rootScrollRef.current) return;
    if (focus.area === 'back' || focus.area === 'actions') {
      rootScrollRef.current.scrollTop = 0;
    } else if (focus.area === 'seasons' || focus.area === 'episodes') {
      rootScrollRef.current.scrollTop = 280;
    } else if (focus.area === 'related') {
      rootScrollRef.current.scrollTop = rootScrollRef.current.scrollHeight;
    }
  }, [focus.area]);

  const backdropUrl = currentItem.backdrop || currentItem.landscape || currentItem.poster || 'assets/placeholder_landscape.png';
  const genres = currentItem.genres && currentItem.genres.length ? currentItem.genres : ['Película', 'Acción'];
  const score = currentItem.score || '8.5';
  const year = currentItem.year && currentItem.year !== '—' ? currentItem.year : '2024';

  return (
    <div className="vod-detail-screen" ref={rootScrollRef}>
      {/* Immersive Cinema Backdrop */}
      <div
        className="vod-detail-backdrop"
        style={{ backgroundImage: `url('${backdropUrl}')` }}
      />
      <div className="vod-detail-overlay-vignette" />

      {/* Top Navigation Row: Back Button */}
      <header className="vod-detail-top-bar">
        <button
          className={`vod-back-btn ${focus.area === 'back' ? 'is-focused' : ''}`}
          onClick={onBack}
        >
          <span className="back-arrow">←</span> Volver al catálogo
        </button>
      </header>

      {/* Main Metadata Section */}
      <main className="vod-detail-main">
        <div className="vod-detail-header-block">
          <h1 className="vod-detail-title">{currentItem.title}</h1>

          {/* Badges / Rating Row */}
          <div className="vod-detail-badges-row">
            <span className="badge-rating-star">★ {score}</span>
            <span className="badge-pill brand">4K ULTRA HD</span>
            <span className="badge-pill">HDR10+</span>
            <span className="badge-pill age">16+</span>
            <span className="badge-meta">{year}</span>
            <span className="badge-meta">
              {isSeries ? `${seasons.length || 1} Temporada${seasons.length > 1 ? 's' : ''}` : currentItem.duration}
            </span>
          </div>

          {/* Genre Chips */}
          <div className="vod-detail-genres-row">
            {genres.map((g, idx) => (
              <span key={idx} className="vod-genre-chip">
                {g}
              </span>
            ))}
          </div>

          {/* Synopsis */}
          <p className="vod-detail-synopsis">
            {currentItem.synopsis || 'Sinopsis completa de la producción cinematográfica en alta resolución disponible en Xuper TV.'}
          </p>

          {/* Cast & Crew */}
          <div className="vod-detail-crew-row">
            <span className="crew-label">Director:</span>
            <span className="crew-value">{currentItem.director || 'Christopher Nolan'}</span>
            <span className="crew-divider">·</span>
            <span className="crew-label">Reparto:</span>
            <span className="crew-value">{currentItem.actors || 'Reparto estelar'}</span>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="vod-detail-actions-row">
          {/* Action 0: Play / Resume */}
          <button
            className={`vod-action-btn primary-btn ${focus.area === 'actions' && focus.actionIndex === 0 ? 'is-focused' : ''}`}
            onClick={() => onPlay(currentItem)}
          >
            <span className="btn-icon">▶</span>
            <span>{resume.label}</span>
          </button>

          {/* Action 1: Favorite */}
          <button
            className={`vod-action-btn secondary-btn ${isFavorite ? 'is-fav' : ''} ${focus.area === 'actions' && focus.actionIndex === 1 ? 'is-focused' : ''}`}
            onClick={() => onToggleFavorite(currentItem)}
          >
            <span className="btn-icon">{isFavorite ? '★' : '☆'}</span>
            <span>{isFavorite ? 'En Mi Lista' : 'Añadir a Favoritos'}</span>
          </button>

          {/* Action 2: Audio & Subtitles */}
          <button
            className={`vod-action-btn secondary-btn ${focus.area === 'actions' && focus.actionIndex === 2 ? 'is-focused' : ''}`}
            onClick={() => onOpenAudioModal && onOpenAudioModal()}
          >
            <span className="btn-icon">🌐</span>
            <span>Audio y Subs · {audioShortName}</span>
          </button>

          {/* Action 3: Trailer */}
          <button
            className={`vod-action-btn secondary-btn ${focus.area === 'actions' && focus.actionIndex === 3 ? 'is-focused' : ''}`}
            onClick={() => onPlay(currentItem, undefined, true)}
          >
            <span className="btn-icon">🎬</span>
            <span>Ver Tráiler</span>
          </button>
        </div>

        {/* Series Section: Seasons Selector + Episodes Slider */}
        {isSeries && (
          <section className="vod-detail-series-section">
            <div className="vod-series-header">
              <h2 className="section-title">Episodios</h2>

              {/* Seasons Selector Pills */}
              {seasons.length > 1 && (
                <div className="vod-seasons-row">
                  {seasons.map((s, sIdx) => {
                    const isSeasonFocused = focus.area === 'seasons' && focus.seasonIndex === sIdx;
                    const isSeasonActive = focus.seasonIndex === sIdx;

                    return (
                      <button
                        key={s.id || sIdx}
                        className={`season-pill-btn ${isSeasonActive ? 'is-active' : ''} ${isSeasonFocused ? 'is-focused' : ''}`}
                        onClick={() => onSelectSeason && onSelectSeason(sIdx)}
                      >
                        {s.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Horizontal Episodes Slider */}
            <div className="vod-episodes-slider" ref={episodesSliderRef}>
              {(isLoading || seasonLoading) ? (
                <div className="vod-episodes-loading">Cargando episodios…</div>
              ) : loadError ? (
                <div className="vod-episodes-loading">No se pudieron cargar los episodios. Vuelve a abrir la ficha para reintentar.</div>
              ) : episodes.length === 0 ? (
                <div className="vod-episodes-loading">No hay episodios disponibles para esta temporada.</div>
              ) : (
                episodes.map((ep, epIdx) => {
                  const isEpFocused = focus.area === 'episodes' && focus.episodeIndex === epIdx;
                  const epPic = ep.picture || backdropUrl;

                  return (
                    <div
                      key={ep.id || epIdx}
                      className={`vod-episode-card ${isEpFocused ? 'is-focused' : ''}`}
                      onClick={() => onPlay(currentItem, ep)}
                    >
                      <div
                        className="episode-card-thumb"
                        style={{ backgroundImage: `url('${epPic}')` }}
                      >
                        <div className="episode-badge-num">EP. {ep.number || epIdx + 1}</div>
                        <div className="episode-play-overlay">
                          <span className="play-triangle">▶</span>
                        </div>
                      </div>

                      <div className="episode-card-body">
                        <div className="episode-card-title">{ep.title || `Capítulo ${ep.number || epIdx + 1}`}</div>
                        <div className="episode-card-meta">
                          <span>{ep.duration || ''}</span>
                          <span>·</span>
                          <span className="badge-tag-mini">{ep.quality || 'FHD'}</span>
                        </div>
                        <p className="episode-card-desc">{ep.description}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}

        {/* Recommended / Similar Titles Row */}
        {relatedItems && relatedItems.length > 0 && (
          <section className="vod-detail-related-section">
            <h2 className="section-title">Títulos Similares</h2>
            <div className="vod-related-slider" ref={relatedSliderRef}>
              {relatedItems.map((rel, rIdx) => {
                const isRelFocused = focus.area === 'related' && focus.relatedIndex === rIdx;
                return (
                  <PosterCard
                    key={rel.id || rIdx}
                    item={rel}
                    isFocused={isRelFocused}
                    onActivate={item => onSelectRelated && onSelectRelated(item)}
                  />
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* Audio & Subtitles Selection Modal (Apple TV Glass Panel) */}
      {focus.area === 'audioModal' && (
        <div className="audio-modal-backdrop" onClick={onCloseAudioModal}>
          <div className="audio-modal-card" onClick={e => e.stopPropagation()}>
            <div className="audio-modal-header">
              <span className="audio-modal-icon">🌐</span>
              <h2 className="audio-modal-title">Audio y Subtítulos</h2>
              <button className="audio-modal-close-btn" onClick={onCloseAudioModal}>✕</button>
            </div>

            <div className="audio-modal-columns">
              {/* Column 1: Audio */}
              <div className="audio-modal-col">
                <h3 className="audio-col-title">IDIOMA DE AUDIO</h3>
                <div className="audio-options-list">
                  {AUDIO_OPTIONS.map((opt, aIdx) => {
                    const isSelected = currentAudio === opt;
                    const isFocused = (focus.modalCol || 'audio') === 'audio' && (focus.modalIndex || 0) === aIdx;

                    return (
                      <button
                        key={opt}
                        className={`audio-option-btn ${isSelected ? 'is-selected' : ''} ${isFocused ? 'is-focused' : ''}`}
                        onClick={() => onSelectAudioOption && onSelectAudioOption(opt)}
                      >
                        <span className="opt-check">{isSelected ? '✓' : ''}</span>
                        <span className="opt-label">{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Column 2: Subtitles */}
              <div className="audio-modal-col">
                <h3 className="audio-col-title">SUBTÍTULOS</h3>
                <div className="audio-options-list">
                  {SUB_OPTIONS.map((sub, sIdx) => {
                    const isSelected = currentSub === sub;
                    const isFocused = focus.modalCol === 'subs' && (focus.modalIndex || 0) === sIdx;

                    return (
                      <button
                        key={sub}
                        className={`audio-option-btn ${isSelected ? 'is-selected' : ''} ${isFocused ? 'is-focused' : ''}`}
                        onClick={() => onSelectSubOption && onSelectSubOption(sub)}
                      >
                        <span className="opt-check">{isSelected ? '✓' : ''}</span>
                        <span className="opt-label">{sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="audio-modal-footer">
              <button
                className="audio-modal-done-btn"
                onClick={onCloseAudioModal}
              >
                Listo (Volver)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
