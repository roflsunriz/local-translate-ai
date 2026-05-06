/**
 * Google Translate Service (no API key required)
 */

import type { SupportedLanguage } from '@/types/settings';

const GOOGLE_TRANSLATE_ENDPOINT = 'https://translate.googleapis.com/translate_a/single';

const LANG_CODE_MAP: Record<SupportedLanguage, string> = {
  auto: 'auto',
  Japanese: 'ja',
  English: 'en',
  Chinese: 'zh-CN',
  Korean: 'ko',
  Spanish: 'es',
  Portuguese: 'pt',
  Russian: 'ru',
  Hindi: 'hi',
  Arabic: 'ar',
  French: 'fr',
  Bengali: 'bn',
  Indonesian: 'id',
};

type GoogleTranslateSegment = [string, string, ...unknown[]];
type GoogleTranslateResult = [GoogleTranslateSegment[], ...unknown[]];

function toGoogleLangCode(lang: SupportedLanguage): string {
  return LANG_CODE_MAP[lang];
}

export class GoogleTranslateService {
  async translate(
    text: string,
    sourceLanguage: SupportedLanguage,
    targetLanguage: SupportedLanguage,
    signal?: AbortSignal,
  ): Promise<string> {
    const sl = toGoogleLangCode(sourceLanguage);
    const tl = toGoogleLangCode(targetLanguage);

    const params = new URLSearchParams({
      client: 'gtx',
      sl,
      tl,
      dt: 't',
      q: text,
    });

    const url = `${GOOGLE_TRANSLATE_ENDPOINT}?${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      signal: signal ?? null,
    });

    if (!response.ok) {
      throw new Error(`Google Translate API error: ${response.status}`);
    }

    const data = (await response.json()) as GoogleTranslateResult;

    return this.extractTranslatedText(data);
  }

  async translateBatch(
    texts: string[],
    sourceLanguage: SupportedLanguage,
    targetLanguage: SupportedLanguage,
    signal: AbortSignal,
    onProgress: (completed: number, total: number, result: string) => void,
  ): Promise<string[]> {
    const results: string[] = [];
    const total = texts.length;

    for (let i = 0; i < texts.length; i++) {
      if (signal.aborted) {
        throw new Error('Translation cancelled');
      }

      const text = texts[i];
      if (!text || text.trim().length === 0) {
        results.push('');
        onProgress(i + 1, total, '');
        continue;
      }

      try {
        const result = await this.translate(text, sourceLanguage, targetLanguage, signal);
        results.push(result);
        onProgress(i + 1, total, result);
      } catch (error) {
        if (signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
          throw error;
        }
        console.error(`Google Translate: failed to translate text at index ${i}:`, error);
        results.push(text);
        onProgress(i + 1, total, text);
      }
    }

    return results;
  }

  private extractTranslatedText(data: GoogleTranslateResult): string {
    const segments = data[0];
    if (!Array.isArray(segments)) {
      throw new Error('Unexpected Google Translate response format');
    }

    return segments
      .filter((seg): seg is GoogleTranslateSegment => Array.isArray(seg) && typeof seg[0] === 'string')
      .map((seg) => seg[0])
      .join('');
  }
}
