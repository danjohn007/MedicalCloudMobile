import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
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

import { Icon, type IconName } from "@/components/Icon";
import { NotificationBellButton } from "@/components/NotificationBellButton";
import { MC, themed } from "@/constants/theme";
import * as api from "@/services/api";

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const dateTime = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export default function DoctorHomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<api.DoctorDashboardData | null>(null);

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function loadDashboard(isRefresh = false) {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      setError("");
      const response = await api.getDoctorDashboard();
      setData(response);
    } catch (e: any) {
      setError(e?.message || "No se pudo cargar el panel del doctor.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const liveAppointment = useMemo(() => {
    const items = [...(data?.today ?? []), ...(data?.upcoming ?? [])];
    return items.find((appointment) => appointment.status === "in_consultation") ?? null;
  }, [data]);

  const doctorName = data?.doctor.name || "Doctor";
  const doctorSpecialty = data?.doctor.specialty || "Especialidad pendiente";
  const firstName = doctorName.split(" ")[0] || doctorName;

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
            onRefresh={() => loadDashboard(true)}
            tintColor={MC.primary}
          />
        }
      >
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroAvatar}>
              {data?.doctor.avatar_url ? (
                <Image source={{ uri: data.doctor.avatar_url }} style={styles.heroAvatarImage} />
              ) : (
                <Text style={styles.heroAvatarText}>{firstName.charAt(0).toUpperCase()}</Text>
              )}
            </View>
            <View style={styles.heroActions}>
              <Pressable
                onPress={() => router.push("/(doctor-tabs)/perfil" as any)}
                style={styles.heroGear}
              >
                <Icon name="gear" size={18} color={MC.primaryDark} />
              </Pressable>
              <NotificationBellButton />
            </View>
          </View>

          <Text style={styles.heroEyebrow}>Panel médico</Text>
          <Text style={styles.heroTitle}>Hola, {firstName}</Text>
          <Text style={styles.heroSubtitle}>{doctorSpecialty}</Text>

          <View style={styles.heroBadgeRow}>
            <HeroBadge
              icon="calendar"
              label={`${data?.stats.today_appts ?? 0} hoy`}
            />
            <HeroBadge
              icon="user-circle"
              label={`${data?.stats.total_patients ?? 0} pacientes`}
            />
            <HeroBadge
              icon="star"
              label={`${(data?.stats.avg_rating ?? 0).toFixed(1)} de calificación`}
            />
          </View>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Icon name="warning" size={18} color={MC.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {liveAppointment ? (
          <Pressable
            onPress={() =>
              router.push(`/doctor/appointments/${liveAppointment.id}/soap` as any)
            }
            style={styles.liveCard}
          >
            <View style={styles.liveIconWrap}>
              <Icon name="pulse" size={18} color="#075985" />
            </View>
            <View style={styles.liveBody}>
              <Text style={styles.liveEyebrow}>En consulta ahora</Text>
              <Text style={styles.liveTitle}>{liveAppointment.patient_name}</Text>
              <Text style={styles.liveMeta}>
                {normalizeType(liveAppointment.type)} | {normalizeStatus(liveAppointment.status)}
              </Text>
            </View>
            <Icon name="arrow-right" size={18} color="#075985" />
          </Pressable>
        ) : null}

        <View style={styles.quickActions}>
          <QuickAction
            icon="calendar"
            label="Agenda"
            toneBg={themed("#EFF6FF", "#122845")}
            toneFg={themed("#2563EB", "#60A5FA")}
            onPress={() => router.push("/(doctor-tabs)/citas" as any)}
          />
          <QuickAction
            icon="gear"
            label="Configuración"
            toneBg={themed("#F5F3FF", "#2A1E46")}
            toneFg={themed("#7C3AED", "#A78BFA")}
            onPress={() => router.push("/doctor/settings" as any)}
          />
          <QuickAction
            icon="user-circle"
            label="Pacientes"
            toneBg={themed("#ECFDF5", "#0F3528")}
            toneFg={themed("#059669", "#34D399")}
            onPress={() => router.push("/(doctor-tabs)/pacientes" as any)}
          />
          <QuickAction
            icon="clipboard-text"
            label="Notas"
            toneBg={themed("#E0F2FE", "#0E3042")}
            toneFg={themed("#075985", "#38BDF8")}
            onPress={() => router.push("/doctor/notes" as any)}
          />
          <QuickAction
            icon="brain"
            label="IA"
            toneBg={themed("#F0FDFA", "#103532")}
            toneFg={themed("#0F766E", "#2DD4BF")}
            onPress={() => router.push("/ai/chat" as any)}
          />
          <QuickAction
            icon="list"
            label="Plantillas"
            toneBg={themed("#F5F3FF", "#2A1E46")}
            toneFg={themed("#7C3AED", "#A78BFA")}
            onPress={() => router.push("/doctor/consultation-templates" as any)}
          />
          <QuickAction
            icon="pill"
            label="Recetas"
            toneBg={themed("#F5F3FF", "#2A1E46")}
            toneFg={themed("#7C3AED", "#A78BFA")}
            onPress={() => router.push("/doctor/prescriptions" as any)}
          />
          <QuickAction
            icon="clock"
            label="Horarios"
            toneBg={themed("#F0FDFA", "#103532")}
            toneFg={themed("#0F766E", "#2DD4BF")}
            onPress={() => router.push("/doctor/availability" as any)}
          />
          <QuickAction
            icon="file"
            label="Documentos"
            toneBg={themed("#FFF7ED", "#3A2312")}
            toneFg={themed("#C2410C", "#FB923C")}
            onPress={() => router.push("/doctor/documents" as any)}
          />
          <QuickAction
            icon="wallet"
            label="Finanzas"
            toneBg={themed("#FFFBEB", "#33280F")}
            toneFg={themed("#D97706", "#FBBF24")}
            onPress={() => router.push("/doctor/finanzas" as any)}
          />
        </View>

        <View style={styles.kpiGrid}>
          <KpiCard
            label="Ingresos del mes"
            value={money.format(data?.stats.month_revenue ?? 0)}
            helper="Facturacion visible"
            icon="wallet"
          />
          <KpiCard
            label="Semana"
            value={String(data?.stats.week_appts ?? 0)}
            helper="Consultas agendadas"
            icon="calendar"
          />
          <KpiCard
            label="Pendientes"
            value={String(data?.stats.pending_appts ?? 0)}
            helper="Por atender o confirmar"
            icon="clock"
          />
          <KpiCard
            label="Recetas activas"
            value={String(data?.stats.active_rx ?? 0)}
            helper="Seguimiento clínico"
            icon="pill"
          />
        </View>

        <Section
          title="Agenda de hoy"
          subtitle="Tus consultas del día con acceso directo al detalle."
          actionLabel="Ver agenda"
          onAction={() => router.push("/(doctor-tabs)/citas" as any)}
        >
          {data?.today.length ? (
            data.today.slice(0, 4).map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                onPress={() => router.push(`/doctor/appointments/${appointment.id}` as any)}
              />
            ))
          ) : (
            <EmptyState text="No hay consultas para hoy." />
          )}
        </Section>

        <Section
          title="Pacientes recientes"
          subtitle="Tus pacientes más activos para abrir su ficha en segundos."
          actionLabel="Ver todos"
          onAction={() => router.push("/(doctor-tabs)/pacientes" as any)}
        >
          {data?.recent_patients.length ? (
            data.recent_patients.map((patient) => (
              <Pressable
                key={patient.id}
                onPress={() => router.push(`/doctor/patients/${patient.id}` as any)}
                style={styles.patientCard}
              >
                <View style={styles.patientAvatar}>
                  {patient.avatar_url ? (
                    <Image source={{ uri: patient.avatar_url }} style={styles.patientAvatarImage} />
                  ) : (
                    <Text style={styles.patientAvatarText}>
                      {patient.name.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={styles.patientBody}>
                  <Text style={styles.patientName}>{patient.name}</Text>
                  <Text style={styles.patientMeta}>
                    {patient.city || "Sin ciudad"} | {patient.total_appointments} citas
                  </Text>
                  <View style={styles.patientTags}>
                    <MiniTag label={patient.blood_type || "Sin sangre"} />
                    <MiniTag
                      label={
                        patient.last_appointment
                          ? `Última ${dateTime.format(new Date(patient.last_appointment))}`
                          : "Sin cita previa"
                      }
                    />
                  </View>
                </View>
              </Pressable>
            ))
          ) : (
            <EmptyState text="Aún no hay pacientes recientes para mostrar." />
          )}
        </Section>

        <Section
          title="Paridad operativa"
          subtitle="Los huecos grandes contra la web ya quedaron concentrados por módulo."
        >
          <View style={styles.parityRow}>
            <QuickAction
              icon="clock"
              label="Disponibilidad"
              toneBg={themed("#F0FDFA", "#103532")}
              toneFg={themed("#0F766E", "#2DD4BF")}
              onPress={() => router.push("/doctor/availability" as any)}
            />
            <QuickAction
              icon="clipboard-text"
              label="Notas"
              toneBg={themed("#E0F2FE", "#0E3042")}
              toneFg={themed("#075985", "#38BDF8")}
              onPress={() => router.push("/doctor/notes" as any)}
            />
            <QuickAction
              icon="chat-circle-dots"
              label="Asistentes"
              toneBg={themed("#FFF7ED", "#3A2312")}
              toneFg={themed("#B45309", "#FDBA74")}
              onPress={() => router.push("/doctor/assistants" as any)}
            />
          </View>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title,
  subtitle,
  children,
  actionLabel,
  onAction,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        </View>
        {actionLabel && onAction ? (
          <Pressable onPress={onAction} style={styles.sectionAction}>
            <Text style={styles.sectionActionText}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function HeroBadge({ icon, label }: { icon: IconName; label: string }) {
  return (
    <View style={styles.heroBadge}>
      <Icon name={icon} size={14} color={MC.primaryDark} />
      <Text style={styles.heroBadgeText}>{label}</Text>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  toneBg,
  toneFg,
  onPress,
}: {
  icon: IconName;
  label: string;
  toneBg: string;
  toneFg: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.quickAction, { backgroundColor: toneBg }]}>
      <View style={[styles.quickActionIcon, { backgroundColor: themed("#FFFFFFAA", "#0F1C26CC") }]}>
        <Icon name={icon} size={18} color={toneFg} />
      </View>
      <Text style={[styles.quickActionLabel, { color: toneFg }]}>{label}</Text>
    </Pressable>
  );
}

function KpiCard({
  label,
  value,
  helper,
  icon,
}: {
  label: string;
  value: string;
  helper: string;
  icon: IconName;
}) {
  return (
    <View style={styles.kpiCard}>
      <View style={styles.kpiIcon}>
        <Icon name={icon} size={18} color={MC.primary} />
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiHelper}>{helper}</Text>
    </View>
  );
}

function AppointmentCard({
  appointment,
  onPress,
}: {
  appointment: api.DoctorAppointmentItem;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.appointmentCard}>
      <View style={styles.appointmentTop}>
        <View style={styles.appointmentAvatar}>
          <Icon name="stethoscope" size={18} color={MC.primary} />
        </View>
        <View style={styles.appointmentBody}>
          <Text style={styles.appointmentPatient}>{appointment.patient_name}</Text>
          <Text style={styles.appointmentMeta}>
            {dateTime.format(new Date(appointment.scheduled_at))} | {normalizeType(appointment.type)}
          </Text>
          <Text style={styles.appointmentMeta}>
            {appointment.location || "Sin ubicación"} | {money.format(appointment.fee || 0)}
          </Text>
          {appointment.reason ? (
            <Text style={styles.appointmentReason}>{appointment.reason}</Text>
          ) : null}
        </View>
      </View>
      <View style={styles.appointmentTags}>
        <MiniTag label={normalizeStatus(appointment.status)} tone="brand" />
        {appointment.payment_status ? (
          <MiniTag label={`Pago ${normalizePaymentStatus(appointment.payment_status)}`} />
        ) : null}
      </View>
    </Pressable>
  );
}

function MiniTag({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "brand";
}) {
  return (
    <View style={[styles.miniTag, tone === "brand" && styles.miniTagBrand]}>
      <Text style={[styles.miniTagText, tone === "brand" && styles.miniTagBrandText]}>
        {label}
      </Text>
    </View>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>{text}</Text>
    </View>
  );
}

function normalizeType(type: string) {
  if (type === "virtual" || type === "videoconsulta") return "Videoconsulta";
  if (type === "home_visit" || type === "domicilio") return "Domicilio";
  return "Presencial";
}

function normalizeStatus(status: string) {
  const map: Record<string, string> = {
    confirmed: "Confirmada",
    pending_doctor: "Pendiente",
    pending_payment: "Pago pendiente",
    in_consultation: "En consulta",
    completed: "Completada",
    cancelled: "Cancelada",
    no_show: "No asistió",
  };

  return map[status] || status;
}

function normalizePaymentStatus(status: string) {
  const map: Record<string, string> = {
    pending: "pendiente",
    paid: "pagado",
    not_required: "sin pago",
    waived: "condonado",
    refunded: "reembolsado",
  };

  return map[status] || status;
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
  hero: {
    borderRadius: 26,
    backgroundColor: MC.primaryLight,
    borderWidth: 1,
    borderColor: themed("#C9ECE8", "#1F4C4A"),
    padding: 18,
    gap: 10,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  heroAvatar: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: MC.card,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  heroAvatarImage: { width: "100%", height: "100%" },
  heroAvatarText: { fontSize: 24, fontWeight: "700", color: MC.primaryDark },
  heroGear: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: themed("#FFFFFFCC", "#0F1C26CC"),
    alignItems: "center",
    justifyContent: "center",
  },
  heroEyebrow: { fontSize: 12, fontWeight: "700", color: MC.primaryDark },
  heroTitle: { fontSize: 28, fontWeight: "700", color: MC.textPrimary },
  heroSubtitle: { fontSize: 14, color: MC.textSecondary },
  heroBadgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  heroBadge: {
    borderRadius: 999,
    backgroundColor: MC.card,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  heroBadgeText: { fontSize: 11, fontWeight: "700", color: MC.primaryDark },
  errorBox: {
    borderRadius: 14,
    backgroundColor: MC.errorSoft,
    padding: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  errorText: { flex: 1, color: MC.error, fontSize: 13 },
  liveCard: {
    borderRadius: 20,
    backgroundColor: themed("#E0F2FE", "#0E3042"),
    borderWidth: 1,
    borderColor: themed("#BAE6FD", "#1E4E63"),
    padding: 14,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  liveIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: themed("#FFFFFFCC", "#0F1C26CC"),
    alignItems: "center",
    justifyContent: "center",
  },
  liveBody: { flex: 1, gap: 2 },
  liveEyebrow: { fontSize: 12, fontWeight: "700", color: MC.primary },
  liveTitle: { fontSize: 15, fontWeight: "700", color: MC.textPrimary },
  liveMeta: { fontSize: 12, color: MC.textSecondary },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  parityRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  quickAction: {
    flexBasis: "47%",
    flexGrow: 1,
    minWidth: 142,
    borderRadius: 20,
    padding: 14,
    gap: 10,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionLabel: { fontSize: 14, fontWeight: "700" },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  kpiCard: {
    flexBasis: "47%",
    flexGrow: 1,
    minWidth: 150,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.card,
    padding: 14,
    gap: 6,
  },
  kpiIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: MC.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  kpiValue: { fontSize: 18, fontWeight: "700", color: MC.textPrimary },
  kpiLabel: { fontSize: 12, fontWeight: "700", color: MC.textPrimary },
  kpiHelper: { fontSize: 11, color: MC.textSecondary },
  section: { gap: 10 },
  sectionHead: { flexDirection: "row", gap: 12, alignItems: "center" },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: MC.textPrimary },
  sectionSubtitle: { fontSize: 13, lineHeight: 18, color: MC.textSecondary, marginTop: 2 },
  sectionAction: {
    borderRadius: 999,
    backgroundColor: MC.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sectionActionText: { fontSize: 12, fontWeight: "700", color: MC.primaryDark },
  sectionBody: { gap: 10 },
  appointmentCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.card,
    padding: 14,
    gap: 10,
  },
  appointmentTop: { flexDirection: "row", gap: 12 },
  appointmentAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: MC.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  appointmentBody: { flex: 1, gap: 4 },
  appointmentPatient: { fontSize: 15, fontWeight: "700", color: MC.textPrimary },
  appointmentMeta: { fontSize: 12, color: MC.textSecondary },
  appointmentReason: { fontSize: 13, color: MC.textPrimary },
  appointmentTags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  patientCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.card,
    padding: 14,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  patientAvatar: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: MC.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  patientAvatarImage: { width: "100%", height: "100%" },
  patientAvatarText: { fontSize: 20, fontWeight: "700", color: MC.primaryDark },
  patientBody: { flex: 1, gap: 4 },
  patientName: { fontSize: 15, fontWeight: "700", color: MC.textPrimary },
  patientMeta: { fontSize: 12, color: MC.textSecondary },
  patientTags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  miniTag: {
    borderRadius: 999,
    backgroundColor: MC.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  miniTagBrand: { backgroundColor: MC.primaryLight },
  miniTagText: { fontSize: 11, fontWeight: "700", color: MC.textSecondary },
  miniTagBrandText: { color: MC.primaryDark },
  emptyState: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.surface,
    padding: 16,
  },
  emptyStateText: { fontSize: 13, color: MC.textSecondary },
});
