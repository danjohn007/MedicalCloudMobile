import { type ColorSchemeName } from 'react-native';
import { create } from 'zustand';

import {
  applyThemeMode,
  readPersistedModeSync,
  THEME_MODE_STORAGE_KEY,
  type AppThemeMode,
  type ResolvedTheme,
} from '@/constants/theme';
import { getSecure, setSecure } from '@/services/storage';

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

// IMPORTANTE: arrancar aqui con mode: 'system' + applyThemeMode('system')
// sobreescribiria el MC que constants/theme.ts ya inicializo correctamente de
// forma sincrona (leyendo la preferencia real guardada), reintroduciendo el
// mismo bug que este fix resuelve. Por eso reusamos la misma lectura sincrona
// para el estado inicial — load() de abajo confirma/corrige esto de forma
// asincrona como respaldo (p.ej. si la lectura sincrona fallo en esa
// plataforma).
const initialMode = readPersistedModeSync();

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: initialMode,
  resolved: applyThemeMode(initialMode),
  loaded: false,
  load: async (systemScheme) => {
    const mode = normalizeMode(await getSecure(THEME_MODE_STORAGE_KEY));
    set({ mode, resolved: applyThemeMode(mode, systemScheme), loaded: true });
  },
  setMode: async (mode, systemScheme) => {
    set({ mode, resolved: applyThemeMode(mode, systemScheme) });
    await setSecure(THEME_MODE_STORAGE_KEY, mode);
  },
  syncSystem: (systemScheme) => {
    if (get().mode === 'system') set({ resolved: applyThemeMode('system', systemScheme) });
  },
}));
