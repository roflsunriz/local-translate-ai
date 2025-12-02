/**
 * i18n (Internationalization) module
 */

import type { UILanguage } from '@/types/settings';

import { ar } from './locales/ar';
import { bn } from './locales/bn';
import { en } from './locales/en';
import { es } from './locales/es';
import { fr } from './locales/fr';
import { hi } from './locales/hi';
import { id } from './locales/id';
import { ja } from './locales/ja';
import { ko } from './locales/ko';
import { pt } from './locales/pt';
import { ru } from './locales/ru';
import { zh } from './locales/zh';

export type TranslationKey = string;

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Translations = typeof ja;

const locales: Record<string, DeepPartial<Translations>> = {
  ja,
  en,
  zh,
  ko,
  es,
  pt,
  ru,
  hi,
  ar,
  fr,
  bn,
  id,
};

/**
 * Get the browser's preferred language
 */
export function getBrowserLanguage(): string {
  const lang = navigator.language.split('-')[0];
  return lang ?? 'en';
}

/**
 * Resolve the actual language to use
 */
export function resolveLanguage(uiLanguage: UILanguage): string {
  if (uiLanguage === 'auto') {
    return getBrowserLanguage();
  }
  return uiLanguage;
}

/**
 * Get a nested value from an object using dot notation
 */
function getNestedValue(obj: unknown, path: string): string | undefined {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return typeof current === 'string' ? current : undefined;
}

/**
 * Get a translated string
 */
export function t(key: TranslationKey, lang: string, params?: Record<string, string | number>): string {
  // Try the requested language first
  let value = getNestedValue(locales[lang], key);

  // Fallback to English if not found
  if (value === undefined && lang !== 'en') {
    value = getNestedValue(locales['en'], key);
  }

  // Fallback to Japanese if still not found
  if (value === undefined && lang !== 'ja') {
    value = getNestedValue(locales['ja'], key);
  }

  // Return key if nothing found
  if (value === undefined) {
    return key;
  }

  // Replace parameters
  if (params) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      value = value.replace(new RegExp(`\\{\\{${paramKey}\\}\\}`, 'g'), String(paramValue));
    }
  }

  return value;
}

/**
 * Create a translation function for a specific language
 */
export function createTranslator(lang: string) {
  return (key: TranslationKey, params?: Record<string, string | number>) => t(key, lang, params);
}

export { ar, bn, en, es, fr, hi, id, ja, ko, pt, ru, zh };
