import { useEffect, useCallback } from 'react';

import { Button } from '@/components/Button';
import { useTranslationStore, useUIStore } from '@/stores';
import type { TranslationHistoryItem } from '@/types/translation';

export function HistoryPanel() {
  const { history, setHistory, setHistoryLoading, historyLoading, clearHistory } =
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
        showSuccess('履歴削除', '翻訳履歴を削除しました');
      })
      .catch(() => {
        showError('エラー', '履歴の削除に失敗しました');
      });
  }, [clearHistory, showSuccess, showError]);

  const handleUseHistoryItem = useCallback((item: TranslationHistoryItem) => {
    const { setInputText, setOutputText, setSourceLanguage, setTargetLanguage } =
      useTranslationStore.getState();
    setInputText(item.sourceText);
    setOutputText(item.translatedText);
    setSourceLanguage(item.sourceLanguage);
    setTargetLanguage(item.targetLanguage);

    // Switch to translate tab
    useUIStore.getState().setSidebarTab('translate');
  }, []);

  const handleCopyItem = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showSuccess('コピー完了', 'クリップボードにコピーしました');
    } catch {
      showError('コピー失敗', 'クリップボードへのコピーに失敗しました');
    }
  }, [showSuccess, showError]);

  if (historyLoading) {
    return (
      <div
        className="flex h-full items-center justify-center"
        style={{ color: 'var(--color-text-muted)' }}
      >
        読み込み中...
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div
        className="flex h-full flex-col items-center justify-center gap-2 p-4"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <span className="text-4xl">📝</span>
        <p>翻訳履歴がありません</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2" style={{ borderColor: 'var(--color-border)' }}>
        <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {history.length}件の履歴
        </span>
        <Button variant="ghost" size="sm" onClick={handleClearHistory}>
          全て削除
        </Button>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto">
        {history.map((item) => (
          <HistoryItem
            key={item.id}
            item={item}
            onUse={() => { handleUseHistoryItem(item); }}
            onCopy={() => { void handleCopyItem(item.translatedText); }}
          />
        ))}
      </div>
    </div>
  );
}

interface HistoryItemProps {
  item: TranslationHistoryItem;
  onUse: () => void;
  onCopy: () => void;
}

function HistoryItem({ item, onUse, onCopy }: HistoryItemProps) {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ja-JP', {
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
      className="border-b p-3 transition-colors hover:bg-opacity-50"
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
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {item.sourceLanguage} → {item.targetLanguage}
        </span>
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {formatDate(item.timestamp)}
        </span>
      </div>

      <p
        className="mb-1 text-sm"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {truncate(item.sourceText, 50)}
      </p>

      <p className="mb-2 text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
        {truncate(item.translatedText, 80)}
      </p>

      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={onUse}>
          使用
        </Button>
        <Button variant="ghost" size="sm" onClick={onCopy}>
          コピー
        </Button>
      </div>
    </div>
  );
}

