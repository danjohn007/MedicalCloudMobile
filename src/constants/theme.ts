import { Appearance, Platform, type ColorSchemeName } from 'react-native';

// ── Doctor Cloud Brand Colors ─────────────────────────────
const lightPalette = {
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

const darkPalette = {
  primary: '#35C4BA', primaryDark: '#1BA8A0', primaryLight: '#143B3A',
  background: '#101820', surface: '#17222D', border: '#314150',
  textPrimary: '#F5F8FA', textSecondary: '#B3C0CB', textMuted: '#8393A1',
  star: '#FBBF24', success: '#34D399', error: '#FB7185', white: '#FFFFFF', overlay: 'rgba(0,0,0,0.65)',
} as const;

export type AppThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const MC: { -readonly [K in keyof typeof lightPalette]: string } = {
  ...(Appearance.getColorScheme() === 'dark' ? darkPalette : lightPalette),
};

export function resolveThemeMode(mode: AppThemeMode, systemScheme: ColorSchemeName = Appearance.getColorScheme()): ResolvedTheme {
  return mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
}

export function applyThemeMode(mode: AppThemeMode, systemScheme?: ColorSchemeName): ResolvedTheme {
  const resolved = resolveThemeMode(mode, systemScheme);
  Object.assign(MC, resolved === 'dark' ? darkPalette : lightPalette);
  return resolved;
}

export const Colors = {
  light: {
    text: lightPalette.textPrimary,
    background: lightPalette.background,
    backgroundElement: lightPalette.surface,
    backgroundSelected: lightPalette.primaryLight,
    textSecondary: lightPalette.textSecondary,
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
