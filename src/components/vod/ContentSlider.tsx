import React, { useRef, useEffect, useState } from 'react';
import { VodItem } from '../../types/vod';
import { PosterCard } from './PosterCard';
import { scrollHorizontalSlider } from '../../utils/scrollHelper';

interface ContentSliderProps {
  title: string;
  subtitle?: string;
  items: VodItem[];
  isRanked?: boolean;
  isWide?: boolean;
  focusedIndex: number | null; // index if this row is focused, null if not
  /** The row is on screen or next to it: its first cards load their images */
  nearFocus: boolean;
  onActivate: (item: VodItem) => void;
}

const ContentSliderComponent: React.FC<ContentSliderProps> = ({
  title,
  subtitle,
  items,
  isRanked,
  isWide,
  focusedIndex,
  nearFocus,
  onActivate
}) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  // Images load only for the cards on screen plus a few ahead, and stay once loaded:
  // portal images are full size (up to 3000 px) and decoding all of them at once stalls the TV
  const ahead = isWide ? 5 : 9;
  const [loadCount, setLoadCount] = useState(0);
  useEffect(() => {
    if (!nearFocus && focusedIndex === null) return;
    const wanted = (focusedIndex || 0) + ahead;
    setLoadCount(c => (wanted > c ? wanted : c));
  }, [nearFocus, focusedIndex, ahead]);

  useEffect(() => {
    if (focusedIndex !== null && sliderRef.current) {
      const target = sliderRef.current.children[focusedIndex] as HTMLElement;
      scrollHorizontalSlider(sliderRef.current, target, focusedIndex, 48, 160);

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
            showImage={idx < loadCount}
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
    if (prev.nearFocus !== next.nearFocus) return false;
    return true;
  }
);
