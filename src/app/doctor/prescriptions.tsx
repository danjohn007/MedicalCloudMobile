import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon } from "@/components/Icon";
import { MC } from "@/constants/theme";
import * as api from "@/services/api";

const money = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default function DoctorPrescriptionsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<api.DoctorPrescriptionsData | null>(null);

  useEffect(() => {
    void loadPrescriptions();
  }, []);

  async function loadPrescriptions(isRefresh = false) {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      setError("");
      const response = await api.getDoctorPrescriptions();
      setData(response);
    } catch (e: any) {
      setError(e?.message || "No se pudieron cargar las recetas.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const recentPatients = useMemo(() => {
    const names = new Set<string>();
    for (const item of data?.data ?? []) {
      if (item.patient_name) {
        names.add(item.patient_name);
      }
    }
    return names.size;
  }, [data]);

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
            onRefresh={() => loadPrescriptions(true)}
            tintColor={MC.primary}
          />
        }
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Icon name="arrow-left" size={22} color={MC.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Recetas</Text>
          <Pressable onPress={() => loadPrescriptions(true)} hitSlop={10}>
            <Icon name="arrow-clockwise" size={20} color={MC.primary} />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Icon name="pill" size={24} color={MC.primaryDark} />
          </View>
          <View style={styles.heroBody}>
            <Text style={styles.heroEyebrow}>Operacion clinica</Text>
            <Text style={styles.heroTitle}>Recetas emitidas</Text>
            <Text style={styles.heroText}>
              Consulta las recetas ligadas a citas, abre al paciente y retoma el
              contexto clinico desde tablet o telefono.
            </Text>
          </View>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Icon name="warning" size={18} color={MC.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.metricsRow}>
          <MetricCard label="Totales" value={String(data?.summary.total ?? 0)} tone="#EFF6FF" />
          <MetricCard label="Activas" value={String(data?.summary.active ?? 0)} tone="#ECFDF5" />
          <MetricCard
            label="Pacientes"
            value={String(recentPatients)}
            tone="#FFF7ED"
          />
        </View>

        <View style={styles.metricsRow}>
          <MetricCard
            label="Este mes"
            value={String(data?.summary.this_month ?? 0)}
            tone="#F5F3FF"
          />
          <MetricCard
            label="Con cita"
            value={String(data?.summary.linked_to_appointments ?? 0)}
            tone="#F0FDFA"
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Timeline de recetas</Text>
            <Text style={styles.sectionSubtitle}>
              {data?.data.length
                ? `${data.data.length} registros listos para revisar`
                : "Sin recetas todavia"}
            </Text>
          </View>

          {data?.data.length ? (
            data.data.map((item) => (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.cardBadge}>
                    <Icon name="pill" size={14} color={MC.primaryDark} />
                    <Text style={styles.cardBadgeText}>
                      {item.status === "active" ? "Activa" : item.status || "Receta"}
                    </Text>
                  </View>
                  <Text style={styles.cardDate}>{formatDate(item.issued_date || item.appt_date)}</Text>
                </View>

                <Text style={styles.cardTitle}>{item.diagnosis || "Receta emitida"}</Text>
                <Text style={styles.cardPatient}>
                  {item.patient_name || "Paciente"}{item.appt_type ? ` | ${normalizeType(item.appt_type)}` : ""}
                </Text>

                <View style={styles.contentBox}>
                  <Label text="Medicamentos" />
                  <Text style={styles.contentText}>
                    {item.medications || "Sin detalle de medicamentos."}
                  </Text>
                </View>

                {item.instructions ? (
                  <View style={styles.contentBox}>
                    <Label text="Indicaciones" />
                    <Text style={styles.contentText}>{item.instructions}</Text>
                  </View>
                ) : null}

                <View style={styles.footerRow}>
                  {item.patient_id ? (
                    <ActionChip
                      icon="user-circle"
                      label="Paciente"
                      onPress={() => router.push(`/doctor/patients/${item.patient_id}` as any)}
                    />
                  ) : null}
                  {item.appointment_id ? (
                    <ActionChip
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
            <View style={styles.emptyCard}>
              <Icon name="pill" size={28} color={MC.textMuted} />
              <Text style={styles.emptyTitle}>Todavia no hay recetas</Text>
              <Text style={styles.emptyText}>
                En cuanto guardes una receta desde una consulta SOAP aparecera aqui.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <View style={[styles.metricCard, { backgroundColor: tone }]}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function ActionChip({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Icon>["name"];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.actionChip}>
      <Icon name={icon} size={14} color={MC.primaryDark} />
      <Text style={styles.actionChipText}>{label}</Text>
    </Pressable>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}

function formatDate(value?: string | null) {
  if (!value) return "Fecha sin registro";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Fecha sin registro" : money.format(date);
}

function normalizeType(value?: string | null) {
  switch ((value || "").toLowerCase()) {
    case "video":
    case "videoconsulta":
      return "Videoconsulta";
    case "home":
    case "domicilio":
      return "Domicilio";
    default:
      return "Presencial";
  }
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
    backgroundColor: "#E8F7F5",
    borderWidth: 1,
    borderColor: "#CBEAE5",
    padding: 18,
    flexDirection: "row",
    gap: 14,
  },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: MC.white,
    alignItems: "center",
    justifyContent: "center",
  },
  heroBody: { flex: 1, gap: 4 },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: MC.primaryDark,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  heroTitle: { fontSize: 24, fontWeight: "700", color: MC.textPrimary },
  heroText: { fontSize: 13, lineHeight: 20, color: MC.textSecondary },
  errorBox: {
    borderRadius: 14,
    backgroundColor: "#FEE2E2",
    padding: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  errorText: { flex: 1, fontSize: 13, color: MC.error },
  metricsRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  metricCard: {
    flex: 1,
    minWidth: 140,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  metricValue: { fontSize: 22, fontWeight: "700", color: MC.textPrimary },
  metricLabel: { fontSize: 12, color: MC.textSecondary, marginTop: 4 },
  section: { gap: 12 },
  sectionHeader: { gap: 4 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: MC.textPrimary },
  sectionSubtitle: { fontSize: 13, color: MC.textSecondary },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.white,
    padding: 16,
    gap: 12,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cardBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: MC.primaryLight,
  },
  cardBadgeText: { fontSize: 12, fontWeight: "700", color: MC.primaryDark },
  cardDate: { fontSize: 12, color: MC.textMuted },
  cardTitle: { fontSize: 16, fontWeight: "700", color: MC.textPrimary },
  cardPatient: { fontSize: 13, color: MC.textSecondary },
  contentBox: {
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    padding: 12,
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: MC.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  contentText: { fontSize: 13, lineHeight: 20, color: MC.textPrimary },
  footerRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#F0FDFA",
  },
  actionChipText: { fontSize: 12, fontWeight: "700", color: MC.primaryDark },
  emptyCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.white,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: MC.textPrimary },
  emptyText: {
    fontSize: 13,
    lineHeight: 20,
    color: MC.textSecondary,
    textAlign: "center",
  },
});
