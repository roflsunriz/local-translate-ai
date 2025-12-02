import { useTranslation } from '@/hooks/useTranslation';
import { useSettingsStore } from '@/stores';

export function ShortcutsTab() {
  const { t } = useTranslation();
  const { settings, updateSettings } = useSettingsStore();

  const handleShortcutChange = (
    key: keyof typeof settings.keyboardShortcuts,
    value: string
  ) => {
    updateSettings({
      keyboardShortcuts: {
        ...settings.keyboardShortcuts,
        [key]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3
          className="mb-4 text-lg font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {t('settings.shortcuts.title')}
        </h3>
        <p
          className="mb-4 text-sm"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {t('settings.shortcuts.description')}
        </p>

        <div className="space-y-4">
          <div>
            <label
              className="mb-1 block text-sm font-medium"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('settings.shortcuts.translateSelection')}
            </label>
            <input
              type="text"
              value={settings.keyboardShortcuts.translateSelection}
              onChange={(e) => { handleShortcutChange('translateSelection', e.target.value); }}
              placeholder="Ctrl+Shift+T"
              className="w-full rounded-md border px-3 py-2 font-mono text-sm"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
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
              {t('settings.shortcuts.toggleSidebar')}
            </label>
            <input
              type="text"
              value={settings.keyboardShortcuts.toggleSidebar}
              onChange={(e) => { handleShortcutChange('toggleSidebar', e.target.value); }}
              placeholder="Ctrl+Shift+S"
              className="w-full rounded-md border px-3 py-2 font-mono text-sm"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>
        </div>
      </div>

      <div
        className="rounded-md p-4"
        style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
      >
        <h4
          className="mb-2 text-sm font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {t('settings.shortcuts.hint')}
        </h4>
        <ul
          className="list-inside list-disc space-y-1 text-sm"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <li>{t('settings.shortcuts.hintFirefox')}</li>
          <li>{t('settings.shortcuts.hintConflict')}</li>
          <li>{t('settings.shortcuts.hintReload')}</li>
        </ul>
      </div>
    </div>
  );
}
