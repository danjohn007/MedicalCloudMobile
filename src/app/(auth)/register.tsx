import { useRouter } from 'expo-router';
import { useState } from 'react';
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

import { Icon } from '@/components/Icon';
import { Logo } from '@/components/Logo';
import { MC } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuthStore();

  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [phone,    setPhone]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      setError('Nombre, correo y contraseña son requeridos.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await register(name.trim(), email.trim().toLowerCase(), password, phone.trim() || undefined);
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e.message ?? 'Error al crear tu cuenta.');
    } finally {
      setLoading(false);
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

          <Text style={styles.title}>Crear cuenta</Text>
          <Text style={styles.subtitle}>Regístrate para agendar tus citas</Text>

          {!!error && (
            <View style={styles.errorBox}>
              <Icon name="warning" size={18} color="#B91C1C" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre completo</Text>
              <View style={styles.inputWrap}>
                <Icon name="user" size={18} color={MC.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Tu nombre"
                  placeholderTextColor={MC.textMuted}
                  autoCapitalize="words"
                  value={name}
                  onChangeText={setName}
                />
              </View>
            </View>

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
              <Text style={styles.label}>Teléfono (opcional)</Text>
              <View style={styles.inputWrap}>
                <Icon name="phone" size={18} color={MC.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="10 dígitos"
                  placeholderTextColor={MC.textMuted}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contraseña</Text>
              <View style={styles.inputWrap}>
                <Icon name="lock" size={18} color={MC.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Mínimo 8 caracteres"
                  placeholderTextColor={MC.textMuted}
                  secureTextEntry={!showPwd}
                  value={password}
                  onChangeText={setPassword}
                  onSubmitEditing={handleRegister}
                />
                <Pressable onPress={() => setShowPwd(!showPwd)} hitSlop={8} style={styles.eyeBtn}>
                  <Icon name="eye" size={20} color={MC.textMuted} />
                </Pressable>
              </View>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.85 }]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={MC.white} />
              : <Text style={styles.btnText}>Crear cuenta</Text>
            }
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>¿Ya tienes cuenta? </Text>
            <Pressable onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.footerLink}>Inicia sesión</Text>
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
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12, marginBottom: 20 },
  errorText: { color: '#B91C1C', fontSize: 14, flex: 1 },
  form: { gap: 16, marginBottom: 28 },
  inputGroup: { gap: 6 },
  label: { fontSize: 14, fontWeight: '500', color: MC.textPrimary },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: MC.surface, borderRadius: 12, borderWidth: 1, borderColor: MC.border },
  inputIcon: { marginLeft: 14 },
  input: { flex: 1, paddingHorizontal: 12, paddingVertical: 14, fontSize: 16, color: MC.textPrimary },
  eyeBtn: { paddingHorizontal: 14 },
  btnPrimary: { backgroundColor: MC.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 20 },
  btnText: { color: MC.white, fontSize: 17, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
  footerText: { color: MC.textSecondary, fontSize: 15 },
  footerLink: { color: MC.primary, fontSize: 15, fontWeight: '600' },
});
