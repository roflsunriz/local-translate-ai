import type { SupportedLanguage } from '@/types/settings';

interface LanguageSelectorProps {
  value: SupportedLanguage;
  onChange: (value: SupportedLanguage) => void;
  includeAuto?: boolean;
  disabled?: boolean;
}

const LANGUAGES: { value: SupportedLanguage; label: string }[] = [
  { value: 'auto', label: 'Auto Detect' },
  { value: 'Japanese', label: 'Japanese' },
  { value: 'English', label: 'English' },
  { value: 'Chinese', label: 'Chinese' },
  { value: 'Korean', label: 'Korean' },
  { value: 'Spanish', label: 'Spanish' },
  { value: 'Portuguese', label: 'Portuguese' },
  { value: 'Russian', label: 'Russian' },
  { value: 'Hindi', label: 'Hindi' },
  { value: 'Arabic', label: 'Arabic' },
  { value: 'French', label: 'French' },
  { value: 'Bengali', label: 'Bengali' },
  { value: 'Indonesian', label: 'Indonesian' },
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

