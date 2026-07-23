import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import * as AppleAuthentication from 'expo-apple-authentication';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoogleLogo } from '@/components/GoogleLogo';
import { Icon } from '@/components/Icon';
import { Logo } from '@/components/Logo';
import { MC, themed } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';
import { resolveAppHome } from '@/utils/role-routing';

export default function LoginScreen() {
  const router = useRouter();
  const { isAuthenticated, login, loginWithGoogle, loginWithApple, user } = useAuthStore();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loadingMode, setLoadingMode] = useState<'email' | 'google' | 'apple' | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(resolveAppHome(user?.role));
    }
  }, [isAuthenticated, router, user?.role]);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      void AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
    }
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Por favor ingresa tu correo y contraseña.');
      return;
    }
    setLoadingMode('email');
    setError('');
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace(resolveAppHome(useAuthStore.getState().user?.role));
    } catch (e: any) {
      setError(e.message ?? 'Error al iniciar sesión.');
    } finally {
      setLoadingMode(null);
    }
  };

  const handleGoogleLogin = async () => {
    setLoadingMode('google');
    setError('');
    try {
      const result = await loginWithGoogle({ autoCreatePatient: true });
      if (result === 'pending_profile') {
        router.replace('/(auth)/google-register');
        return;
      }
      router.replace(resolveAppHome(useAuthStore.getState().user?.role));
    } catch (e: any) {
      setError(e.message ?? 'Error al iniciar sesión con Google.');
    } finally {
      setLoadingMode(null);
    }
  };

  const handleAppleLogin = async () => {
    setLoadingMode('apple');
    setError('');
    try {
      const result = await loginWithApple({ autoCreatePatient: true });
      if (result === 'pending_profile') {
        router.replace('/(auth)/google-register');
        return;
      }
      router.replace(resolveAppHome(useAuthStore.getState().user?.role));
    } catch (e: any) {
      if (e?.code !== 'ERR_REQUEST_CANCELED') setError(e.message ?? 'Error al iniciar sesión con Apple.');
    } finally {
      setLoadingMode(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={10}>
            <Icon name="arrow-left" size={24} color={MC.textPrimary} />
          </Pressable>

          {/* Brand */}
          <View style={styles.brandRow}>
            <Logo variant="icon-color" width={48} />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.appName}>
                <Text style={styles.appNameBold}>Doctor</Text> Cloud
              </Text>
              <Text style={styles.brandSub}>Tu salud, nuestra prioridad</Text>
            </View>
          </View>

          <Text style={styles.title}>Iniciar sesión</Text>
          <Text style={styles.subtitle}>Bienvenido de vuelta</Text>

          {/* Error */}
          {!!error && (
            <View style={styles.errorBox}>
              <Icon name="warning" size={18} color={MC.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Inputs */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Correo electrónico</Text>
              <View style={styles.inputWrap}>
                <Icon name="envelope" size={18} color={MC.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="correo@ejemplo.com"
                  placeholderTextColor={MC.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contraseña</Text>
              <View style={styles.inputWrap}>
                <Icon name="lock" size={18} color={MC.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Tu contraseña"
                  placeholderTextColor={MC.textMuted}
                  secureTextEntry={!showPwd}
                  autoComplete="password"
                  value={password}
                  onChangeText={setPassword}
                  onSubmitEditing={handleLogin}
                />
                <Pressable onPress={() => setShowPwd(!showPwd)} hitSlop={8} style={styles.eyeBtn}>
                  <Icon name="eye" size={20} color={MC.textMuted} />
                </Pressable>
              </View>
            </View>
          </View>

          {/* Login button */}
          <Pressable
            style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.85 }]}
            onPress={handleLogin}
            disabled={loadingMode !== null}
          >
            {loadingMode === 'email'
              ? <ActivityIndicator color={MC.white} />
              : <Text style={styles.btnText}>Iniciar sesión</Text>
            }
          </Pressable>

          <View style={styles.separatorRow}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>o</Text>
            <View style={styles.separatorLine} />
          </View>

          <Pressable
            style={({ pressed }) => [styles.btnGoogle, pressed && { opacity: 0.85 }]}
            onPress={handleGoogleLogin}
            disabled={loadingMode !== null}
          >
            {loadingMode === 'google' ? (
              <ActivityIndicator color={MC.textPrimary} />
            ) : (
              <>
                <View style={styles.googleBadge}>
                  <GoogleLogo size={18} />
                </View>
                <Text style={styles.btnGoogleText}>Iniciar sesi{"\u00f3"}n con Google</Text>
              </>
            )}
          </Pressable>

          {appleAvailable ? (
            <View style={[styles.appleWrap, loadingMode !== null && { opacity: 0.6 }]} pointerEvents={loadingMode === null ? 'auto' : 'none'}>
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={14}
                style={styles.appleButton}
                onPress={handleAppleLogin}
              />
              {loadingMode === 'apple' ? <ActivityIndicator color={MC.white} style={styles.appleLoader} /> : null}
            </View>
          ) : null}

          {/* Register link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>¿No tienes cuenta? </Text>
            <Pressable onPress={() => router.replace('/(auth)/register')}>
              <Text style={styles.footerLink}>Regístrate</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MC.background },
  scroll: { flexGrow: 1, padding: 24 },
  backBtn: { marginBottom: 16, alignSelf: 'flex-start' },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  appName: { fontSize: 20, color: MC.textPrimary },
  appNameBold: { fontWeight: '700', color: MC.primary },
  brandSub: { fontSize: 12, color: MC.textSecondary },
  title: { fontSize: 28, fontWeight: '700', color: MC.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: 15, color: MC.textSecondary, marginBottom: 28 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: MC.errorSoft, borderRadius: 10,
    padding: 12, marginBottom: 20,
  },
  errorText: { color: MC.error, fontSize: 14, flex: 1 },
  form: { gap: 16, marginBottom: 28 },
  inputGroup: { gap: 6 },
  label: { fontSize: 14, fontWeight: '500', color: MC.textPrimary },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: MC.surface, borderRadius: 12,
    borderWidth: 1, borderColor: MC.border,
  },
  inputIcon: { marginLeft: 14 },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 16,
    color: MC.textPrimary,
  },
  eyeBtn: { paddingHorizontal: 14 },
  btnPrimary: {
    backgroundColor: MC.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginBottom: 20,
  },
  btnText: { color: MC.white, fontSize: 17, fontWeight: '600' },
  separatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: MC.border,
  },
  separatorText: { color: MC.textMuted, fontSize: 14 },
  btnGoogle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: MC.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: MC.border,
    paddingVertical: 16,
    marginBottom: 20,
  },
  appleWrap: { height: 52, marginBottom: 20, justifyContent: 'center' },
  appleButton: { width: '100%', height: 52 },
  appleLoader: { position: 'absolute', alignSelf: 'center' },
  googleBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: themed('#F3F4F6', '#0F1C26'),
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGoogleText: {
    color: MC.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
  footerText: { color: MC.textSecondary, fontSize: 15 },
  footerLink: { color: MC.primary, fontSize: 15, fontWeight: '600' },
});
