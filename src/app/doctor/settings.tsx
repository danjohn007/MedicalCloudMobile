import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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

const DURATION_OPTIONS = [20, 30, 40, 45, 60];
const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

export default function DoctorSettingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [subspecialty, setSubspecialty] = useState("");
  const [bio, setBio] = useState("");
  const [consultationFee, setConsultationFee] = useState("");
  const [telemedicineFee, setTelemedicineFee] = useState("");
  const [homeVisitFee, setHomeVisitFee] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateProv, setStateProv] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  useEffect(() => {
    void loadDoctor();
  }, []);

  async function loadDoctor() {
    try {
      setLoading(true);
      setError("");

      const profile = await api.getDoctorSettings();
      const doctor = profile.data;
      setAvatarUrl(doctor.avatar_url ?? doctor.photo ?? null);
      setName(doctor.name || "");
      setSpecialty(doctor.specialty || "");
      setSubspecialty(doctor?.subspecialty || "");
      setBio(doctor?.bio || "");
      setConsultationFee(
        doctor?.consultation_fee != null ? String(doctor.consultation_fee) : "",
      );
      setTelemedicineFee(
        doctor?.telemedicine_fee != null ? String(doctor.telemedicine_fee) : "",
      );
      setHomeVisitFee(
        doctor?.home_visit_fee != null ? String(doctor.home_visit_fee) : "",
      );
      setDurationMinutes(
        doctor?.duration_minutes != null ? String(doctor.duration_minutes) : "30",
      );
      setAddress(doctor?.address || "");
      setCity(doctor?.city || "");
      setStateProv(doctor?.state || "");
      setLat(typeof doctor?.lat === "number" ? doctor.lat : null);
      setLng(typeof doctor?.lng === "number" ? doctor.lng : null);
    } catch (e: any) {
      setError(e?.message || "No se pudo cargar la configuración del doctor.");
    } finally {
      setLoading(false);
    }
  }

  const pricingPreview = useMemo(() => {
    const items = [
      { label: "Consulta", value: Number(consultationFee || 0) },
      { label: "Virtual", value: Number(telemedicineFee || 0) },
      { label: "Domicilio", value: Number(homeVisitFee || 0) },
    ];
    return items.map((item) => ({
      ...item,
      formatted: item.value > 0 ? money.format(item.value) : "Sin definir",
    }));
  }, [consultationFee, telemedicineFee, homeVisitFee]);

  async function pickAvatar() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Permiso requerido",
          "Necesitas permitir acceso a fotos para cambiar el avatar.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.85,
      });
      if (result.canceled || !result.assets?.length) return;

      const img = result.assets[0];
      const ext = (img.uri.split(".").pop() || "jpg").toLowerCase();
      const fileName = `doctor_avatar_${Date.now()}.${ext}`;
      const type = img.mimeType || `image/${ext === "jpg" ? "jpeg" : ext}`;
      const upload = await api.uploadAvatar({ uri: img.uri, name: fileName, type });

      setAvatarUrl(upload.url);
      setSuccess("Avatar actualizado.");
      setTimeout(() => setSuccess(""), 2400);
    } catch (e: any) {
      setError(e?.message || "No se pudo actualizar el avatar.");
    }
  }

  async function handleSave() {
    if (!name.trim() || !specialty.trim()) {
      Alert.alert("Faltan datos", "Nombre y especialidad son obligatorios.");
      return;
    }

    if (Number(consultationFee || 0) <= 0 || Number(telemedicineFee || 0) <= 0) {
      Alert.alert(
        "Tarifas requeridas",
        "La consulta presencial y la videoconsulta deben ser mayores a 0 para que el doctor aparezca en el listado.",
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");
      await api.updateDoctorProfile({
        name: name.trim(),
        specialty: specialty.trim(),
        subspecialty: subspecialty.trim() || undefined,
        bio: bio.trim() || undefined,
        consultation_fee: Number(consultationFee || 0),
        telemedicine_fee: Number(telemedicineFee || 0),
        home_visit_fee: Number(homeVisitFee || 0),
        duration_minutes: Number(durationMinutes || 30),
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: stateProv.trim() || undefined,
        lat,
        lng,
      });
      setSuccess("Configuración del doctor actualizada.");
      setTimeout(() => setSuccess(""), 3200);
    } catch (e: any) {
      setError(e?.message || "No se pudo guardar la configuración.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingWrap} edges={["top"]}>
        <ActivityIndicator size="large" color={MC.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={10}>
              <Icon name="arrow-left" size={22} color={MC.textPrimary} />
            </Pressable>
            <Text style={styles.headerTitle}>Configuración general</Text>
            <Pressable onPress={() => router.push("/doctor/availability" as any)} hitSlop={10}>
              <Icon name="calendar" size={20} color={MC.primary} />
            </Pressable>
          </View>

          <View style={styles.hero}>
            <View style={styles.heroTop}>
              <Pressable style={styles.avatar} onPress={pickAvatar}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>
                    {(name || "D").charAt(0).toUpperCase()}
                  </Text>
                )}
              </Pressable>
              <View style={styles.heroBody}>
                <Text style={styles.heroEyebrow}>Workspace doctor</Text>
                <Text style={styles.heroTitle}>{name || "Doctor"}</Text>
                <Text style={styles.heroSubtitle}>
                  {specialty || "Especialidad pendiente"}
                </Text>
              </View>
            </View>

            <View style={styles.heroPills}>
              <HeroPill icon="wallet" label={pricingPreview[0]?.formatted || "Sin tarifa"} />
              <HeroPill icon="clock" label={`${durationMinutes || "30"} min`} />
              <HeroPill icon="map-pin" label={city || "Ciudad pendiente"} />
            </View>
          </View>

          <Banner
            icon="info"
            tone="info"
            text="Las tarifas presenciales y de videoconsulta deben quedar arriba de 0 para que este doctor aparezca en el buscador de pacientes."
          />

          {error ? (
            <Banner icon="warning" tone="error" text={error} />
          ) : null}
          {success ? (
            <Banner icon="check-circle" tone="success" text={success} />
          ) : null}

          <SectionCard
            icon="user-circle"
            title="Identidad clínica"
            subtitle="Lo que ve el paciente y lo que usa tu panel para presentarte."
          >
            <Field label="Nombre visible">
              <Input value={name} onChangeText={setName} placeholder="Tu nombre profesional" />
            </Field>
            <Row>
              <Col>
                <Field label="Especialidad">
                  <Input
                    value={specialty}
                    onChangeText={setSpecialty}
                    placeholder="Cardiologia"
                  />
                </Field>
              </Col>
              <Col>
                <Field label="Subespecialidad">
                  <Input
                    value={subspecialty}
                    onChangeText={setSubspecialty}
                    placeholder="Ej. ecocardiografia"
                  />
                </Field>
              </Col>
            </Row>
            <Field label="Bio profesional">
              <MultilineInput
                value={bio}
                onChangeText={setBio}
                placeholder="Describe tu enfoque, experiencia y tipo de consulta."
              />
            </Field>
          </SectionCard>

          <SectionCard
            icon="wallet"
            title="Tarifas y duracion"
            subtitle="Precios base del consultorio para cada modalidad de cita."
          >
            <Row>
              <Col>
                <Field label="Consulta presencial">
                  <Input
                    value={consultationFee}
                    onChangeText={setConsultationFee}
                    placeholder="500"
                    keyboardType="numeric"
                  />
                </Field>
              </Col>
              <Col>
                <Field label="Videoconsulta">
                  <Input
                    value={telemedicineFee}
                    onChangeText={setTelemedicineFee}
                    placeholder="600"
                    keyboardType="numeric"
                  />
                </Field>
              </Col>
            </Row>
            <Field label="Visita a domicilio">
              <Input
                value={homeVisitFee}
                onChangeText={setHomeVisitFee}
                placeholder="0"
                keyboardType="numeric"
              />
            </Field>

            <Text style={styles.subLabel}>Duracion por consulta</Text>
            <View style={styles.chipRow}>
              {DURATION_OPTIONS.map((minutes) => {
                const active = durationMinutes === String(minutes);
                return (
                  <Pressable
                    key={minutes}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setDurationMinutes(String(minutes))}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {minutes} min
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.previewGrid}>
              {pricingPreview.map((item) => (
                <View key={item.label} style={styles.previewCard}>
                  <Text style={styles.previewLabel}>{item.label}</Text>
                  <Text style={styles.previewValue}>{item.formatted}</Text>
                </View>
              ))}
            </View>
          </SectionCard>

          <SectionCard
            icon="map-pin"
            title="Consultorio"
            subtitle="Ubicación y contexto general para pacientes y agenda."
          >
            <LocationPicker
              title="Dirección del consultorio"
              subtitle="Puedes usar tu ubicación actual como sugerencia, escribir la dirección manualmente o fijarla tocando el mapa."
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
              style={styles.inlineLink}
              onPress={() => router.push("/doctor/availability" as any)}
            >
              <Icon name="calendar" size={16} color={MC.primaryDark} />
              <Text style={styles.inlineLinkText}>Abrir horarios y disponibilidad</Text>
            </Pressable>
          </SectionCard>

          <SectionCard
            icon="file"
            title="Documentos y expediente"
            subtitle="Atajo rapido al bloque pendiente de documentos desde la app."
          >
            <Text style={styles.cardText}>
              La ficha del doctor ya tiene acceso a pacientes, historial y recetas.
              El siguiente salto natural es subir estudios y mover documentos del
              expediente desde móvil.
            </Text>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => router.push("/doctor/documents" as any)}
            >
              <Icon name="file" size={16} color={MC.primaryDark} />
              <Text style={styles.secondaryButtonText}>Abrir hub de documentos</Text>
            </Pressable>
          </SectionCard>

          {error ? <ActionStatus tone="error" text={error} /> : null}
          {success ? <ActionStatus tone="success" text={success} /> : null}

          <View style={styles.actions}>
            <Pressable style={styles.cancelButton} onPress={() => router.back()}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[styles.saveButton, saving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={MC.white} size="small" />
              ) : (
                <>
                  <Icon name="check-circle" size={16} color={MC.white} />
                  <Text style={styles.saveButtonText}>Guardar diseño</Text>
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SectionCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ComponentProps<typeof Icon>["name"];
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <Icon name={icon} size={18} color={MC.primaryDark} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        </View>
      </View>
      {children}
    </View>
  );
}

function Banner({
  icon,
  tone,
  text,
}: {
  icon: React.ComponentProps<typeof Icon>["name"];
  tone: "info" | "success" | "error";
  text: string;
}) {
  const palette = {
    info: { bg: "#E0F2FE", fg: "#075985", border: "#7DD3FC" },
    success: { bg: "#ECFDF5", fg: "#047857", border: "#6EE7B7" },
    error: { bg: "#FEE2E2", fg: "#B91C1C", border: "#FCA5A5" },
  }[tone];

  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: palette.bg, borderColor: palette.border },
      ]}
    >
      <Icon name={icon} size={16} color={palette.fg} />
      <Text style={[styles.bannerText, { color: palette.fg }]}>{text}</Text>
    </View>
  );
}

function HeroPill({
  icon,
  label,
}: {
  icon: React.ComponentProps<typeof Icon>["name"];
  label: string;
}) {
  return (
    <View style={styles.heroPill}>
      <Icon name={icon} size={14} color={MC.white} />
      <Text style={styles.heroPillText}>{label}</Text>
    </View>
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

function Row({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

function Col({ children }: { children: React.ReactNode }) {
  return <View style={styles.col}>{children}</View>;
}

function Input({
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "numeric";
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      keyboardType={keyboardType}
      style={styles.input}
      placeholderTextColor={MC.textMuted}
    />
  );
}

function ActionStatus({
  tone,
  text,
}: {
  tone: "success" | "error";
  text: string;
}) {
  const success = tone === "success";
  return (
    <View style={[styles.actionStatus, success ? styles.actionStatusOk : styles.actionStatusError]}>
      <Icon name={success ? "check-circle" : "warning"} size={16} color={success ? MC.success : MC.error} />
      <Text style={[styles.actionStatusText, { color: success ? MC.success : MC.error }]}>
        {text}
      </Text>
    </View>
  );
}

function MultilineInput({
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
      style={[styles.input, styles.textArea]}
      multiline
      textAlignVertical="top"
      placeholderTextColor={MC.textMuted}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MC.background },
  loadingWrap: {
    flex: 1,
    backgroundColor: MC.background,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { padding: 16, paddingBottom: 40, gap: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: MC.textPrimary },
  hero: {
    borderRadius: 28,
    padding: 20,
    gap: 14,
    backgroundColor: "#0F766E",
  },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  heroBody: { flex: 1, gap: 4 },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: "#CCFBF1",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  heroTitle: { fontSize: 26, fontWeight: "800", color: MC.white },
  heroSubtitle: { fontSize: 13, color: "#CCFBF1" },
  avatar: {
    width: 74,
    height: 74,
    borderRadius: 24,
    backgroundColor: "#134E4A",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%" },
  avatarText: { fontSize: 28, fontWeight: "800", color: MC.white },
  heroPills: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    backgroundColor: "#134E4A",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroPillText: { fontSize: 12, fontWeight: "700", color: MC.white },
  banner: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  bannerText: { flex: 1, fontSize: 13, lineHeight: 19 },
  sectionCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.white,
    padding: 16,
    gap: 14,
  },
  sectionHeader: { flexDirection: "row", gap: 12, alignItems: "center" },
  sectionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: MC.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: MC.textPrimary },
  sectionSubtitle: { fontSize: 12, color: MC.textSecondary, lineHeight: 18 },
  field: { gap: 7 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: MC.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  subLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: MC.textPrimary,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: MC.border,
    borderRadius: 14,
    backgroundColor: "#FCFDFE",
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: MC.textPrimary,
    fontSize: 14,
  },
  textArea: { minHeight: 110 },
  row: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: {
    borderColor: MC.primary,
    backgroundColor: MC.primaryLight,
  },
  chipText: { fontSize: 12, fontWeight: "600", color: MC.textSecondary },
  chipTextActive: { color: MC.primaryDark },
  previewGrid: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  previewCard: {
    flex: 1,
    minWidth: 100,
    borderRadius: 18,
    backgroundColor: MC.surface,
    padding: 12,
    gap: 4,
  },
  previewLabel: { fontSize: 11, color: MC.textSecondary },
  previewValue: { fontSize: 15, fontWeight: "700", color: MC.textPrimary },
  cardText: { fontSize: 13, lineHeight: 20, color: MC.textSecondary },
  inlineLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
    marginTop: 4,
  },
  inlineLinkText: { fontSize: 13, fontWeight: "700", color: MC.primaryDark },
  secondaryButton: {
    marginTop: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#BFE7E4",
    backgroundColor: MC.primaryLight,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  secondaryButtonText: { fontSize: 13, fontWeight: "700", color: MC.primaryDark },
  actionStatus: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionStatusOk: {
    backgroundColor: "#ECFDF5",
    borderColor: "#6EE7B7",
  },
  actionStatusError: {
    backgroundColor: "#FEE2E2",
    borderColor: "#FCA5A5",
  },
  actionStatusText: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: "600" },
  actions: { flexDirection: "row", gap: 12 },
  cancelButton: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MC.border,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
  },
  cancelButtonText: { fontSize: 14, fontWeight: "700", color: MC.textSecondary },
  saveButton: {
    flex: 1.4,
    borderRadius: 16,
    backgroundColor: MC.primary,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  saveButtonText: { fontSize: 14, fontWeight: "800", color: MC.white },
});
