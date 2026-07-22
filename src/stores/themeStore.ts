import { type ColorSchemeName } from 'react-native';
import { create } from 'zustand';

import { applyThemeMode, type AppThemeMode, type ResolvedTheme } from '@/constants/theme';
import { getSecure, setSecure } from '@/services/storage';

const THEME_MODE_KEY = 'mc_theme_mode';

function normalizeMode(value: string | null): AppThemeMode {
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
}

interface ThemeState {
  mode: AppThemeMode;
  resolved: ResolvedTheme;
  loaded: boolean;
  load: (systemScheme?: ColorSchemeName) => Promise<void>;
  setMode: (mode: AppThemeMode, systemScheme?: ColorSchemeName) => Promise<void>;
  syncSystem: (systemScheme: ColorSchemeName) => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'system',
  resolved: applyThemeMode('system'),
  loaded: false,
  load: async (systemScheme) => {
    const mode = normalizeMode(await getSecure(THEME_MODE_KEY));
    set({ mode, resolved: applyThemeMode(mode, systemScheme), loaded: true });
  },
  setMode: async (mode, systemScheme) => {
    set({ mode, resolved: applyThemeMode(mode, systemScheme) });
    await setSecure(THEME_MODE_KEY, mode);
  },
  syncSystem: (systemScheme) => {
    if (get().mode === 'system') set({ resolved: applyThemeMode('system', systemScheme) });
  },
}));
