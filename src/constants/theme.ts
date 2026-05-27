import '@/global.css';

import { Platform } from 'react-native';

// ── Medical Cloud Brand Colors ────────────────────────────
export const MC = {
  primary:       '#1BA8A0',
  primaryDark:   '#148C85',
  primaryLight:  '#E8F8F7',
  background:    '#FFFFFF',
  surface:       '#F7F9FC',
  border:        '#E5E7EB',
  textPrimary:   '#111827',
  textSecondary: '#6B7280',
  textMuted:     '#9CA3AF',
  star:          '#F59E0B',
  success:       '#10B981',
  error:         '#EF4444',
  white:         '#FFFFFF',
  overlay:       'rgba(0,0,0,0.45)',
} as const;

export const Colors = {
  light: {
    text: MC.textPrimary,
    background: MC.background,
    backgroundElement: MC.surface,
    backgroundSelected: MC.primaryLight,
    textSecondary: MC.textSecondary,
  },
  dark: {
    text: '#F9FAFB',
    background: '#0F1117',
    backgroundElement: '#1C1F26',
    backgroundSelected: '#1a3a38',
    textSecondary: '#9CA3AF',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
