/**
 * UI state store using Zustand
 */

import { create } from 'zustand';

import type { ToastNotification } from '@/types/ui';

type SidebarTab = 'translate' | 'history';

interface UIState {
  // Sidebar
  sidebarTab: SidebarTab;

  // Toast notifications
  toasts: ToastNotification[];

  // Loading states
  isGlobalLoading: boolean;

  // Actions
  setSidebarTab: (tab: SidebarTab) => void;

  // Toast actions
  addToast: (toast: Omit<ToastNotification, 'id' | 'createdAt'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;

  // Loading actions
  setGlobalLoading: (loading: boolean) => void;

  // Convenience toast methods
  showSuccess: (title: string, message: string, duration?: number) => string;
  showError: (title: string, message: string, duration?: number) => string;
  showWarning: (title: string, message: string, duration?: number) => string;
  showInfo: (title: string, message: string, duration?: number) => string;
}

const DEFAULT_TOAST_DURATION = 5000;

export const useUIStore = create<UIState>((set, get) => ({
  sidebarTab: 'translate',
  toasts: [],
  isGlobalLoading: false,

  setSidebarTab: (tab) => {
    set({ sidebarTab: tab });
  },

  addToast: (toast) => {
    const id = crypto.randomUUID();
    const newToast: ToastNotification = {
      ...toast,
      id,
      createdAt: Date.now(),
      duration: toast.duration ?? DEFAULT_TOAST_DURATION,
    };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    // Auto-remove after duration
    if (newToast.duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, newToast.duration);
    }

    return id;
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearToasts: () => {
    set({ toasts: [] });
  },

  setGlobalLoading: (loading) => {
    set({ isGlobalLoading: loading });
  },

  showSuccess: (title, message, duration) => {
    return get().addToast({ type: 'success', title, message, duration: duration ?? DEFAULT_TOAST_DURATION });
  },

  showError: (title, message, duration) => {
    return get().addToast({ type: 'error', title, message, duration: duration ?? DEFAULT_TOAST_DURATION });
  },

  showWarning: (title, message, duration) => {
    return get().addToast({ type: 'warning', title, message, duration: duration ?? DEFAULT_TOAST_DURATION });
  },

  showInfo: (title, message, duration) => {
    return get().addToast({ type: 'info', title, message, duration: duration ?? DEFAULT_TOAST_DURATION });
  },
}));

