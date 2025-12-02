/**
 * UI-related types
 */

import type { TranslationStatus } from './translation';

export interface ToastNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  duration: number;
  createdAt: number;
}

export interface SidebarState {
  isOpen: boolean;
  activeTab: 'translate' | 'history' | 'settings';
}

export interface TranslationUIState {
  inputText: string;
  outputText: string;
  status: TranslationStatus;
  currentRequestId: string | null;
  streamingText: string;
  errorMessage: string | null;
}

export interface PopupPosition {
  x: number;
  y: number;
  anchor: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export interface SelectionInfo {
  text: string;
  range: Range | null;
  position: PopupPosition;
}

export type TabId = 'general' | 'api' | 'prompt' | 'advanced' | 'shortcuts';

export interface SettingsTabConfig {
  id: TabId;
  labelKey: string;
  icon: string;
}

export const SETTINGS_TABS: SettingsTabConfig[] = [
  { id: 'general', labelKey: 'settings.tabs.general', icon: '⚙️' },
  { id: 'api', labelKey: 'settings.tabs.api', icon: '🔌' },
  { id: 'prompt', labelKey: 'settings.tabs.prompt', icon: '💬' },
  { id: 'advanced', labelKey: 'settings.tabs.advanced', icon: '🔧' },
  { id: 'shortcuts', labelKey: 'settings.tabs.shortcuts', icon: '⌨️' },
];

