/**
 * Toast Notification Utility for Content Scripts
 * Provides non-React toast notifications matching the existing ToastContainer style
 */

const TOAST_CONTAINER_ID = 'lta-toast-container';
const TOAST_STYLES_ID = 'lta-toast-styles';

type ToastType = 'info' | 'success' | 'warning' | 'error';

interface ToastOptions {
  /** Toast title text */
  title: string;
  /** Optional message text */
  message?: string | undefined;
  /** Toast type for styling */
  type: ToastType;
  /** Duration in milliseconds (0 for persistent, default: 4000) */
  duration?: number | undefined;
  /** Unique ID for the toast (auto-generated if not provided) */
  id?: string | undefined;
}

interface ToastInstance {
  id: string;
  element: HTMLDivElement;
  timeoutId: number | null;
}

const activeToasts = new Map<string, ToastInstance>();

// MDI icon paths for toast icons
const MDI_ICONS: Record<ToastType | 'close', string> = {
  success: 'M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z',
  error: 'M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z',
  warning: 'M13,14H11V10H13M13,18H11V16H13M1,21H23L12,2L1,21Z',
  info: 'M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z',
  close: 'M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z',
};

const TYPE_COLORS: Record<ToastType, string> = {
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
};

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Create an SVG icon element
 */
function createSvgIcon(type: ToastType | 'close', size = 14, color = 'white'): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.style.verticalAlign = 'middle';
  svg.style.flexShrink = '0';

  const pathEl = document.createElementNS(SVG_NS, 'path');
  pathEl.setAttribute('fill', color);
  pathEl.setAttribute('d', MDI_ICONS[type]);

  svg.appendChild(pathEl);
  return svg;
}

/**
 * Inject toast styles into the document
 */
export function injectToastStyles(doc: Document = document): void {
  if (doc.getElementById(TOAST_STYLES_ID)) {
    return;
  }

  const style = doc.createElement('style');
  style.id = TOAST_STYLES_ID;
  style.textContent = `
    .lta-toast-container {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 16px;
      pointer-events: none;
    }
    .lta-toast {
      pointer-events: auto;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      width: 100%;
      max-width: 384px;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      animation: lta-toast-slide-in 0.3s ease-out;
    }
    .lta-toast.lta-toast-exit {
      animation: lta-toast-slide-out 0.2s ease-in forwards;
    }
    .lta-toast-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 9999px;
      flex-shrink: 0;
    }
    .lta-toast-content {
      flex: 1;
      min-width: 0;
    }
    .lta-toast-title {
      font-size: 14px;
      font-weight: 500;
      line-height: 1.4;
      margin: 0;
    }
    .lta-toast-message {
      font-size: 12px;
      line-height: 1.4;
      margin: 4px 0 0 0;
      opacity: 0.8;
    }
    .lta-toast-close {
      flex-shrink: 0;
      padding: 4px;
      border: none;
      border-radius: 4px;
      background: transparent;
      cursor: pointer;
      opacity: 0.5;
      transition: opacity 0.2s, background-color 0.2s;
    }
    .lta-toast-close:hover {
      opacity: 1;
      background-color: rgba(0, 0, 0, 0.1);
    }
    @keyframes lta-toast-slide-in {
      from {
        transform: translateY(100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
    @keyframes lta-toast-slide-out {
      from {
        transform: translateY(0);
        opacity: 1;
      }
      to {
        transform: translateY(100%);
        opacity: 0;
      }
    }

    /* Light mode (default) */
    .lta-toast {
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
    }
    .lta-toast-title {
      color: #0f172a;
    }
    .lta-toast-message {
      color: #475569;
    }
    .lta-toast-close svg path {
      fill: #94a3b8;
    }

    /* Dark mode detection */
    @media (prefers-color-scheme: dark) {
      .lta-toast {
        background-color: #1e293b;
        border-color: #334155;
      }
      .lta-toast-title {
        color: #f8fafc;
      }
      .lta-toast-message {
        color: #cbd5e1;
      }
      .lta-toast-close svg path {
        fill: #64748b;
      }
      .lta-toast-close:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }
    }
  `;
  doc.head.appendChild(style);
}

/**
 * Get or create the toast container
 */
function getToastContainer(doc: Document = document): HTMLDivElement {
  injectToastStyles(doc);

  let container = doc.getElementById(TOAST_CONTAINER_ID) as HTMLDivElement | null;
  if (!container) {
    container = doc.createElement('div');
    container.id = TOAST_CONTAINER_ID;
    container.className = 'lta-toast-container';
    doc.body.appendChild(container);
  }
  return container;
}

/**
 * Show a toast notification
 * @returns The toast ID for later dismissal
 */
export function showToast(options: ToastOptions, doc: Document = document): string {
  const id = options.id ?? crypto.randomUUID();
  const duration = options.duration ?? 4000;
  const color = TYPE_COLORS[options.type];

  // If toast with same ID exists, update it
  const existing = activeToasts.get(id);
  if (existing) {
    updateToast(id, options, doc);
    return id;
  }

  const container = getToastContainer(doc);

  // Create toast element
  const toast = doc.createElement('div');
  toast.className = 'lta-toast';
  toast.setAttribute('role', 'alert');
  toast.style.borderColor = color;

  // Icon container
  const iconContainer = doc.createElement('span');
  iconContainer.className = 'lta-toast-icon';
  iconContainer.style.backgroundColor = color;
  iconContainer.appendChild(createSvgIcon(options.type, 14, 'white'));
  toast.appendChild(iconContainer);

  // Content container
  const content = doc.createElement('div');
  content.className = 'lta-toast-content';

  const title = doc.createElement('p');
  title.className = 'lta-toast-title';
  title.textContent = options.title;
  content.appendChild(title);

  if (options.message) {
    const message = doc.createElement('p');
    message.className = 'lta-toast-message';
    message.textContent = options.message;
    content.appendChild(message);
  }
  toast.appendChild(content);

  // Close button
  const closeBtn = doc.createElement('button');
  closeBtn.className = 'lta-toast-close';
  closeBtn.setAttribute('aria-label', '閉じる');
  closeBtn.appendChild(createSvgIcon('close', 16, 'currentColor'));
  closeBtn.addEventListener('click', () => {
    dismissToast(id, doc);
  });
  toast.appendChild(closeBtn);

  container.appendChild(toast);

  // Set up auto-dismiss
  let timeoutId: number | null = null;
  if (duration > 0) {
    timeoutId = window.setTimeout(() => {
      dismissToast(id, doc);
    }, duration);
  }

  activeToasts.set(id, { id, element: toast, timeoutId });

  return id;
}

/**
 * Update an existing toast
 */
export function updateToast(
  id: string,
  options: Partial<ToastOptions>,
  doc: Document = document
): void {
  const instance = activeToasts.get(id);
  if (!instance) {
    return;
  }

  const toast = instance.element;

  // Update title if provided
  if (options.title !== undefined) {
    const titleEl = toast.querySelector('.lta-toast-title');
    if (titleEl) {
      titleEl.textContent = options.title;
    }
  }

  // Update message if provided
  if (options.message !== undefined) {
    const content = toast.querySelector('.lta-toast-content');
    let messageEl = toast.querySelector('.lta-toast-message') as HTMLParagraphElement | null;

    if (options.message) {
      if (!messageEl && content) {
        messageEl = doc.createElement('p');
        messageEl.className = 'lta-toast-message';
        content.appendChild(messageEl);
      }
      if (messageEl) {
        messageEl.textContent = options.message;
      }
    } else if (messageEl) {
      messageEl.remove();
    }
  }

  // Update type/color if provided
  if (options.type !== undefined) {
    const color = TYPE_COLORS[options.type];
    toast.style.borderColor = color;

    const iconContainer = toast.querySelector('.lta-toast-icon') as HTMLElement | null;
    if (iconContainer) {
      iconContainer.style.backgroundColor = color;
      iconContainer.textContent = '';
      iconContainer.appendChild(createSvgIcon(options.type, 14, 'white'));
    }
  }

  // Update duration if provided
  if (options.duration !== undefined) {
    // Clear existing timeout
    if (instance.timeoutId !== null) {
      window.clearTimeout(instance.timeoutId);
      instance.timeoutId = null;
    }

    // Set new timeout
    if (options.duration > 0) {
      instance.timeoutId = window.setTimeout(() => {
        dismissToast(id, doc);
      }, options.duration);
    }
  }
}

/**
 * Dismiss a toast notification
 */
export function dismissToast(id: string, doc: Document = document): void {
  const instance = activeToasts.get(id);
  if (!instance) {
    return;
  }

  // Clear timeout
  if (instance.timeoutId !== null) {
    window.clearTimeout(instance.timeoutId);
  }

  // Add exit animation
  instance.element.classList.add('lta-toast-exit');

  // Remove after animation
  setTimeout(() => {
    instance.element.remove();
    activeToasts.delete(id);

    // Remove container if empty
    const container = doc.getElementById(TOAST_CONTAINER_ID);
    if (container && container.children.length === 0) {
      container.remove();
    }
  }, 200);
}

/**
 * Dismiss all toasts
 */
export function dismissAllToasts(doc: Document = document): void {
  for (const id of activeToasts.keys()) {
    dismissToast(id, doc);
  }
}

/**
 * Helper functions for common toast types
 */
export function showInfoToast(
  title: string,
  message?: string,
  duration?: number,
  doc: Document = document
): string {
  return showToast({ title, message, type: 'info', duration }, doc);
}

export function showSuccessToast(
  title: string,
  message?: string,
  duration?: number,
  doc: Document = document
): string {
  return showToast({ title, message, type: 'success', duration }, doc);
}

export function showWarningToast(
  title: string,
  message?: string,
  duration?: number,
  doc: Document = document
): string {
  return showToast({ title, message, type: 'warning', duration }, doc);
}

export function showErrorToast(
  title: string,
  message?: string,
  duration?: number,
  doc: Document = document
): string {
  return showToast({ title, message, type: 'error', duration }, doc);
}

