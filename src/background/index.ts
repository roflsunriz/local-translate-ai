/**
 * Background Script - Handles API communication, caching, and message routing
 */

import { HistoryService } from '@/services/historyService';
import { SettingsService } from '@/services/settingsService';
import { TranslationService } from '@/services/translationService';
import { applyConversions } from '@/utils/currency';
import { sanitizeAccumulatedResult } from '@/utils/sanitize';

import type { ExtensionMessage, TranslateTextMessage, TranslatePageMessage, DeleteHistoryItemMessage } from '@/types/messages';
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

/**
 * Broadcast message to all contexts (sidebar, options, and content scripts)
 */
async function broadcastMessage(message: unknown): Promise<void> {
  // Send to extension pages (sidebar, options)
  void browser.runtime.sendMessage(message).catch(() => {
    // Ignore errors when no listeners
  });

  // Send to content scripts in all tabs
  try {
    const tabs = await browser.tabs.query({});
    for (const tab of tabs) {
      if (tab.id !== undefined) {
        void browser.tabs.sendMessage(tab.id, message).catch(() => {
          // Ignore errors for tabs without content script
        });
      }
    }
  } catch {
    // Ignore errors querying tabs
  }
}

/**
 * Send message to active tab's content script only
 */
async function sendToActiveTab(message: unknown): Promise<void> {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (tab?.id !== undefined) {
      void browser.tabs.sendMessage(tab.id, message).catch(() => {
        // Ignore errors for tabs without content script
      });
    }
  } catch {
    // Ignore errors querying tabs
  }
}

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

    case 'DELETE_HISTORY_ITEM':
      return handleDeleteHistoryItem((message as DeleteHistoryItemMessage).payload.id);

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

  // Show progress bar on active tab (indeterminate mode for text translation)
  // Also includes translationKind for toast notification
  void sendToActiveTab({
    type: 'SHOW_PROGRESS_BAR',
    timestamp: Date.now(),
    payload: { indeterminate: true, translationKind: 'selection' },
  });

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

    // Build conversion options from settings
    const conversionOptions = {
      usdToJpy: {
        enabled: settings.currencyConversion.enabled,
        rate: settings.currencyConversion.usdToJpyRate,
      },
      paramConversion: {
        enabled: settings.paramConversion?.enabled ?? false,
      },
    };

    if (stream && settings.streamingEnabled) {
      // Streaming translation
      await translationService.translateStreaming(
        text,
        sourceLanguage,
        targetLanguage,
        profile,
        abortController.signal,
        (chunk, accumulated) => {
          // Apply conversions and sanitize accumulated text for display
          const convertedAccumulated = sanitizeAccumulatedResult(
            applyConversions(accumulated, conversionOptions)
          );

          // Send streaming chunk to all listeners (sidebar, content script)
          void broadcastMessage({
            type: 'TRANSLATE_TEXT_STREAM_CHUNK',
            timestamp: Date.now(),
            payload: { requestId, chunk, accumulated: convertedAccumulated },
          });
        }
      );

      // Get final result, apply conversions and sanitize
      const rawResult = translationService.getLastResult();
      const result = rawResult
        ? sanitizeAccumulatedResult(applyConversions(rawResult, conversionOptions))
        : null;
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

        // Hide progress bar
        void sendToActiveTab({
          type: 'HIDE_PROGRESS_BAR',
          timestamp: Date.now(),
        });

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
        void broadcastMessage(response);

        return response;
      }

      // Hide progress bar even if no result
      void sendToActiveTab({
        type: 'HIDE_PROGRESS_BAR',
        timestamp: Date.now(),
      });

      return { success: true };
    } else {
      // Non-streaming translation
      const rawResult = await translationService.translate(
        text,
        sourceLanguage,
        targetLanguage,
        profile,
        abortController.signal
      );

      // Apply conversions and sanitize result
      const convertedText = sanitizeAccumulatedResult(
        applyConversions(rawResult.translatedText, conversionOptions)
      );

      // Save to history if enabled (with converted text)
      if (settings.historyEnabled) {
        await historyService.addItem({
          id: requestId,
          sourceText: text,
          translatedText: convertedText,
          sourceLanguage,
          targetLanguage,
          timestamp: Date.now(),
          profileId: profile.id,
        });
      }

      // Hide progress bar
      void sendToActiveTab({
        type: 'HIDE_PROGRESS_BAR',
        timestamp: Date.now(),
      });

      const response = {
        type: 'TRANSLATE_TEXT_RESULT',
        timestamp: Date.now(),
        payload: {
          ...rawResult,
          translatedText: convertedText,
        },
      };

      // Also broadcast to all contexts
      void broadcastMessage(response);

      return response;
    }
  } catch (error) {
    // Hide progress bar on error
    void sendToActiveTab({
      type: 'HIDE_PROGRESS_BAR',
      timestamp: Date.now(),
    });

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
    const activeTabId = tab.id;

    // Show progress bar (indeterminate until first translation completes) and toast notification
    void browser.tabs.sendMessage(activeTabId, {
      type: 'SHOW_PROGRESS_BAR',
      timestamp: Date.now(),
      payload: { indeterminate: true, translationKind: 'page' },
    }).catch(() => {
      // Ignore errors if content script is not ready
    });

    // Request text nodes from content script
    const contentResponse = await browser.tabs.sendMessage(activeTabId, {
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

    // Build conversion options from settings (same as handleTranslateText)
    const conversionOptions = {
      usdToJpy: {
        enabled: settings.currencyConversion.enabled,
        rate: settings.currencyConversion.usdToJpyRate,
      },
      paramConversion: {
        enabled: settings.paramConversion?.enabled ?? false,
      },
    };

    // Translate with progressive rendering (each node applied immediately after translation)
    const translatedTexts = await translationService.translateBatch(
      contentResponse.texts,
      'auto' as SupportedLanguage,
      targetLanguage,
      profile,
      abortController.signal,
      (completed, total, result) => {
        // Get the nodeId for the just-completed translation
        const nodeId = contentResponse.nodeIds[completed - 1];
        if (nodeId && result) {
          // Apply conversions and sanitize the result before sending to content script
          const convertedResult = applyConversions(result, conversionOptions);
          const sanitizedResult = sanitizeAccumulatedResult(convertedResult);

          // Send single node translation to content script for immediate rendering
          void browser.tabs.sendMessage(activeTabId, {
            type: 'APPLY_SINGLE_NODE_TRANSLATION',
            timestamp: Date.now(),
            payload: {
              nodeId,
              translatedText: sanitizedResult,
              translatedNodes: completed,
              totalNodes: total,
            },
          }).catch(() => {
            // Ignore errors if tab is closed
          });
        }

        // Also send progress update to all contexts
        void broadcastMessage({
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

    // Apply conversions and sanitization to final translated texts
    const processedTexts = translatedTexts.map(text => {
      const converted = applyConversions(text, conversionOptions);
      return sanitizeAccumulatedResult(converted);
    });

    // Send final completion message (all translations already applied progressively)
    await browser.tabs.sendMessage(activeTabId, {
      type: 'APPLY_PAGE_TRANSLATION',
      timestamp: Date.now(),
      payload: {
        nodeIds: contentResponse.nodeIds,
        translatedTexts: processedTexts,
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
    // Hide progress bar on page translation error
    void sendToActiveTab({
      type: 'HIDE_PROGRESS_BAR',
      timestamp: Date.now(),
    });

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

    // Hide progress bar when translation is cancelled
    void sendToActiveTab({
      type: 'HIDE_PROGRESS_BAR',
      timestamp: Date.now(),
    });
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
  void broadcastMessage({
    type: 'SETTINGS_UPDATED',
    timestamp: Date.now(),
    payload: { settings },
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

async function handleDeleteHistoryItem(id: string): Promise<unknown> {
  await historyService.removeItem(id);
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

// Listen for storage changes to clear settings cache
// This ensures settings changes from options page are reflected in background
browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes['settings']) {
    // Clear the settings cache so next getSettings() reads fresh data
    settingsService.clearCache();
    console.info('Settings cache cleared due to storage change');
  }
});

console.info('Local Translate AI background script loaded');
