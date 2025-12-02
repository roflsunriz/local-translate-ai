import { useEffect, useState } from 'react';

import { TabBar } from '@/components/TabBar';
import { ToastContainer } from '@/components/ToastContainer';
import { useSettingsStore, useUIStore } from '@/stores';

import { AdvancedTab } from './tabs/AdvancedTab';
import { ApiTab } from './tabs/ApiTab';
import { GeneralTab } from './tabs/GeneralTab';
import { PromptTab } from './tabs/PromptTab';
import { ShortcutsTab } from './tabs/ShortcutsTab';

type TabId = 'general' | 'api' | 'prompt' | 'advanced' | 'shortcuts';

const TABS = [
  { id: 'general', label: '⚙️ 一般' },
  { id: 'api', label: '🔌 API' },
  { id: 'prompt', label: '💬 プロンプト' },
  { id: 'advanced', label: '🔧 詳細' },
  { id: 'shortcuts', label: '⌨️ ショートカット' },
];

export function OptionsPage() {
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

  const handleSave = async () => {
    try {
      await saveToStorage();
      showSuccess('保存完了', '設定を保存しました');
    } catch {
      showError('保存失敗', '設定の保存に失敗しました');
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
    showSuccess('エクスポート完了', '設定をエクスポートしました');
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
        showSuccess('インポート完了', '設定をインポートしました');
      } catch {
        showError('インポート失敗', '設定ファイルの読み込みに失敗しました');
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
            Local Translate AI 設定
          </h1>
          <p
            className="mt-2 text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            翻訳拡張機能の設定を管理します
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
            tabs={TABS}
            activeTab={activeTab}
            onTabChange={(tab) => { setActiveTab(tab as TabId); }}
          />

          <div className="p-6">
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
                className="rounded-md px-4 py-2 text-sm font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  color: 'var(--color-text-primary)',
                }}
              >
                エクスポート
              </button>
              <button
                onClick={handleImport}
                className="rounded-md px-4 py-2 text-sm font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  color: 'var(--color-text-primary)',
                }}
              >
                インポート
              </button>
            </div>
            <button
              onClick={() => { void handleSave(); }}
              className="rounded-md px-6 py-2 text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              保存
            </button>
          </div>
        </div>

        <footer
          className="mt-8 text-center text-sm"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <a
            href="https://github.com/your-username/local-translate-ai/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
            style={{ color: 'var(--color-accent)' }}
          >
            問題を報告 (GitHub Issues)
          </a>
        </footer>
      </div>

      <ToastContainer />
    </div>
  );
}

