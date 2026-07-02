import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { LocationPicker } from "@/components/LocationPicker";
import { MC } from "@/constants/theme";
import * as api from "@/services/api";

const GENDERS = ["Masculino", "Femenino", "Otro"];

export default function DoctorLinkPatientScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<"code" | "register">("code");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [accessCode, setAccessCode] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateProv, setStateProv] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  async function handleLinkByCode() {
    if (accessCode.trim().length < 8) {
      Alert.alert("Codigo invalido", "Ingresa el codigo personal completo del paciente.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      const result = await api.linkDoctorPatient(accessCode.trim());
      Alert.alert("Paciente vinculado", result.message || "El paciente ya quedo disponible.");
      if (result.patient?.id) {
        router.replace(`/doctor/patients/${result.patient.id}` as any);
        return;
      }
      router.back();
    } catch (e: any) {
      setError(e?.message || "No se pudo vincular al paciente.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRegisterPatient() {
    if (!name.trim() || !email.trim()) {
      Alert.alert("Faltan datos", "Nombre y correo del paciente son obligatorios.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      const result = await api.registerDoctorPatient({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        gender: gender || undefined,
        birth_date: birthDate.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: stateProv.trim() || undefined,
        lat,
        lng,
      });
      Alert.alert(
        "Paciente registrado",
        result.message || "Se enviaron las credenciales al correo del paciente.",
      );
      if (result.patient_id) {
        router.replace(`/doctor/patients/${result.patient_id}` as any);
        return;
      }
      router.back();
    } catch (e: any) {
      setError(e?.message || "No se pudo registrar al paciente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={10}>
              <Icon name="arrow-left" size={22} color={MC.textPrimary} />
            </Pressable>
            <Text style={styles.headerTitle}>Vincular paciente</Text>
            <View style={{ width: 22 }} />
          </View>

          <View style={styles.hero}>
            <Text style={styles.heroEyebrow}>Privacidad primero</Text>
            <Text style={styles.heroTitle}>Expediente solo con relacion valida</Text>
            <Text style={styles.heroText}>
              Un doctor independiente ya no ve expedientes abiertos por defecto. Puede
              vincular al paciente con su codigo personal o registrarlo directamente para
              enviarle sus accesos por correo.
            </Text>
          </View>

          <View style={styles.segmentRow}>
            <SegmentButton
              active={mode === "code"}
              label="Codigo del paciente"
              onPress={() => setMode("code")}
            />
            <SegmentButton
              active={mode === "register"}
              label="Alta directa"
              onPress={() => setMode("register")}
            />
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Icon name="warning" size={16} color={MC.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {mode === "code" ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Ingresar codigo personal</Text>
              <Text style={styles.cardSubtitle}>
                El paciente te comparte su codigo de acceso y queda vinculado para poder ver
                expediente, recetas y crear citas futuras.
              </Text>
              <TextInput
                value={accessCode}
                onChangeText={setAccessCode}
                placeholder="Ej. A8K4P2QM"
                autoCapitalize="characters"
                placeholderTextColor={MC.textMuted}
                style={styles.codeInput}
              />
              <Pressable
                style={[styles.primaryButton, saving && { opacity: 0.7 }]}
                onPress={handleLinkByCode}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={MC.white} />
                ) : (
                  <>
                    <Icon name="shield-check" size={16} color={MC.white} />
                    <Text style={styles.primaryButtonText}>Vincular con codigo</Text>
                  </>
                )}
              </Pressable>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Alta directa de paciente</Text>
              <Text style={styles.cardSubtitle}>
                El sistema creara su cuenta, la vinculara contigo y enviara por correo sus
                credenciales de acceso.
              </Text>

              <Field label="Nombre completo">
                <Input value={name} onChangeText={setName} placeholder="Nombre del paciente" />
              </Field>
              <Field label="Correo">
                <Input value={email} onChangeText={setEmail} placeholder="correo@ejemplo.com" />
              </Field>
              <Field label="Telefono">
                <Input value={phone} onChangeText={setPhone} placeholder="4421234567" />
              </Field>
              <Field label="Fecha de nacimiento">
                <Input value={birthDate} onChangeText={setBirthDate} placeholder="YYYY-MM-DD" />
              </Field>

              <Text style={styles.fieldLabel}>Genero</Text>
              <View style={styles.genderRow}>
                {GENDERS.map((item) => {
                  const active = gender === item;
                  return (
                    <Pressable
                      key={item}
                      style={[styles.genderChip, active && styles.genderChipActive]}
                      onPress={() => setGender(item)}
                    >
                      <Text style={[styles.genderChipText, active && styles.genderChipTextActive]}>
                        {item}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <LocationPicker
                title="Direccion del paciente"
                subtitle="Opcional, pero ayuda a ordenar citas y sugerir doctores cercanos desde su perfil."
                value={{ address, city, state: stateProv, lat, lng }}
                onChange={(next) => {
                  setAddress(next.address);
                  setCity(next.city);
                  setStateProv(next.state);
                  setLat(next.lat);
                  setLng(next.lng);
                }}
              />

              <Pressable
                style={[styles.primaryButton, saving && { opacity: 0.7 }]}
                onPress={handleRegisterPatient}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={MC.white} />
                ) : (
                  <>
                    <Icon name="user-circle" size={16} color={MC.white} />
                    <Text style={styles.primaryButtonText}>Registrar y vincular</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SegmentButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.segmentButton, active && styles.segmentButtonActive]}
      onPress={onPress}
    >
      <Text style={[styles.segmentButtonText, active && styles.segmentButtonTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Input({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={MC.textMuted}
      style={styles.input}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MC.background },
  content: { padding: 16, paddingBottom: 36, gap: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: MC.textPrimary },
  hero: {
    borderRadius: 24,
    backgroundColor: "#E0F2FE",
    borderWidth: 1,
    borderColor: "#93C5FD",
    padding: 18,
    gap: 8,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    color: "#1D4ED8",
    letterSpacing: 0.6,
  },
  heroTitle: { fontSize: 24, fontWeight: "800", color: MC.textPrimary },
  heroText: { fontSize: 13, lineHeight: 20, color: MC.textSecondary },
  segmentRow: { flexDirection: "row", gap: 10 },
  segmentButton: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.white,
    paddingVertical: 14,
    alignItems: "center",
  },
  segmentButtonActive: {
    borderColor: MC.primary,
    backgroundColor: MC.primaryLight,
  },
  segmentButtonText: { fontSize: 13, fontWeight: "700", color: MC.textSecondary },
  segmentButtonTextActive: { color: MC.primaryDark },
  errorBox: {
    borderRadius: 14,
    backgroundColor: "#FEE2E2",
    padding: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  errorText: { flex: 1, fontSize: 13, color: MC.error },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.white,
    padding: 16,
    gap: 14,
  },
  cardTitle: { fontSize: 18, fontWeight: "700", color: MC.textPrimary },
  cardSubtitle: { fontSize: 13, lineHeight: 20, color: MC.textSecondary },
  codeInput: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 2,
    color: MC.textPrimary,
    textAlign: "center",
  },
  primaryButton: {
    borderRadius: 18,
    backgroundColor: MC.primary,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryButtonText: { fontSize: 14, fontWeight: "800", color: MC.white },
  field: { gap: 6 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: MC.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: "#FCFDFE",
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: MC.textPrimary,
  },
  genderRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  genderChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  genderChipActive: {
    borderColor: MC.primary,
    backgroundColor: MC.primaryLight,
  },
  genderChipText: { fontSize: 12, fontWeight: "600", color: MC.textSecondary },
  genderChipTextActive: { color: MC.primaryDark },
});
