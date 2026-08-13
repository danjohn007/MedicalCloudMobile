import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
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
  "Cardiología",
  "Dermatología",
  "Endocrinologia",
  "Gastroenterologia",
  "Ginecología",
  "Medicina General",
  "Medicina Interna",
  "Neurología",
  "Nutriologia",
  "Oftalmología",
  "Oncologia",
  "Ortopedia",
  "Otorrinolaringologia",
  "Pediatría",
  "Psiquiatría",
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
  const socialProviderLabel = pendingGoogleSignup?.provider === "apple" ? "Apple" : "Google";

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
  const [acceptedTermsPrivacy, setAcceptedTermsPrivacy] = useState(false);
  const [acceptedSensitiveHealthData, setAcceptedSensitiveHealthData] = useState(false);
  const [confirmedAdultOrGuardian, setConfirmedAdultOrGuardian] = useState(false);

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
      setError("Cédula, especialidad y ciudad son obligatorios para doctores.");
      return;
    }
    if (!acceptedTermsPrivacy) {
      setError("Debes leer y aceptar los términos y el aviso de privacidad.");
      return;
    }
    if (!acceptedSensitiveHealthData) {
      setError("Debes autorizar expresamente el tratamiento de datos sensibles de salud.");
      return;
    }
    if (!confirmedAdultOrGuardian) {
      setError(
        role === "doctor"
          ? "Debes confirmar que eres mayor de edad y estás facultado para crear esta cuenta."
          : "Debes confirmar que eres mayor de edad o que actúas como madre, padre o tutor.",
      );
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
            accepted_terms_privacy: true,
            sensitive_health_data_consent: true,
            adult_or_guardian_confirmation: true,
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
        accepted_terms_privacy: true,
        sensitive_health_data_consent: true,
        adult_or_guardian_confirmation: true,
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
              ? `Terminamos de validar ${socialProviderLabel}. Solo confirma tu información para cerrar el alta.`
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
                  <Icon name="warning" size={18} color={MC.error} />
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
                    <ReadonlyField label={`Correo de ${socialProviderLabel}`} value={email} />
                    <ReadonlyField
                      label="Contraseña"
                      value={`Protegida por ${socialProviderLabel}`}
                      hint={`Este acceso ya queda ligado a tu cuenta de ${socialProviderLabel}.`}
                    />
                  </>
                ) : (
                  <>
                    <Field
                      label="Correo electrónico"
                      value={email}
                      onChangeText={setEmail}
                      placeholder="correo@ejemplo.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    <Field
                      label="Contraseña"
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Mínimo 8 caracteres"
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
                  label="Teléfono"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="10 digitos"
                  keyboardType="phone-pad"
                />

                {role === "doctor" ? (
                  <>
                    <Field
                      label="Cédula profesional"
                      value={cedula}
                      onChangeText={setCedula}
                      placeholder="Tu cédula"
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
                    <Text style={styles.patientHintTitle}>Código personal del paciente</Text>
                    <Text style={styles.patientHintText}>
                      Tu código de 8 caracteres se genera automáticamente al terminar el alta y
                      luego lo verás en tu perfil y panel principal.
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.consentCard}>
                <Text style={styles.consentTitle}>Privacidad y autorizaciones</Text>
                <Text style={styles.consentIntro}>
                  Estas autorizaciones quedan registradas junto con la versión vigente de los
                  documentos y la fecha de aceptación.
                </Text>
                <ConsentRow
                  checked={acceptedTermsPrivacy}
                  onToggle={() => setAcceptedTermsPrivacy((value) => !value)}
                >
                  <Text style={styles.consentText}>
                    He leído y acepto los{" "}
                    <Text
                      style={styles.consentLink}
                      onPress={(event) => {
                        event.stopPropagation();
                        void Linking.openURL("https://doctorcloud.digital/app/terminos");
                      }}
                    >
                      términos
                    </Text>
                    {" "}y el{" "}
                    <Text
                      style={styles.consentLink}
                      onPress={(event) => {
                        event.stopPropagation();
                        void Linking.openURL("https://doctorcloud.digital/app/privacidad");
                      }}
                    >
                      aviso de privacidad
                    </Text>
                    .
                  </Text>
                </ConsentRow>
                <ConsentRow
                  checked={acceptedSensitiveHealthData}
                  onToggle={() => setAcceptedSensitiveHealthData((value) => !value)}
                >
                  <Text style={styles.consentText}>
                    {role === "doctor"
                      ? "Reconozco que Doctor Cloud tratará datos sensibles de los pacientes que gestione y confirmo que sólo incorporaré información cuando cuente con las facultades y autorizaciones necesarias."
                      : "Consiento de manera expresa el tratamiento de mis datos personales sensibles de salud para prestar las funciones médicas que decida utilizar."}
                  </Text>
                </ConsentRow>
                <ConsentRow
                  checked={confirmedAdultOrGuardian}
                  onToggle={() => setConfirmedAdultOrGuardian((value) => !value)}
                >
                  <Text style={styles.consentText}>
                    {role === "doctor"
                      ? "Confirmo que soy mayor de edad y estoy facultado para crear y administrar esta cuenta profesional."
                      : "Confirmo que soy mayor de edad o que actúo como madre, padre o tutor con facultades para proporcionar estos datos."}
                  </Text>
                </ConsentRow>
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

function ConsentRow({
  checked,
  onToggle,
  children,
}: {
  checked: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onToggle}
      style={styles.consentRow}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked ? <Icon name="check" size={15} color={MC.white} /> : null}
      </View>
      <View style={styles.consentCopy}>{children}</View>
    </Pressable>
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
    backgroundColor: MC.errorSoft,
    borderRadius: 12,
    padding: 12,
  },
  errorText: { color: MC.error, fontSize: 14, flex: 1 },
  successCard: {
    borderRadius: 18,
    backgroundColor: MC.successSoft,
    borderWidth: 1,
    borderColor: MC.successBorder,
    padding: 18,
    gap: 10,
  },
  successTitle: { fontSize: 18, fontWeight: "700", color: MC.success },
  successText: { fontSize: 14, lineHeight: 21, color: MC.success },
  form: { gap: 14 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 14, fontWeight: "600", color: MC.textPrimary },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: MC.card,
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
    backgroundColor: MC.surface,
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
    backgroundColor: MC.card,
    borderWidth: 1,
    borderColor: MC.border,
  },
  chipActive: {
    backgroundColor: MC.primaryLight,
    borderColor: MC.primary,
  },
  chipText: { color: MC.textSecondary, fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: MC.primaryDark },
  patientHintCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.input,
    padding: 14,
    gap: 6,
  },
  patientHintTitle: { fontSize: 14, fontWeight: "700", color: MC.textPrimary },
  patientHintText: { fontSize: 13, lineHeight: 20, color: MC.textSecondary },
  consentCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: MC.infoBorder,
    backgroundColor: MC.card,
    padding: 16,
    gap: 13,
  },
  consentTitle: { color: MC.textPrimary, fontSize: 16, fontWeight: "800" },
  consentIntro: { color: MC.textSecondary, fontSize: 12.5, lineHeight: 19 },
  consentRow: { flexDirection: "row", alignItems: "flex-start", gap: 11 },
  checkbox: {
    width: 23,
    height: 23,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: MC.border,
    backgroundColor: MC.surface,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkboxChecked: { borderColor: MC.primary, backgroundColor: MC.primary },
  consentCopy: { flex: 1 },
  consentText: { color: MC.textSecondary, fontSize: 13, lineHeight: 20 },
  consentLink: { color: MC.primary, fontWeight: "800", textDecorationLine: "underline" },
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
