/**
 * Icon component using Material Design Icons
 */

import Icon from '@mdi/react';
import {
  mdiCog,
  mdiApi,
  mdiMessageText,
  mdiTune,
  mdiKeyboard,
  mdiTranslate,
  mdiHistory,
  mdiContentCopy,
  mdiClose,
  mdiCheck,
  mdiAlertCircle,
  mdiInformation,
  mdiAlert,
  mdiDelete,
  mdiPlus,
  mdiPencil,
  mdiRefresh,
  mdiCancel,
  mdiSend,
  mdiGithub,
  mdiExport,
  mdiImport,
  mdiWeatherNight,
  mdiWeatherSunny,
  mdiThemeLightDark,
  mdiEarth,
  mdiSwapHorizontal,
  mdiChevronRight,
  mdiChevronLeft,
} from '@mdi/js';

export type IconName =
  | 'settings'
  | 'api'
  | 'message'
  | 'tune'
  | 'keyboard'
  | 'translate'
  | 'history'
  | 'copy'
  | 'close'
  | 'check'
  | 'error'
  | 'info'
  | 'warning'
  | 'delete'
  | 'add'
  | 'edit'
  | 'refresh'
  | 'cancel'
  | 'send'
  | 'github'
  | 'export'
  | 'import'
  | 'dark'
  | 'light'
  | 'theme'
  | 'globe'
  | 'swap'
  | 'chevronRight'
  | 'chevronLeft';

const iconMap: Record<IconName, string> = {
  settings: mdiCog,
  api: mdiApi,
  message: mdiMessageText,
  tune: mdiTune,
  keyboard: mdiKeyboard,
  translate: mdiTranslate,
  history: mdiHistory,
  copy: mdiContentCopy,
  close: mdiClose,
  check: mdiCheck,
  error: mdiAlertCircle,
  info: mdiInformation,
  warning: mdiAlert,
  delete: mdiDelete,
  add: mdiPlus,
  edit: mdiPencil,
  refresh: mdiRefresh,
  cancel: mdiCancel,
  send: mdiSend,
  github: mdiGithub,
  export: mdiExport,
  import: mdiImport,
  dark: mdiWeatherNight,
  light: mdiWeatherSunny,
  theme: mdiThemeLightDark,
  globe: mdiEarth,
  swap: mdiSwapHorizontal,
  chevronRight: mdiChevronRight,
  chevronLeft: mdiChevronLeft,
};

interface MdiIconProps {
  name: IconName;
  size?: number | string;
  color?: string;
  className?: string;
}

export function MdiIcon({ name, size = 24, color, className }: MdiIconProps) {
  const path = iconMap[name];
  if (!path) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }

  const computedSize = typeof size === 'number' ? size / 24 : size;

  // Build props conditionally to satisfy exactOptionalPropertyTypes
  if (color && className) {
    return <Icon path={path} size={computedSize} color={color} className={className} />;
  } else if (color) {
    return <Icon path={path} size={computedSize} color={color} />;
  } else if (className) {
    return <Icon path={path} size={computedSize} className={className} />;
  }

  return <Icon path={path} size={computedSize} />;
}

export default MdiIcon;
