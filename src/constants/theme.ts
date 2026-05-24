import '@/global.css';

import { Platform } from 'react-native';

import { palette } from '@/lib/tw';

export const Colors = {
  light: {
    text:              palette.light.text,
    background:        palette.light.background,
    backgroundElement: palette.light.backgroundElement,
    backgroundSelected:palette.light.backgroundSelected,
    textSecondary:     palette.light.textSecondary,
    primary:           palette.light.primary,
  },
  dark: {
    text:              palette.dark.text,
    background:        palette.dark.background,
    backgroundElement: palette.dark.backgroundElement,
    backgroundSelected:palette.dark.backgroundSelected,
    textSecondary:     palette.dark.textSecondary,
    primary:           palette.dark.primary,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light;

export const Fonts = Platform.select({
  ios: {
    sans:    'system-ui',
    serif:   'ui-serif',
    rounded: 'ui-rounded',
    mono:    'ui-monospace',
  },
  default: {
    sans:    'normal',
    serif:   'serif',
    rounded: 'normal',
    mono:    'monospace',
  },
  web: {
    sans:    'var(--font-display)',
    serif:   'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono:    'var(--font-mono)',
  },
});

export const Spacing = {
  half:  2,
  one:   4,
  two:   8,
  three: 16,
  four:  24,
  five:  32,
  six:   64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
