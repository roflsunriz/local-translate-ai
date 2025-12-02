import { useEffect } from 'react';

import { TabBar } from '@/components/TabBar';
import { ToastContainer } from '@/components/ToastContainer';
import { useSettingsStore, useUIStore } from '@/stores';

import { HistoryPanel } from './panels/HistoryPanel';
import { TranslatePanel } from './panels/TranslatePanel';

export function Sidebar() {
  const { sidebarTab, setSidebarTab } = useUIStore();
  const { loadFromStorage, settings } = useSettingsStore();

  useEffect(() => {
    void loadFromStorage();
  }, [loadFromStorage]);

  // Apply theme
  const { themeMode } = settings;
  useEffect(() => {
    if (themeMode === 'auto') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', themeMode);
    }
  }, [themeMode]);

  return (
    <div className="flex h-screen flex-col" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <header
        className="flex items-center justify-between border-b px-4 py-3"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <h1
          className="text-lg font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Local Translate AI
        </h1>
      </header>

      <TabBar
        tabs={[
          { id: 'translate', label: '翻訳' },
          { id: 'history', label: '履歴' },
        ]}
        activeTab={sidebarTab}
        onTabChange={(tab) => { setSidebarTab(tab as 'translate' | 'history'); }}
      />

      <main className="scrollbar-thin flex-1 overflow-y-auto">
        {sidebarTab === 'translate' && <TranslatePanel />}
        {sidebarTab === 'history' && <HistoryPanel />}
      </main>

      <ToastContainer />
    </div>
  );
}

