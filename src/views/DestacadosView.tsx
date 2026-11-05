import React, { useRef, useEffect } from 'react';
import { useRenderCount } from '../debug/renderCount';
import { setTrackOffset } from '../utils/scrollHelper';
import { VodItem } from '../types/vod';
import { HistoryItem } from '../types/history';
import { HeroShowcase } from '../components/vod/HeroShowcase';
import { ContentSlider } from '../components/vod/ContentSlider';
import { ContinueWatchingRow } from '../components/vod/ContinueWatchingRow';
import { rowHasSeeAll } from '../app/tabRows';

export interface DestacadosFocus {
  area: 'hero' | 'row';
  heroBtn?: 'play' | 'fav';
  rowIndex: number;
  cardIndex: number;
}

export interface ContentRowDef {
  id: string;
  title: string;
  subtitle?: string;
  type: 'vod' | 'history';
  isRanked?: boolean;
  isWide?: boolean;
  items: VodItem[] | HistoryItem[];
}

interface DestacadosViewProps {
  heroItems: VodItem[];
  activeHeroIndex: number;
  historyItems: HistoryItem[];
  trendingItems: VodItem[];
  recommendedMovies: VodItem[];
  mustWatchSeries: VodItem[];
  rows?: ContentRowDef[];
  focus: DestacadosFocus;
  isFocusActive?: boolean;
  isFavorite: boolean;
  onPlayHero: (item: VodItem) => void;
  onToggleFavHero: (item: VodItem) => void;
  onActivateHistory: (item: HistoryItem) => void;
  onActivateVod: (item: VodItem) => void;
  onSeeAll?: (row: ContentRowDef) => void;
}

export const DestacadosView: React.FC<DestacadosViewProps> = ({
  heroItems,
  activeHeroIndex,
  historyItems,
  trendingItems,
  recommendedMovies,
  mustWatchSeries,
  rows,
  focus,
  isFocusActive = true,
  isFavorite,
  onPlayHero,
  onToggleFavHero,
  onActivateHistory,
  onActivateVod,
  onSeeAll
}) => {
  useRenderCount('DestacadosView');
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const currentHero = heroItems[activeHeroIndex] || heroItems[0];

  // Vertical framing: the page track moves with a GPU transform (see scrollHelper)
  useEffect(() => {
    const track = trackRef.current;
    const container = containerRef.current;
    if (!isFocusActive || !track || !container) return;

    if (focus.area === 'hero') {
      setTrackOffset(track, 'y', 0);
    } else if (focus.area === 'row') {
      const sections = track.querySelectorAll('.content-section');
      const secEl = sections[focus.rowIndex] as HTMLElement | undefined;
      if (secEl) {
        const max = Math.max(0, track.offsetHeight - container.clientHeight + 60);
        setTrackOffset(track, 'y', Math.min(max, Math.max(0, secEl.offsetTop - 24)));
      }
    }
  }, [isFocusActive, focus.area, focus.rowIndex]);

  // Compute visible rows if not explicitly provided
  const visibleRows: ContentRowDef[] = rows || (() => {
    const list: ContentRowDef[] = [];
    if (historyItems && historyItems.length > 0) {
      list.push({ id: 'history', title: 'Seguir viendo', type: 'history', items: historyItems });
    }
    if (mustWatchSeries && mustWatchSeries.length > 0) {
      list.push({
        id: 'top_series',
        title: 'Top 10: series en Xuper TV',
        type: 'vod',
        isRanked: true,
        items: mustWatchSeries.slice(0, 10)
      });
    }
    if (recommendedMovies && recommendedMovies.length > 0) {
      list.push({
        id: 'top_movies',
        title: 'Top 10: películas en Xuper TV',
        type: 'vod',
        isRanked: true,
        items: recommendedMovies.slice(0, 10)
      });
    }
    if (mustWatchSeries && mustWatchSeries.length > 3) {
      list.push({
        id: 'featured_collection',
        title: 'Contra todo pronóstico',
        type: 'vod',
        isWide: true,
        items: mustWatchSeries.slice(1, 13)
      });
    }
    if (recommendedMovies && recommendedMovies.length > 5) {
      list.push({
        id: 'must_watch',
        title: 'Éxitos imperdibles en Xuper TV',
        type: 'vod',
        items: recommendedMovies.slice(10, 26)
      });
    }
    if (trendingItems && trendingItems.length > 0) {
      list.push({
        id: 'new_releases',
        title: 'Últimos estrenos en Xuper TV',
        type: 'vod',
        items: trendingItems.slice(0, 16)
      });
    }
    return list;
  })();

  return (
    <div className="page-container" ref={containerRef}>
      <div className="page-track" ref={trackRef}>
      <HeroShowcase
        item={currentHero}
        totalItems={heroItems.length}
        activeIndex={activeHeroIndex}
        focusedButton={isFocusActive && focus.area === 'hero' ? (focus.heroBtn || 'play') : null}
        isFavorite={isFavorite}
        isDimmed={isFocusActive && focus.area === 'row'}
        onPlay={onPlayHero}
        onToggleFav={onToggleFavHero}
      />

      {visibleRows.map((row, rowIdx) => {
        const isFocusedRow = isFocusActive && focus.area === 'row' && focus.rowIndex === rowIdx;
        const focusedIndex = isFocusedRow ? focus.cardIndex : null;

        if (row.type === 'history') {
          return (
            <ContinueWatchingRow
              key={row.id}
              items={row.items as HistoryItem[]}
              focusedIndex={focusedIndex}
              onActivate={onActivateHistory}
            />
          );
        }

        return (
          <ContentSlider
            key={row.id}
            title={row.title}
            subtitle={row.subtitle}
            items={row.items as VodItem[]}
            isRanked={row.isRanked}
            nearFocus={rowIdx <= (isFocusActive && focus.area === 'row' ? focus.rowIndex : 0) + 2}
            isWide={row.isWide}
            focusedIndex={focusedIndex}
            onActivate={onActivateVod}
            onSeeAll={onSeeAll && rowHasSeeAll(row) ? () => onSeeAll(row) : undefined}
          />
        );
      })}
      </div>
    </div>
  );
};
