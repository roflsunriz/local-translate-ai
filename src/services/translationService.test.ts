import { describe, expect, it, vi } from 'vitest';

import { TranslationService } from './translationService';

import { DEFAULT_PROFILE } from '@/types/settings';

import type { TranslationResult } from '@/types/translation';

function createResult(sourceText: string): TranslationResult {
  return {
    id: sourceText,
    requestId: '',
    translatedText: `translated:${sourceText}`,
    sourceText,
    sourceLanguage: 'auto',
    targetLanguage: 'Japanese',
    timestamp: 0,
    duration: 0,
    fromCache: false,
  };
}

describe('TranslationService.translateBatch', () => {
  it('limits concurrent requests and keeps results in source order', async () => {
    const service = new TranslationService();
    let active = 0;
    let maxActive = 0;
    const completedIndexes: number[] = [];

    vi.spyOn(service, 'translate').mockImplementation(async (text) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      const delay = text === 'first' ? 30 : 5;
      await new Promise((resolve) => setTimeout(resolve, delay));
      active -= 1;
      return createResult(text);
    });

    const results = await service.translateBatch(
      ['first', 'second', 'third', 'fourth'],
      'auto',
      'Japanese',
      { ...DEFAULT_PROFILE, pageTranslationConcurrency: 2 },
      new AbortController().signal,
      (_completed, _total, _result, index) => {
        completedIndexes.push(index);
      },
    );

    expect(maxActive).toBe(2);
    expect(results).toEqual([
      'translated:first',
      'translated:second',
      'translated:third',
      'translated:fourth',
    ]);
    expect(completedIndexes).toHaveLength(4);
    expect([...completedIndexes].sort((a, b) => a - b)).toEqual([0, 1, 2, 3]);
  });

  it('uses one request for legacy profiles without a concurrency setting', async () => {
    const service = new TranslationService();
    let active = 0;
    let maxActive = 0;
    const legacyProfile = {
      ...DEFAULT_PROFILE,
      pageTranslationConcurrency: undefined,
    } as unknown as typeof DEFAULT_PROFILE;

    vi.spyOn(service, 'translate').mockImplementation(async (text) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return createResult(text);
    });

    await service.translateBatch(
      ['first', 'second'],
      'auto',
      'Japanese',
      legacyProfile,
      new AbortController().signal,
      () => undefined,
    );

    expect(maxActive).toBe(1);
  });

  it('caps imported concurrency values at 32', async () => {
    const service = new TranslationService();
    let active = 0;
    let maxActive = 0;
    let releaseWorkers: (() => void) | undefined;
    const workersBlocked = new Promise<void>((resolve) => {
      releaseWorkers = resolve;
    });

    vi.spyOn(service, 'translate').mockImplementation(async (text) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await workersBlocked;
      active -= 1;
      return createResult(text);
    });

    const batch = service.translateBatch(
      Array.from({ length: 40 }, (_, index) => `text-${index}`),
      'auto',
      'Japanese',
      { ...DEFAULT_PROFILE, pageTranslationConcurrency: 1_000 },
      new AbortController().signal,
      () => undefined,
    );

    await vi.waitFor(() => {
      expect(maxActive).toBe(32);
    });
    releaseWorkers?.();
    await batch;
  });

  it('uses one request for invalid imported concurrency values', async () => {
    const service = new TranslationService();
    let active = 0;
    let maxActive = 0;

    vi.spyOn(service, 'translate').mockImplementation(async (text) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return createResult(text);
    });

    await service.translateBatch(
      ['first', 'second'],
      'auto',
      'Japanese',
      { ...DEFAULT_PROFILE, pageTranslationConcurrency: Number.NaN },
      new AbortController().signal,
      () => undefined,
    );

    expect(maxActive).toBe(1);
  });

  it('keeps the source text at the failed index while other workers continue', async () => {
    const service = new TranslationService();

    vi.spyOn(service, 'translate').mockImplementation(async (text) => {
      if (text === 'failed') {
        throw new Error('provider error');
      }
      return createResult(text);
    });

    const results = await service.translateBatch(
      ['first', 'failed', 'third'],
      'auto',
      'Japanese',
      { ...DEFAULT_PROFILE, pageTranslationConcurrency: 3 },
      new AbortController().signal,
      () => undefined,
    );

    expect(results).toEqual(['translated:first', 'failed', 'translated:third']);
  });
});
