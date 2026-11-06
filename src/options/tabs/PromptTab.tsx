import { useTranslation } from '@/hooks/useTranslation';
import { useSettingsStore } from '@/stores';
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_USER_PROMPT_TEMPLATE } from '@/types/settings';

import type { Plamo3Form } from '@/types/settings';

export function PromptTab() {
  const { t } = useTranslation();
  const { updateProfile, getActiveProfile } = useSettingsStore();
  const activeProfile = getActiveProfile();

  if (!activeProfile) {
    return (
      <div style={{ color: 'var(--color-text-muted)' }}>
        {t('settings.api.currentProfile')}: N/A
      </div>
    );
  }

  if (activeProfile.apiType === 'plamo3') {
    return (
      <div className="space-y-4">
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {t('settings.prompt.plamo3Description')}
        </p>
        <div>
          <label htmlFor="plamo3-form" className="mb-1 block text-sm font-medium"
            style={{ color: 'var(--color-text-secondary)' }}>
            {t('settings.prompt.plamo3Form')}
          </label>
          <select
            id="plamo3-form"
            value={activeProfile.plamo3Form ?? 'plain'}
            onChange={(e) => { updateProfile(activeProfile.id, { plamo3Form: e.target.value as Plamo3Form }); }}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          >
            <option value="auto">{t('settings.prompt.plamo3FormAuto')}</option>
            <option value="plain">{t('settings.prompt.plamo3FormPlain')}</option>
            <option value="polite">{t('settings.prompt.plamo3FormPolite')}</option>
          </select>
        </div>
      </div>
    );
  }

  const handleUpdatePrompt = (
    field: 'systemPrompt' | 'userPromptTemplate',
    value: string
  ) => {
    updateProfile(activeProfile.id, { [field]: value });
  };

  const handleResetSystemPrompt = () => {
    updateProfile(activeProfile.id, { systemPrompt: DEFAULT_SYSTEM_PROMPT });
  };

  const handleResetUserPrompt = () => {
    updateProfile(activeProfile.id, { userPromptTemplate: DEFAULT_USER_PROMPT_TEMPLATE });
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label
            className="text-sm font-medium"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('settings.prompt.systemPrompt')}
          </label>
          <button
            onClick={handleResetSystemPrompt}
            className="text-xs transition-colors hover:underline"
            style={{ color: 'var(--color-accent)' }}
          >
            {t('settings.prompt.resetToDefault')}
          </button>
        </div>
        <textarea
          value={activeProfile.systemPrompt}
          onChange={(e) => { handleUpdatePrompt('systemPrompt', e.target.value); }}
          rows={4}
          className="w-full rounded-md border px-3 py-2 text-sm"
          style={{
            backgroundColor: 'var(--color-bg-tertiary)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label
            className="text-sm font-medium"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('settings.prompt.userPrompt')}
          </label>
          <button
            onClick={handleResetUserPrompt}
            className="text-xs transition-colors hover:underline"
            style={{ color: 'var(--color-accent)' }}
          >
            {t('settings.prompt.resetToDefault')}
          </button>
        </div>
        <textarea
          value={activeProfile.userPromptTemplate}
          onChange={(e) => { handleUpdatePrompt('userPromptTemplate', e.target.value); }}
          rows={8}
          className="w-full rounded-md border px-3 py-2 font-mono text-sm"
          style={{
            backgroundColor: 'var(--color-bg-tertiary)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
        />
      </div>

      <div
        className="rounded-md p-4"
        style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
      >
        <h4
          className="mb-2 text-sm font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {t('settings.prompt.variables')}
        </h4>
        <ul
          className="list-inside list-disc space-y-1 text-sm"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <li>
            <code className="rounded bg-[var(--color-bg-secondary)] px-1">
              {'{{source_language}}'}
            </code>{' '}
            - {t('settings.prompt.variableSource')}
          </li>
          <li>
            <code className="rounded bg-[var(--color-bg-secondary)] px-1">
              {'{{target_language}}'}
            </code>{' '}
            - {t('settings.prompt.variableTarget')}
          </li>
          <li>
            <code className="rounded bg-[var(--color-bg-secondary)] px-1">
              {'{{input_text}}'}
            </code>{' '}
            - {t('settings.prompt.variableInput')}
          </li>
          <li>
            <code className="rounded bg-[var(--color-bg-secondary)] px-1">
              {'{{output_text}}'}
            </code>{' '}
            - {t('settings.prompt.variableOutput')}
          </li>
        </ul>
      </div>
    </div>
  );
}
