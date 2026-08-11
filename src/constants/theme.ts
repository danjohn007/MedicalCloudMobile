import { Appearance, Platform, type ColorSchemeName } from 'react-native';

export type AppThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

// Fuente unica de la llave de almacenamiento: stores/themeStore.ts la importa
// de aqui para que la lectura sincrona (abajo) y la asincrona (el store) nunca
// queden desincronizadas por un typo.
export const THEME_MODE_STORAGE_KEY = 'mc_theme_mode';

function normalizeStoredMode(value: string | null): AppThemeMode {
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
}

/**
 * Lee el modo de apariencia guardado de forma SINCRONA, antes de que se
 * evalue el resto de los modulos de la app (incluyendo cualquier
 * StyleSheet.create() que use MC/themed()).
 *
 * Por que hace falta esto: en RN/Metro, todo el grafo de imports de la app se
 * ejecuta de un tiron al arrancar, ANTES de que React empiece a renderizar.
 * Si MC se inicializaba solo con Appearance.getColorScheme() (el esquema del
 * SISTEMA) y la preferencia guardada del usuario se leia despues de forma
 * asincrona (expo-secure-store getItemAsync, dentro de un useEffect), todo
 * StyleSheet.create() que ya hubiera capturado colores de MC quedaba
 * "horneado" con el esquema del sistema para siempre — sin importar que el
 * usuario hubiera elegido claro/oscuro manualmente, y sin importar cuantas
 * veces se recargara la app despues (la misma carrera ocurre en cada arranque).
 * expo-secure-store expone getItem() (sincrono, bloquea brevemente el hilo JS)
 * pensado justo para casos como este: leer un valor pequeno antes de que el
 * resto de la app arranque.
 */
export function readPersistedModeSync(): AppThemeMode {
  try {
    if (typeof window !== 'undefined' && (window as any).localStorage) {
      return normalizeStoredMode((window as any).localStorage.getItem(THEME_MODE_STORAGE_KEY));
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const SecureStore = require('expo-secure-store');
    if (typeof SecureStore?.getItem === 'function') {
      return normalizeStoredMode(SecureStore.getItem(THEME_MODE_STORAGE_KEY));
    }
  } catch {
    // Sin almacenamiento sincrono disponible (p.ej. Expo Go en algunas
    // plataformas): cae a 'system', igual que antes de este fix. load()
    // en themeStore.ts corrige esto asincrono momentos despues como respaldo.
  }
  return 'system';
}

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

export function resolveThemeMode(mode: AppThemeMode, systemScheme: ColorSchemeName = Appearance.getColorScheme()): ResolvedTheme {
  return mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
}

const initialResolvedTheme: ResolvedTheme = resolveThemeMode(readPersistedModeSync());

export const MC: { -readonly [K in keyof typeof lightPalette]: string } = {
  ...(initialResolvedTheme === 'dark' ? darkPalette : lightPalette),
};

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
