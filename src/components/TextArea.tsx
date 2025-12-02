import type { TextareaHTMLAttributes } from 'react';

interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  value: string;
  onChange?: (value: string) => void;
}

export function TextArea({
  value,
  onChange,
  className = '',
  ...props
}: TextAreaProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className={`
        w-full rounded-md border px-3 py-2 text-sm
        transition-colors
        focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]
        disabled:cursor-not-allowed disabled:opacity-50
        ${className}
      `}
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        borderColor: 'var(--color-border)',
        color: 'var(--color-text-primary)',
      }}
      {...props}
    />
  );
}

