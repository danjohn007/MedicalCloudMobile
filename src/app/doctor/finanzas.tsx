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

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const dateFmt = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default function DoctorFinancesScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<api.DoctorFinancialHistoryData | null>(null);

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData(isRefresh = false) {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      setError("");
      const response = await api.getDoctorFinancialHistory();
      setData(response);
    } catch (e: any) {
      setError(e?.message || "No se pudo cargar el historial financiero.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const collected = useMemo(() => {
    return (data?.consultations ?? []).reduce((acc, item) => {
      if ((item.status || "").toLowerCase() === "completed") {
        return acc + item.amount;
      }
      return acc;
    }, 0);
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
            onRefresh={() => loadData(true)}
            tintColor={MC.primary}
          />
        }
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Icon name="arrow-left" size={22} color={MC.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Finanzas</Text>
          <Pressable onPress={() => loadData(true)} hitSlop={10}>
            <Icon name="arrow-clockwise" size={20} color={MC.primary} />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroGlow} />
          <Text style={styles.heroEyebrow}>Operación del consultorio</Text>
          <Text style={styles.heroTitle}>{money.format(collected)}</Text>
          <Text style={styles.heroSubtitle}>Cobrado en consultas completadas</Text>
          <View style={styles.heroPills}>
            <HeroPill icon="calendar" label={`${data?.summary.total_consultations ?? 0} consultas`} />
            <HeroPill icon="wallet" label={money.format(data?.summary.this_month ?? 0)} />
          </View>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Icon name="warning" size={18} color={MC.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.metricsRow}>
          <MetricCard label="Este mes" value={money.format(data?.summary.this_month ?? 0)} />
          <MetricCard label="Este año" value={money.format(data?.summary.this_year ?? 0)} />
          <MetricCard
            label="Consultas"
            value={String(data?.summary.total_consultations ?? 0)}
          />
        </View>

        <Section
          title="Cobros por consulta"
          subtitle="Cada pago queda ligado a la cita y al paciente cuando existe esa relación."
        >
          {data?.consultations.length ? (
            data.consultations.map((item) => (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View>
                    <Text style={styles.cardTitle}>{item.patient_name || "Consulta médica"}</Text>
                    <Text style={styles.cardSubtitle}>
                      {item.appointment_type ? normalizeType(item.appointment_type) : "Consulta"}
                      {item.scheduled_at ? ` | ${formatDate(item.scheduled_at)}` : ""}
                    </Text>
                  </View>
                  <Text style={styles.amountText}>{money.format(item.amount)}</Text>
                </View>

                <View style={styles.metaRow}>
                  <MetaBadge text={normalizeStatus(item.status)} />
                  <MetaBadge text={(item.method || "método").toUpperCase()} />
                  <MetaBadge text={(item.currency || "MXN").toUpperCase()} />
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.cardFooterText}>
                    Registrado {formatDate(item.created_at)}
                  </Text>
                  {item.appointment_id ? (
                    <Pressable
                      onPress={() =>
                        router.push(`/doctor/appointments/${item.appointment_id}` as any)
                      }
                      style={styles.inlineAction}
                    >
                      <Text style={styles.inlineActionText}>Abrir cita</Text>
                      <Icon name="arrow-right" size={14} color={MC.primaryDark} />
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))
          ) : (
            <EmptyCard
              icon="wallet"
              title="Todavía no hay cobros"
              text="Los pagos de consultas aparecerán aquí cuando el servidor sincronice esos movimientos."
            />
          )}
        </Section>

        <Section
          title="Suscripciones"
          subtitle="Vista rápida de renovaciones y cargos administrativos del doctor."
        >
          {data?.subscriptions.length ? (
            data.subscriptions.map((item) => (
              <View key={item.id} style={styles.subscriptionCard}>
                <View>
                  <Text style={styles.cardTitle}>Plan / suscripcion</Text>
                  <Text style={styles.cardSubtitle}>Registrado {formatDate(item.created_at)}</Text>
                </View>
                <View style={styles.subscriptionRight}>
                  <Text style={styles.amountText}>{money.format(item.amount)}</Text>
                  <Text style={styles.subscriptionMeta}>
                    {(item.method || "método").toUpperCase()} | {normalizeStatus(item.status)}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <EmptyCard
              icon="calendar"
              title="Sin cargos de suscripcion"
              text="Aquí se mostrarán los movimientos del plan del consultorio cuando existan."
            />
          )}
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      </View>
      {children}
    </View>
  );
}

function HeroPill({ icon, label }: { icon: React.ComponentProps<typeof Icon>["name"]; label: string }) {
  return (
    <View style={styles.heroPill}>
      <Icon name={icon} size={14} color="#DFF7F4" />
      <Text style={styles.heroPillText}>{label}</Text>
    </View>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function MetaBadge({ text }: { text: string }) {
  return (
    <View style={styles.metaBadge}>
      <Text style={styles.metaBadgeText}>{text}</Text>
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
      <Icon name={icon} size={26} color={MC.textMuted} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "fecha sin registro";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "fecha sin registro" : dateFmt.format(date);
}

function normalizeStatus(value?: string | null) {
  switch ((value || "").toLowerCase()) {
    case "completed":
      return "Completado";
    case "paid":
      return "Pagado";
    case "pending":
      return "Pendiente";
    case "failed":
      return "Fallido";
    default:
      return value || "Sin estado";
  }
}

function normalizeType(value?: string | null) {
  switch ((value || "").toLowerCase()) {
    case "videoconsulta":
    case "video":
      return "Videoconsulta";
    case "domicilio":
    case "home":
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
    borderRadius: 28,
    backgroundColor: "#0F766E",
    padding: 20,
    overflow: "hidden",
    gap: 8,
  },
  heroGlow: {
    position: "absolute",
    right: -30,
    top: -20,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "#34D39944",
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: "#CCFBF1",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  heroTitle: { fontSize: 30, fontWeight: "800", color: MC.white },
  heroSubtitle: { fontSize: 13, color: "#CCFBF1" },
  heroPills: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 6 },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#134E4A",
  },
  heroPillText: { fontSize: 12, fontWeight: "700", color: MC.white },
  errorBox: {
    borderRadius: 14,
    backgroundColor: MC.errorSoft,
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
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.card,
    padding: 14,
    gap: 6,
  },
  metricLabel: { fontSize: 12, color: MC.textSecondary },
  metricValue: { fontSize: 20, fontWeight: "700", color: MC.textPrimary },
  section: { gap: 12 },
  sectionHeader: { gap: 4 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: MC.textPrimary },
  sectionSubtitle: { fontSize: 13, lineHeight: 20, color: MC.textSecondary },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.card,
    padding: 16,
    gap: 12,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: MC.textPrimary },
  cardSubtitle: { fontSize: 13, color: MC.textSecondary, marginTop: 4 },
  amountText: { fontSize: 16, fontWeight: "800", color: MC.primaryDark },
  metaRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  metaBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: MC.input,
  },
  metaBadgeText: { fontSize: 11, fontWeight: "700", color: MC.textMuted },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  cardFooterText: { flex: 1, fontSize: 12, color: MC.textMuted },
  inlineAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  inlineActionText: { fontSize: 12, fontWeight: "700", color: MC.primaryDark },
  subscriptionCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.input,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  subscriptionRight: { alignItems: "flex-end", gap: 4 },
  subscriptionMeta: { fontSize: 11, color: MC.textMuted },
  emptyCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.card,
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
