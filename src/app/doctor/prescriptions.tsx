import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  DoctorPatientPicker,
  filterDoctorPatients,
} from "@/components/DoctorPatientPicker";
import { DoctorFeatureAccessGate } from "@/components/DoctorFeatureAccessGate";
import { Icon } from "@/components/Icon";
import { MC } from "@/constants/theme";
import * as api from "@/services/api";

const dateFmt = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Sin fecha";
  return dateFmt.format(parsed);
}

function truncate(value?: string | null, max = 150) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}...`;
}

export default function DoctorPrescriptionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ patientId?: string | string[] }>();
  const requestedPatientId = Number(
    Array.isArray(params.patientId) ? params.patientId[0] : params.patientId,
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [patients, setPatients] = useState<api.DoctorPatientSummary[]>([]);
  const [data, setData] = useState<api.DoctorPrescriptionsData | null>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(
    Number.isFinite(requestedPatientId) && requestedPatientId > 0
      ? requestedPatientId
      : null,
  );
  const [diagnosis, setDiagnosis] = useState("");
  const [medications, setMedications] = useState("");
  const [instructions, setInstructions] = useState("");
  const [validDays, setValidDays] = useState("30");

  useEffect(() => {
    void loadScreen();
  }, []);

  async function loadScreen(isRefresh = false) {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      setError("");

      const [patientsResponse, prescriptionsResponse] = await Promise.all([
        api.getDoctorPatients(),
        api.getDoctorPrescriptions(),
      ]);

      setPatients(patientsResponse.data || []);
      setData(prescriptionsResponse);
    } catch (e: any) {
      setError(e?.message || "No se pudieron cargar las recetas.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const filteredPatients = useMemo(
    () => filterDoctorPatients(patients, patientSearch),
    [patients, patientSearch],
  );

  useEffect(() => {
    if (!selectedPatientId && filteredPatients.length) {
      setSelectedPatientId(filteredPatients[0].id);
    }
  }, [filteredPatients, selectedPatientId]);

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === selectedPatientId) ?? null,
    [patients, selectedPatientId],
  );

  async function handleSave() {
    if (!selectedPatientId) {
      Alert.alert("Paciente requerido", "Selecciona un paciente.");
      return;
    }

    if (!diagnosis.trim() || !medications.trim()) {
      Alert.alert(
        "Datos incompletos",
        "Diagnóstico y medicamentos son obligatorios.",
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await api.createDoctorPrescription({
        patient_id: selectedPatientId,
        diagnosis: diagnosis.trim(),
        medications: medications.trim(),
        instructions: instructions.trim() || undefined,
        valid_days: Math.max(1, Number(validDays) || 30),
      });

      setDiagnosis("");
      setMedications("");
      setInstructions("");
      setValidDays("30");
      setSuccess("Receta guardada correctamente.");
      await loadScreen();
    } catch (e: any) {
      setError(e?.message || "No se pudo guardar la receta.");
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
    <DoctorFeatureAccessGate feature="prescriptions">
      <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadScreen(true)}
            tintColor={MC.primary}
          />
        }
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Icon name="arrow-left" size={22} color={MC.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Recetas</Text>
          <Pressable onPress={() => loadScreen(true)} hitSlop={10}>
            <Icon name="arrow-clockwise" size={20} color={MC.primary} />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Emite una receta desde aquí</Text>
          <Text style={styles.heroText}>
            Selecciona al paciente, captura diagnóstico e indicaciones, y queda
            lista en su historial.
          </Text>
        </View>

        {error ? (
          <MessageBox tone="error" text={error} />
        ) : null}
        {success ? (
          <MessageBox tone="success" text={success} />
        ) : null}

        <View style={styles.card}>
          <DoctorPatientPicker
            patients={patients}
            selectedPatientId={selectedPatientId}
            onSelectPatient={setSelectedPatientId}
            search={patientSearch}
            onChangeSearch={setPatientSearch}
            subtitle="Pacientes vinculados listos para receta."
          />

          {selectedPatient ? (
            <View style={styles.inlineActions}>
              <ActionButton
                icon="user-circle"
                label="Abrir paciente"
                onPress={() =>
                  router.push(`/doctor/patients/${selectedPatient.id}` as any)
                }
              />
              <ActionButton
                icon="calendar"
                label="Agendar cita"
                onPress={() =>
                  router.push(
                    `/doctor/appointments/create?patientId=${selectedPatient.id}` as any,
                  )
                }
              />
            </View>
          ) : null}

          <Field
            label="Diagnóstico"
            placeholder="Escribe el diagnóstico principal."
            value={diagnosis}
            onChangeText={setDiagnosis}
          />
          <Field
            label="Medicamentos"
            placeholder="Medicamento, dosis y frecuencia."
            value={medications}
            onChangeText={setMedications}
            multiline
          />
          <Field
            label="Indicaciones"
            placeholder="Duración, cuidados o recomendaciones."
            value={instructions}
            onChangeText={setInstructions}
            multiline
          />
          <Field
            label="Vigencia en días"
            placeholder="30"
            value={validDays}
            onChangeText={setValidDays}
            keyboardType="numeric"
          />

          <Pressable
            style={[styles.primaryButton, saving && styles.buttonDisabled]}
            onPress={() => void handleSave()}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={MC.white} size="small" />
            ) : (
              <>
                <Icon name="check" size={16} color={MC.white} />
                <Text style={styles.primaryButtonText}>Guardar receta</Text>
              </>
            )}
          </Pressable>
        </View>

        <SectionHeader
          title="Recetas recientes"
          subtitle={`${data?.summary.total ?? 0} registradas`}
        />

        {data?.data.length ? (
          data.data.map((item) => (
            <View key={item.id} style={styles.listCard}>
              <View style={styles.listTop}>
                <View style={styles.listBadge}>
                  <Text style={styles.listBadgeText}>
                    {item.status === "active" ? "Activa" : item.status || "Receta"}
                  </Text>
                </View>
                <Text style={styles.listDate}>
                  {formatDate(item.issued_date || item.appt_date)}
                </Text>
              </View>

              <Text style={styles.listPatient}>{item.patient_name || "Paciente"}</Text>
              <Text style={styles.listTitle}>
                {item.diagnosis || "Receta sin diagnóstico"}
              </Text>
              <Text style={styles.listText}>
                {truncate(item.medications, 180) || "Sin medicamentos registrados."}
              </Text>
              {item.instructions ? (
                <Text style={styles.listPlan}>{truncate(item.instructions, 160)}</Text>
              ) : null}

              <View style={styles.inlineActions}>
                {item.patient_id ? (
                  <ActionButton
                    icon="user-circle"
                    label="Paciente"
                    onPress={() =>
                      router.push(`/doctor/patients/${item.patient_id}` as any)
                    }
                  />
                ) : null}
                {item.appointment_id ? (
                  <ActionButton
                    icon="calendar"
                    label="Cita"
                    onPress={() =>
                      router.push(`/doctor/appointments/${item.appointment_id}` as any)
                    }
                  />
                ) : null}
              </View>
            </View>
          ))
        ) : (
          <EmptyCard
            icon="pill"
            title="Todavía no hay recetas"
            text="La primera receta que guardes aparecerá aquí con acceso rápido al paciente."
          />
        )}
      </ScrollView>
      </SafeAreaView>
    </DoctorFeatureAccessGate>
  );
}

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChangeText,
  multiline = false,
  keyboardType,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
  keyboardType?: "default" | "numeric";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={MC.textMuted}
        style={[styles.input, multiline && styles.inputMultiline]}
        multiline={multiline}
        keyboardType={keyboardType}
        textAlignVertical={multiline ? "top" : "center"}
      />
    </View>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Icon>["name"];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.actionButton}>
      <Icon name={icon} size={14} color={MC.primaryDark} />
      <Text style={styles.actionButtonText}>{label}</Text>
    </Pressable>
  );
}

function MessageBox({
  tone,
  text,
}: {
  tone: "error" | "success";
  text: string;
}) {
  const bg = tone === "error" ? MC.errorSoft : MC.successSoft;
  const color = tone === "error" ? MC.error : MC.success;
  const icon = tone === "error" ? "warning" : "check-circle";

  return (
    <View style={[styles.messageBox, { backgroundColor: bg }]}>
      <Icon name={icon} size={18} color={color} />
      <Text style={[styles.messageText, { color }]}>{text}</Text>
    </View>
  );
}

function EmptyCard({
  icon,
  title,
  text,
}: {
  icon: React.ComponentProps<typeof Icon>["name"];
  title: string;
  text: string;
}) {
  return (
    <View style={styles.emptyCard}>
      <Icon name={icon} size={24} color={MC.textMuted} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
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
  content: { padding: 16, paddingBottom: 36, gap: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: MC.textPrimary },
  hero: {
    borderRadius: 24,
    backgroundColor: MC.primaryLight,
    borderWidth: 1,
    borderColor: MC.infoBorder,
    padding: 18,
    gap: 8,
  },
  heroTitle: { fontSize: 24, fontWeight: "700", color: MC.textPrimary },
  heroText: { fontSize: 14, lineHeight: 21, color: MC.textSecondary },
  messageBox: {
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  messageText: { flex: 1, fontSize: 13 },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.card,
    padding: 16,
    gap: 16,
  },
  inlineActions: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: MC.primaryLight,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: MC.primaryDark,
  },
  field: { gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: MC.textPrimary },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: MC.border,
    borderRadius: 16,
    backgroundColor: MC.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: MC.textPrimary,
  },
  inputMultiline: { minHeight: 108 },
  primaryButton: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: MC.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: MC.white,
  },
  buttonDisabled: { opacity: 0.65 },
  sectionHeader: { gap: 4 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: MC.textPrimary },
  sectionSubtitle: { fontSize: 13, color: MC.textSecondary },
  listCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.card,
    padding: 16,
    gap: 10,
  },
  listTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  listBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: MC.primaryLight,
  },
  listBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: MC.primaryDark,
  },
  listDate: { fontSize: 12, color: MC.textMuted },
  listPatient: { fontSize: 15, fontWeight: "700", color: MC.textPrimary },
  listTitle: { fontSize: 14, fontWeight: "700", color: MC.textPrimary },
  listText: { fontSize: 13, lineHeight: 20, color: MC.textSecondary },
  listPlan: { fontSize: 13, lineHeight: 20, color: MC.textSecondary },
  emptyCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.card,
    padding: 20,
    alignItems: "center",
    gap: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: MC.textPrimary },
  emptyText: {
    fontSize: 13,
    lineHeight: 20,
    color: MC.textSecondary,
    textAlign: "center",
  },
});
