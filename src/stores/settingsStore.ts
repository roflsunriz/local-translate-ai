/**
 * Settings store using Zustand
 */

import { create } from 'zustand';

import type {
  Settings,
  TranslationProfile,
  ExclusionPattern,
  ThemeMode,
  UILanguage,
} from '@/types/settings';
import { DEFAULT_SETTINGS } from '@/types/settings';

interface SettingsState {
  settings: Settings;
  isLoading: boolean;
  error: string | null;

  // Actions
  setSettings: (settings: Settings) => void;
  updateSettings: (partial: Partial<Settings>) => void;
  resetSettings: () => void;

  // Profile actions
  addProfile: (profile: TranslationProfile) => void;
  updateProfile: (id: string, updates: Partial<TranslationProfile>) => void;
  deleteProfile: (id: string) => void;
  setActiveProfile: (id: string) => void;
  getActiveProfile: () => TranslationProfile | undefined;

  // Exclusion pattern actions
  addExclusionPattern: (pattern: ExclusionPattern) => void;
  updateExclusionPattern: (id: string, updates: Partial<ExclusionPattern>) => void;
  deleteExclusionPattern: (id: string) => void;
  toggleExclusionPattern: (id: string) => void;

  // Theme actions
  setTheme: (mode: ThemeMode) => void;
  setUILanguage: (language: UILanguage) => void;

  // Loading state
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Persistence
  loadFromStorage: () => Promise<void>;
  saveToStorage: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isLoading: false,
  error: null,

  setSettings: (settings) => {
    set({ settings });
  },

  updateSettings: (partial) => {
    set((state) => ({
      settings: { ...state.settings, ...partial },
    }));
  },

  resetSettings: () => {
    set({ settings: DEFAULT_SETTINGS });
  },

  addProfile: (profile) => {
    set((state) => ({
      settings: {
        ...state.settings,
        profiles: [...state.settings.profiles, profile],
      },
    }));
  },

  updateProfile: (id, updates) => {
    set((state) => ({
      settings: {
        ...state.settings,
        profiles: state.settings.profiles.map((p) =>
          p.id === id ? { ...p, ...updates } : p
        ),
      },
    }));
  },

  deleteProfile: (id) => {
    const { settings } = get();
    if (settings.profiles.length <= 1) {
      set({ error: 'Cannot delete the last profile' });
      return;
    }
    if (settings.activeProfileId === id) {
      const firstOther = settings.profiles.find((p) => p.id !== id);
      if (firstOther) {
        set((state) => ({
          settings: {
            ...state.settings,
            activeProfileId: firstOther.id,
            profiles: state.settings.profiles.filter((p) => p.id !== id),
          },
        }));
        return;
      }
    }
    set((state) => ({
      settings: {
        ...state.settings,
        profiles: state.settings.profiles.filter((p) => p.id !== id),
      },
    }));
  },

  setActiveProfile: (id) => {
    set((state) => ({
      settings: { ...state.settings, activeProfileId: id },
    }));
  },

  getActiveProfile: () => {
    const { settings } = get();
    return settings.profiles.find((p) => p.id === settings.activeProfileId);
  },

  addExclusionPattern: (pattern) => {
    set((state) => ({
      settings: {
        ...state.settings,
        exclusionPatterns: [...state.settings.exclusionPatterns, pattern],
      },
    }));
  },

  updateExclusionPattern: (id, updates) => {
    set((state) => ({
      settings: {
        ...state.settings,
        exclusionPatterns: state.settings.exclusionPatterns.map((p) =>
          p.id === id ? { ...p, ...updates } : p
        ),
      },
    }));
  },

  deleteExclusionPattern: (id) => {
    set((state) => ({
      settings: {
        ...state.settings,
        exclusionPatterns: state.settings.exclusionPatterns.filter(
          (p) => p.id !== id
        ),
      },
    }));
  },

  toggleExclusionPattern: (id) => {
    set((state) => ({
      settings: {
        ...state.settings,
        exclusionPatterns: state.settings.exclusionPatterns.map((p) =>
          p.id === id ? { ...p, enabled: !p.enabled } : p
        ),
      },
    }));
  },

  setTheme: (mode) => {
    set((state) => ({
      settings: { ...state.settings, themeMode: mode },
    }));
  },

  setUILanguage: (language) => {
    set((state) => ({
      settings: { ...state.settings, uiLanguage: language },
    }));
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  setError: (error) => {
    set({ error });
  },

  loadFromStorage: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await browser.storage.local.get('settings');
      if (result['settings']) {
        const stored = result['settings'] as Partial<Settings>;
        set((state) => ({
          settings: { ...state.settings, ...stored },
          isLoading: false,
        }));
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load settings';
      set({ error: message, isLoading: false });
    }
  },

  saveToStorage: async () => {
    const { settings } = get();
    try {
      await browser.storage.local.set({ settings });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save settings';
      set({ error: message });
    }
  },
}));

