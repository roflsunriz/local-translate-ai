/**
 * useTranslation hook for i18n support
 */

import { useMemo } from 'react';

import { t, resolveLanguage } from '@/i18n';
import { useSettingsStore } from '@/stores';

import type { TranslationKey } from '@/i18n';

export function useTranslation() {
  const { settings } = useSettingsStore();
  const lang = resolveLanguage(settings.uiLanguage);

  const translate = useMemo(() => {
    return (key: TranslationKey, params?: Record<string, string | number>) => {
      return t(key, lang, params);
    };
  }, [lang]);

  return {
    t: translate,
    lang,
  };
}

export default useTranslation;

