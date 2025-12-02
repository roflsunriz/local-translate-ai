/**
 * Settings Service - Manages extension settings in browser storage
 */

import type { Settings } from '@/types/settings';
import { DEFAULT_SETTINGS } from '@/types/settings';

const STORAGE_KEY = 'settings';

export class SettingsService {
  private cachedSettings: Settings | null = null;

  async getSettings(): Promise<Settings> {
    if (this.cachedSettings) {
      return this.cachedSettings;
    }

    const result = await browser.storage.local.get(STORAGE_KEY);
    const stored = result[STORAGE_KEY] as Partial<Settings> | undefined;

    if (stored) {
      // Merge with defaults to ensure all fields exist
      this.cachedSettings = { ...DEFAULT_SETTINGS, ...stored };
    } else {
      this.cachedSettings = DEFAULT_SETTINGS;
    }

    return this.cachedSettings;
  }

  async updateSettings(partial: Partial<Settings>): Promise<Settings> {
    const current = await this.getSettings();
    const updated = { ...current, ...partial };

    await browser.storage.local.set({ [STORAGE_KEY]: updated });
    this.cachedSettings = updated;

    return updated;
  }

  async resetSettings(): Promise<Settings> {
    await browser.storage.local.set({ [STORAGE_KEY]: DEFAULT_SETTINGS });
    this.cachedSettings = DEFAULT_SETTINGS;
    return DEFAULT_SETTINGS;
  }

  clearCache(): void {
    this.cachedSettings = null;
  }
}

