import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon } from "@/components/Icon";
import { MC } from "@/constants/theme";
import { getSpecialties } from "@/services/api";
import { useAuthStore } from "@/stores/authStore";
import { resolveAppHome } from "@/utils/role-routing";

const FALLBACK_SPECIALTIES = [
  "Cardiologia",
  "Dermatologia",
  "Endocrinologia",
  "Gastroenterologia",
  "Ginecologia",
  "Medicina General",
  "Medicina Interna",
  "Neurologia",
  "Nutriologia",
  "Oftalmologia",
  "Oncologia",
  "Ortopedia",
  "Otorrinolaringologia",
  "Pediatria",
  "Psiquiatria",
  "Traumatologia",
  "Urologia",
];

export default function RegisterDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string | string[]; google?: string | string[] }>();
  const roleParam = Array.isArray(params.role) ? params.role[0] : params.role;
  const googleParam = Array.isArray(params.google) ? params.google[0] : params.google;
  const role = roleParam === "doctor" ? "doctor" : roleParam === "patient" ? "patient" : null;
  const isGoogle = googleParam === "1";

  const { register, completeGoogleSignup, pendingGoogleSignup, clearPendingGoogleSignup } =
    useAuthStore();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [cedula, setCedula] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [city, setCity] = useState("");
  const [stateProv, setStateProv] = useState("");
  const [specialties, setSpecialties] = useState<string[]>(FALLBACK_SPECIALTIES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingApprovalMessage, setPendingApprovalMessage] = useState("");

  useEffect(() => {
    if (!role) {
      router.replace(isGoogle ? "/(auth)/google-register" : "/(auth)/register");
      return;
    }

    if (isGoogle) {
      if (!pendingGoogleSignup) {
        router.replace("/(auth)/login");
        return;
      }
      setName(pendingGoogleSignup.name);
      setEmail(pendingGoogleSignup.email);
      return;
    }

    setEmail("");
    setPassword("");
  }, [isGoogle, pendingGoogleSignup, role, router]);

  useEffect(() => {
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
  }, []);

  const roleLabel = useMemo(() => (role === "doctor" ? "Doctor" : "Paciente"), [role]);

  if (!role) {
    return null;
  }

  const handleBack = () => {
    if (loading) return;
    router.back();
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }

    if (!isGoogle) {
      if (!email.trim()) {
        setError("El correo es obligatorio.");
        return;
      }
      if (password.length < 8) {
        setError("La contraseña debe tener al menos 8 caracteres.");
        return;
      }
    }

    if (role === "doctor" && (!cedula.trim() || !specialty.trim() || !city.trim())) {
      setError("Cedula, especialidad y ciudad son obligatorios para doctores.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (isGoogle) {
          const result = await completeGoogleSignup({
            role,
            name: name.trim(),
            phone: phone.trim() || undefined,
            cedula: cedula.trim() || undefined,
            specialty: specialty.trim() || undefined,
            city: city.trim() || undefined,
            state: stateProv.trim() || undefined,
          });

        if (result === "pending_approval") {
          setPendingApprovalMessage(
            "Registro completado. Tu cuenta de doctor quedó pendiente de aprobación.",
          );
          return;
        }

        router.replace(resolveAppHome(useAuthStore.getState().user?.role));
        return;
      }

      const result = await register({
        role,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim() || undefined,
        cedula: cedula.trim() || undefined,
        specialty: specialty.trim() || undefined,
        city: city.trim() || undefined,
        state: stateProv.trim() || undefined,
      });

      if (result === "pending_approval") {
        setPendingApprovalMessage(
          "Registro completado. Tu cuenta de doctor quedó pendiente de aprobación.",
        );
        return;
      }

      router.replace(resolveAppHome(useAuthStore.getState().user?.role));
    } catch (e: any) {
      setError(e.message ?? "No se pudo completar tu registro.");
    } finally {
      setLoading(false);
    }
  };

  const handlePendingExit = () => {
    clearPendingGoogleSignup();
    router.replace("/(auth)/login");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Pressable style={styles.backBtn} onPress={handleBack} hitSlop={10}>
            <Icon name="arrow-left" size={24} color={MC.textPrimary} />
          </Pressable>

          <Text style={styles.title}>
            {isGoogle ? `Completa tu perfil de ${roleLabel}` : `Registro de ${roleLabel}`}
          </Text>
          <Text style={styles.subtitle}>
            {isGoogle
              ? "Terminamos de validar Google. Solo confirma tu informacion para cerrar el alta."
              : "Completa el formulario para crear tu cuenta con el perfil correcto."}
          </Text>

          {pendingApprovalMessage ? (
            <View style={styles.successCard}>
              <Text style={styles.successTitle}>Solicitud enviada</Text>
              <Text style={styles.successText}>{pendingApprovalMessage}</Text>
              <Pressable style={styles.btnPrimary} onPress={handlePendingExit}>
                <Text style={styles.btnText}>Volver a iniciar sesión</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {!!error ? (
                <View style={styles.errorBox}>
                  <Icon name="warning" size={18} color="#B91C1C" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.form}>
                <Field
                  label="Nombre completo"
                  value={name}
                  onChangeText={setName}
                  placeholder="Tu nombre"
                />

                {isGoogle ? (
                  <>
                    <ReadonlyField label="Correo de Google" value={email} />
                    <ReadonlyField
                      label="Contrasena"
                      value="Protegida por Google"
                      hint="Este acceso ya queda ligado a tu cuenta de Google."
                    />
                  </>
                ) : (
                  <>
                    <Field
                      label="Correo electronico"
                      value={email}
                      onChangeText={setEmail}
                      placeholder="correo@ejemplo.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    <Field
                      label="Contrasena"
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Minimo 8 caracteres"
                      secureTextEntry={!showPwd}
                      trailing={
                        <Pressable onPress={() => setShowPwd((value) => !value)} hitSlop={8}>
                          <Icon name="eye" size={20} color={MC.textMuted} />
                        </Pressable>
                      }
                    />
                  </>
                )}

                <Field
                  label="Telefono"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="10 digitos"
                  keyboardType="phone-pad"
                />

                {role === "doctor" ? (
                  <>
                    <Field
                      label="Cedula profesional"
                      value={cedula}
                      onChangeText={setCedula}
                      placeholder="Tu cedula"
                    />
                    <Field
                      label="Especialidad"
                      value={specialty}
                      onChangeText={setSpecialty}
                      placeholder="Ej. Medicina General"
                    />
                    <View style={styles.chipWrap}>
                      {specialties.map((item) => {
                        const active = specialty === item;
                        return (
                          <Pressable
                            key={item}
                            style={[styles.chip, active && styles.chipActive]}
                            onPress={() => setSpecialty(item)}
                          >
                            <Text style={[styles.chipText, active && styles.chipTextActive]}>
                              {item}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <Field
                      label="Ciudad"
                      value={city}
                      onChangeText={setCity}
                      placeholder="Tu ciudad"
                    />
                    <Field
                      label="Estado"
                      value={stateProv}
                      onChangeText={setStateProv}
                      placeholder="Tu estado"
                    />
                  </>
                ) : (
                  <View style={styles.patientHintCard}>
                    <Text style={styles.patientHintTitle}>Codigo personal del paciente</Text>
                    <Text style={styles.patientHintText}>
                      Tu código de 8 caracteres se genera automáticamente al terminar el alta y
                      luego lo veras en tu perfil y dashboard.
                    </Text>
                  </View>
                )}
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.btnPrimary,
                  pressed && { opacity: 0.88 },
                  loading && { opacity: 0.7 },
                ]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={MC.white} />
                ) : (
                  <Text style={styles.btnText}>
                    {isGoogle ? "Completar registro" : "Crear cuenta"}
                  </Text>
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
  autoCapitalize = "sentences",
  secureTextEntry = false,
  trailing,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words";
  secureTextEntry?: boolean;
  trailing?: ReactNode;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={MC.textMuted}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secureTextEntry}
        />
        {trailing ? <View style={styles.trailingWrap}>{trailing}</View> : null}
      </View>
    </View>
  );
}

function ReadonlyField({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.readonlyField}>
        <Text style={styles.readonlyValue}>{value}</Text>
      </View>
      {hint ? <Text style={styles.readonlyHint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MC.background },
  scroll: { flexGrow: 1, padding: 24, gap: 18 },
  backBtn: { alignSelf: "flex-start" },
  title: { fontSize: 28, fontWeight: "700", color: MC.textPrimary },
  subtitle: { fontSize: 15, color: MC.textSecondary, lineHeight: 22 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    padding: 12,
  },
  errorText: { color: "#B91C1C", fontSize: 14, flex: 1 },
  successCard: {
    borderRadius: 18,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    padding: 18,
    gap: 10,
  },
  successTitle: { fontSize: 18, fontWeight: "700", color: "#047857" },
  successText: { fontSize: 14, lineHeight: 21, color: "#047857" },
  form: { gap: 14 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 14, fontWeight: "600", color: MC.textPrimary },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: MC.white,
    borderWidth: 1,
    borderColor: MC.border,
    borderRadius: 14,
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: MC.textPrimary,
    fontSize: 16,
  },
  trailingWrap: { paddingRight: 14 },
  readonlyField: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: "#EEF2F7",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  readonlyValue: { color: MC.textSecondary, fontSize: 15, fontWeight: "600" },
  readonlyHint: { color: MC.textMuted, fontSize: 12, lineHeight: 18 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: MC.white,
    borderWidth: 1,
    borderColor: MC.border,
  },
  chipActive: {
    backgroundColor: "#DDF7F7",
    borderColor: MC.primary,
  },
  chipText: { color: MC.textSecondary, fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: MC.primaryDark },
  patientHintCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: "#F8FAFC",
    padding: 14,
    gap: 6,
  },
  patientHintTitle: { fontSize: 14, fontWeight: "700", color: MC.textPrimary },
  patientHintText: { fontSize: 13, lineHeight: 20, color: MC.textSecondary },
  btnPrimary: {
    backgroundColor: MC.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  btnText: { color: MC.white, fontSize: 16, fontWeight: "700" },
});
