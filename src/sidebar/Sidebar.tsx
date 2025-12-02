import { useEffect } from 'react';

import { MdiIcon } from '@/components/Icon';
import { TabBar } from '@/components/TabBar';
import { ToastContainer } from '@/components/ToastContainer';
import { useTranslation } from '@/hooks';
import { useSettingsStore, useUIStore } from '@/stores';

import { HistoryPanel } from './panels/HistoryPanel';
import { TranslatePanel } from './panels/TranslatePanel';

export function Sidebar() {
  const { t } = useTranslation();
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

  const tabs = [
    {
      id: 'translate',
      label: t('sidebar.tabs.translate'),
      icon: <MdiIcon name="translate" size={18} />,
    },
    {
      id: 'history',
      label: t('sidebar.tabs.history'),
      icon: <MdiIcon name="history" size={18} />,
    },
  ];

  return (
    <div className="flex h-screen flex-col" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <header
        className="flex items-center justify-between border-b px-4 py-3"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-2">
          <MdiIcon name="globe" size={20} color="var(--color-accent)" />
          <h1
            className="text-lg font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {t('sidebar.title')}
          </h1>
        </div>
      </header>

      <TabBar
        tabs={tabs}
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
