import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TabId } from '../layout/TopNavbar';
import { LiveChannel } from '../../types/channel';
import { VodItem } from '../../types/vod';
import { catalogService } from '../../services/catalogService';
import { MOCK_CHANNELS_BY_CATEGORY } from '../../services/mockLiveChannels';
import { OnScreenKeyboard, KbState, KB_INITIAL, pressKey, moveCursor, keyAt } from '../live/OnScreenKeyboard';
import { normalizeText } from '../../utils/normalizeText';
import { normalizeChannels } from '../../lib/channelKey';
import { allChannelEntries } from '../../lib/channelCache';

export interface SearchModalProps {
  isOpen: boolean;
  currentTab: TabId;
  onClose: () => void;
  onSelectChannel: (channel: LiveChannel) => void;
  onSelectVodItem: (item: VodItem) => void;
  channels: LiveChannel[];
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  currentTab,
  onClose,
  onSelectChannel,
  onSelectVodItem,
  channels
}) => {
  const [query, setQuery] = useState<string>('');
  const [focusedResultIndex, setFocusedResultIndex] = useState<number>(0);
  const [focusArea, setFocusArea] = useState<'keyboard' | 'results'>('keyboard');
  const [kb, setKb] = useState<KbState>(KB_INITIAL);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  const isTvSearch = currentTab === 'tv';

  // All VOD items from catalog
  const [allVodItems, setAllVodItems] = useState<VodItem[]>([]);
  useEffect(() => {
    catalogService.fetchCatalog().then(cat => {
      const all: VodItem[] = [
        ...(cat.featured || []),
        ...(cat.movies || []),
        ...(cat.series || []),
        ...(cat.kids || []),
        ...(cat.anime || [])
      ];
      // deduplicate by id
      const seen = new Set<string>();
      const unique = all.filter(item => {
        if (!item || !item.id || seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
      setAllVodItems(unique);
    });
  }, []);

  // Comprehensive list of ALL channels across all categories
  const allKnownChannels = useMemo(() => {
    // Reading every cached category is expensive: only do it while the search is open
    if (!isOpen) return [] as LiveChannel[];
    const list: LiveChannel[] = [...channels];
    const seen = new Set<string>(channels.map(c => String(c.id || c.code)));

    // 1. Read from all saved category lists (in memory)
    for (const entry of allChannelEntries()) {
      if (!entry || !Array.isArray(entry.channels)) continue;
      for (const ch of normalizeChannels<LiveChannel>(entry.channels)) {
        const key = String(ch.id || ch.code);
        if (!seen.has(key)) {
          seen.add(key);
          list.push(ch);
        }
      }
    }

    // 2. Add mock channels for comprehensive offline / dev lookup
    Object.values(MOCK_CHANNELS_BY_CATEGORY).forEach(chs => {
      chs.forEach(ch => {
        const key = String(ch.id || ch.code);
        if (!seen.has(key)) {
          seen.add(key);
          list.push(ch);
        }
      });
    });

    return list;
  }, [channels, isOpen]);

  // Filtered Live Channels
  const filteredChannels = useMemo(() => {
    if (!isTvSearch) return [];
    const q = normalizeText(query.trim());
    if (!q) return allKnownChannels.slice(0, 30);
    return allKnownChannels.filter(ch => {
      const name = normalizeText(ch.name);
      const code = normalizeText(ch.code);
      const now = normalizeText(ch.now);
      return name.includes(q) || code.includes(q) || now.includes(q);
    });
  }, [isTvSearch, query, allKnownChannels]);

  // Filtered VOD items
  const filteredVod = useMemo(() => {
    if (isTvSearch) return [];
    const q = normalizeText(query.trim());
    if (!q) return allVodItems.slice(0, 24);
    return allVodItems.filter(item => {
      const title = normalizeText(item.title);
      const genres = Array.isArray(item.genres) ? normalizeText(item.genres.join(' ')) : '';
      const actors = normalizeText(item.actors);
      const synopsis = normalizeText(item.synopsis);
      return title.includes(q) || genres.includes(q) || actors.includes(q) || synopsis.includes(q);
    });
  }, [isTvSearch, query, allVodItems]);

  const totalResults = isTvSearch ? filteredChannels.length : filteredVod.length;

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setFocusedResultIndex(0);
      setFocusArea('keyboard');
      setKb(KB_INITIAL);
    }
  }, [isOpen]);

  const typeKey = (k: string) => {
    const res = pressKey(k, query, kb, 40);
    setKb(res.state);
    if (res.ok) {
      if (totalResults > 0) {
        setFocusArea('results');
        setFocusedResultIndex(0);
      }
    } else if (res.query !== query) {
      setQuery(res.query);
      setFocusedResultIndex(0);
    }
  };

  // Handle keyboard / remote navigation inside the modal (on-screen keyboard + results)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isBack = e.key === 'Escape' || e.keyCode === 10009 || e.keyCode === 461;
      const isBackspace = e.key === 'Backspace' || e.keyCode === 8;
      const cols = isTvSearch ? 2 : 4;

      if (isBack) {
        e.preventDefault();
        if (focusArea === 'results') setFocusArea('keyboard');
        else onClose();
        return;
      }

      if (focusArea === 'keyboard') {
        if (isBackspace) {
          e.preventDefault();
          if (query) typeKey('del');
          else onClose();
          return;
        }
        if (/^[A-Za-z0-9\u00C0-\u024F ._\-'&@+]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          typeKey(e.key === ' ' ? 'space' : e.key);
          return;
        }
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault();
          const dir = e.key === 'ArrowUp' ? 'up' : e.key === 'ArrowDown' ? 'down' : e.key === 'ArrowLeft' ? 'left' : 'right';
          const next = moveCursor(kb, dir);
          if (next) {
            setKb(next);
          } else if (totalResults > 0) {
            // → from the last key of a row moves to the results on the right
            setFocusArea('results');
            setFocusedResultIndex(0);
          }
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          typeKey(keyAt(kb));
        }
        return;
      }

      // Results area
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedResultIndex(prev => Math.min(totalResults - 1, prev + cols));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedResultIndex(prev => Math.max(0, prev - cols));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        // ← from the first column goes back to the keyboard on the left
        if (focusedResultIndex % cols === 0) setFocusArea('keyboard');
        else setFocusedResultIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setFocusedResultIndex(prev => Math.min(totalResults - 1, prev + 1));
      } else if (e.key === 'Enter' && totalResults > 0) {
        e.preventDefault();
        if (isTvSearch) {
          const ch = filteredChannels[focusedResultIndex];
          if (ch) {
            onSelectChannel(ch);
            onClose();
          }
        } else {
          const item = filteredVod[focusedResultIndex];
          if (item) {
            onSelectVodItem(item);
            onClose();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, focusArea, focusedResultIndex, totalResults, isTvSearch, filteredChannels, filteredVod, query, kb, onClose, onSelectChannel, onSelectVodItem]);

  // Keep focused result in view
  useEffect(() => {
    if (focusArea === 'results' && resultsContainerRef.current) {
      const container = resultsContainerRef.current;
      const target = container.children[focusedResultIndex] as HTMLElement;
      if (target) {
        target.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedResultIndex, focusArea]);

  if (!isOpen) return null;

  return (
    <div className="search-modal-backdrop" onClick={onClose}>
      <div className="search-modal-container" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="search-modal-header">
          <div className="search-modal-title-row">
            <div className="search-title-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <div>
              <h2 className="search-modal-title">
                {isTvSearch ? 'Buscar Canales de TV en Vivo' : 'Buscar Películas, Series y Contenido'}
              </h2>
              <p className="search-modal-subtitle">
                {isTvSearch
                  ? 'Filtra entre todos los canales disponibles por nombre o programación'
                  : 'Explora nuestro catálogo de más de 600 títulos por nombre, género o reparto'}
              </p>
            </div>
          </div>

          <button className="search-close-btn" onClick={onClose} title="Cerrar búsqueda">
            ✕
          </button>
        </div>

        {/* Search text (typed with the on-screen keyboard) */}
        <div className={`search-input-wrapper ${focusArea === 'keyboard' ? 'is-focused' : ''}`}>
          <svg className="search-input-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <div className={`search-input-text ${query ? '' : 'is-empty'}`}>
            {query ||
              (isTvSearch
                ? 'Escribe el nombre del canal (ej. WIN Sports, Caracol, Cine)...'
                : 'Escribe el título de la película o serie (ej. Ted Lasso, Halloween, Alien)...')}
            {focusArea === 'keyboard' && <span className="pc-search-caret" />}
          </div>
        </div>

        <div className="search-body">
        <div className="search-keyboard-wrap">
          <OnScreenKeyboard
            state={kb}
            focused={focusArea === 'keyboard'}
            onPress={k => typeKey(k)}
          />
        </div>

        {/* Results Area */}
        <div className="search-results-area">
          <div className="search-results-counter">
            <span>Resultados: {totalResults} {isTvSearch ? 'canales' : 'títulos'}</span>
            <span className="search-nav-hint">▲ ▼ ◄ ► y OK · ► desde el teclado abre los resultados</span>
          </div>

          {totalResults === 0 ? (
            <div className="search-empty-state">
              <div className="search-empty-icon">🔍</div>
              <div className="search-empty-title">No se encontraron resultados para "{query}"</div>
              <div className="search-empty-desc">
                {isTvSearch
                  ? 'Intenta buscar con otra palabra clave o revisa la lista de categorías.'
                  : 'Intenta buscar por género, año o un término más general.'}
              </div>
            </div>
          ) : isTvSearch ? (
            /* Channels Results Grid (2 Columns) */
            <div className="search-channels-grid" ref={resultsContainerRef}>
              {filteredChannels.map((ch, idx) => {
                const isFocused = focusArea === 'results' && focusedResultIndex === idx;
                const initials = String(ch.name || 'TV').trim().slice(0, 2).toUpperCase();

                return (
                  <div
                    key={ch.id || idx}
                    className={`search-channel-card ${isFocused ? 'is-focused' : ''}`}
                    onClick={() => {
                      onSelectChannel(ch);
                      onClose();
                    }}
                  >
                    <div className="sc-num">{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}</div>
                    {ch.logo ? (
                      <img
                        className="sc-logo"
                        src={ch.logo}
                        alt=""
                        onError={e => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="sc-avatar">{initials}</div>
                    )}
                    <div className="sc-info">
                      <div className="sc-title">
                        <span>{ch.name}</span>
                        <span className="sc-badge">EN VIVO</span>
                      </div>
                      <div className="sc-now">{ch.now || 'Transmisión en directo'}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* VOD Results Grid (5 Columns) */
            <div className="search-vod-grid" ref={resultsContainerRef}>
              {filteredVod.map((item, idx) => {
                const isFocused = focusArea === 'results' && focusedResultIndex === idx;

                return (
                  <div
                    key={item.id || idx}
                    className={`search-vod-card ${isFocused ? 'is-focused' : ''}`}
                    onClick={() => {
                      onSelectVodItem(item);
                      onClose();
                    }}
                  >
                    <div className="svc-poster-wrap">
                      <img
                        className="svc-poster"
                        src={item.poster}
                        alt={item.title}
                        onError={e => {
                          (e.target as HTMLImageElement).src = 'assets/placeholder_vertical.png';
                        }}
                      />
                      <div className="svc-score-badge">★ {item.score || '8.5'}</div>
                      <div className="svc-kind-badge">{item.kind === 'serie' ? 'SERIE' : 'PELÍCULA'}</div>
                    </div>
                    <div className="svc-info">
                      <div className="svc-title">{item.title}</div>
                      <div className="svc-meta">{item.year} • {item.genres?.[0] || 'Contenido'}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
};