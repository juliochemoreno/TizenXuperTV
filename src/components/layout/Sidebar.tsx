import React from 'react';

export type TabId = 'tv' | 'destacados' | 'peliculas' | 'series' | 'kids' | 'anime' | 'historial';

interface TabItem {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabItem[] = [
  {
    id: 'tv',
    label: 'TV EN VIVO',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <rect x="2" y="7" width="20" height="15" rx="2" />
        <polyline points="17 2 12 7 7 2" />
      </svg>
    )
  },
  {
    id: 'destacados',
    label: 'DESTACADOS',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    )
  },
  {
    id: 'peliculas',
    label: 'PELÍCULAS',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <rect x="2" y="2" width="20" height="20" rx="2.18" />
        <line x1="7" y1="2" x2="7" y2="22" />
        <line x1="17" y1="2" x2="17" y2="22" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <line x1="2" y1="7" x2="7" y2="7" />
        <line x1="2" y1="17" x2="7" y2="17" />
        <line x1="17" y1="17" x2="22" y2="17" />
        <line x1="17" y1="7" x2="22" y2="7" />
      </svg>
    )
  },
  {
    id: 'series',
    label: 'SERIES',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    )
  },
  {
    id: 'kids',
    label: 'KIDS',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <circle cx="12" cy="12" r="10" />
        <circle cx="9" cy="9" r="1.5" />
        <circle cx="15" cy="9" r="1.5" />
        <path d="M8 15s1.5 2 4 2 4-2 4-2" />
      </svg>
    )
  },
  {
    id: 'anime',
    label: 'ANIME',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    )
  },
  {
    id: 'historial',
    label: 'HISTORIAL',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    )
  }
];

interface SidebarProps {
  selectedTab: TabId;
  isExpanded: boolean;
  focusedIndex: number | null; // index if sidebar has focus
  onSelectTab: (tab: TabId) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  selectedTab,
  isExpanded,
  focusedIndex,
  onSelectTab
}) => {
  return (
    <aside className={`app-sidebar ${isExpanded ? 'is-expanded' : ''}`}>
      {TABS.map((tab, idx) => {
        const isSelected = selectedTab === tab.id;
        const isFocused = focusedIndex === idx;

        return (
          <div
            key={tab.id}
            className={`sidebar-item ${isSelected ? 'is-selected' : ''} ${isFocused ? 'is-focused' : ''}`}
            onClick={() => onSelectTab(tab.id)}
          >
            <div className="sidebar-icon">{tab.icon}</div>
            <div className="sidebar-label">{tab.label}</div>
          </div>
        );
      })}
    </aside>
  );
};

export { TABS };
