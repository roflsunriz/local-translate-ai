import { useEffect, useCallback } from 'react';

import { Button } from '@/components/Button';
import { MdiIcon } from '@/components/Icon';
import { useTranslation } from '@/hooks';
import { useTranslationStore, useUIStore } from '@/stores';

import type { TranslationHistoryItem } from '@/types/translation';

export function HistoryTab() {
  const { t } = useTranslation();
  const { history, setHistory, setHistoryLoading, historyLoading, clearHistory, deleteHistoryItem } =
    useTranslationStore();
  const { showSuccess, showError } = useUIStore();

  useEffect(() => {
    // Load history from background script
    setHistoryLoading(true);
    browser.runtime
      .sendMessage({
        type: 'GET_HISTORY',
        timestamp: Date.now(),
        payload: { limit: 100 },
      })
      .then((response: unknown) => {
        if (response && typeof response === 'object' && 'items' in response) {
          const data = response as { items: TranslationHistoryItem[] };
          setHistory(data.items);
        }
      })
      .catch(console.error)
      .finally(() => {
        setHistoryLoading(false);
      });
  }, [setHistory, setHistoryLoading]);

  const handleClearHistory = useCallback(() => {
    browser.runtime
      .sendMessage({
        type: 'CLEAR_HISTORY',
        timestamp: Date.now(),
      })
      .then(() => {
        clearHistory();
        showSuccess(t('common.success'), t('notifications.historyCleared'));
      })
      .catch(() => {
        showError(t('common.error'), t('notifications.unknownError'));
      });
  }, [clearHistory, showSuccess, showError, t]);

  const handleDeleteItem = useCallback(
    (itemId: string) => {
      browser.runtime
        .sendMessage({
          type: 'DELETE_HISTORY_ITEM',
          timestamp: Date.now(),
          payload: { id: itemId },
        })
        .then(() => {
          deleteHistoryItem(itemId);
          showSuccess(t('common.success'), t('settings.history.deleted'));
        })
        .catch(() => {
          showError(t('common.error'), t('notifications.unknownError'));
        });
    },
    [deleteHistoryItem, showSuccess, showError, t]
  );

  const handleCopyItem = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        showSuccess(t('common.copied'), t('notifications.copySuccess'));
      } catch {
        showError(t('common.error'), t('notifications.copyFailed'));
      }
    },
    [showSuccess, showError, t]
  );

  if (historyLoading) {
    return (
      <div
        className="flex h-96 items-center justify-center"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <MdiIcon name="refresh" size={24} className="animate-spin" />
        <span className="ml-2">{t('common.loading')}</span>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div
        className="flex h-96 flex-col items-center justify-center gap-2 p-4"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <MdiIcon name="history" size={48} />
        <p>{t('sidebar.history.empty')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3
          className="text-lg font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {t('settings.tabs.history')}
        </h3>
        <div className="flex items-center gap-4">
          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {t('sidebar.history.itemCount', { count: history.length })}
          </span>
          <Button variant="ghost" size="sm" onClick={handleClearHistory}>
            <MdiIcon name="delete" size={16} />
            <span className="ml-1">{t('sidebar.history.clearAll')}</span>
          </Button>
        </div>
      </div>

      <div
        className="max-h-[500px] overflow-y-auto rounded-lg border"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-bg-tertiary)',
        }}
      >
        {history.map((item) => (
          <HistoryItem
            key={item.id}
            item={item}
            onDelete={() => {
              handleDeleteItem(item.id);
            }}
            onCopyOriginal={() => {
              void handleCopyItem(item.sourceText);
            }}
            onCopyTranslated={() => {
              void handleCopyItem(item.translatedText);
            }}
          />
        ))}
      </div>
    </div>
  );
}

interface HistoryItemProps {
  item: TranslationHistoryItem;
  onDelete: () => void;
  onCopyOriginal: () => void;
  onCopyTranslated: () => void;
}

function HistoryItem({ item, onDelete, onCopyOriginal, onCopyTranslated }: HistoryItemProps) {
  const { t } = useTranslation();

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncate = (text: string, maxLength: number) => {
    if (text.length <= maxLength) {
      return text;
    }
    return text.slice(0, maxLength) + '...';
  };

  return (
    <div
      className="border-b p-4 transition-colors last:border-b-0"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'transparent',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          <MdiIcon name="swap" size={12} />
          <span>{item.sourceLanguage} → {item.targetLanguage}</span>
        </div>
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {formatDate(item.timestamp)}
        </span>
      </div>

      <div className="mb-2">
        <p
          className="mb-1 text-xs font-medium"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {t('settings.history.original')}
        </p>
        <p
          className="text-sm"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {truncate(item.sourceText, 100)}
        </p>
      </div>

      <div className="mb-3">
        <p
          className="mb-1 text-xs font-medium"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {t('settings.history.translated')}
        </p>
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
          {truncate(item.translatedText, 150)}
        </p>
      </div>

      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={onCopyOriginal}>
          <MdiIcon name="copy" size={14} />
          <span className="ml-1">{t('settings.history.copyOriginal')}</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={onCopyTranslated}>
          <MdiIcon name="copy" size={14} />
          <span className="ml-1">{t('settings.history.copyTranslated')}</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete}>
          <MdiIcon name="delete" size={14} />
          <span className="ml-1">{t('common.delete')}</span>
        </Button>
      </div>
    </div>
  );
}
