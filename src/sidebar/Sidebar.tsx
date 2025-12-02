import { useEffect } from 'react';

import { MdiIcon } from '@/components/Icon';
import { TabBar } from '@/components/TabBar';
import { ToastContainer } from '@/components/ToastContainer';
import { useTranslation } from '@/hooks';
import { useSettingsStore, useTranslationStore, useUIStore } from '@/stores';

import { HistoryPanel } from './panels/HistoryPanel';
import { TranslatePanel } from './panels/TranslatePanel';

import type { ExtensionMessage } from '@/types/messages';

export function Sidebar() {
  const { t } = useTranslation();
  const { sidebarTab, setSidebarTab, showError } = useUIStore();
  const { loadFromStorage, settings } = useSettingsStore();
  const {
    currentRequestId,
    setStatus,
    setOutputText,
    appendStreamingText,
    completeTranslation,
    failTranslation,
  } = useTranslationStore();

  useEffect(() => {
    void loadFromStorage();
  }, [loadFromStorage]);

  // Listen for messages from background script
  useEffect(() => {
    const handleMessage = (message: ExtensionMessage) => {
      const { currentRequestId: reqId } = useTranslationStore.getState();

      switch (message.type) {
        case 'TRANSLATE_TEXT_STREAM_CHUNK': {
          const payload = message.payload as { requestId: string; chunk: string; accumulated: string };
          if (payload.requestId === reqId) {
            setStatus('streaming');
            appendStreamingText(payload.chunk);
          }
          break;
        }

        case 'TRANSLATE_TEXT_STREAM_END': {
          const payload = message.payload as { requestId: string; translatedText: string };
          if (payload.requestId === reqId) {
            completeTranslation(payload.translatedText);
          }
          break;
        }

        case 'TRANSLATE_TEXT_RESULT': {
          const payload = message.payload as { requestId: string; translatedText: string };
          if (payload.requestId === reqId) {
            completeTranslation(payload.translatedText);
          }
          break;
        }

        case 'TRANSLATE_TEXT_ERROR': {
          const payload = message.payload as { requestId: string; code: string; message: string };
          if (payload.requestId === reqId) {
            failTranslation({
              requestId: payload.requestId,
              code: (payload.code as 'API_ERROR' | 'NETWORK_ERROR' | 'TIMEOUT' | 'CANCELLED' | 'INVALID_RESPONSE' | 'UNKNOWN_ERROR') || 'UNKNOWN_ERROR',
              message: payload.message,
              timestamp: Date.now(),
            });
            showError(t('notifications.translationError'), payload.message);
          }
          break;
        }
      }
    };

    browser.runtime.onMessage.addListener(handleMessage);
    return () => {
      browser.runtime.onMessage.removeListener(handleMessage);
    };
  }, [
    currentRequestId,
    setStatus,
    setOutputText,
    appendStreamingText,
    completeTranslation,
    failTranslation,
    showError,
    t,
  ]);

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
