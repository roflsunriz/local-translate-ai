import { useCallback } from 'react';

import { Button } from '@/components/Button';
import { LanguageSelector } from '@/components/LanguageSelector';
import { TextArea } from '@/components/TextArea';
import { useSettingsStore, useTranslationStore, useUIStore } from '@/stores';
import type { SupportedLanguage } from '@/types/settings';

export function TranslatePanel() {
  const {
    inputText,
    outputText,
    streamingText,
    status,
    sourceLanguage,
    targetLanguage,
    setInputText,
    setSourceLanguage,
    setTargetLanguage,
    startTranslation,
    clearTexts,
  } = useTranslationStore();

  const { settings, getActiveProfile } = useSettingsStore();
  const { showSuccess, showError, showInfo } = useUIStore();

  const activeProfile = getActiveProfile();
  const effectiveSourceLang = sourceLanguage ?? activeProfile?.sourceLanguage ?? 'auto';
  const effectiveTargetLang = targetLanguage ?? activeProfile?.targetLanguage ?? 'Japanese';

  const displayText = status === 'streaming' ? streamingText : outputText;
  const isTranslating = status === 'translating' || status === 'streaming';

  const handleTranslate = useCallback(() => {
    if (!inputText.trim()) {
      showError('エラー', '翻訳するテキストを入力してください');
      return;
    }

    const requestId = crypto.randomUUID();
    startTranslation(requestId);
    showInfo('翻訳開始', '翻訳を開始しました...');

    // Send message to background script
    browser.runtime
      .sendMessage({
        type: 'TRANSLATE_TEXT',
        timestamp: Date.now(),
        payload: {
          requestId,
          text: inputText,
          sourceLanguage: effectiveSourceLang,
          targetLanguage: effectiveTargetLang,
          profileId: settings.activeProfileId,
          stream: settings.streamingEnabled,
        },
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : '不明なエラー';
        showError('API エラー', message);
      });
  }, [
    inputText,
    effectiveSourceLang,
    effectiveTargetLang,
    settings.activeProfileId,
    settings.streamingEnabled,
    startTranslation,
    showError,
    showInfo,
  ]);

  const handleCancel = useCallback(() => {
    const { currentRequestId, cancelTranslation } = useTranslationStore.getState();
    if (currentRequestId) {
      browser.runtime
        .sendMessage({
          type: 'CANCEL_TRANSLATION',
          timestamp: Date.now(),
          payload: { requestId: currentRequestId },
        })
        .catch(console.error);
      cancelTranslation();
      showInfo('キャンセル', '翻訳をキャンセルしました');
    }
  }, [showInfo]);

  const handleCopy = useCallback(async (formatted: boolean) => {
    const text = formatted ? displayText : displayText.replace(/\n+/g, ' ').trim();
    try {
      await navigator.clipboard.writeText(text);
      showSuccess('コピー完了', 'クリップボードにコピーしました');
    } catch {
      showError('コピー失敗', 'クリップボードへのコピーに失敗しました');
    }
  }, [displayText, showSuccess, showError]);

  const handleClear = useCallback(() => {
    clearTexts();
  }, [clearTexts]);

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      {/* Source Language */}
      <div>
        <label
          className="mb-1 block text-sm font-medium"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          ソース言語
        </label>
        <LanguageSelector
          value={effectiveSourceLang}
          onChange={(lang) => { setSourceLanguage(lang as SupportedLanguage); }}
          includeAuto
        />
      </div>

      {/* Input Text */}
      <div className="flex-1">
        <label
          className="mb-1 block text-sm font-medium"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          入力テキスト
        </label>
        <TextArea
          value={inputText}
          onChange={setInputText}
          placeholder="翻訳するテキストを入力..."
          className="h-32 w-full resize-none"
          disabled={isTranslating}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {isTranslating ? (
          <Button variant="secondary" onClick={handleCancel} className="flex-1">
            キャンセル
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={handleTranslate}
            disabled={!inputText.trim()}
            className="flex-1"
          >
            翻訳
          </Button>
        )}
        <Button variant="ghost" onClick={handleClear} disabled={isTranslating}>
          クリア
        </Button>
      </div>

      {/* Target Language */}
      <div>
        <label
          className="mb-1 block text-sm font-medium"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          ターゲット言語
        </label>
        <LanguageSelector
          value={effectiveTargetLang}
          onChange={(lang) => { setTargetLanguage(lang as SupportedLanguage); }}
        />
      </div>

      {/* Output Text */}
      <div className="flex-1">
        <label
          className="mb-1 block text-sm font-medium"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          翻訳結果
        </label>
        <TextArea
          value={displayText}
          readOnly
          placeholder={isTranslating ? '翻訳中...' : '翻訳結果がここに表示されます'}
          className="h-32 w-full resize-none"
        />
      </div>

      {/* Copy Buttons */}
      {displayText && (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => { void handleCopy(true); }}
            className="flex-1"
          >
            コピー（フォーマット済み）
          </Button>
          <Button
            variant="secondary"
            onClick={() => { void handleCopy(false); }}
            className="flex-1"
          >
            コピー（1行）
          </Button>
        </div>
      )}
    </div>
  );
}

