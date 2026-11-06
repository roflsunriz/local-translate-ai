import { useTranslation } from '@/hooks/useTranslation';
import { useSettingsStore } from '@/stores';
import { PLAMO2_SYSTEM_PROMPT, PLAMO2_USER_PROMPT_TEMPLATE, GENERAL_USER_PROMPT_TEMPLATE } from '@/types/settings';

import type { ApiType, Plamo3Form } from '@/types/settings';

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

  const handleUpdatePrompt = (
    field: 'systemPrompt' | 'userPromptTemplate',
    value: string
  ) => {
    updateProfile(activeProfile.id, { [field]: value });
  };

  const handleResetSystemPrompt = () => {
    updateProfile(activeProfile.id, { systemPrompt: PLAMO2_SYSTEM_PROMPT });
  };

  const handleResetUserPrompt = () => {
    updateProfile(activeProfile.id, { userPromptTemplate: PLAMO2_USER_PROMPT_TEMPLATE });
  };

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="prompt-api-type" className="mb-1 block text-sm font-medium"
          style={{ color: 'var(--color-text-secondary)' }}>
          {t('settings.api.apiType')}
        </label>
        <select
          id="prompt-api-type"
          value={activeProfile.apiType}
          onChange={(e) => { updateProfile(activeProfile.id, { apiType: e.target.value as ApiType }); }}
          className="w-full rounded-md border px-3 py-2 text-sm"
          style={{
            backgroundColor: 'var(--color-bg-tertiary)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
        >
          <option value="plamo3">{t('settings.api.apiTypePlamo3')}</option>
          <option value="openai">{t('settings.api.apiTypeOpenAI')}</option>
          <option value="anthropic">{t('settings.api.apiTypeAnthropic')}</option>
        </select>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {activeProfile.apiType === 'plamo3'
            ? t('settings.prompt.plamo3Description')
            : t('settings.prompt.genericDescription')}
        </p>
      </div>

      {activeProfile.apiType === 'plamo3' && (
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
      )}

      {activeProfile.apiType !== 'plamo3' &&
        (activeProfile.systemPrompt === PLAMO2_SYSTEM_PROMPT ||
          activeProfile.userPromptTemplate === PLAMO2_USER_PROMPT_TEMPLATE) && (
        <p id="prompt-plamo2-hint" className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {t('settings.prompt.plamo2Hint')}
        </p>
      )}

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <label
            htmlFor="prompt-system"
            className="text-sm font-medium"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('settings.prompt.systemPrompt')}
          </label>
          <div className="flex flex-wrap gap-3">
            <button id="prompt-clear-system" onClick={() => { handleUpdatePrompt('systemPrompt', ''); }}
              className="text-xs transition-colors hover:underline" style={{ color: 'var(--color-accent)' }}>
              {t('common.clear')}
            </button>
            <button id="prompt-plamo2-system" onClick={handleResetSystemPrompt}
              className="text-xs transition-colors hover:underline" style={{ color: 'var(--color-accent)' }}>
              {t('settings.prompt.plamo2Default')}
            </button>
          </div>
        </div>
        <textarea
          id="prompt-system"
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
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <label
            htmlFor="prompt-user"
            className="text-sm font-medium"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('settings.prompt.userPrompt')}
          </label>
          <div className="flex flex-wrap gap-3">
            <button id="prompt-general-template"
              onClick={() => { handleUpdatePrompt('userPromptTemplate', GENERAL_USER_PROMPT_TEMPLATE); }}
              className="text-xs transition-colors hover:underline" style={{ color: 'var(--color-accent)' }}>
              {t('settings.prompt.generalTemplate')}
            </button>
            <button id="prompt-plamo2-template" onClick={handleResetUserPrompt}
              className="text-xs transition-colors hover:underline" style={{ color: 'var(--color-accent)' }}>
              {t('settings.prompt.plamo2Default')}
            </button>
          </div>
        </div>
        <textarea
          id="prompt-user"
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
              {'{{source_language_zh}}'}
            </code>{' '}
            - {t('settings.prompt.variableSourceChinese')}
          </li>
          <li>
            <code className="rounded bg-[var(--color-bg-secondary)] px-1">
              {'{{target_language_zh}}'}
            </code>{' '}
            - {t('settings.prompt.variableTargetChinese')}
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
