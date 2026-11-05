import React from 'react';
import { VodItem } from '../../types/vod';

interface PosterCardProps {
  item: VodItem;
  isFocused: boolean;
  rank?: number; // 1-10 for Top 10 rows
  isWide?: boolean; // 4:3 / landscape card (e.g. Colección Destacada)
  /** False until the card is near the screen: its image is not downloaded or decoded before */
  showImage?: boolean;
  onActivate: (item: VodItem) => void;
}

const PosterCardComponent: React.FC<PosterCardProps> = ({
  item,
  isFocused,
  rank,
  isWide,
  showImage = true,
  onActivate
}) => {
  const posterUrl = isWide
    ? (item.landscape || item.backdrop || item.poster || 'assets/placeholder_landscape.png')
    : (item.poster || item.landscape || item.backdrop || 'assets/placeholder_vertical.png');

  const categoryName = item.isSeries ? 'Programa de TV' : 'Película';
  const genresStr = item.genres && item.genres.length ? item.genres.slice(0, 2).join(' · ') : (item.category || 'Cine');
  const wideSubtitle = `${categoryName} · ${genresStr}`;
  const wideTagline = item.score && parseFloat(item.score) >= 8.5
    ? `★ ${item.score} · Aclamada por la crítica`
    : `Top 10 en Xuper TV`;

  const metaSubtitle = item.score && item.score !== '0'
    ? `★ ${item.score} · ${item.year && item.year !== '—' ? item.year : '2024'}`
    : ((item.genres && item.genres[0]) || (item.category ? item.category.toUpperCase() : 'CINE'));

  return (
    <div
      className={`poster-card apple-poster-card ${isWide ? 'is-wide-card' : ''} ${rank ? 'has-rank' : ''} ${isFocused ? 'is-focused' : ''}`}
      onClick={() => onActivate(item)}
    >
      <div
        className="poster-card-img"
        style={showImage ? { backgroundImage: `url('${posterUrl}')` } : undefined}
      >
        {/* Top 10 Rank Number in clean Apple TV typography */}
        {rank !== undefined && rank > 0 && !isWide && (
          <div className="poster-rank-badge">{rank}</div>
        )}

        {/* Wide Card "Nueva temporada" Pill Tag (Apple TV style) */}
        {isWide && (
          <div className="wide-season-pill">
            {item.isSeries ? 'Nueva temporada' : 'Exclusivo'}
          </div>
        )}

        {/* Brand mark top-right corner */}
        {!isWide && (
          <div className="poster-brand-badge">
            <span>tv</span>
          </div>
        )}

        {/* Wide Card top-right translucent action circle */}
        {isWide && (
          <div className="wide-top-circle">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="19" cy="12" r="1.5" />
              <circle cx="5" cy="12" r="1.5" />
            </svg>
          </div>
        )}

        {/* Bottom Vignette with Title & Metadata */}
        {isWide ? (
          <div className="poster-bottom-vignette wide-vignette">
            <div className="wide-vignette-title">{item.title || 'Sin título'}</div>
            <div className="wide-vignette-sub">
              <span className="wide-tv-badge">tv</span>
              <span className="wide-sub-text">{wideSubtitle}</span>
            </div>
            <div className="wide-vignette-tagline">{wideTagline}</div>
          </div>
        ) : (
          <div className="poster-bottom-vignette">
            <div className="poster-vignette-title">{item.title || 'Sin título'}</div>
            <div className="poster-vignette-genre">{metaSubtitle}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export const PosterCard = React.memo<PosterCardProps>(
  PosterCardComponent,
  (prev, next) => {
    return (
      prev.isFocused === next.isFocused &&
      prev.item.id === next.item.id &&
      prev.rank === next.rank &&
      prev.isWide === next.isWide &&
      prev.showImage === next.showImage
    );
  }
);
