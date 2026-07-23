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
import { Icon } from "@/components/Icon";
import { MC } from "@/constants/theme";
import * as api from "@/services/api";

const dateFmt = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
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

export default function DoctorNotesScreen() {
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
  const [notes, setNotes] = useState<api.DoctorNoteEntry[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(
    Number.isFinite(requestedPatientId) && requestedPatientId > 0
      ? requestedPatientId
      : null,
  );
  const [subjective, setSubjective] = useState("");
  const [objective, setObjective] = useState("");
  const [assessment, setAssessment] = useState("");
  const [planText, setPlanText] = useState("");

  useEffect(() => {
    void loadScreen();
  }, []);

  async function loadScreen(isRefresh = false) {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      setError("");

      const [patientsResponse, notesResponse] = await Promise.all([
        api.getDoctorPatients(),
        api.getDoctorNotes(),
      ]);

      setPatients(patientsResponse.data || []);
      setNotes(notesResponse.data || []);
    } catch (e: any) {
      setError(e?.message || "No se pudieron cargar las notas.");
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

    if (
      !subjective.trim() &&
      !objective.trim() &&
      !assessment.trim() &&
      !planText.trim()
    ) {
      Alert.alert("Nota vacia", "Escribe al menos un dato clínico.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await api.createDoctorNote({
        patient_id: selectedPatientId,
        subjective: subjective.trim() || undefined,
        objective: objective.trim() || undefined,
        assessment: assessment.trim() || undefined,
        plan_text: planText.trim() || undefined,
      });

      setSubjective("");
      setObjective("");
      setAssessment("");
      setPlanText("");
      setSuccess("Nota guardada correctamente.");
      await loadScreen();
    } catch (e: any) {
      setError(e?.message || "No se pudo guardar la nota.");
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
          <Text style={styles.headerTitle}>Notas clínicas</Text>
          <Pressable onPress={() => loadScreen(true)} hitSlop={10}>
            <Icon name="arrow-clockwise" size={20} color={MC.primary} />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Crea una nota sin salir de aquí</Text>
          <Text style={styles.heroText}>
            Elige al paciente, guarda la nota y abre su ficha solo si necesitas
            revisar algo más.
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
            subtitle="Pacientes vinculados para notas y seguimiento."
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
            label="Subjetivo"
            placeholder="Síntomas, motivo y lo que refiere el paciente."
            value={subjective}
            onChangeText={setSubjective}
            multiline
          />
          <Field
            label="Objetivo"
            placeholder="Signos, exploración o hallazgos importantes."
            value={objective}
            onChangeText={setObjective}
            multiline
          />
          <Field
            label="Valoracion"
            placeholder="Diagnóstico o impresión clínica."
            value={assessment}
            onChangeText={setAssessment}
            multiline
          />
          <Field
            label="Plan"
            placeholder="Estudios, tratamiento, seguimiento o recomendaciones."
            value={planText}
            onChangeText={setPlanText}
            multiline
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
                <Text style={styles.primaryButtonText}>Guardar nota</Text>
              </>
            )}
          </Pressable>
        </View>

        <SectionHeader
          title="Notas recientes"
          subtitle={`${notes.length} notas registradas`}
        />

        {notes.length ? (
          notes.map((note) => (
            <View key={note.id} style={styles.listCard}>
              <View style={styles.listTop}>
                <View style={styles.listBadgeRow}>
                  <View style={styles.listBadge}>
                    <Text style={styles.listBadgeText}>
                      {note.appointment_id ? "Con cita" : "Nota directa"}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.listStateBadge,
                      note.is_signed ? styles.listStateBadgeSigned : styles.listStateBadgeDraft,
                    ]}
                  >
                    <Text
                      style={[
                        styles.listStateBadgeText,
                        note.is_signed
                          ? styles.listStateBadgeTextSigned
                          : styles.listStateBadgeTextDraft,
                      ]}
                    >
                      {note.is_signed ? "Firmada" : "Borrador"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.listDate}>
                  {formatDate(note.signed_at || note.updated_at || note.scheduled_at || note.created_at)}
                </Text>
              </View>

              <Text style={styles.listPatient}>{note.patient_name || "Paciente"}</Text>
              {note.assessment ? (
                <Text style={styles.listTitle}>{truncate(note.assessment, 120)}</Text>
              ) : null}
              {note.subjective ? (
                <Text style={styles.listText}>
                  {truncate(note.subjective, note.assessment ? 120 : 180)}
                </Text>
              ) : null}
              {note.plan_text ? (
                <Text style={styles.listPlan}>{truncate(note.plan_text, 150)}</Text>
              ) : null}

              <View style={styles.inlineActions}>
                {note.patient_id ? (
                  <ActionButton
                    icon="user-circle"
                    label="Paciente"
                    onPress={() =>
                      router.push(`/doctor/patients/${note.patient_id}` as any)
                    }
                  />
                ) : null}
                {note.appointment_id ? (
                  <ActionButton
                    icon="calendar"
                    label="Cita"
                    onPress={() =>
                      router.push(`/doctor/appointments/${note.appointment_id}` as any)
                    }
                  />
                ) : null}
              </View>
            </View>
          ))
        ) : (
          <EmptyCard
            icon="clipboard-text"
            title="Todavía no hay notas"
            text="La primera nota que guardes aparecerá aquí con acceso rápido al paciente."
          />
        )}
      </ScrollView>
    </SafeAreaView>
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
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
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
  listBadgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
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
  listStateBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  listStateBadgeSigned: { backgroundColor: MC.successSoft },
  listStateBadgeDraft: { backgroundColor: MC.warningSoft },
  listStateBadgeText: { fontSize: 12, fontWeight: "700" },
  listStateBadgeTextSigned: { color: MC.success },
  listStateBadgeTextDraft: { color: MC.star },
  listDate: { fontSize: 12, color: MC.textMuted },
  listPatient: { fontSize: 15, fontWeight: "700", color: MC.textPrimary },
  listTitle: { fontSize: 14, fontWeight: "600", color: MC.textPrimary },
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
