interface Tab {
  id: string;
  label: string;
  icon?: string;
}

interface TabBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function TabBar({ tabs, activeTab, onTabChange }: TabBarProps) {
  return (
    <div
      className="flex border-b"
      style={{ borderColor: 'var(--color-border)' }}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => { onTabChange(tab.id); }}
            className={`
              flex-1 px-4 py-3 text-sm font-medium transition-colors
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset
              focus-visible:ring-[var(--color-accent)]
            `}
            style={{
              color: isActive
                ? 'var(--color-accent)'
                : 'var(--color-text-secondary)',
              borderBottom: isActive
                ? '2px solid var(--color-accent)'
                : '2px solid transparent',
              backgroundColor: 'transparent',
            }}
          >
            {tab.icon && <span className="mr-1">{tab.icon}</span>}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

