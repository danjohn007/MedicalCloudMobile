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
  pendingGoogleSignup: api.PendingGoogleRegistration | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  loadSaved: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<'authenticated' | 'pending_profile'>;
  completeGoogleSignup: (payload: {
    role: 'doctor' | 'patient';
    cedula?: string;
    specialty?: string;
    city?: string;
    birth_date?: string;
    gender?: string;
    phone?: string;
  }) => Promise<'authenticated' | 'pending_approval'>;
  clearPendingGoogleSignup: () => void;
  register: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  pendingGoogleSignup: null,
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
      set({ user: res.user, isAuthenticated: true, pendingGoogleSignup: null });
    } catch (error) {
      throw new Error(normalizeAuthErrorMessage(error));
    }
  },

  loginWithGoogle: async () => {
    try {
      const res = await api.loginWithGoogle();
      if (res.status === 'pending_profile') {
        set({ pendingGoogleSignup: res.pending, user: null, isAuthenticated: false });
        return 'pending_profile';
      }

      await api.saveToken(res.token);
      await api.saveUser(res.user);
      set({ user: res.user, isAuthenticated: true, pendingGoogleSignup: null });
      return 'authenticated';
    } catch (error) {
      throw new Error(normalizeAuthErrorMessage(error));
    }
  },

  completeGoogleSignup: async (payload) => {
    const pending = useAuthStore.getState().pendingGoogleSignup;
    if (!pending) {
      throw new Error('Tu sesion de registro con Google ya no esta disponible. Intenta de nuevo.');
    }

    try {
      const res = await api.completeGoogleRegistration({
        pending_token: pending.pending_token,
        ...payload,
      });

      if (res.status === 'pending_approval') {
        set({ pendingGoogleSignup: null, user: null, isAuthenticated: false });
        return 'pending_approval';
      }

      await api.saveToken(res.token);
      await api.saveUser(res.user);
      set({ user: res.user, isAuthenticated: true, pendingGoogleSignup: null });
      return 'authenticated';
    } catch (error) {
      throw new Error(normalizeAuthErrorMessage(error));
    }
  },

  clearPendingGoogleSignup: () => {
    set({ pendingGoogleSignup: null });
  },

  register: async (name, email, password, phone) => {
    const res = await api.register(name, email, password, phone);
    await api.saveToken(res.token);
    await api.saveUser(res.user);
    set({ user: res.user, isAuthenticated: true, pendingGoogleSignup: null });
  },

  logout: async () => {
    await api.clearToken();
    set({ user: null, isAuthenticated: false, pendingGoogleSignup: null });
  },
}));
