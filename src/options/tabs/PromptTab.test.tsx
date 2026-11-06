import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PromptTab } from './PromptTab';

import { useSettingsStore } from '@/stores/settingsStore';
import { DEFAULT_PROFILE, DEFAULT_SETTINGS } from '@/types/settings';

import type { ApiType } from '@/types/settings';

beforeEach(() => { vi.stubGlobal('navigator', { language: 'en-US' }); });
afterEach(() => {
  useSettingsStore.getState().resetSettings();
  vi.unstubAllGlobals();
});

describe('PromptTab', () => {
  it.each<ApiType>(['plamo3', 'openai', 'anthropic'])(
    'keeps both editable prompt fields and the API selector visible for %s',
    (apiType) => {
      const profile = { ...DEFAULT_PROFILE, apiType, systemPrompt: 'custom system', userPromptTemplate: 'custom {{input_text}}' };
      useSettingsStore.getState().setSettings({ ...DEFAULT_SETTINGS, uiLanguage: 'en', profiles: [profile] });

      const markup = renderToStaticMarkup(<PromptTab />);
      expect(markup).toContain('id="prompt-api-type"');
      expect(markup).toContain('id="prompt-system"');
      expect(markup).toContain('id="prompt-user"');
      expect(markup).toContain('custom system');
      expect(markup).toContain('custom {{input_text}}');
      expect(markup).toContain('id="prompt-general-template"');
      expect(markup).toContain('{{target_language_zh}}');
      if (apiType === 'plamo3') {
        expect(markup).toContain('id="plamo3-form"');
      } else {
        expect(markup).not.toContain('id="plamo3-form"');
      }
    },
  );
});
