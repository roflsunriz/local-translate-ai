import { useEffect, useState } from 'react';

import { MdiIcon } from '@/components/Icon';
import { TabBar } from '@/components/TabBar';
import { ToastContainer } from '@/components/ToastContainer';
import { useTranslation } from '@/hooks';
import { useSettingsStore, useUIStore } from '@/stores';

import { AdvancedTab } from './tabs/AdvancedTab';
import { ApiTab } from './tabs/ApiTab';
import { GeneralTab } from './tabs/GeneralTab';
import { PromptTab } from './tabs/PromptTab';
import { ShortcutsTab } from './tabs/ShortcutsTab';

import type { IconName } from '@/components/Icon';

type TabId = 'general' | 'api' | 'prompt' | 'advanced' | 'shortcuts';

interface TabConfig {
  id: TabId;
  labelKey: string;
  icon: IconName;
}

const TAB_CONFIGS: TabConfig[] = [
  { id: 'general', labelKey: 'settings.tabs.general', icon: 'settings' },
  { id: 'api', labelKey: 'settings.tabs.api', icon: 'api' },
  { id: 'prompt', labelKey: 'settings.tabs.prompt', icon: 'message' },
  { id: 'advanced', labelKey: 'settings.tabs.advanced', icon: 'tune' },
  { id: 'shortcuts', labelKey: 'settings.tabs.shortcuts', icon: 'keyboard' },
];

export function OptionsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const { loadFromStorage, settings, saveToStorage } = useSettingsStore();
  const { showSuccess, showError } = useUIStore();

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

  const tabs = TAB_CONFIGS.map((config) => ({
    id: config.id,
    label: t(config.labelKey),
    icon: <MdiIcon name={config.icon} size={18} />,
  }));

  const handleSave = async () => {
    try {
      await saveToStorage();
      showSuccess(t('common.success'), t('settings.saved'));
    } catch {
      showError(t('common.error'), t('settings.saveFailed'));
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'local-translate-ai-settings.json';
    a.click();
    URL.revokeObjectURL(url);
    showSuccess(t('common.success'), t('settings.exported'));
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        return;
      }

      try {
        const text = await file.text();
        const imported = JSON.parse(text) as Partial<typeof settings>;
        useSettingsStore.getState().setSettings({ ...settings, ...imported });
        await saveToStorage();
        showSuccess(t('common.success'), t('settings.imported'));
      } catch {
        showError(t('common.error'), t('settings.importFailed'));
      }
    };
    input.click();
  };

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      <div className="mx-auto max-w-4xl px-4 py-8">
        <header className="mb-8">
          <h1
            className="text-2xl font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {t('settings.title')}
          </h1>
          <p
            className="mt-2 text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('settings.description')}
          </p>
        </header>

        <div
          className="rounded-lg border"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            borderColor: 'var(--color-border)',
          }}
        >
          <TabBar
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={(tab) => { setActiveTab(tab as TabId); }}
          />

          <div className="min-h-[600px] p-6">
            {activeTab === 'general' && <GeneralTab />}
            {activeTab === 'api' && <ApiTab />}
            {activeTab === 'prompt' && <PromptTab />}
            {activeTab === 'advanced' && <AdvancedTab />}
            {activeTab === 'shortcuts' && <ShortcutsTab />}
          </div>

          <div
            className="flex items-center justify-between border-t px-6 py-4"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="flex gap-2">
              <button
                onClick={handleExport}
                className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  color: 'var(--color-text-primary)',
                }}
              >
                <MdiIcon name="export" size={16} />
                {t('common.export')}
              </button>
              <button
                onClick={handleImport}
                className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  color: 'var(--color-text-primary)',
                }}
              >
                <MdiIcon name="import" size={16} />
                {t('common.import')}
              </button>
            </div>
            <button
              onClick={() => { void handleSave(); }}
              className="inline-flex items-center gap-2 rounded-md px-6 py-2 text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              <MdiIcon name="check" size={16} />
              {t('common.save')}
            </button>
          </div>
        </div>

        <footer
          className="mt-8 flex items-center justify-center gap-2 text-sm"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <MdiIcon name="github" size={16} />
          <a
            href="https://github.com/roflsunriz/local-translate-ai/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
            style={{ color: 'var(--color-accent)' }}
          >
            {t('settings.reportIssue')}
          </a>
        </footer>
      </div>

      <ToastContainer />
    </div>
  );
}
