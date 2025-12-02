/**
 * Background Script - Handles API communication, caching, and message routing
 */

import { HistoryService } from '@/services/historyService';
import { SettingsService } from '@/services/settingsService';
import { TranslationService } from '@/services/translationService';

import type { ExtensionMessage, TranslateTextMessage } from '@/types/messages';
import type { Settings } from '@/types/settings';

// Initialize services
const translationService = new TranslationService();
const historyService = new HistoryService();
const settingsService = new SettingsService();

// Active translation requests (for cancellation)
const activeRequests = new Map<string, AbortController>();

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
    const profile = settings.profiles.find((p) => p.id === profileId);

    if (!profile) {
      throw new Error('Profile not found');
    }

    if (stream && settings.streamingEnabled) {
      // Streaming translation
      await translationService.translateStreaming(
        text,
        sourceLanguage,
        targetLanguage,
        profile,
        abortController.signal,
        (chunk, accumulated) => {
          // Send streaming chunk to sidebar
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
        // Save to history
        await historyService.addItem({
          id: requestId,
          sourceText: text,
          translatedText: result,
          sourceLanguage,
          targetLanguage,
          timestamp: Date.now(),
          profileId,
        });

        sendResponse({
          type: 'TRANSLATE_TEXT_STREAM_END',
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
        });
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

      // Save to history
      await historyService.addItem({
        id: requestId,
        sourceText: text,
        translatedText: result.translatedText,
        sourceLanguage,
        targetLanguage,
        timestamp: Date.now(),
        profileId,
      });

      sendResponse({
        type: 'TRANSLATE_TEXT_RESULT',
        payload: result,
      });
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
    // Send selected text to sidebar for translation
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
    // Send message to content script to translate page
    void browser.tabs.sendMessage(tab.id, {
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

console.info('Local Translate AI background script loaded');

