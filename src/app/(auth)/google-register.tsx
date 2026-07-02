import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
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
import { MC } from '@/constants/theme';
import { getSpecialties } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { resolveAppHome } from '@/utils/role-routing';

const FALLBACK_SPECIALTIES = [
  'Cardiología',
  'Dermatología',
  'Endocrinología',
  'Gastroenterología',
  'Ginecología',
  'Hematología',
  'Infectología',
  'Medicina General',
  'Medicina Interna',
  'Nefrología',
  'Neurología',
  'Nutriología',
  'Oftalmología',
  'Oncología',
  'Ortopedia',
  'Otorrinolaringología',
  'Pediatría',
  'Psiquiatría',
  'Radiología',
  'Reumatología',
  'Traumatología',
  'Urología',
];

export default function GoogleRegisterScreen() {
  const router = useRouter();
  const {
    pendingGoogleSignup,
    completeGoogleSignup,
    clearPendingGoogleSignup,
  } = useAuthStore();

  const [role, setRole] = useState<'doctor' | 'patient' | null>(null);
  const [cedula, setCedula] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [city, setCity] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [phone, setPhone] = useState('');
  const [specialties, setSpecialties] = useState<string[]>(FALLBACK_SPECIALTIES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [doctorSuccess, setDoctorSuccess] = useState('');

  useEffect(() => {
    if (!pendingGoogleSignup) {
      router.replace('/(auth)/login');
      return;
    }

    let active = true;
    getSpecialties()
      .then((res) => {
        if (!active) return;
        const names = (res.data ?? [])
          .map((item) => item.name?.trim())
          .filter((value): value is string => Boolean(value));
        if (names.length > 0) {
          setSpecialties(names);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [pendingGoogleSignup, router]);

  if (!pendingGoogleSignup) {
    return null;
  }

  const handleSubmit = async () => {
    if (!role) {
      setError('Selecciona si deseas registrarte como doctor o paciente.');
      return;
    }

    if (role === 'doctor' && (!cedula.trim() || !specialty.trim() || !city.trim())) {
      setError('Cédula, especialidad y ciudad son obligatorios para doctores.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await completeGoogleSignup({
        role,
        cedula: cedula.trim() || undefined,
        specialty: specialty.trim() || undefined,
        city: city.trim() || undefined,
        birth_date: birthDate.trim() || undefined,
        gender: gender || undefined,
        phone: phone.trim() || undefined,
      });

      if (result === 'pending_approval') {
        setDoctorSuccess('Registro completado. Tu cuenta de doctor quedó pendiente de aprobación.');
        return;
      }

      router.replace(resolveAppHome(useAuthStore.getState().user?.role));
    } catch (e: any) {
      setError(e.message ?? 'No se pudo completar tu registro con Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    clearPendingGoogleSignup();
    router.replace('/(auth)/login');
  };

  const avatarLetter = pendingGoogleSignup.name.trim().charAt(0).toUpperCase() || 'D';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Pressable style={styles.backBtn} onPress={handleBackToLogin} hitSlop={10}>
            <Icon name="arrow-left" size={24} color={MC.textPrimary} />
          </Pressable>

          <Text style={styles.title}>Casi listo</Text>
          <Text style={styles.subtitle}>
            Verificamos tu cuenta de Google. Elige cómo usarás DoctorCloud y completa tu perfil.
          </Text>

          <View style={styles.accountCard}>
            {pendingGoogleSignup.avatar_url ? (
              <View style={styles.avatarWrap}>
                <Text style={styles.avatarLetter}>{avatarLetter}</Text>
              </View>
            ) : (
              <View style={styles.avatarWrap}>
                <Text style={styles.avatarLetter}>{avatarLetter}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.accountName}>{pendingGoogleSignup.name}</Text>
              <Text style={styles.accountEmail}>{pendingGoogleSignup.email}</Text>
            </View>
          </View>

          {doctorSuccess ? (
            <View style={styles.successCard}>
              <Text style={styles.successTitle}>Solicitud enviada</Text>
              <Text style={styles.successText}>{doctorSuccess}</Text>
              <Pressable style={styles.btnPrimary} onPress={handleBackToLogin}>
                <Text style={styles.btnText}>Volver a iniciar sesión</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {!!error && (
                <View style={styles.errorBox}>
                  <Icon name="warning" size={18} color="#B91C1C" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <Text style={styles.sectionLabel}>¿Cómo usarás DoctorCloud?</Text>
              <View style={styles.roleRow}>
                <Pressable
                  style={[styles.roleCard, role === 'doctor' && styles.roleCardActive]}
                  onPress={() => setRole('doctor')}
                >
                  <Text style={[styles.roleTitle, role === 'doctor' && styles.roleTitleActive]}>
                    Soy Doctor
                  </Text>
                  <Text style={styles.roleDesc}>Gestiona pacientes y consultas</Text>
                </Pressable>
                <Pressable
                  style={[styles.roleCard, role === 'patient' && styles.roleCardActive]}
                  onPress={() => setRole('patient')}
                >
                  <Text style={[styles.roleTitle, role === 'patient' && styles.roleTitleActive]}>
                    Soy Paciente
                  </Text>
                  <Text style={styles.roleDesc}>Agenda citas y guarda tu historial</Text>
                </Pressable>
              </View>

              <View style={styles.readonlyCard}>
                <Text style={styles.readonlyLabel}>Correo Google</Text>
                <Text style={styles.readonlyValue}>{pendingGoogleSignup.email}</Text>
              </View>

              {role === 'doctor' && (
                <View style={styles.form}>
                  <Field label="Cédula profesional" value={cedula} onChangeText={setCedula} />
                  <Field label="Teléfono" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                  <Text style={styles.fieldLabel}>Especialidad</Text>
                  <View style={styles.chipWrap}>
                    {specialties.map((item) => {
                      const active = specialty === item;
                      return (
                        <Pressable
                          key={item}
                          style={[styles.chip, active && styles.chipActive]}
                          onPress={() => setSpecialty(item)}
                        >
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>{item}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Field label="Ciudad" value={city} onChangeText={setCity} />
                </View>
              )}

              {role === 'patient' && (
                <View style={styles.form}>
                  <Field
                    label="Fecha de nacimiento"
                    value={birthDate}
                    onChangeText={setBirthDate}
                    placeholder="YYYY-MM-DD"
                  />
                  <Field label="Teléfono (opcional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                  <Text style={styles.fieldLabel}>Género</Text>
                  <View style={styles.chipWrap}>
                    {[
                      { label: 'Masculino', value: 'M' },
                      { label: 'Femenino', value: 'F' },
                      { label: 'Otro', value: 'O' },
                    ].map((item) => {
                      const active = gender === item.value;
                      return (
                        <Pressable
                          key={item.value}
                          style={[styles.chip, active && styles.chipActive]}
                          onPress={() => setGender(item.value)}
                        >
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.btnPrimary,
                  pressed && { opacity: 0.85 },
                  (!role || loading) && { opacity: 0.7 },
                ]}
                onPress={handleSubmit}
                disabled={!role || loading}
              >
                {loading ? (
                  <ActivityIndicator color={MC.white} />
                ) : (
                  <Text style={styles.btnText}>Completar registro</Text>
                )}
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={MC.textMuted}
        keyboardType={keyboardType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MC.background },
  scroll: { flexGrow: 1, padding: 24, gap: 18 },
  backBtn: { marginBottom: 6, alignSelf: 'flex-start' },
  title: { fontSize: 28, fontWeight: '700', color: MC.textPrimary },
  subtitle: { fontSize: 15, color: MC.textSecondary, lineHeight: 22 },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: MC.surface,
    borderWidth: 1,
    borderColor: MC.border,
    borderRadius: 18,
    padding: 16,
    marginTop: 6,
  },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: MC.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { color: MC.white, fontSize: 22, fontWeight: '700' },
  accountName: { color: MC.textPrimary, fontSize: 16, fontWeight: '700' },
  accountEmail: { color: MC.textSecondary, fontSize: 13, marginTop: 4 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: 12,
  },
  errorText: { color: '#B91C1C', fontSize: 14, flex: 1 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: MC.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 8,
  },
  roleRow: { flexDirection: 'row', gap: 12 },
  roleCard: {
    flex: 1,
    backgroundColor: MC.surface,
    borderWidth: 1.5,
    borderColor: MC.border,
    borderRadius: 18,
    padding: 16,
  },
  roleCardActive: {
    borderColor: MC.primary,
    backgroundColor: '#E9F7FA',
  },
  roleTitle: { fontSize: 16, fontWeight: '700', color: MC.textPrimary, marginBottom: 6 },
  roleTitleActive: { color: MC.primaryDark },
  roleDesc: { fontSize: 13, color: MC.textSecondary, lineHeight: 18 },
  readonlyCard: {
    backgroundColor: '#F3F6FB',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: MC.border,
  },
  readonlyLabel: { color: MC.textSecondary, fontSize: 12, marginBottom: 4 },
  readonlyValue: { color: MC.textPrimary, fontSize: 15, fontWeight: '600' },
  form: { gap: 14 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 14, fontWeight: '500', color: MC.textPrimary },
  input: {
    backgroundColor: MC.surface,
    borderWidth: 1,
    borderColor: MC.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: MC.textPrimary,
    fontSize: 16,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: MC.surface,
    borderWidth: 1,
    borderColor: MC.border,
  },
  chipActive: {
    backgroundColor: '#DDF7F7',
    borderColor: MC.primary,
  },
  chipText: { color: MC.textSecondary, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: MC.primaryDark },
  btnPrimary: {
    backgroundColor: MC.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: { color: MC.white, fontSize: 17, fontWeight: '600' },
  successCard: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 18,
    padding: 18,
    gap: 12,
  },
  successTitle: { color: '#065F46', fontSize: 18, fontWeight: '700' },
  successText: { color: '#065F46', fontSize: 14, lineHeight: 22 },
});
