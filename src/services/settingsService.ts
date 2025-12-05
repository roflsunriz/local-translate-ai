/**
 * Settings Service - Manages extension settings in browser storage
 * API keys are encrypted before storage and decrypted on retrieval
 */

import type { Settings } from '@/types/settings';
import { DEFAULT_SETTINGS } from '@/types/settings';

import { encrypt, decrypt, isEncrypted } from './cryptoService';

const STORAGE_KEY = 'settings';

export class SettingsService {
  private cachedSettings: Settings | null = null;

  /**
   * Get settings with decrypted API keys
   */
  async getSettings(): Promise<Settings> {
    if (this.cachedSettings) {
      return this.cachedSettings;
    }

    const result = await browser.storage.local.get(STORAGE_KEY);
    const stored = result[STORAGE_KEY] as Partial<Settings> | undefined;

    let settings: Settings;
    if (stored) {
      // Merge with defaults to ensure all fields exist
      settings = { ...DEFAULT_SETTINGS, ...stored };
    } else {
      settings = { ...DEFAULT_SETTINGS };
    }

    // Decrypt API keys in profiles
    const profilesWithDefaults = settings.profiles.map((profile) => ({
      ...profile,
      apiType: profile.apiType ?? 'openai',
    }));

    settings.profiles = await Promise.all(
      profilesWithDefaults.map(async (profile) => ({
        ...profile,
        apiKey: await this.decryptApiKey(profile.apiKey),
      }))
    );

    this.cachedSettings = settings;
    return this.cachedSettings;
  }

  /**
   * Update settings with encrypted API keys
   */
  async updateSettings(partial: Partial<Settings>): Promise<Settings> {
    const current = await this.getSettings();
    let updated = { ...current, ...partial };

    // If profiles are being updated, encrypt API keys before storage
    if (partial.profiles) {
      const profilesWithDefaults = partial.profiles.map((profile) => ({
        ...profile,
        apiType: profile.apiType ?? 'openai',
      }));

      updated.profiles = await Promise.all(
        profilesWithDefaults.map(async (profile) => ({
          ...profile,
          apiKey: await this.encryptApiKey(profile.apiKey),
        }))
      );
    }

    // Store with encrypted keys
    await browser.storage.local.set({ [STORAGE_KEY]: updated });

    // Cache with decrypted keys for runtime use
    if (partial.profiles) {
      updated.profiles = await Promise.all(
        updated.profiles.map(async (profile) => ({
          ...profile,
          apiType: profile.apiType ?? 'openai',
          apiKey: await this.decryptApiKey(profile.apiKey),
        }))
      );
    }

    this.cachedSettings = updated;
    return this.cachedSettings;
  }

  /**
   * Reset settings to defaults (API keys will be encrypted on next save)
   */
  async resetSettings(): Promise<Settings> {
    // Encrypt default API keys before storage
    const settingsToStore: Settings = {
      ...DEFAULT_SETTINGS,
      profiles: await Promise.all(
        DEFAULT_SETTINGS.profiles.map(async (profile) => ({
          ...profile,
          apiKey: await this.encryptApiKey(profile.apiKey),
        }))
      ),
    };

    await browser.storage.local.set({ [STORAGE_KEY]: settingsToStore });

    // Return with decrypted keys for runtime use
    this.cachedSettings = { ...DEFAULT_SETTINGS };
    return this.cachedSettings;
  }

  /**
   * Clear the cached settings
   */
  clearCache(): void {
    this.cachedSettings = null;
  }

  /**
   * Encrypt an API key if not already encrypted
   */
  private async encryptApiKey(apiKey: string): Promise<string> {
    // Don't encrypt empty keys
    if (!apiKey) {
      return apiKey;
    }

    // Don't re-encrypt already encrypted keys
    if (isEncrypted(apiKey)) {
      return apiKey;
    }

    try {
      return await encrypt(apiKey);
    } catch (error) {
      console.error('Failed to encrypt API key:', error);
      // Return original on failure (will be encrypted on next save attempt)
      return apiKey;
    }
  }

  /**
   * Decrypt an API key if encrypted
   */
  private async decryptApiKey(apiKey: string): Promise<string> {
    // Don't decrypt empty keys
    if (!apiKey) {
      return apiKey;
    }

    // Only decrypt if it looks encrypted
    if (!isEncrypted(apiKey)) {
      return apiKey;
    }

    try {
      return await decrypt(apiKey);
    } catch (error) {
      console.error('Failed to decrypt API key:', error);
      // Return original on failure (might be legacy unencrypted key)
      return apiKey;
    }
  }
}
