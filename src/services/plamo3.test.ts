import { afterEach, describe, expect, it, vi } from 'vitest';

import { Plamo3LanguageError, TranslationService } from './translationService';

import { DEFAULT_PROFILE, DEFAULT_USER_PROMPT_TEMPLATE } from '@/types/settings';
import { useSettingsStore } from '@/stores/settingsStore';
import { SettingsService } from '@/services/settingsService';
import { sanitizeTranslationResult } from '@/utils/sanitize';

import type { SupportedLanguage, TranslationProfile } from '@/types/settings';

function mockChatResponse() {
  const fetchMock = vi.fn(async (_url: string, _options: RequestInit) =>
    new Response(JSON.stringify({ choices: [{ message: { content: '翻訳結果' } }] }), {
      headers: { 'Content-Type': 'application/json' },
    }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function bodyOf(fetchMock: ReturnType<typeof mockChatResponse>): unknown {
  const body = fetchMock.mock.calls[0]?.[1].body;
  return JSON.parse(String(body)) as unknown;
}

afterEach(() => {
  vi.unstubAllGlobals();
  useSettingsStore.getState().resetSettings();
});

describe('PLaMo 3 requests', () => {
  it('sends the original text, automatic source detection and Japanese plain form', async () => {
    const fetchMock = mockChatResponse();
    const result = await new TranslationService().translate('A meeting.', 'auto', 'Japanese', DEFAULT_PROFILE);

    expect(result.translatedText).toBe('翻訳結果');
    expect(bodyOf(fetchMock)).toEqual({
      model: 'plamo-3-translate',
      messages: [{ role: 'user', content: 'A meeting.' }],
      chat_template_kwargs: { target_lang: 'ja', form: 'plain' },
      temperature: 0,
      stop: ['<|plamo:tag|>', '<|plamo:bos|>'],
      stream: false,
    });
  });

  it.each<[SupportedLanguage, string]>([
    ['Japanese', 'ja'], ['English', 'en'], ['Chinese', 'zh-hans'], ['Korean', 'ko'],
    ['Spanish', 'es'], ['Russian', 'ru'], ['Hindi', 'hi'], ['Arabic', 'ar'],
    ['French', 'fr'], ['Bengali', 'bn'], ['Indonesian', 'id'],
  ])('converts %s to %s for both translation directions', async (language, code) => {
    const fetchMock = mockChatResponse();
    await new TranslationService().translate('text', language, language, { ...DEFAULT_PROFILE, plamo3Form: 'auto' });
    expect(bodyOf(fetchMock)).toMatchObject({ chat_template_kwargs: { source_lang: code, target_lang: code } });
    expect((bodyOf(fetchMock) as { chat_template_kwargs: { form?: string } }).chat_template_kwargs.form).toBeUndefined();
  });

  it('streams with an explicit source and polite Japanese form', async () => {
    const events = new TextEncoder().encode(
      'data: {"choices":[{"delta":{"content":"こんにちは"}}]}\r\n\r\ndata:{"choices":[{"delta":{"content":"世界"}}]}\n\ndata: [DONE]',
    );
    const fetchMock = vi.fn(async (_url: string, _options: RequestInit) => new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          for (let offset = 0; offset < events.length; offset += 7) {
            controller.enqueue(events.slice(offset, offset + 7));
          }
          controller.close();
        },
      }),
      { headers: { 'Content-Type': 'text/event-stream' } },
    ));
    vi.stubGlobal('fetch', fetchMock);
    const service = new TranslationService();
    const chunks: string[] = [];
    await service.translateStreaming('Hello', 'English', 'Japanese', { ...DEFAULT_PROFILE, plamo3Form: 'polite' },
      new AbortController().signal, (_chunk, accumulated) => { chunks.push(accumulated); });
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1].body)) as unknown).toMatchObject({
      stream: true,
      messages: [{ role: 'user', content: 'Hello' }],
      chat_template_kwargs: { source_lang: 'en', target_lang: 'ja', form: 'polite' },
    });
    expect(chunks).toEqual(['こんにちは', 'こんにちは世界']);
    expect(service.getLastResult()).toBe('こんにちは世界');
  });

  it('omits the Japanese style when translating to another language', async () => {
    const fetchMock = mockChatResponse();
    await new TranslationService().translate('こんにちは', 'Japanese', 'English', { ...DEFAULT_PROFILE, plamo3Form: 'polite' });
    expect(bodyOf(fetchMock)).toMatchObject({ chat_template_kwargs: { source_lang: 'ja', target_lang: 'en' } });
    expect((bodyOf(fetchMock) as { chat_template_kwargs: { form?: string } }).chat_template_kwargs.form).toBeUndefined();
  });

  it('rejects unsupported languages before sending or processing a page batch', async () => {
    const fetchMock = mockChatResponse();
    const service = new TranslationService();
    await expect(service.translate('text', 'Portuguese', 'Japanese', DEFAULT_PROFILE)).rejects.toBeInstanceOf(Plamo3LanguageError);
    await expect(service.translate('text', 'auto', 'Portuguese', DEFAULT_PROFILE)).rejects.toBeInstanceOf(Plamo3LanguageError);
    await expect(service.translate('text', 'auto', 'auto', DEFAULT_PROFILE)).rejects.toBeInstanceOf(Plamo3LanguageError);
    await expect(service.translateBatch(['text'], 'auto', 'Portuguese', DEFAULT_PROFILE,
      new AbortController().signal, () => undefined)).rejects.toBeInstanceOf(Plamo3LanguageError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps the existing OpenAI and Anthropic prompt formats', async () => {
    const fetchMock = mockChatResponse();
    const profile: TranslationProfile = {
      ...DEFAULT_PROFILE, apiType: 'openai', model: 'plamo-2', systemPrompt: 'Translate to {{target_language}}',
      userPromptTemplate: DEFAULT_USER_PROMPT_TEMPLATE,
    };
    await new TranslationService().translate('Hello', 'English', 'Japanese', profile);
    expect(bodyOf(fetchMock)).toEqual({
      model: 'plamo-2',
      messages: [
        { role: 'system', content: 'Translate to Japanese' },
        { role: 'user', content: '<|plamo:op|>dataset\ntranslation\n<|plamo:op|>input lang=English\nHello\n<|plamo:op|>output lang=Japanese' },
      ],
      stream: false,
    });

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ content: [{ type: 'text', text: '翻訳結果' }] })));
    await new TranslationService().translate('Hello', 'English', 'Japanese', { ...profile, apiType: 'anthropic' });
    const anthropic = JSON.parse(String(fetchMock.mock.calls[1]?.[1].body)) as unknown;
    expect(anthropic).toMatchObject({ model: 'plamo-2', system: 'Translate to Japanese', stream: false });
    expect(anthropic).not.toHaveProperty('chat_template_kwargs');
  });
});

describe('saved profile compatibility', () => {
  it('leaves legacy profiles and prompts in OpenAI mode in both storage readers', async () => {
    const { apiType: _apiType, plamo3Form: _form, ...legacyProfile } = {
      ...DEFAULT_PROFILE, id: 'legacy', model: 'plamo-2', apiType: 'openai' as const,
    };
    const stored = { activeProfileId: 'legacy', profiles: [legacyProfile] };
    vi.stubGlobal('browser', { storage: { local: { get: vi.fn(async () => ({ settings: stored })) } } });
    const serviceSettings = await new SettingsService().getSettings();
    expect(serviceSettings.profiles[0]).toMatchObject({ id: 'legacy', model: 'plamo-2', apiType: 'openai', userPromptTemplate: DEFAULT_USER_PROMPT_TEMPLATE });
    await useSettingsStore.getState().loadFromStorage();
    expect(useSettingsStore.getState().settings.profiles[0]).toMatchObject({ id: 'legacy', model: 'plamo-2', apiType: 'openai', userPromptTemplate: DEFAULT_USER_PROMPT_TEMPLATE });
  });
});

describe('translated text cleanup', () => {
  it('keeps ordinary sentences starting with translation while removing explicit labels', () => {
    expect(sanitizeTranslationResult('翻訳結果')).toBe('翻訳結果');
    expect(sanitizeTranslationResult('翻訳は難しい。')).toBe('翻訳は難しい。');
    expect(sanitizeTranslationResult('Translation is difficult.')).toBe('Translation is difficult.');
    expect(sanitizeTranslationResult('翻訳結果: 会議は明日だ。')).toBe('会議は明日だ。');
    expect(sanitizeTranslationResult('Translation: The meeting is tomorrow.')).toBe('The meeting is tomorrow.');
  });
});
