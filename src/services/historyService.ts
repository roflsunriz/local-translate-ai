/**
 * History Service - Manages translation history in browser storage
 */

import type { TranslationHistoryItem } from '@/types/translation';

const STORAGE_KEY = 'translation_history';
const DEFAULT_MAX_ITEMS = 100;

export class HistoryService {
  private maxItems: number;

  constructor(maxItems: number = DEFAULT_MAX_ITEMS) {
    this.maxItems = maxItems;
  }

  async getItems(limit?: number, offset?: number): Promise<TranslationHistoryItem[]> {
    const result = await browser.storage.local.get(STORAGE_KEY);
    const items = (result[STORAGE_KEY] as TranslationHistoryItem[] | undefined) ?? [];

    const start = offset ?? 0;
    const end = limit ? start + limit : undefined;

    return items.slice(start, end);
  }

  async getCount(): Promise<number> {
    const result = await browser.storage.local.get(STORAGE_KEY);
    const items = (result[STORAGE_KEY] as TranslationHistoryItem[] | undefined) ?? [];
    return items.length;
  }

  async addItem(item: TranslationHistoryItem): Promise<void> {
    const result = await browser.storage.local.get(STORAGE_KEY);
    const items = (result[STORAGE_KEY] as TranslationHistoryItem[] | undefined) ?? [];

    // Add new item at the beginning
    items.unshift(item);

    // Trim to max items
    if (items.length > this.maxItems) {
      items.splice(this.maxItems);
    }

    await browser.storage.local.set({ [STORAGE_KEY]: items });
  }

  async removeItem(id: string): Promise<void> {
    const result = await browser.storage.local.get(STORAGE_KEY);
    const items = (result[STORAGE_KEY] as TranslationHistoryItem[] | undefined) ?? [];

    const filtered = items.filter((item) => item.id !== id);
    await browser.storage.local.set({ [STORAGE_KEY]: filtered });
  }

  async clear(): Promise<void> {
    await browser.storage.local.remove(STORAGE_KEY);
  }

  setMaxItems(maxItems: number): void {
    this.maxItems = maxItems;
  }
}

