import { create } from 'zustand';
import * as api from '@/services/api';

function normalizeAuthErrorMessage(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Error al iniciar sesión.';

  if (/solo pacientes|solo pacientes y doctores|solo doctores|app movil/i.test(message)) {
    return 'Credenciales incorrectas.';
  }

  return message;
}

interface AuthState {
  user: api.AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  loadSaved: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  loadSaved: async () => {
    try {
      const [token, user] = await Promise.all([api.getToken(), api.getSavedUser()]);
      if (token && user) {
        set({ user, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    try {
      const res = await api.login(email, password);
      await api.saveToken(res.token);
      await api.saveUser(res.user);
      set({ user: res.user, isAuthenticated: true });
    } catch (error) {
      throw new Error(normalizeAuthErrorMessage(error));
    }
  },

  register: async (name, email, password, phone) => {
    const res = await api.register(name, email, password, phone);
    await api.saveToken(res.token);
    await api.saveUser(res.user);
    set({ user: res.user, isAuthenticated: true });
  },

  logout: async () => {
    await api.clearToken();
    set({ user: null, isAuthenticated: false });
  },
}));
