import React, { useRef, useEffect } from 'react';
import { HistoryItem } from '../../types/history';
import { ContinueWatchingCard } from './ContinueWatchingCard';
import { scrollHorizontalSlider } from '../../utils/scrollHelper';

interface ContinueWatchingRowProps {
  items: HistoryItem[];
  focusedIndex: number | null;
  onActivate: (item: HistoryItem) => void;
}

const ContinueWatchingRowComponent: React.FC<ContinueWatchingRowProps> = ({
  items,
  focusedIndex,
  onActivate
}) => {
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focusedIndex !== null && sliderRef.current) {
      const target = sliderRef.current.children[focusedIndex] as HTMLElement;
      scrollHorizontalSlider(sliderRef.current, target, focusedIndex, 48, 160);
    }
  }, [focusedIndex]);

  if (!items || !items.length) return null;

  return (
    <div className="content-section continue-watching-section">
      <div className="section-header">
        <div className="section-title">
          Seguir viendo <span className="section-chevron">›</span>
        </div>
      </div>
      <div className="content-slider" ref={sliderRef}>
        {items.map((item, idx) => (
          <ContinueWatchingCard
            key={item.id || idx}
            item={item}
            isFocused={focusedIndex === idx}
            onActivate={onActivate}
          />
        ))}
      </div>
    </div>
  );
};

export const ContinueWatchingRow = React.memo<ContinueWatchingRowProps>(
  ContinueWatchingRowComponent,
  (prev, next) => {
    return prev.focusedIndex === next.focusedIndex && prev.items === next.items;
  }
);
