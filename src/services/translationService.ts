/**
 * Translation Service - Handles API communication with llama.cpp server
 */

import type { TranslationProfile, SupportedLanguage } from '@/types/settings';
import type { TranslationResult } from '@/types/translation';
import type { ChatCompletionRequest, ChatCompletionResponse, ChatCompletionChunk } from '@/types/api';

export class TranslationService {
  private lastResult: string = '';

  async translate(
    text: string,
    sourceLanguage: SupportedLanguage,
    targetLanguage: SupportedLanguage,
    profile: TranslationProfile,
    signal?: AbortSignal
  ): Promise<TranslationResult> {
    const startTime = Date.now();

    const prompt = this.buildPrompt(text, sourceLanguage, targetLanguage, profile);
    const request: ChatCompletionRequest = {
      model: profile.model,
      messages: [
        { role: 'system', content: profile.systemPrompt.replace('{{target_language}}', targetLanguage) },
        { role: 'user', content: prompt },
      ],
      stream: false,
    };

    const response = await this.fetchWithTimeout(
      profile.apiEndpoint,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${profile.apiKey}`,
        },
        body: JSON.stringify(request),
        signal: signal ?? null,
      },
      profile.timeout * 1000
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as ChatCompletionResponse;
    const translatedText = data.choices[0]?.message.content ?? '';

    this.lastResult = translatedText;

    return {
      id: crypto.randomUUID(),
      requestId: '',
      translatedText,
      sourceText: text,
      sourceLanguage,
      targetLanguage,
      timestamp: Date.now(),
      duration: Date.now() - startTime,
      fromCache: false,
    };
  }

  async translateStreaming(
    text: string,
    sourceLanguage: SupportedLanguage,
    targetLanguage: SupportedLanguage,
    profile: TranslationProfile,
    signal: AbortSignal,
    onChunk: (chunk: string, accumulated: string) => void
  ): Promise<void> {
    const prompt = this.buildPrompt(text, sourceLanguage, targetLanguage, profile);
    const request: ChatCompletionRequest = {
      model: profile.model,
      messages: [
        { role: 'system', content: profile.systemPrompt.replace('{{target_language}}', targetLanguage) },
        { role: 'user', content: prompt },
      ],
      stream: true,
    };

    const response = await this.fetchWithTimeout(
      profile.apiEndpoint,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${profile.apiKey}`,
        },
        body: JSON.stringify(request),
        signal,
      },
      profile.timeout * 1000
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    let accumulated = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              continue;
            }

            try {
              const parsed = JSON.parse(data) as ChatCompletionChunk;
              const content = parsed.choices[0]?.delta.content ?? '';
              if (content) {
                accumulated += content;
                onChunk(content, accumulated);
              }
            } catch {
              // Ignore parsing errors for incomplete JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    this.lastResult = accumulated;
  }

  getLastResult(): string {
    return this.lastResult;
  }

  private buildPrompt(
    text: string,
    sourceLanguage: SupportedLanguage,
    targetLanguage: SupportedLanguage,
    profile: TranslationProfile
  ): string {
    return profile.userPromptTemplate
      .replace(/\{\{source_language\}\}/g, sourceLanguage)
      .replace(/\{\{target_language\}\}/g, targetLanguage)
      .replace(/\{\{input_text\}\}/g, text);
  }

  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout: number
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => { controller.abort(); }, timeout);

    // Combine signals if one was provided
    if (options.signal) {
      options.signal.addEventListener('abort', () => { controller.abort(); });
    }

    try {
      return await fetch(url, {
        ...options,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

