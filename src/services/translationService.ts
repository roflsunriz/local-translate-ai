/**
 * Translation Service - Handles API communication with llama.cpp server
 */

import type { TranslationProfile, SupportedLanguage } from '@/types/settings';
import type { TranslationResult } from '@/types/translation';
import type { ChatCompletionRequest, ChatCompletionResponse, ChatCompletionChunk } from '@/types/api';
import { sanitizeTranslationResult, sanitizeAccumulatedResult } from '@/utils/sanitize';

export interface RetryConfig {
  maxRetries: number;
  retryInterval: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryInterval: 1000,
};

/**
 * Safety limits for streaming translation to prevent infinite loops
 */
const STREAMING_SAFETY_LIMITS = {
  /** Maximum output length as a multiplier of input length */
  maxOutputLengthMultiplier: 10,
  /** Minimum maximum output length (for very short inputs) */
  minMaxOutputLength: 1000,
  /** Maximum number of consecutive repeated patterns to detect loops */
  maxConsecutiveRepeats: 5,
  /** Minimum pattern length to consider for repetition detection */
  minPatternLength: 10,
  /** Maximum time (ms) without receiving new content before aborting */
  contentTimeoutMs: 30000,
};

/**
 * Error thrown when streaming loop is detected
 */
export class StreamingLoopError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StreamingLoopError';
  }
}

export class TranslationService {
  private lastResult: string = '';
  private retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG;

  setRetryConfig(config: Partial<RetryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...config };
  }

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

    // Execute with retry
    const response = await this.executeWithRetry(
      () => this.fetchWithTimeout(
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
      ),
      signal
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as ChatCompletionResponse;
    const rawTranslatedText = data.choices[0]?.message.content ?? '';

    // Sanitize the translation result to remove any chat template tokens
    const translatedText = sanitizeTranslationResult(rawTranslatedText);

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

    // Execute with retry
    const response = await this.executeWithRetry(
      () => this.fetchWithTimeout(
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
      ),
      signal
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

    // Safety limits
    const maxOutputLength = Math.max(
      text.length * STREAMING_SAFETY_LIMITS.maxOutputLengthMultiplier,
      STREAMING_SAFETY_LIMITS.minMaxOutputLength
    );
    let lastContentTime = Date.now();
    let lastChunks: string[] = [];

    try {
      while (true) {
        // Check for content timeout
        if (Date.now() - lastContentTime > STREAMING_SAFETY_LIMITS.contentTimeoutMs) {
          console.warn('Streaming translation timeout: no content received');
          break;
        }

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
                // Update last content time
                lastContentTime = Date.now();

                // Check for maximum output length
                if (accumulated.length + content.length > maxOutputLength) {
                  console.warn(`Streaming translation exceeded max length (${maxOutputLength}), truncating`);
                  // Add truncated content and stop
                  const remaining = maxOutputLength - accumulated.length;
                  if (remaining > 0) {
                    accumulated += content.slice(0, remaining);
                    onChunk(content.slice(0, remaining), accumulated);
                  }
                  throw new StreamingLoopError(`Output exceeded maximum length of ${maxOutputLength} characters`);
                }

                // Check for repetition loop
                if (this.detectRepetitionLoop(content, lastChunks, accumulated)) {
                  console.warn('Streaming translation loop detected, stopping');
                  throw new StreamingLoopError('Repetition loop detected in translation output');
                }

                // Track recent chunks for loop detection
                lastChunks.push(content);
                if (lastChunks.length > STREAMING_SAFETY_LIMITS.maxConsecutiveRepeats * 2) {
                  lastChunks = lastChunks.slice(-STREAMING_SAFETY_LIMITS.maxConsecutiveRepeats * 2);
                }

                accumulated += content;
                onChunk(content, accumulated);
              }
            } catch (e) {
              // Re-throw StreamingLoopError
              if (e instanceof StreamingLoopError) {
                throw e;
              }
              // Ignore parsing errors for incomplete JSON
            }
          }
        }
      }
    } catch (e) {
      // Handle StreamingLoopError gracefully - we still have partial results
      if (e instanceof StreamingLoopError) {
        console.warn('Streaming stopped due to safety limit:', e.message);
        // Continue with the accumulated result so far
      } else {
        throw e;
      }
    } finally {
      reader.releaseLock();
    }

    // Sanitize the final accumulated result
    this.lastResult = sanitizeAccumulatedResult(accumulated);
  }

  /**
   * Detect repetition loops in streaming output
   */
  private detectRepetitionLoop(
    newContent: string,
    recentChunks: string[],
    accumulated: string
  ): boolean {
    // Method 1: Check if the same chunk is repeated consecutively
    if (recentChunks.length >= STREAMING_SAFETY_LIMITS.maxConsecutiveRepeats) {
      const lastN = recentChunks.slice(-STREAMING_SAFETY_LIMITS.maxConsecutiveRepeats);
      if (lastN.every(chunk => chunk === newContent) && newContent.length > 0) {
        return true;
      }
    }

    // Method 2: Check for repeating patterns in accumulated text
    if (accumulated.length >= STREAMING_SAFETY_LIMITS.minPatternLength * 3) {
      const tail = accumulated.slice(-STREAMING_SAFETY_LIMITS.minPatternLength * 3);
      // Check if the tail consists of repeating patterns
      for (let patternLen = STREAMING_SAFETY_LIMITS.minPatternLength; patternLen <= tail.length / 3; patternLen++) {
        const pattern = tail.slice(-patternLen);
        const prevPattern1 = tail.slice(-patternLen * 2, -patternLen);
        const prevPattern2 = tail.slice(-patternLen * 3, -patternLen * 2);

        if (pattern === prevPattern1 && pattern === prevPattern2) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Translate multiple texts in batch (for page translation)
   */
  async translateBatch(
    texts: string[],
    sourceLanguage: SupportedLanguage,
    targetLanguage: SupportedLanguage,
    profile: TranslationProfile,
    signal: AbortSignal,
    onProgress: (completed: number, total: number, result: string) => void
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
        const result = await this.translate(
          text,
          sourceLanguage,
          targetLanguage,
          profile,
          signal
        );
        results.push(result.translatedText);
        onProgress(i + 1, total, result.translatedText);
      } catch (error) {
        // On error, keep original text
        console.error(`Failed to translate text at index ${i}:`, error);
        results.push(text);
        onProgress(i + 1, total, text);
      }
    }

    return results;
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

  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    signal?: AbortSignal
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      if (signal?.aborted) {
        throw new Error('Request was cancelled');
      }

      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on abort
        if (lastError.name === 'AbortError' || signal?.aborted) {
          throw lastError;
        }

        // Don't retry on last attempt
        if (attempt === this.retryConfig.maxRetries) {
          break;
        }

        // Wait before retry
        await this.delay(this.retryConfig.retryInterval);
        console.warn(`Retry attempt ${attempt + 1}/${this.retryConfig.maxRetries}`);
      }
    }

    throw lastError ?? new Error('Unknown error during retry');
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
