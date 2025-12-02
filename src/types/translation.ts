/**
 * Translation-related types
 */

import type { SupportedLanguage } from './settings';

export type TranslationStatus =
  | 'idle'
  | 'translating'
  | 'streaming'
  | 'completed'
  | 'error'
  | 'cancelled';

export interface TranslationRequest {
  id: string;
  sourceText: string;
  sourceLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
  profileId: string;
  timestamp: number;
}

export interface TranslationResult {
  id: string;
  requestId: string;
  translatedText: string;
  sourceText: string;
  sourceLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
  timestamp: number;
  duration: number;
  fromCache: boolean;
}

export interface TranslationError {
  requestId: string;
  code: TranslationErrorCode;
  message: string;
  details?: unknown;
  timestamp: number;
}

export type TranslationErrorCode =
  | 'API_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'INVALID_RESPONSE'
  | 'UNKNOWN_ERROR';

export interface TranslationHistoryItem {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
  timestamp: number;
  profileId: string;
}

export interface TranslationCache {
  key: string;
  sourceText: string;
  translatedText: string;
  sourceLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
  profileId: string;
  timestamp: number;
  expiresAt: number;
}

export interface PageTranslationProgress {
  totalNodes: number;
  translatedNodes: number;
  currentNodeIndex: number;
  status: TranslationStatus;
  errors: TranslationError[];
}

