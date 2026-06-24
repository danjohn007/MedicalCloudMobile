import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Icon } from "@/components/Icon";
import { MC } from "@/constants/theme";
import * as api from "@/services/api";

const dateFmt = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function fetchPatientDetail(patientId: number) {
  return Promise.all([
    api.getDoctorPatientSnapshot(patientId),
    api.getDoctorPatientHistory(patientId),
  ]);
}

export default function DoctorPatientDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const patientId = Number(Array.isArray(params.id) ? params.id[0] : params.id);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [snapshot, setSnapshot] = useState<api.DoctorPatientSnapshotData | null>(null);
  const [history, setHistory] = useState<api.DoctorPatientHistoryData | null>(null);

  useEffect(() => {
    if (!Number.isFinite(patientId) || patientId <= 0) {
      setError("Paciente invalido.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        setError("");
        const [snapshotResponse, historyResponse] = await fetchPatientDetail(patientId);
        if (cancelled) return;
        setSnapshot(snapshotResponse);
        setHistory(historyResponse);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || "No se pudo cargar el detalle del paciente.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [patientId]);

  async function loadData(isRefresh = false) {
    if (!Number.isFinite(patientId) || patientId <= 0) {
      setError("Paciente invalido.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      setError("");
      const [snapshotResponse, historyResponse] = await fetchPatientDetail(patientId);

      setSnapshot(snapshotResponse);
      setHistory(historyResponse);
    } catch (e: any) {
      setError(e?.message || "No se pudo cargar el detalle del paciente.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingWrap} edges={["top"]}>
        <ActivityIndicator size="large" color={MC.primary} />
      </SafeAreaView>
    );
  }

  const patient = snapshot?.patient ?? history?.patient ?? null;
  const notes = history?.notes ?? [];
  const prescriptions = history?.prescriptions ?? [];
  const historyEntries = history?.history ?? [];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={MC.primary}
          />
        }
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Icon name="arrow-left" size={22} color={MC.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Paciente</Text>
          <View style={styles.headerSpacer} />
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Icon name="warning" size={18} color={MC.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {patient ? (
          <>
            <View style={styles.hero}>
              <View style={styles.avatar}>
                {patient.avatar_url ? (
                  <Image source={{ uri: patient.avatar_url }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{patient.name.charAt(0).toUpperCase()}</Text>
                )}
              </View>
              <View style={styles.heroBody}>
                <Text style={styles.heroTitle}>{patient.name}</Text>
                <Text style={styles.heroSubtitle}>{patient.email}</Text>
                <View style={styles.heroChips}>
                  <MetaChip icon="clock" label={patient.age != null ? `${patient.age} anos` : "Edad s/d"} />
                  <MetaChip icon="drop" label={patient.blood_type || "Sangre s/d"} />
                  <MetaChip icon="user-circle" label={patient.gender || "Genero s/d"} />
                </View>
              </View>
            </View>

            <View style={styles.metricsRow}>
              <MetricCard label="Notas" value={String(notes.length)} />
              <MetricCard label="Recetas" value={String(prescriptions.length)} />
              <MetricCard label="Historial" value={String(historyEntries.length)} />
            </View>

            <Section title="Resumen clinico">
              <InfoRow label="Telefono" value={patient.phone || "Sin telefono"} />
              <InfoRow label="Ciudad" value={patient.city || "Sin ciudad"} />
              <InfoRow label="Ocupacion" value={patient.occupation || "Sin dato"} />
              <InfoRow
                label="Contacto de emergencia"
                value={
                  patient.emergency_contact_name
                    ? `${patient.emergency_contact_name}${patient.emergency_contact_phone ? ` | ${patient.emergency_contact_phone}` : ""}`
                    : "Sin dato"
                }
              />
            </Section>

            <Section title="Alertas y tratamiento">
              <AlertBox
                title="Alergias"
                text={pickFirst(patient.allergies, snapshot?.record?.allergies) || "Sin alergias registradas"}
              />
              <AlertBox
                title="Medicacion actual"
                text={
                  pickFirst(patient.current_medications, snapshot?.record?.current_medications) ||
                  "Sin medicamentos registrados"
                }
              />
              <AlertBox
                title="Condiciones cronicas"
                text={
                  pickFirst(patient.chronic_conditions, snapshot?.record?.chronic_conditions) ||
                  "Sin condiciones cronicas registradas"
                }
              />
            </Section>

            <Section title="Notas recientes">
              {notes.length ? (
                notes.slice(0, 4).map((note) => (
                  <TimelineCard
                    key={`note-${note.id}`}
                    icon="clipboard-text"
                    title={formatDate(note.scheduled_at || note.created_at)}
                    subtitle={note.assessment || note.appt_reason || "Sin resumen clinico"}
                    body={truncate(note.plan_text || note.subjective || "", 140)}
                  />
                ))
              ) : (
                <EmptyState text="Todavia no hay notas clinicas para este paciente." />
              )}
            </Section>

            <Section title="Recetas recientes">
              {prescriptions.length ? (
                prescriptions.slice(0, 4).map((prescription) => (
                  <TimelineCard
                    key={`rx-${prescription.id}`}
                    icon="pill"
                    title={formatDate(prescription.issued_date)}
                    subtitle={prescription.diagnosis || "Receta emitida"}
                    body={truncate(prescription.medications || prescription.instructions || "", 140)}
                  />
                ))
              ) : (
                <EmptyState text="No hay recetas registradas para este paciente." />
              )}
            </Section>

            <Section title="Historial">
              {historyEntries.length ? (
                historyEntries.slice(0, 5).map((entry) => (
                  <TimelineCard
                    key={`hist-${entry.id ?? `${entry.category}-${entry.created_at}`}`}
                    icon="clock"
                    title={formatDate(entry.date_recorded || entry.created_at)}
                    subtitle={entry.category || "Registro"}
                    body={truncate(entry.description || "", 160)}
                  />
                ))
              ) : (
                <EmptyState text="No hay entradas de historial disponibles." />
              )}
            </Section>
          </>
        ) : (
          <EmptyState text="No se encontro informacion del paciente." />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function MetaChip({ icon, label }: { icon: "clock" | "drop" | "user-circle"; label: string }) {
  return (
    <View style={styles.metaChip}>
      <Icon name={icon} size={14} color={MC.primaryDark} />
      <Text style={styles.metaChipText}>{label}</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function AlertBox({ title, text }: { title: string; text: string }) {
  return (
    <View style={styles.alertBox}>
      <Text style={styles.alertTitle}>{title}</Text>
      <Text style={styles.alertText}>{text}</Text>
    </View>
  );
}

function TimelineCard({
  icon,
  title,
  subtitle,
  body,
}: {
  icon: "clipboard-text" | "pill" | "clock";
  title: string;
  subtitle: string;
  body: string;
}) {
  return (
    <View style={styles.timelineCard}>
      <View style={styles.timelineIcon}>
        <Icon name={icon} size={16} color={MC.primary} />
      </View>
      <View style={styles.timelineBody}>
        <Text style={styles.timelineTitle}>{title}</Text>
        <Text style={styles.timelineSubtitle}>{subtitle}</Text>
        {body ? <Text style={styles.timelineText}>{body}</Text> : null}
      </View>
    </View>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function pickFirst(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return "";
}

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Sin fecha";

  return dateFmt.format(parsed);
}

function truncate(value: string, max: number) {
  if (!value) return "";
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trim()}...`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MC.background },
  loadingWrap: {
    flex: 1,
    backgroundColor: MC.background,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { padding: 16, paddingBottom: 36, gap: 14 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: MC.textPrimary },
  headerSpacer: { width: 22 },
  errorBox: {
    borderRadius: 14,
    backgroundColor: "#FEE2E2",
    padding: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  errorText: { flex: 1, color: MC.error, fontSize: 13 },
  hero: {
    borderRadius: 20,
    backgroundColor: MC.primaryLight,
    padding: 16,
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: MC.white,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: { width: "100%", height: "100%" },
  avatarText: { fontSize: 24, fontWeight: "700", color: MC.primaryDark },
  heroBody: { flex: 1, gap: 6 },
  heroTitle: { fontSize: 21, fontWeight: "700", color: MC.textPrimary },
  heroSubtitle: { fontSize: 13, color: MC.textSecondary },
  heroChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metaChip: {
    borderRadius: 999,
    backgroundColor: MC.white,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  metaChipText: { fontSize: 11, fontWeight: "700", color: MC.primaryDark },
  metricsRow: { flexDirection: "row", gap: 10 },
  metricCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.white,
    padding: 14,
    gap: 4,
  },
  metricValue: { fontSize: 20, fontWeight: "700", color: MC.textPrimary },
  metricLabel: { fontSize: 12, color: MC.textSecondary },
  section: { gap: 8 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: MC.textPrimary },
  sectionBody: { gap: 10 },
  infoRow: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.white,
    padding: 12,
    gap: 4,
  },
  infoLabel: { fontSize: 11, fontWeight: "700", color: MC.textMuted },
  infoValue: { fontSize: 14, color: MC.textPrimary },
  alertBox: {
    borderRadius: 16,
    backgroundColor: MC.surface,
    borderWidth: 1,
    borderColor: MC.border,
    padding: 12,
    gap: 6,
  },
  alertTitle: { fontSize: 12, fontWeight: "700", color: MC.textPrimary },
  alertText: { fontSize: 13, lineHeight: 19, color: MC.textSecondary },
  timelineCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.white,
    padding: 12,
    flexDirection: "row",
    gap: 10,
  },
  timelineIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: MC.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineBody: { flex: 1, gap: 4 },
  timelineTitle: { fontSize: 13, fontWeight: "700", color: MC.textPrimary },
  timelineSubtitle: { fontSize: 12, color: MC.primaryDark, fontWeight: "700" },
  timelineText: { fontSize: 12, lineHeight: 18, color: MC.textSecondary },
  emptyState: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.surface,
    padding: 16,
  },
  emptyText: { fontSize: 13, color: MC.textSecondary },
});
