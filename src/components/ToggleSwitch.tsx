interface ToggleSwitchProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

export function ToggleSwitch({
  id,
  checked,
  onChange,
  label,
  description,
  disabled = false,
}: ToggleSwitchProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        id={id}
        role="switch"
        type="button"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => { onChange(!checked); }}
        className={`
          relative inline-flex h-6 w-11 shrink-0 cursor-pointer
          rounded-full border-2 border-transparent
          transition-colors duration-200 ease-in-out
          focus-visible:outline-none focus-visible:ring-2
          focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2
          ${disabled ? 'cursor-not-allowed opacity-50' : ''}
        `}
        style={{
          backgroundColor: checked ? 'var(--color-accent)' : 'var(--color-border)',
        }}
      >
        <span
          aria-hidden="true"
          className={`
            pointer-events-none inline-block h-5 w-5
            rounded-full bg-white shadow-lg ring-0
            transition duration-200 ease-in-out
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
      <div className="flex flex-col">
        <label
          htmlFor={id}
          className="cursor-pointer text-sm font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {label}
        </label>
        {description && (
          <span
            className="text-xs"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {description}
          </span>
        )}
      </div>
    </div>
  );
}
