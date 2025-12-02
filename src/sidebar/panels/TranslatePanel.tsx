import { useCallback } from 'react';

import { Button } from '@/components/Button';
import { MdiIcon } from '@/components/Icon';
import { LanguageSelector } from '@/components/LanguageSelector';
import { TextArea } from '@/components/TextArea';
import { useTranslation } from '@/hooks';
import { useSettingsStore, useTranslationStore, useUIStore } from '@/stores';

import type { SupportedLanguage } from '@/types/settings';

export function TranslatePanel() {
  const { t } = useTranslation();
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
      showError(t('common.error'), t('sidebar.translate.inputPlaceholder'));
      return;
    }

    const requestId = crypto.randomUUID();
    startTranslation(requestId);
    showInfo(t('notifications.translationStarted'), '');

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
        const message = error instanceof Error ? error.message : t('notifications.unknownError');
        showError(t('notifications.translationError'), message);
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
    t,
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
      showInfo(t('notifications.translationCancelled'), '');
    }
  }, [showInfo, t]);

  const handleCopy = useCallback(async (formatted: boolean) => {
    const text = formatted ? displayText : displayText.replace(/\n+/g, ' ').trim();
    try {
      await navigator.clipboard.writeText(text);
      showSuccess(t('common.copied'), t('notifications.copySuccess'));
    } catch {
      showError(t('common.error'), t('notifications.copyFailed'));
    }
  }, [displayText, showSuccess, showError, t]);

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
          {t('sidebar.translate.sourceLanguage')}
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
          {t('sidebar.translate.inputPlaceholder').split('...')[0]}
        </label>
        <TextArea
          value={inputText}
          onChange={setInputText}
          placeholder={t('sidebar.translate.inputPlaceholder')}
          className="h-32 w-full resize-none"
          disabled={isTranslating}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {isTranslating ? (
          <Button variant="secondary" onClick={handleCancel} className="flex-1">
            <MdiIcon name="cancel" size={16} />
            <span className="ml-2">{t('common.cancel')}</span>
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={handleTranslate}
            disabled={!inputText.trim()}
            className="flex-1"
          >
            <MdiIcon name="send" size={16} />
            <span className="ml-2">{t('sidebar.translate.translateButton')}</span>
          </Button>
        )}
        <Button variant="ghost" onClick={handleClear} disabled={isTranslating}>
          <MdiIcon name="delete" size={16} />
        </Button>
      </div>

      {/* Target Language */}
      <div>
        <label
          className="mb-1 block text-sm font-medium"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {t('sidebar.translate.targetLanguage')}
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
          {isTranslating ? t('sidebar.translate.translating') : t('sidebar.translate.outputPlaceholder').split(' ')[0]}
        </label>
        <TextArea
          value={displayText}
          readOnly
          placeholder={isTranslating ? t('sidebar.translate.translating') : t('sidebar.translate.outputPlaceholder')}
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
            <MdiIcon name="copy" size={16} />
            <span className="ml-2">{t('sidebar.translate.copyFormatted')}</span>
          </Button>
          <Button
            variant="secondary"
            onClick={() => { void handleCopy(false); }}
            className="flex-1"
          >
            <MdiIcon name="copy" size={16} />
            <span className="ml-2">{t('sidebar.translate.copyPlain')}</span>
          </Button>
        </div>
      )}
    </div>
  );
}
