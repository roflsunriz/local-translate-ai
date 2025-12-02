/**
 * Translation store using Zustand
 */

import { create } from 'zustand';

import type {
  TranslationStatus,
  TranslationHistoryItem,
  TranslationError,
} from '@/types/translation';
import type { SupportedLanguage } from '@/types/settings';

interface TranslationState {
  // Input/Output
  inputText: string;
  outputText: string;
  streamingText: string;

  // Status
  status: TranslationStatus;
  currentRequestId: string | null;
  error: TranslationError | null;

  // History
  history: TranslationHistoryItem[];
  historyLoading: boolean;

  // Language selection (override profile defaults)
  sourceLanguage: SupportedLanguage | null;
  targetLanguage: SupportedLanguage | null;

  // Actions
  setInputText: (text: string) => void;
  setOutputText: (text: string) => void;
  setStreamingText: (text: string) => void;
  appendStreamingText: (chunk: string) => void;
  clearTexts: () => void;

  // Status actions
  setStatus: (status: TranslationStatus) => void;
  setCurrentRequestId: (id: string | null) => void;
  setError: (error: TranslationError | null) => void;

  // Language actions
  setSourceLanguage: (language: SupportedLanguage | null) => void;
  setTargetLanguage: (language: SupportedLanguage | null) => void;

  // History actions
  setHistory: (items: TranslationHistoryItem[]) => void;
  addToHistory: (item: TranslationHistoryItem) => void;
  clearHistory: () => void;
  setHistoryLoading: (loading: boolean) => void;

  // Translation flow
  startTranslation: (requestId: string) => void;
  completeTranslation: (text: string) => void;
  failTranslation: (error: TranslationError) => void;
  cancelTranslation: () => void;
}

export const useTranslationStore = create<TranslationState>((set, get) => ({
  inputText: '',
  outputText: '',
  streamingText: '',
  status: 'idle',
  currentRequestId: null,
  error: null,
  history: [],
  historyLoading: false,
  sourceLanguage: null,
  targetLanguage: null,

  setInputText: (text) => {
    set({ inputText: text });
  },

  setOutputText: (text) => {
    set({ outputText: text });
  },

  setStreamingText: (text) => {
    set({ streamingText: text });
  },

  appendStreamingText: (chunk) => {
    set((state) => ({
      streamingText: state.streamingText + chunk,
    }));
  },

  clearTexts: () => {
    set({
      inputText: '',
      outputText: '',
      streamingText: '',
      error: null,
      status: 'idle',
      currentRequestId: null,
    });
  },

  setStatus: (status) => {
    set({ status });
  },

  setCurrentRequestId: (id) => {
    set({ currentRequestId: id });
  },

  setError: (error) => {
    set({ error });
  },

  setSourceLanguage: (language) => {
    set({ sourceLanguage: language });
  },

  setTargetLanguage: (language) => {
    set({ targetLanguage: language });
  },

  setHistory: (items) => {
    set({ history: items });
  },

  addToHistory: (item) => {
    set((state) => ({
      history: [item, ...state.history],
    }));
  },

  clearHistory: () => {
    set({ history: [] });
  },

  setHistoryLoading: (loading) => {
    set({ historyLoading: loading });
  },

  startTranslation: (requestId) => {
    set({
      status: 'translating',
      currentRequestId: requestId,
      error: null,
      outputText: '',
      streamingText: '',
    });
  },

  completeTranslation: (text) => {
    const { inputText, sourceLanguage, targetLanguage, currentRequestId } = get();

    // Create history item
    const historyItem: TranslationHistoryItem = {
      id: currentRequestId ?? crypto.randomUUID(),
      sourceText: inputText,
      translatedText: text,
      sourceLanguage: sourceLanguage ?? 'auto',
      targetLanguage: targetLanguage ?? 'Japanese',
      timestamp: Date.now(),
      profileId: '', // Will be set by background script
    };

    set((state) => ({
      status: 'completed',
      outputText: text,
      streamingText: '',
      currentRequestId: null,
      history: [historyItem, ...state.history],
    }));
  },

  failTranslation: (error) => {
    set({
      status: 'error',
      error,
      currentRequestId: null,
      streamingText: '',
    });
  },

  cancelTranslation: () => {
    set({
      status: 'cancelled',
      currentRequestId: null,
      streamingText: '',
    });
  },
}));

