import { useState } from 'react';

import { Button } from '@/components/Button';
import { LanguageSelector } from '@/components/LanguageSelector';
import { useTranslation } from '@/hooks/useTranslation';
import { useSettingsStore, useUIStore } from '@/stores';
import { DEFAULT_PROFILE } from '@/types/settings';

import type { ApiType, TranslationProfile, SupportedLanguage } from '@/types/settings';

export function ApiTab() {
  const { t } = useTranslation();
  const { settings, addProfile, updateProfile, deleteProfile, setActiveProfile } =
    useSettingsStore();
  const { showSuccess, showError } = useUIStore();
  const [editingProfile, setEditingProfile] = useState<TranslationProfile | null>(null);

  const activeProfile = settings.profiles.find((p) => p.id === settings.activeProfileId);

  const handleCreateProfile = () => {
    const newProfile: TranslationProfile = {
      ...DEFAULT_PROFILE,
      id: crypto.randomUUID(),
      name: `${t('settings.api.newProfile')} ${settings.profiles.length + 1}`,
    };
    addProfile(newProfile);
    setEditingProfile(newProfile);
  };

  const handleDeleteProfile = (id: string) => {
    if (settings.profiles.length <= 1) {
      showError(t('common.error'), t('settings.api.cannotDeleteLast'));
      return;
    }
    deleteProfile(id);
    showSuccess(t('common.success'), t('common.delete'));
  };

  const handleSaveProfile = () => {
    if (editingProfile) {
      updateProfile(editingProfile.id, editingProfile);
      setEditingProfile(null);
      showSuccess(t('common.success'), t('settings.saved'));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3
            className="text-lg font-medium"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {t('settings.api.profiles')}
          </h3>
          <Button variant="secondary" size="sm" onClick={handleCreateProfile}>
            + {t('settings.api.newProfile')}
          </Button>
        </div>

        <div className="space-y-2">
          {settings.profiles.map((profile) => (
            <div
              key={profile.id}
              className="flex items-center justify-between rounded-md border p-3"
              style={{
                borderColor:
                  profile.id === settings.activeProfileId
                    ? 'var(--color-accent)'
                    : 'var(--color-border)',
                backgroundColor: 'var(--color-bg-tertiary)',
              }}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="activeProfile"
                  checked={profile.id === settings.activeProfileId}
                  onChange={() => { setActiveProfile(profile.id); }}
                  className="h-4 w-4"
                />
                <span style={{ color: 'var(--color-text-primary)' }}>
                  {profile.name}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setEditingProfile({ ...profile }); }}
                >
                  {t('common.edit')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { handleDeleteProfile(profile.id); }}
                >
                  {t('common.delete')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editingProfile ? (
        <ProfileEditor
          profile={editingProfile}
          onChange={setEditingProfile}
          onSave={handleSaveProfile}
          onCancel={() => { setEditingProfile(null); }}
        />
      ) : (
        activeProfile && <ProfileViewer profile={activeProfile} />
      )}
    </div>
  );
}

interface ProfileEditorProps {
  profile: TranslationProfile;
  onChange: (profile: TranslationProfile) => void;
  onSave: () => void;
  onCancel: () => void;
}

function ProfileEditor({ profile, onChange, onSave, onCancel }: ProfileEditorProps) {
  const { t } = useTranslation();

  const updateField = <K extends keyof TranslationProfile>(
    field: K,
    value: TranslationProfile[K]
  ) => {
    onChange({ ...profile, [field]: value });
  };

  return (
    <div
      className="space-y-4 rounded-md border p-4"
      style={{
        borderColor: 'var(--color-accent)',
        backgroundColor: 'var(--color-bg-tertiary)',
      }}
    >
      <h4
        className="font-medium"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {t('common.edit')}
      </h4>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label
            className="mb-1 block text-sm font-medium"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('settings.api.profileName')}
          </label>
          <input
            type="text"
            value={profile.name}
            onChange={(e) => { updateField('name', e.target.value); }}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>

        <div>
          <label
            className="mb-1 block text-sm font-medium"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('settings.api.apiType')}
          </label>
          <select
            value={profile.apiType}
            onChange={(e) => { updateField('apiType', e.target.value as ApiType); }}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          >
            <option value="openai">{t('settings.api.apiTypeOpenAI')}</option>
            <option value="anthropic">{t('settings.api.apiTypeAnthropic')}</option>
          </select>
        </div>

        <div>
          <label
            className="mb-1 block text-sm font-medium"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('settings.api.model')}
          </label>
          <input
            type="text"
            value={profile.model}
            onChange={(e) => { updateField('model', e.target.value); }}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>

        <div className="md:col-span-2">
          <label
            className="mb-1 block text-sm font-medium"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('settings.api.endpoint')}
          </label>
          <input
            type="url"
            value={profile.apiEndpoint}
            onChange={(e) => { updateField('apiEndpoint', e.target.value); }}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>

        <div>
          <label
            className="mb-1 block text-sm font-medium"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('settings.api.apiKey')}
          </label>
          <input
            type="password"
            value={profile.apiKey}
            onChange={(e) => { updateField('apiKey', e.target.value); }}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>

        <div>
          <label
            className="mb-1 block text-sm font-medium"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('settings.api.timeout')}
          </label>
          <input
            type="number"
            value={profile.timeout}
            onChange={(e) => { updateField('timeout', Number(e.target.value)); }}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>

        <div>
          <label
            className="mb-1 block text-sm font-medium"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('settings.api.sourceLanguage')}
          </label>
          <LanguageSelector
            value={profile.sourceLanguage}
            onChange={(lang) => { updateField('sourceLanguage', lang as SupportedLanguage); }}
            includeAuto
          />
        </div>

        <div>
          <label
            className="mb-1 block text-sm font-medium"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('settings.api.targetLanguage')}
          </label>
          <LanguageSelector
            value={profile.targetLanguage}
            onChange={(lang) => { updateField('targetLanguage', lang as SupportedLanguage); }}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button variant="primary" onClick={onSave}>
          {t('common.save')}
        </Button>
      </div>
    </div>
  );
}

interface ProfileViewerProps {
  profile: TranslationProfile;
}

function ProfileViewer({ profile }: ProfileViewerProps) {
  const { t } = useTranslation();

  return (
    <div
      className="rounded-md border p-4"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-bg-tertiary)',
      }}
    >
      <h4
        className="mb-4 font-medium"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {t('settings.api.currentProfile')}: {profile.name}
      </h4>

      <dl className="grid gap-2 text-sm md:grid-cols-2">
        <div>
          <dt style={{ color: 'var(--color-text-muted)' }}>{t('settings.api.endpoint')}</dt>
          <dd style={{ color: 'var(--color-text-primary)' }}>{profile.apiEndpoint}</dd>
        </div>
        <div>
          <dt style={{ color: 'var(--color-text-muted)' }}>{t('settings.api.apiType')}</dt>
          <dd style={{ color: 'var(--color-text-primary)' }}>
            {profile.apiType === 'anthropic'
              ? t('settings.api.apiTypeAnthropic')
              : t('settings.api.apiTypeOpenAI')}
          </dd>
        </div>
        <div>
          <dt style={{ color: 'var(--color-text-muted)' }}>{t('settings.api.model')}</dt>
          <dd style={{ color: 'var(--color-text-primary)' }}>{profile.model}</dd>
        </div>
        <div>
          <dt style={{ color: 'var(--color-text-muted)' }}>{t('settings.api.timeout')}</dt>
          <dd style={{ color: 'var(--color-text-primary)' }}>{profile.timeout}s</dd>
        </div>
        <div>
          <dt style={{ color: 'var(--color-text-muted)' }}>{t('settings.api.sourceLanguage')} → {t('settings.api.targetLanguage')}</dt>
          <dd style={{ color: 'var(--color-text-primary)' }}>
            {profile.sourceLanguage} → {profile.targetLanguage}
          </dd>
        </div>
      </dl>
    </div>
  );
}
