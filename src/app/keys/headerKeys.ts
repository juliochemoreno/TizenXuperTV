import { TvKey } from '../../hooks/useTvRemote';
import { TabId, TABS } from '../../components/layout/TopNavbar';
import { DestacadosFocus } from '../../views/DestacadosView';
import { LiveTvFocus } from '../../views/LiveTvView';
import { FocusDomain, Setter } from '../types';

export interface HeaderKeysCtx {
  setFocusDomain: Setter<FocusDomain>;
  selectedTab: TabId;
  setSelectedTab: Setter<TabId>;
  headerFocusIndex: number;
  setHeaderFocusIndex: Setter<number>;
  setDestacadosFocus: Setter<DestacadosFocus>;
  setLiveTvFocus: Setter<LiveTvFocus>;
  setIsSearchOpen: Setter<boolean>;
  guardTab: (tab: TabId, apply: () => void) => void;
  openProfile: () => void;
}

export function handleHeaderKeys(key: TvKey, ctx: HeaderKeysCtx): boolean {
  const {
    setFocusDomain,
    selectedTab,
    setSelectedTab,
    headerFocusIndex,
    setHeaderFocusIndex,
    setDestacadosFocus,
    setLiveTvFocus,
    setIsSearchOpen,
    guardTab,
    openProfile
  } = ctx;
  if (key === 'left') {
    setHeaderFocusIndex(prev => Math.max(0, prev - 1));
    return true;
  }
  if (key === 'right') {
    setHeaderFocusIndex(prev => Math.min(8, prev + 1));
    return true;
  }
  if (key === 'up') {
    return true;
  }
  if (key === 'enter') {
    if (headerFocusIndex <= 6) {
      const tabId = TABS[headerFocusIndex].id;
      guardTab(tabId, () => setSelectedTab(tabId));
    } else if (headerFocusIndex === 7) {
      setIsSearchOpen(true);
    } else if (headerFocusIndex === 8) {
      openProfile();
    }
    return true;
  }
  if (key === 'down') {
    setFocusDomain('content');
    if (selectedTab === 'tv') {
      setLiveTvFocus(prev => ({ ...prev, area: 'channels', channelIndex: 0 }));
    } else {
      setDestacadosFocus(prev => ({ ...prev, area: 'hero', heroBtn: 'play' }));
    }
    return true;
  }
  return true;
}
