import { useState } from 'react';

import { Button } from '@/components/Button';
import { LanguageSelector } from '@/components/LanguageSelector';
import { useSettingsStore, useUIStore } from '@/stores';
import type { TranslationProfile, SupportedLanguage } from '@/types/settings';
import { DEFAULT_PROFILE } from '@/types/settings';

export function ApiTab() {
  const { settings, addProfile, updateProfile, deleteProfile, setActiveProfile } =
    useSettingsStore();
  const { showSuccess, showError } = useUIStore();
  const [editingProfile, setEditingProfile] = useState<TranslationProfile | null>(null);

  const activeProfile = settings.profiles.find((p) => p.id === settings.activeProfileId);

  const handleCreateProfile = () => {
    const newProfile: TranslationProfile = {
      ...DEFAULT_PROFILE,
      id: crypto.randomUUID(),
      name: `プロファイル ${settings.profiles.length + 1}`,
    };
    addProfile(newProfile);
    setEditingProfile(newProfile);
  };

  const handleDeleteProfile = (id: string) => {
    if (settings.profiles.length <= 1) {
      showError('削除不可', '最後のプロファイルは削除できません');
      return;
    }
    deleteProfile(id);
    showSuccess('削除完了', 'プロファイルを削除しました');
  };

  const handleSaveProfile = () => {
    if (editingProfile) {
      updateProfile(editingProfile.id, editingProfile);
      setEditingProfile(null);
      showSuccess('保存完了', 'プロファイルを保存しました');
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
            プロファイル
          </h3>
          <Button variant="secondary" size="sm" onClick={handleCreateProfile}>
            + 新規プロファイル
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
                  編集
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { handleDeleteProfile(profile.id); }}
                >
                  削除
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
        プロファイル編集
      </h4>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label
            className="mb-1 block text-sm font-medium"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            プロファイル名
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
            モデル名
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
            APIエンドポイント
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
            APIキー
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
            タイムアウト（秒）
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
            デフォルトソース言語
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
            デフォルトターゲット言語
          </label>
          <LanguageSelector
            value={profile.targetLanguage}
            onChange={(lang) => { updateField('targetLanguage', lang as SupportedLanguage); }}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          キャンセル
        </Button>
        <Button variant="primary" onClick={onSave}>
          保存
        </Button>
      </div>
    </div>
  );
}

interface ProfileViewerProps {
  profile: TranslationProfile;
}

function ProfileViewer({ profile }: ProfileViewerProps) {
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
        現在のプロファイル: {profile.name}
      </h4>

      <dl className="grid gap-2 text-sm md:grid-cols-2">
        <div>
          <dt style={{ color: 'var(--color-text-muted)' }}>エンドポイント</dt>
          <dd style={{ color: 'var(--color-text-primary)' }}>{profile.apiEndpoint}</dd>
        </div>
        <div>
          <dt style={{ color: 'var(--color-text-muted)' }}>モデル</dt>
          <dd style={{ color: 'var(--color-text-primary)' }}>{profile.model}</dd>
        </div>
        <div>
          <dt style={{ color: 'var(--color-text-muted)' }}>タイムアウト</dt>
          <dd style={{ color: 'var(--color-text-primary)' }}>{profile.timeout}秒</dd>
        </div>
        <div>
          <dt style={{ color: 'var(--color-text-muted)' }}>言語</dt>
          <dd style={{ color: 'var(--color-text-primary)' }}>
            {profile.sourceLanguage} → {profile.targetLanguage}
          </dd>
        </div>
      </dl>
    </div>
  );
}

