import { create } from 'zustand';
import * as api from '@/services/api';
import { registerDeviceForPushNotifications, unregisterDeviceForPushNotifications } from '@/services/push-notifications';
import { getNativeAppleIdentity, getNativeGoogleIdentity } from '@/services/native-social-auth';

function normalizeAuthErrorMessage(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Error al iniciar sesión.';

  if (/solo pacientes|solo pacientes y doctores|solo doctores|app móvil|app movil/i.test(message)) {
    return 'Credenciales incorrectas.';
  }

  return message;
}

async function completeSocialLogin(
  res: api.GoogleLoginResult,
  options: { autoCreatePatient?: boolean } | undefined,
  set: (state: Partial<AuthState>) => void,
): Promise<'authenticated' | 'pending_profile'> {
  if (res.status === 'pending_profile') {
    if (options?.autoCreatePatient) {
      const completed = await api.completeGoogleRegistration({
        pending_token: res.pending.pending_token,
        role: 'patient',
        name: res.pending.name,
      });
      if (completed.status !== 'authenticated') {
        throw new Error('No se pudo completar el inicio de sesión.');
      }
      await api.saveToken(completed.token);
      await api.saveUser(completed.user);
      set({ user: completed.user, isAuthenticated: true, pendingGoogleSignup: null });
      void registerDeviceForPushNotifications().catch(() => {});
      return 'authenticated';
    }

    set({ pendingGoogleSignup: res.pending, user: null, isAuthenticated: false });
    return 'pending_profile';
  }

  await api.saveToken(res.token);
  await api.saveUser(res.user);
  set({ user: res.user, isAuthenticated: true, pendingGoogleSignup: null });
  void registerDeviceForPushNotifications().catch(() => {});
  return 'authenticated';
}

interface AuthState {
  user: api.AuthUser | null;
  pendingGoogleSignup: api.PendingGoogleRegistration | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  loadSaved: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (options?: { autoCreatePatient?: boolean }) => Promise<'authenticated' | 'pending_profile'>;
  loginWithApple: (options?: { autoCreatePatient?: boolean }) => Promise<'authenticated' | 'pending_profile'>;
  completeGoogleSignup: (payload: {
    role: 'doctor' | 'patient';
    name?: string;
    cedula?: string;
    specialty?: string;
    city?: string;
    state?: string;
    birth_date?: string;
    gender?: string;
    phone?: string;
  }) => Promise<'authenticated' | 'pending_approval'>;
  clearPendingGoogleSignup: () => void;
  register: (payload: api.MobileRegisterPayload) => Promise<'authenticated' | 'pending_approval'>;
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
        void registerDeviceForPushNotifications().catch(() => {});
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
      void registerDeviceForPushNotifications().catch(() => {});
    } catch (error) {
      throw new Error(normalizeAuthErrorMessage(error));
    }
  },

  loginWithGoogle: async (options) => {
    try {
      const identity = await getNativeGoogleIdentity();
      const res = await api.loginWithNativeSocial({ provider: 'google', id_token: identity.idToken, name: identity.name });
      return completeSocialLogin(res, options, set);
    } catch (error) {
      throw new Error(normalizeAuthErrorMessage(error));
    }
  },

  loginWithApple: async (options) => {
    try {
      const identity = await getNativeAppleIdentity();
      const res = await api.loginWithNativeSocial({ provider: 'apple', id_token: identity.idToken, name: identity.name });
      return completeSocialLogin(res, options, set);
    } catch (error) {
      throw new Error(normalizeAuthErrorMessage(error));
    }
  },

  completeGoogleSignup: async (payload) => {
    const pending = useAuthStore.getState().pendingGoogleSignup;
    if (!pending) {
      throw new Error('Tu sesión de registro con Google ya no está disponible. Intenta de nuevo.');
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
      void registerDeviceForPushNotifications().catch(() => {});
      return 'authenticated';
    } catch (error) {
      throw new Error(normalizeAuthErrorMessage(error));
    }
  },

  clearPendingGoogleSignup: () => {
    set({ pendingGoogleSignup: null });
  },

  register: async (payload) => {
    const res = await api.register(payload);
    if (res.status === 'pending_approval') {
      set({ user: null, isAuthenticated: false, pendingGoogleSignup: null });
      return 'pending_approval';
    }

    await api.saveToken(res.token);
    await api.saveUser(res.user);
    set({ user: res.user, isAuthenticated: true, pendingGoogleSignup: null });
    void registerDeviceForPushNotifications().catch(() => {});
    return 'authenticated';
  },

  logout: async () => {
    await unregisterDeviceForPushNotifications().catch(() => {});
    await api.clearToken();
    set({ user: null, isAuthenticated: false, pendingGoogleSignup: null });
  },
}));
