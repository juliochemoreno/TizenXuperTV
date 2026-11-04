import { useEffect } from 'react';

export type TvKey = 'up' | 'down' | 'left' | 'right' | 'enter' | 'back' | 'other';

interface UseTvRemoteOptions {
  onKey: (key: TvKey, event: KeyboardEvent) => boolean | void;
}

export function useTvRemote({ onKey }: UseTvRemoteOptions) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      let key: TvKey = 'other';

      switch (e.keyCode) {
        case 38: // ArrowUp
          key = 'up';
          break;
        case 40: // ArrowDown
          key = 'down';
          break;
        case 37: // ArrowLeft
          key = 'left';
          break;
        case 39: // ArrowRight
          key = 'right';
          break;
        case 13: // Enter
          key = 'enter';
          break;
        case 10009: // Tizen Back
        case 27:    // Escape
        case 461:   // LG Back
        case 8:     // Backspace
          key = 'back';
          break;
        default:
          return;
      }

      const consumed = onKey(key, e);
      if (consumed !== false) {
        e.preventDefault();
        e.stopPropagation();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onKey]);
}
