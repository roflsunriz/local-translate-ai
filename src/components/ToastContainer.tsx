import { MdiIcon } from '@/components/Icon';
import { useUIStore } from '@/stores';

import type { ToastNotification } from '@/types/ui';
import type { IconName } from '@/components/Icon';

const typeConfig: Record<ToastNotification['type'], { bg: string; icon: IconName }> = {
  success: { bg: 'var(--color-success)', icon: 'check' },
  error: { bg: 'var(--color-error)', icon: 'error' },
  warning: { bg: 'var(--color-warning)', icon: 'warning' },
  info: { bg: 'var(--color-accent)', icon: 'info' },
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
  const config = typeConfig[toast.type];

  return (
    <div
      className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg p-4 shadow-lg animate-in slide-in-from-bottom-5"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        border: `1px solid ${config.bg}`,
      }}
      role="alert"
    >
      <span
        className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-white"
        style={{ backgroundColor: config.bg }}
      >
        <MdiIcon name={config.icon} size={14} color="white" />
      </span>
      <div className="flex-1">
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
          {toast.title}
        </p>
        {toast.message && (
          <p className="mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {toast.message}
          </p>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="flex-shrink-0 rounded p-1 transition-colors hover:bg-[var(--color-bg-tertiary)]"
        style={{ color: 'var(--color-text-muted)' }}
        aria-label="閉じる"
      >
        <MdiIcon name="close" size={16} />
      </button>
    </div>
  );
}
