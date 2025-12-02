/**
 * Background Script - Handles API communication, caching, and message routing
 */

import { HistoryService } from '@/services/historyService';
import { SettingsService } from '@/services/settingsService';
import { TranslationService } from '@/services/translationService';

import type { ExtensionMessage, TranslateTextMessage, TranslatePageMessage } from '@/types/messages';
import type { Settings, SupportedLanguage } from '@/types/settings';

// Initialize services
const translationService = new TranslationService();
const historyService = new HistoryService();
const settingsService = new SettingsService();

// Active translation requests (for cancellation)
const activeRequests = new Map<string, AbortController>();

// Initialize retry config from settings
async function initializeServices(): Promise<void> {
  const settings = await settingsService.getSettings();
  translationService.setRetryConfig({
    maxRetries: settings.retryCount,
    retryInterval: settings.retryInterval,
  });
  historyService.setMaxItems(settings.historyMaxItems);
}

// Initialize on script load
void initializeServices();

// Message handler - Firefox requires returning a Promise for async responses
browser.runtime.onMessage.addListener((
  message: ExtensionMessage,
  _sender: browser.runtime.MessageSender
): Promise<unknown> | undefined => {
  // Return a Promise for async handling (Firefox WebExtension pattern)
  return handleMessage(message).catch((error: unknown) => {
    console.error('Message handler error:', error);
    return { error: String(error) };
  });
});

async function handleMessage(
  message: ExtensionMessage
): Promise<unknown> {
  switch (message.type) {
    case 'TRANSLATE_TEXT':
      return handleTranslateText(message);

    case 'TRANSLATE_PAGE':
      return handleTranslatePage(message);

    case 'CANCEL_TRANSLATION':
      handleCancelTranslation(message.payload.requestId);
      return { success: true };

    case 'GET_SETTINGS':
      return handleGetSettings();

    case 'SAVE_SETTINGS':
      return handleSaveSettings(message.payload.settings);

    case 'GET_HISTORY':
      return handleGetHistory(message.payload);

    case 'CLEAR_HISTORY':
      return handleClearHistory();

    default:
      console.warn('Unknown message type:', message.type);
      return { error: 'Unknown message type' };
  }
}

async function handleTranslateText(
  message: TranslateTextMessage
): Promise<unknown> {
  const { requestId, text, sourceLanguage, targetLanguage, profileId, stream } =
    message.payload;

  // Create abort controller for this request
  const abortController = new AbortController();
  activeRequests.set(requestId, abortController);

  try {
    const settings = await settingsService.getSettings();
    const effectiveProfileId = profileId || settings.activeProfileId;
    const profile = settings.profiles.find((p) => p.id === effectiveProfileId) ?? settings.profiles[0];

    if (!profile) {
      throw new Error('Profile not found');
    }

    // Update retry config
    translationService.setRetryConfig({
      maxRetries: settings.retryCount,
      retryInterval: settings.retryInterval,
    });

    if (stream && settings.streamingEnabled) {
      // Streaming translation
      await translationService.translateStreaming(
        text,
        sourceLanguage,
        targetLanguage,
        profile,
        abortController.signal,
        (chunk, accumulated) => {
          // Send streaming chunk to all listeners (sidebar, content script)
          void browser.runtime.sendMessage({
            type: 'TRANSLATE_TEXT_STREAM_CHUNK',
            timestamp: Date.now(),
            payload: { requestId, chunk, accumulated },
          }).catch(() => {
            // Ignore errors when sending to contexts that may not be listening
          });
        }
      );

      // Get final result
      const result = translationService.getLastResult();
      if (result) {
        // Save to history if enabled
        if (settings.historyEnabled) {
          await historyService.addItem({
            id: requestId,
            sourceText: text,
            translatedText: result,
            sourceLanguage,
            targetLanguage,
            timestamp: Date.now(),
            profileId: profile.id,
          });
        }

        const response = {
          type: 'TRANSLATE_TEXT_STREAM_END',
          timestamp: Date.now(),
          payload: {
            id: crypto.randomUUID(),
            requestId,
            translatedText: result,
            sourceText: text,
            sourceLanguage,
            targetLanguage,
            timestamp: Date.now(),
            duration: 0,
            fromCache: false,
          },
        };

        // Also broadcast to all contexts
        void browser.runtime.sendMessage(response).catch(() => {
          // Ignore errors when sending to contexts that may not be listening
        });

        return response;
      }
      return { success: true };
    } else {
      // Non-streaming translation
      const result = await translationService.translate(
        text,
        sourceLanguage,
        targetLanguage,
        profile,
        abortController.signal
      );

      // Save to history if enabled
      if (settings.historyEnabled) {
        await historyService.addItem({
          id: requestId,
          sourceText: text,
          translatedText: result.translatedText,
          sourceLanguage,
          targetLanguage,
          timestamp: Date.now(),
          profileId: profile.id,
        });
      }

      const response = {
        type: 'TRANSLATE_TEXT_RESULT',
        timestamp: Date.now(),
        payload: result,
      };

      // Also broadcast to all contexts
      void browser.runtime.sendMessage(response).catch(() => {
        // Ignore errors when sending to contexts that may not be listening
      });

      return response;
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        type: 'TRANSLATE_TEXT_ERROR',
        payload: {
          requestId,
          code: 'CANCELLED',
          message: 'Translation was cancelled',
          timestamp: Date.now(),
        },
      };
    } else {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Translation error:', error);
      return {
        type: 'TRANSLATE_TEXT_ERROR',
        payload: {
          requestId,
          code: 'API_ERROR',
          message: errorMessage,
          details: String(error),
          timestamp: Date.now(),
        },
      };
    }
  } finally {
    activeRequests.delete(requestId);
  }
}

async function handleTranslatePage(
  message: TranslatePageMessage
): Promise<unknown> {
  const { requestId, targetLanguage, profileId } = message.payload;

  // Create abort controller
  const abortController = new AbortController();
  activeRequests.set(requestId, abortController);

  try {
    const settings = await settingsService.getSettings();
    const effectiveProfileId = profileId || settings.activeProfileId;
    const profile = settings.profiles.find((p) => p.id === effectiveProfileId) ?? settings.profiles[0];

    if (!profile) {
      throw new Error('Profile not found');
    }

    // Get active tab
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (!tab?.id) {
      throw new Error('No active tab');
    }

    // Request text nodes from content script
    const contentResponse = await browser.tabs.sendMessage(tab.id, {
      type: 'GET_PAGE_TEXT_NODES',
      timestamp: Date.now(),
    }) as { texts: string[]; nodeIds: string[] };

    if (!contentResponse?.texts || contentResponse.texts.length === 0) {
      return {
        type: 'TRANSLATE_PAGE_COMPLETE',
        timestamp: Date.now(),
        payload: {
          requestId,
          translatedNodes: 0,
          duration: 0,
        },
      };
    }

    const startTime = Date.now();
    const totalNodes = contentResponse.texts.length;

    // Translate in batches
    const translatedTexts = await translationService.translateBatch(
      contentResponse.texts,
      'auto' as SupportedLanguage,
      targetLanguage,
      profile,
      abortController.signal,
      (completed, total, _result) => {
        // Send progress update
        void browser.runtime.sendMessage({
          type: 'TRANSLATE_PAGE_PROGRESS',
          timestamp: Date.now(),
          payload: {
            totalNodes: total,
            translatedNodes: completed,
            currentNodeIndex: completed,
            status: 'translating',
            errors: [],
          },
        }).catch(() => {
          // Ignore errors when sending to contexts that may not be listening
        });
      }
    );

    // Send translated texts back to content script
    await browser.tabs.sendMessage(tab.id, {
      type: 'APPLY_PAGE_TRANSLATION',
      timestamp: Date.now(),
      payload: {
        nodeIds: contentResponse.nodeIds,
        translatedTexts,
      },
    });

    return {
      type: 'TRANSLATE_PAGE_COMPLETE',
      timestamp: Date.now(),
      payload: {
        requestId,
        translatedNodes: totalNodes,
        duration: Date.now() - startTime,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Page translation error:', error);
    return {
      type: 'TRANSLATE_PAGE_ERROR',
      payload: {
        requestId,
        code: 'API_ERROR',
        message: errorMessage,
        details: String(error),
        timestamp: Date.now(),
      },
    };
  } finally {
    activeRequests.delete(requestId);
  }
}

function handleCancelTranslation(requestId: string): void {
  const controller = activeRequests.get(requestId);
  if (controller) {
    controller.abort();
    activeRequests.delete(requestId);
  }
}

async function handleGetSettings(): Promise<unknown> {
  const settings = await settingsService.getSettings();
  return { settings };
}

async function handleSaveSettings(
  partialSettings: Partial<Settings>
): Promise<unknown> {
  await settingsService.updateSettings(partialSettings);
  const settings = await settingsService.getSettings();

  // Update service configs
  translationService.setRetryConfig({
    maxRetries: settings.retryCount,
    retryInterval: settings.retryInterval,
  });
  historyService.setMaxItems(settings.historyMaxItems);

  // Notify all contexts about settings update
  void browser.runtime.sendMessage({
    type: 'SETTINGS_UPDATED',
    timestamp: Date.now(),
    payload: { settings },
  }).catch(() => {
    // Ignore errors when sending to contexts that may not be listening
  });

  return { success: true, settings };
}

async function handleGetHistory(
  payload: { limit?: number; offset?: number }
): Promise<unknown> {
  const items = await historyService.getItems(payload.limit, payload.offset);
  const total = await historyService.getCount();
  return { items, total };
}

async function handleClearHistory(): Promise<unknown> {
  await historyService.clear();
  return { success: true };
}

// Context menu setup
browser.contextMenus.create({
  id: 'translate-selection',
  title: '選択テキストを翻訳',
  contexts: ['selection'],
});

browser.contextMenus.create({
  id: 'translate-page',
  title: 'ページ全体を翻訳',
  contexts: ['page'],
});

browser.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) {
    return;
  }

  if (info.menuItemId === 'translate-selection' && info.selectionText) {
    // Send selected text for translation
    void browser.runtime.sendMessage({
      type: 'TRANSLATE_TEXT',
      timestamp: Date.now(),
      payload: {
        requestId: crypto.randomUUID(),
        text: info.selectionText,
        sourceLanguage: 'auto',
        targetLanguage: 'Japanese',
        profileId: '',
        stream: true,
      },
    });
  } else if (info.menuItemId === 'translate-page') {
    // Send message to background to handle page translation
    void handleTranslatePage({
      type: 'TRANSLATE_PAGE',
      timestamp: Date.now(),
      payload: {
        requestId: crypto.randomUUID(),
        targetLanguage: 'Japanese',
        profileId: '',
      },
    });
  }
});

// Keyboard shortcut handling
browser.commands.onCommand.addListener((command) => {
  if (command === 'translate-selection') {
    // Get active tab and send message to content script
    void browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      const tab = tabs[0];
      if (tab?.id) {
        void browser.tabs.sendMessage(tab.id, {
          type: 'GET_SELECTION',
          timestamp: Date.now(),
        });
      }
    });
  } else if (command === 'toggle-sidebar') {
    void browser.sidebarAction.toggle();
  }
});

// Browser action (toolbar button) click handler
browser.browserAction?.onClicked?.addListener(() => {
  void browser.runtime.openOptionsPage();
});

console.info('Local Translate AI background script loaded');
