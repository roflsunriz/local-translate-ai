/**
 * Message types for communication between extension components
 * (Background Script <-> Content Script <-> Sidebar)
 */

import type { Settings, SupportedLanguage } from './settings';
import type { TranslationResult, TranslationError, PageTranslationProgress, TranslationHistoryItem } from './translation';

// Message type discriminators
export type MessageType =
  | 'TRANSLATE_TEXT'
  | 'TRANSLATE_TEXT_RESULT'
  | 'TRANSLATE_TEXT_ERROR'
  | 'TRANSLATE_TEXT_STREAM_CHUNK'
  | 'TRANSLATE_TEXT_STREAM_END'
  | 'TRANSLATE_PAGE'
  | 'TRANSLATE_PAGE_PROGRESS'
  | 'TRANSLATE_PAGE_COMPLETE'
  | 'TRANSLATE_PAGE_ERROR'
  | 'GET_PAGE_TEXT_NODES'
  | 'APPLY_PAGE_TRANSLATION'
  | 'APPLY_SINGLE_NODE_TRANSLATION'
  | 'CANCEL_TRANSLATION'
  | 'GET_SETTINGS'
  | 'GET_SETTINGS_RESULT'
  | 'SAVE_SETTINGS'
  | 'SETTINGS_UPDATED'
  | 'GET_HISTORY'
  | 'GET_HISTORY_RESULT'
  | 'CLEAR_HISTORY'
  | 'TOGGLE_SIDEBAR'
  | 'GET_SELECTION'
  | 'NOTIFICATION'
  | 'SHOW_PROGRESS_BAR'
  | 'HIDE_PROGRESS_BAR';

// Base message interface
export interface BaseMessage {
  type: MessageType;
  timestamp: number;
}

// Translation messages
export interface TranslateTextMessage extends BaseMessage {
  type: 'TRANSLATE_TEXT';
  payload: {
    requestId: string;
    text: string;
    sourceLanguage: SupportedLanguage;
    targetLanguage: SupportedLanguage;
    profileId: string;
    stream: boolean;
  };
}

export interface TranslateTextResultMessage extends BaseMessage {
  type: 'TRANSLATE_TEXT_RESULT';
  payload: TranslationResult;
}

export interface TranslateTextErrorMessage extends BaseMessage {
  type: 'TRANSLATE_TEXT_ERROR';
  payload: TranslationError;
}

export interface TranslateTextStreamChunkMessage extends BaseMessage {
  type: 'TRANSLATE_TEXT_STREAM_CHUNK';
  payload: {
    requestId: string;
    chunk: string;
    accumulated: string;
  };
}

export interface TranslateTextStreamEndMessage extends BaseMessage {
  type: 'TRANSLATE_TEXT_STREAM_END';
  payload: TranslationResult;
}

// Page translation messages
export interface TranslatePageMessage extends BaseMessage {
  type: 'TRANSLATE_PAGE';
  payload: {
    requestId: string;
    targetLanguage: SupportedLanguage;
    profileId: string;
  };
}

export interface TranslatePageProgressMessage extends BaseMessage {
  type: 'TRANSLATE_PAGE_PROGRESS';
  payload: PageTranslationProgress;
}

export interface TranslatePageCompleteMessage extends BaseMessage {
  type: 'TRANSLATE_PAGE_COMPLETE';
  payload: {
    requestId: string;
    translatedNodes: number;
    duration: number;
  };
}

export interface TranslatePageErrorMessage extends BaseMessage {
  type: 'TRANSLATE_PAGE_ERROR';
  payload: TranslationError;
}

export interface ApplySingleNodeTranslationMessage extends BaseMessage {
  type: 'APPLY_SINGLE_NODE_TRANSLATION';
  payload: {
    nodeId: string;
    translatedText: string;
    translatedNodes: number;
    totalNodes: number;
  };
}

// Cancel message
export interface CancelTranslationMessage extends BaseMessage {
  type: 'CANCEL_TRANSLATION';
  payload: {
    requestId: string;
  };
}

// Settings messages
export interface GetSettingsMessage extends BaseMessage {
  type: 'GET_SETTINGS';
}

export interface GetSettingsResultMessage extends BaseMessage {
  type: 'GET_SETTINGS_RESULT';
  payload: {
    settings: Settings;
  };
}

export interface SaveSettingsMessage extends BaseMessage {
  type: 'SAVE_SETTINGS';
  payload: {
    settings: Partial<Settings>;
  };
}

export interface SettingsUpdatedMessage extends BaseMessage {
  type: 'SETTINGS_UPDATED';
  payload: {
    settings: Settings;
  };
}

// History messages
export interface GetHistoryMessage extends BaseMessage {
  type: 'GET_HISTORY';
  payload: {
    limit?: number;
    offset?: number;
  };
}

export interface GetHistoryResultMessage extends BaseMessage {
  type: 'GET_HISTORY_RESULT';
  payload: {
    items: TranslationHistoryItem[];
    total: number;
  };
}

export interface ClearHistoryMessage extends BaseMessage {
  type: 'CLEAR_HISTORY';
}

// UI messages
export interface ToggleSidebarMessage extends BaseMessage {
  type: 'TOGGLE_SIDEBAR';
}

export interface GetSelectionMessage extends BaseMessage {
  type: 'GET_SELECTION';
}

// Notification messages
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface NotificationMessage extends BaseMessage {
  type: 'NOTIFICATION';
  payload: {
    id: string;
    notificationType: NotificationType;
    title: string;
    message: string;
    duration?: number;
  };
}

// Progress bar messages
export type TranslationKind = 'page' | 'selection';

export interface ShowProgressBarMessage extends BaseMessage {
  type: 'SHOW_PROGRESS_BAR';
  payload: {
    indeterminate: boolean;
    /** Type of translation for toast notification */
    translationKind?: TranslationKind | undefined;
  };
}

export interface HideProgressBarMessage extends BaseMessage {
  type: 'HIDE_PROGRESS_BAR';
}

// Union type for all messages
export type ExtensionMessage =
  | TranslateTextMessage
  | TranslateTextResultMessage
  | TranslateTextErrorMessage
  | TranslateTextStreamChunkMessage
  | TranslateTextStreamEndMessage
  | TranslatePageMessage
  | TranslatePageProgressMessage
  | TranslatePageCompleteMessage
  | TranslatePageErrorMessage
  | ApplySingleNodeTranslationMessage
  | CancelTranslationMessage
  | GetSettingsMessage
  | GetSettingsResultMessage
  | SaveSettingsMessage
  | SettingsUpdatedMessage
  | GetHistoryMessage
  | GetHistoryResultMessage
  | ClearHistoryMessage
  | ToggleSidebarMessage
  | GetSelectionMessage
  | NotificationMessage
  | ShowProgressBarMessage
  | HideProgressBarMessage;

// Type guard helpers
export function isTranslateTextMessage(msg: ExtensionMessage): msg is TranslateTextMessage {
  return msg.type === 'TRANSLATE_TEXT';
}

export function isTranslateTextResultMessage(msg: ExtensionMessage): msg is TranslateTextResultMessage {
  return msg.type === 'TRANSLATE_TEXT_RESULT';
}

export function isTranslateTextErrorMessage(msg: ExtensionMessage): msg is TranslateTextErrorMessage {
  return msg.type === 'TRANSLATE_TEXT_ERROR';
}

export function isNotificationMessage(msg: ExtensionMessage): msg is NotificationMessage {
  return msg.type === 'NOTIFICATION';
}
