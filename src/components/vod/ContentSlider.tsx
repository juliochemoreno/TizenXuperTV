import React, { useRef, useEffect } from 'react';
import { VodItem } from '../../types/vod';
import { PosterCard } from './PosterCard';
import { scrollHorizontalSlider } from '../../utils/scrollHelper';
import { prefetchImages } from '../../utils/imagePrefetcher';

interface ContentSliderProps {
  title: string;
  subtitle?: string;
  items: VodItem[];
  isRanked?: boolean;
  isWide?: boolean;
  focusedIndex: number | null; // index if this row is focused, null if not
  onActivate: (item: VodItem) => void;
}

const ContentSliderComponent: React.FC<ContentSliderProps> = ({
  title,
  subtitle,
  items,
  isRanked,
  isWide,
  focusedIndex,
  onActivate
}) => {
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focusedIndex !== null && sliderRef.current) {
      const target = sliderRef.current.children[focusedIndex] as HTMLElement;
      scrollHorizontalSlider(sliderRef.current, target, focusedIndex, 48, 160);

      // Pre-decode upcoming 4 card images in GPU texture memory
      const nextUrls = items.slice(focusedIndex + 1, focusedIndex + 5).map(it =>
        isWide ? (it.landscape || it.backdrop || it.poster) : (it.poster || it.landscape)
      );
      prefetchImages(nextUrls, 4);
    }
  }, [focusedIndex, items, isWide]);

  if (!items || !items.length) return null;

  return (
    <div className="content-section">
      <div className="section-header">
        <div className="section-title">
          {title} {!isWide && <span className="section-chevron">›</span>}
        </div>
        {subtitle && <div className="section-sub">{subtitle}</div>}
      </div>
      <div className={`content-slider ${isWide ? 'is-wide-slider' : ''}`} ref={sliderRef}>
        {items.map((item, idx) => (
          <PosterCard
            key={item.id || idx}
            item={item}
            rank={isRanked ? idx + 1 : undefined}
            isWide={isWide}
            isFocused={focusedIndex === idx}
            onActivate={onActivate}
          />
        ))}
      </div>
    </div>
  );
};

export const ContentSlider = React.memo<ContentSliderProps>(
  ContentSliderComponent,
  (prev, next) => {
    if (prev.focusedIndex !== next.focusedIndex) return false;
    if (prev.title !== next.title) return false;
    if (prev.subtitle !== next.subtitle) return false;
    if (prev.items !== next.items) return false;
    if (prev.isRanked !== next.isRanked) return false;
    if (prev.isWide !== next.isWide) return false;
    return true;
  }
);
