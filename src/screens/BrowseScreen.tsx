import React, { useState, useEffect, useRef, useCallback } from 'react';
import { VodItem } from '../types/vod';
import { useScreenKeys } from '../hooks/useScreenKeys';
import { PosterCard } from '../components/vod/PosterCard';
import { BrowseRoot } from '../lib/screenStack';

interface BrowseScreenProps {
  isTop: boolean;
  /** Hidden (and inactive) while a detail opened from here is on screen */
  hidden: boolean;
  root: BrowseRoot;
  title: string;
  initialTag?: string;
  initialYear?: string;
  onClose: () => void;
  onOpenVod: (item: VodItem) => void;
}

type Area = 'tags' | 'years' | 'grid';

const COLS = 9;
const PAGE_SIZE = COLS * 6;
const ROW_HEIGHT = 286; // card + gap, see .browse-grid
const IMAGE_ROWS_AHEAD = 3;

const ROOT_LABEL: Record<BrowseRoot, string> = {
  featured: 'Destacados',
  movies: 'Películas',
  series: 'Series',
  kids: 'Kids',
  anime: 'Anime'
};

// Portal genre tags come in English
const TAG_ES: Record<string, string> = {
  Action: 'Acción', Drama: 'Drama', Adventure: 'Aventura', Crime: 'Crimen', 'Sci-Fi': 'Ciencia ficción',
  Cartoon: 'Dibujos', Comedy: 'Comedia', Romance: 'Romance', Animation: 'Animación', Family: 'Familia',
  Fantasy: 'Fantasía', Thriller: 'Suspenso', Horror: 'Terror', History: 'Historia', Mystery: 'Misterio',
  Documentary: 'Documental', 'Reality-TV': 'Reality', Short: 'Cortos', War: 'Bélica', Western: 'Western',
  Biography: 'Biografía', Music: 'Música', Sport: 'Deporte', 'Game Shows': 'Concursos'
};

export function tagLabel(tag: string): string {
  return TAG_ES[tag] || tag;
}

interface Page {
  items: VodItem[];
  total: number;
}

function loadPage(root: BrowseRoot, tag: string, year: string, pageNum: number): Promise<Page> {
  return new Promise((resolve, reject) => {
    const client = window.MagisClient;
    if (!client || typeof client.browse !== 'function') return reject(new Error('no portal client'));
    client.browse(root, { tags: tag, year }, pageNum, PAGE_SIZE, (err: any, res: any) => {
      if (err) return reject(err);
      const items: VodItem[] = (res.items || []).map((it: any) => ({
        ...it,
        isSeries: it.type === 'teleplay' || it.kind === 'serie'
      }));
      resolve({ items, total: res.total || 0 });
    });
  });
}

/** "Ver todo": the full catalog of a section from the portal, with genre and year filters */
export const BrowseScreen: React.FC<BrowseScreenProps> = ({
  isTop,
  hidden,
  root,
  title,
  initialTag = '',
  initialYear = '',
  onClose,
  onOpenVod
}) => {
  const [tags, setTags] = useState<string[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [tag, setTag] = useState(initialTag);
  const [year, setYear] = useState(initialYear);
  const [items, setItems] = useState<VodItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [area, setArea] = useState<Area>('grid');
  const [chip, setChip] = useState(0);
  const [cursor, setCursor] = useState(0);
  const pageRef = useRef(0);
  const loadingRef = useRef(false);
  const queryRef = useRef(0);
  const gridRef = useRef<HTMLDivElement>(null);

  // Filter values of the section
  useEffect(() => {
    const client = window.MagisClient;
    if (!client || typeof client.browseFilters !== 'function') return;
    client.browseFilters(root, (err: any, res: any) => {
      if (err || !res) return;
      setTags(res.tags || []);
      setYears((res.year || []).slice(0, 30));
    });
  }, [root]);

  const loadMore = useCallback(() => {
    if (loadingRef.current) return;
    const query = queryRef.current;
    loadingRef.current = true;
    setLoading(true);
    loadPage(root, tag, year, pageRef.current + 1).then(page => {
      if (query !== queryRef.current) return;
      pageRef.current += 1;
      setItems(prev => prev.concat(page.items));
      setTotal(page.total);
      setFailed(false);
    }, () => {
      if (query === queryRef.current) setFailed(true);
    }).then(() => {
      if (query !== queryRef.current) return;
      loadingRef.current = false;
      setLoading(false);
    });
  }, [root, tag, year]);

  // New filter: start over from page 1
  useEffect(() => {
    queryRef.current += 1;
    pageRef.current = 0;
    loadingRef.current = false;
    setItems([]);
    setTotal(0);
    setCursor(0);
    loadMore();
  }, [loadMore]);

  // Next page when the cursor gets close to the end of what is loaded
  useEffect(() => {
    if (area !== 'grid' || loading || failed) return;
    if (items.length < total && cursor >= items.length - COLS * 2) loadMore();
  }, [cursor, area, items.length, total, loading, failed, loadMore]);

  // Keep the focused row in view (two rows above it stay visible)
  const focusRow = Math.floor(cursor / COLS);
  useEffect(() => {
    if (gridRef.current) gridRef.current.style.transform = `translateY(${-Math.max(0, focusRow - 1) * ROW_HEIGHT}px)`;
  }, [focusRow]);

  const tagChips = ['', ...tags];
  const yearChips = ['', ...years];

  const openChips = (which: 'tags' | 'years') => {
    setArea(which);
    const list = which === 'tags' ? tagChips : yearChips;
    setChip(Math.max(0, list.indexOf(which === 'tags' ? tag : year)));
  };

  useScreenKeys(key => {
    if (key === 'back') {
      if (area !== 'grid' && items.length) setArea('grid');
      else onClose();
      return;
    }
    if (area === 'grid') {
      if (key === 'left') setCursor(c => (c % COLS === 0 ? c : c - 1));
      else if (key === 'right') setCursor(c => (c % COLS === COLS - 1 || c + 1 >= items.length ? c : c + 1));
      else if (key === 'down') setCursor(c => (c + COLS < items.length ? c + COLS : c));
      else if (key === 'up') {
        if (cursor < COLS) openChips('years');
        else setCursor(c => c - COLS);
      } else if (key === 'enter') {
        const it = items[cursor];
        if (it) onOpenVod(it);
      }
      return;
    }
    const list = area === 'tags' ? tagChips : yearChips;
    if (key === 'left') setChip(c => Math.max(0, c - 1));
    else if (key === 'right') setChip(c => Math.min(list.length - 1, c + 1));
    else if (key === 'up' && area === 'years') openChips('tags');
    else if (key === 'down') {
      if (area === 'tags') openChips('years');
      else if (items.length) setArea('grid');
    } else if (key === 'enter') {
      const value = list[chip] || '';
      if (area === 'tags') setTag(value);
      else setYear(value);
      setArea('grid');
    }
  }, isTop && !hidden);

  const chipRow = (which: 'tags' | 'years', list: string[], current: string, label: (v: string) => string) => (
    <div className="browse-chips">
      <div
        className="browse-chips-track"
        style={{ transform: `translateX(${area === which ? -Math.max(0, chip - 4) * 150 : 0}px)` }}
      >
        {list.map((v, i) => (
          <div
            key={v || 'all'}
            className={`browse-chip ${v === current ? 'is-selected' : ''} ${area === which && i === chip ? 'is-focused' : ''}`}
          >
            {label(v)}
          </div>
        ))}
      </div>
    </div>
  );

  const sectionTitle = [title || ROOT_LABEL[root], tag ? tagLabel(tag) : '', year].filter(Boolean).join(' · ');

  return (
    <div className="browse-screen" style={hidden ? { display: 'none' } : undefined}>
      <div className="browse-head">
        <div className="browse-title">{sectionTitle}</div>
        <div className="browse-count">
          {total ? `${total.toLocaleString('es')} títulos` : loading ? 'Cargando…' : ''}
        </div>
      </div>
      {chipRow('tags', tagChips, tag, v => (v ? tagLabel(v) : 'Todos los géneros'))}
      {chipRow('years', yearChips, year, v => v || 'Todos los años')}

      <div className="browse-body">
        <div className="browse-grid" ref={gridRef}>
          {items.map((it, i) => (
            <PosterCard
              key={`${it.id}-${i}`}
              item={it}
              isFocused={area === 'grid' && i === cursor}
              showImage={Math.abs(Math.floor(i / COLS) - focusRow) <= IMAGE_ROWS_AHEAD}
              onActivate={onOpenVod}
            />
          ))}
        </div>
        {!loading && !items.length && (
          <div className="browse-empty">{failed ? 'No se pudo cargar el catálogo. Atrás para volver.' : 'No hay títulos con estos filtros.'}</div>
        )}
      </div>
    </div>
  );
};
