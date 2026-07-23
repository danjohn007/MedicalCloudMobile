import { Appearance, Platform, type ColorSchemeName } from 'react-native';

// ── Doctor Cloud Brand Colors ─────────────────────────────
const lightPalette = {
  scheme:        'light',
  primary:       '#1BA8A0',
  primaryDark:   '#148C85',
  primaryLight:  '#E8F8F7',
  background:    '#FFFFFF',
  surface:       '#F7F9FC',
  card:          '#FFFFFF',
  input:         '#F8FAFC',
  border:        '#E5E7EB',
  textPrimary:   '#111827',
  textSecondary: '#6B7280',
  textMuted:     '#9CA3AF',
  star:          '#F59E0B',
  success:       '#10B981',
  error:         '#EF4444',
  errorSoft:     '#FEE2E2',
  errorBorder:   '#FECACA',
  warningSoft:   '#FEF3C7',
  warningBorder: '#FCD34D',
  infoSoft:      '#E0F2FE',
  infoBorder:    '#BAE6FD',
  successSoft:   '#ECFDF5',
  successBorder: '#A7F3D0',
  purpleSoft:    '#F5F3FF',
  purpleBorder:  '#DDD6FE',
  orangeSoft:    '#FFF7ED',
  orangeBorder:  '#FED7AA',
  white:         '#FFFFFF',
  overlay:       'rgba(0,0,0,0.45)',
} as const;

const darkPalette = {
  scheme: 'dark',
  primary: '#35C4BA', primaryDark: '#1BA8A0', primaryLight: '#143B3A',
  background: '#0B151C', surface: '#12202A', card: '#142331', input: '#101C26', border: '#2D3D4A',
  textPrimary: '#F5F8FA', textSecondary: '#B3C0CB', textMuted: '#8393A1',
  star: '#FBBF24', success: '#34D399', error: '#FB7185',
  errorSoft: '#3A1820', errorBorder: '#7F1D1D',
  warningSoft: '#3A2A10', warningBorder: '#92400E',
  infoSoft: '#0E3042', infoBorder: '#1E4E63',
  successSoft: '#0F3528', successBorder: '#176246',
  purpleSoft: '#241B3A', purpleBorder: '#47336F',
  orangeSoft: '#3A2312', orangeBorder: '#7C3A12',
  white: '#FFFFFF', overlay: 'rgba(0,0,0,0.65)',
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

export function themed(lightValue: string, darkValue: string): string {
  return MC.scheme === 'dark' ? darkValue : lightValue;
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
