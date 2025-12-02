import type { SupportedLanguage } from '@/types/settings';

interface LanguageSelectorProps {
  value: SupportedLanguage;
  onChange: (value: SupportedLanguage) => void;
  includeAuto?: boolean;
  disabled?: boolean;
}

const LANGUAGES: { value: SupportedLanguage; label: string }[] = [
  { value: 'auto', label: '自動検出' },
  { value: 'Japanese', label: '日本語' },
  { value: 'English', label: 'English' },
  { value: 'Chinese', label: '中文' },
  { value: 'Korean', label: '한국어' },
  { value: 'Spanish', label: 'Español' },
  { value: 'Portuguese', label: 'Português' },
  { value: 'Russian', label: 'Русский' },
  { value: 'Hindi', label: 'हिन्दी' },
  { value: 'Arabic', label: 'العربية' },
  { value: 'French', label: 'Français' },
  { value: 'Bengali', label: 'বাংলা' },
  { value: 'Indonesian', label: 'Bahasa Indonesia' },
];

export function LanguageSelector({
  value,
  onChange,
  includeAuto = false,
  disabled = false,
}: LanguageSelectorProps) {
  const options = includeAuto
    ? LANGUAGES
    : LANGUAGES.filter((l) => l.value !== 'auto');

  return (
    <select
      value={value}
      onChange={(e) => { onChange(e.target.value as SupportedLanguage); }}
      disabled={disabled}
      className="
        w-full rounded-md border px-3 py-2 text-sm
        transition-colors
        focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]
        disabled:cursor-not-allowed disabled:opacity-50
      "
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        borderColor: 'var(--color-border)',
        color: 'var(--color-text-primary)',
      }}
    >
      {options.map((lang) => (
        <option key={lang.value} value={lang.value}>
          {lang.label}
        </option>
      ))}
    </select>
  );
}

