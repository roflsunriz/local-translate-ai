import { useUIStore } from '@/stores';
import type { ToastNotification } from '@/types/ui';

const typeStyles: Record<ToastNotification['type'], { bg: string; icon: string }> = {
  success: { bg: 'var(--color-success)', icon: '✓' },
  error: { bg: 'var(--color-error)', icon: '✕' },
  warning: { bg: 'var(--color-warning)', icon: '⚠' },
  info: { bg: 'var(--color-accent)', icon: 'ℹ' },
};

export function ToastContainer() {
  const { toasts, removeToast } = useUIStore();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={() => { removeToast(toast.id); }} />
      ))}
    </div>
  );
}

interface ToastProps {
  toast: ToastNotification;
  onDismiss: () => void;
}

function Toast({ toast, onDismiss }: ToastProps) {
  const style = typeStyles[toast.type];

  return (
    <div
      className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg p-4 shadow-lg animate-in slide-in-from-bottom-5"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        border: `1px solid ${style.bg}`,
      }}
      role="alert"
    >
      <span
        className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-sm text-white"
        style={{ backgroundColor: style.bg }}
      >
        {style.icon}
      </span>
      <div className="flex-1">
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
          {toast.title}
        </p>
        <p className="mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          {toast.message}
        </p>
      </div>
      <button
        onClick={onDismiss}
        className="flex-shrink-0 rounded p-1 transition-colors hover:bg-[var(--color-bg-tertiary)]"
        style={{ color: 'var(--color-text-muted)' }}
        aria-label="閉じる"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

