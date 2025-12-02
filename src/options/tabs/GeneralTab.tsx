import { useSettingsStore } from '@/stores';
import type { UILanguage, ThemeMode } from '@/types/settings';

const UI_LANGUAGES: { value: UILanguage; label: string }[] = [
  { value: 'auto', label: '自動' },
  { value: 'ja', label: '日本語' },
  { value: 'en', label: 'English' },
  { value: 'zh', label: '中文' },
  { value: 'ko', label: '한국어' },
  { value: 'es', label: 'Español' },
  { value: 'pt', label: 'Português' },
  { value: 'ru', label: 'Русский' },
  { value: 'hi', label: 'हिन्दी' },
  { value: 'ar', label: 'العربية' },
  { value: 'fr', label: 'Français' },
  { value: 'bn', label: 'বাংলা' },
  { value: 'id', label: 'Bahasa Indonesia' },
];

const THEME_MODES: { value: ThemeMode; label: string }[] = [
  { value: 'auto', label: '自動（システム設定に従う）' },
  { value: 'light', label: 'ライト' },
  { value: 'dark', label: 'ダーク' },
];

export function GeneralTab() {
  const { settings, updateSettings } = useSettingsStore();

  return (
    <div className="space-y-6">
      <div>
        <h3
          className="mb-4 text-lg font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          表示設定
        </h3>

        <div className="space-y-4">
          <div>
            <label
              className="mb-1 block text-sm font-medium"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              表示言語
            </label>
            <select
              value={settings.uiLanguage}
              onChange={(e) => { updateSettings({ uiLanguage: e.target.value as UILanguage }); }}
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            >
              {UI_LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              className="mb-1 block text-sm font-medium"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              テーマ
            </label>
            <select
              value={settings.themeMode}
              onChange={(e) => { updateSettings({ themeMode: e.target.value as ThemeMode }); }}
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            >
              {THEME_MODES.map((mode) => (
                <option key={mode.value} value={mode.value}>
                  {mode.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div>
        <h3
          className="mb-4 text-lg font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          米ドル換算機能
        </h3>
        <p
          className="mb-4 text-sm"
          style={{ color: 'var(--color-text-muted)' }}
        >
          英語→日本語翻訳時に、米ドル金額を日本円に換算して表示します
        </p>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="currencyEnabled"
              checked={settings.currencyConversion.enabled}
              onChange={(e) => {
                updateSettings({
                  currencyConversion: {
                    ...settings.currencyConversion,
                    enabled: e.target.checked,
                  },
                });
              }}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label
              htmlFor="currencyEnabled"
              className="text-sm"
              style={{ color: 'var(--color-text-primary)' }}
            >
              米ドル換算を有効にする
            </label>
          </div>

          {settings.currencyConversion.enabled && (
            <div>
              <label
                className="mb-1 block text-sm font-medium"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                1ドル = 何円
              </label>
              <input
                type="number"
                value={settings.currencyConversion.usdToJpyRate}
                onChange={(e) => {
                  updateSettings({
                    currencyConversion: {
                      ...settings.currencyConversion,
                      usdToJpyRate: Number(e.target.value),
                    },
                  });
                }}
                className="w-32 rounded-md border px-3 py-2 text-sm"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

