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

// Message handler
browser.runtime.onMessage.addListener((
  message: ExtensionMessage,
  _sender: browser.runtime.MessageSender,
  sendResponse: (response: unknown) => void
): true | undefined => {
  handleMessage(message, sendResponse).catch((error: unknown) => {
    console.error('Message handler error:', error);
  });
  return true; // Keep the message channel open for async response
});

async function handleMessage(
  message: ExtensionMessage,
  sendResponse: (response: unknown) => void
): Promise<void> {
  switch (message.type) {
    case 'TRANSLATE_TEXT':
      await handleTranslateText(message, sendResponse);
      break;

    case 'TRANSLATE_PAGE':
      await handleTranslatePage(message, sendResponse);
      break;

    case 'CANCEL_TRANSLATION':
      handleCancelTranslation(message.payload.requestId);
      sendResponse({ success: true });
      break;

    case 'GET_SETTINGS':
      await handleGetSettings(sendResponse);
      break;

    case 'SAVE_SETTINGS':
      await handleSaveSettings(message.payload.settings, sendResponse);
      break;

    case 'GET_HISTORY':
      await handleGetHistory(message.payload, sendResponse);
      break;

    case 'CLEAR_HISTORY':
      await handleClearHistory(sendResponse);
      break;

    default:
      console.warn('Unknown message type:', message.type);
  }
}

async function handleTranslateText(
  message: TranslateTextMessage,
  sendResponse: (response: unknown) => void
): Promise<void> {
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

        sendResponse(response);

        // Also broadcast to all contexts
        void browser.runtime.sendMessage(response);
      }
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

      sendResponse(response);

      // Also broadcast to all contexts
      void browser.runtime.sendMessage(response);
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      sendResponse({
        type: 'TRANSLATE_TEXT_ERROR',
        payload: {
          requestId,
          code: 'CANCELLED',
          message: 'Translation was cancelled',
          timestamp: Date.now(),
        },
      });
    } else {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Translation error:', error);
      sendResponse({
        type: 'TRANSLATE_TEXT_ERROR',
        payload: {
          requestId,
          code: 'API_ERROR',
          message: errorMessage,
          details: error,
          timestamp: Date.now(),
        },
      });
    }
  } finally {
    activeRequests.delete(requestId);
  }
}

async function handleTranslatePage(
  message: TranslatePageMessage,
  sendResponse: (response: unknown) => void
): Promise<void> {
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
    const response = await browser.tabs.sendMessage(tab.id, {
      type: 'GET_PAGE_TEXT_NODES',
      timestamp: Date.now(),
    }) as { texts: string[]; nodeIds: string[] };

    if (!response?.texts || response.texts.length === 0) {
      sendResponse({
        type: 'TRANSLATE_PAGE_COMPLETE',
        timestamp: Date.now(),
        payload: {
          requestId,
          translatedNodes: 0,
          duration: 0,
        },
      });
      return;
    }

    const startTime = Date.now();
    const totalNodes = response.texts.length;

    // Translate in batches
    const translatedTexts = await translationService.translateBatch(
      response.texts,
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
        });
      }
    );

    // Send translated texts back to content script
    await browser.tabs.sendMessage(tab.id, {
      type: 'APPLY_PAGE_TRANSLATION',
      timestamp: Date.now(),
      payload: {
        nodeIds: response.nodeIds,
        translatedTexts,
      },
    });

    sendResponse({
      type: 'TRANSLATE_PAGE_COMPLETE',
      timestamp: Date.now(),
      payload: {
        requestId,
        translatedNodes: totalNodes,
        duration: Date.now() - startTime,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Page translation error:', error);
    sendResponse({
      type: 'TRANSLATE_PAGE_ERROR',
      payload: {
        requestId,
        code: 'API_ERROR',
        message: errorMessage,
        details: error,
        timestamp: Date.now(),
      },
    });
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

async function handleGetSettings(sendResponse: (response: unknown) => void): Promise<void> {
  const settings = await settingsService.getSettings();
  sendResponse({ settings });
}

async function handleSaveSettings(
  partialSettings: Partial<Settings>,
  sendResponse: (response: unknown) => void
): Promise<void> {
  await settingsService.updateSettings(partialSettings);
  const settings = await settingsService.getSettings();

  // Update service configs
  translationService.setRetryConfig({
    maxRetries: settings.retryCount,
    retryInterval: settings.retryInterval,
  });
  historyService.setMaxItems(settings.historyMaxItems);

  sendResponse({ success: true, settings });

  // Notify all contexts about settings update
  void browser.runtime.sendMessage({
    type: 'SETTINGS_UPDATED',
    timestamp: Date.now(),
    payload: { settings },
  });
}

async function handleGetHistory(
  payload: { limit?: number; offset?: number },
  sendResponse: (response: unknown) => void
): Promise<void> {
  const items = await historyService.getItems(payload.limit, payload.offset);
  const total = await historyService.getCount();
  sendResponse({ items, total });
}

async function handleClearHistory(sendResponse: (response: unknown) => void): Promise<void> {
  await historyService.clear();
  sendResponse({ success: true });
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
    void handleTranslatePage(
      {
        type: 'TRANSLATE_PAGE',
        timestamp: Date.now(),
        payload: {
          requestId: crypto.randomUUID(),
          targetLanguage: 'Japanese',
          profileId: '',
        },
      },
      () => { /* Response handled internally */ }
    );
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
