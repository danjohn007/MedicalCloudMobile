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
import { NotificationBellButton } from "@/components/NotificationBellButton";
import { MC } from "@/constants/theme";
import * as api from "@/services/api";
import { isPresentialAppointmentType } from "@/utils/appointmentTypes";

const dateFmt = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const FILTERS: { label: string; value: api.DoctorAppointmentScope }[] = [
  { label: "Hoy", value: "today" },
  { label: "Próximas", value: "upcoming" },
  { label: "En consulta", value: "in_consultation" },
  { label: "Completadas", value: "completed" },
];

export default function DoctorAppointmentsScreen() {
  const router = useRouter();
  const [scope, setScope] = useState<api.DoctorAppointmentScope>("today");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [appointments, setAppointments] = useState<api.DoctorAppointmentItem[]>([]);

  useEffect(() => {
    void loadAppointments(scope);
  }, [scope]);

  async function loadAppointments(
    nextScope: api.DoctorAppointmentScope,
    isRefresh = false,
  ) {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      setError("");
      const response = await api.getDoctorAppointments(nextScope);
      setAppointments(response.data || []);
    } catch (e: any) {
      setError(e?.message || "No se pudieron cargar las consultas.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const liveAppointment = useMemo(
    () => appointments.find((appointment) => appointment.status === "in_consultation") ?? null,
    [appointments],
  );
  const scopeSummary = useMemo(() => getScopeSummary(scope, appointments), [appointments, scope]);

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
            onRefresh={() => loadAppointments(scope, true)}
            tintColor={MC.primary}
          />
        }
      >
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <Text style={styles.heroEyebrow}>Agenda clínica</Text>
            <NotificationBellButton />
          </View>
          <Text style={styles.heroTitle}>Consultas</Text>
          <Text style={styles.heroSubtitle}>
            Gestiona el estado de cada cita y entra directo al flujo de consulta.
          </Text>
          <View style={styles.heroStats}>
            <HeroStat label="Filtro" value={FILTERS.find((item) => item.value === scope)?.label || "Hoy"} />
            <HeroStat label="Resultados" value={String(appointments.length)} />
          </View>
          <Pressable
            onPress={() => router.push("/doctor/appointments/create" as any)}
            style={styles.createButton}
          >
            <Icon name="plus" size={16} color={MC.white} />
            <Text style={styles.createButtonText}>Nueva cita</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {FILTERS.map((filter) => {
            const active = filter.value === scope;
            return (
              <Pressable
                key={filter.value}
                onPress={() => setScope(filter.value)}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.scopeCard}>
          <View style={styles.scopeHeader}>
            <View style={styles.scopeIcon}>
              <Icon name={scopeSummary.icon} size={18} color={scopeSummary.color} />
            </View>
            <View style={styles.scopeBody}>
              <Text style={styles.scopeTitle}>{scopeSummary.title}</Text>
              <Text style={styles.scopeText}>{scopeSummary.text}</Text>
            </View>
          </View>
          <View style={styles.scopeStats}>
            <HeroStat label="Prioridad" value={String(scopeSummary.priorityCount)} />
            <HeroStat label="Resto" value={String(Math.max(appointments.length - scopeSummary.priorityCount, 0))} />
          </View>
        </View>

        {liveAppointment ? (
          <Pressable
            onPress={() =>
              router.push(`/doctor/appointments/${liveAppointment.id}/soap` as any)
            }
            style={styles.liveCard}
          >
            <View style={styles.liveIcon}>
              <Icon name="pulse" size={20} color="#075985" />
            </View>
            <View style={styles.liveBody}>
              <Text style={styles.liveEyebrow}>En consulta</Text>
              <Text style={styles.liveTitle}>{liveAppointment.patient_name}</Text>
              <Text style={styles.liveText}>
                {normalizeType(liveAppointment.type)} | abrir nota SOAP y receta
              </Text>
            </View>
            <Icon name="arrow-right" size={18} color="#075985" />
          </Pressable>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <Icon name="warning" size={18} color={MC.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.list}>
          {appointments.length ? (
            appointments.map((appointment) => (
              <Pressable
                key={appointment.id}
                onPress={() => router.push(`/doctor/appointments/${appointment.id}` as any)}
                style={styles.card}
              >
                <View style={styles.cardHead}>
                  <View style={styles.cardIcon}>
                    <Icon
                      name={appointment.status === "in_consultation" ? "pulse" : "calendar"}
                      size={18}
                      color={MC.primary}
                    />
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={styles.patientName}>{appointment.patient_name}</Text>
                    <Text style={styles.meta}>
                      {dateFmt.format(new Date(appointment.scheduled_at))} |{" "}
                      {normalizeType(appointment.type)}
                    </Text>
                    <Text style={styles.meta}>
                      {appointment.location || "Sin ubicación"} |{" "}
                      {money.format(appointment.fee || 0)}
                    </Text>
                    {appointment.reason ? (
                      <Text style={styles.reason}>{appointment.reason}</Text>
                    ) : null}
                  </View>
                </View>
                <View
                  style={[
                    styles.hintCard,
                    appointmentHintToneStyles[
                      getAppointmentActionHint(appointment).tone
                    ],
                  ]}
                >
                  <Icon
                    name={getAppointmentActionHint(appointment).icon}
                    size={16}
                    color={getAppointmentActionHint(appointment).color}
                  />
                  <View style={styles.hintBody}>
                    <Text
                      style={[
                        styles.hintTitle,
                        { color: getAppointmentActionHint(appointment).color },
                      ]}
                    >
                      {getAppointmentActionHint(appointment).title}
                    </Text>
                    <Text style={styles.hintText}>
                      {getAppointmentActionHint(appointment).text}
                    </Text>
                  </View>
                </View>
                <View style={styles.tagRow}>
                  <Tag label={normalizeStatus(appointment.status)} tone="brand" />
                  {appointment.payment_status ? (
                    <Tag label={`Pago ${normalizePaymentStatus(appointment.payment_status)}`} />
                  ) : null}
                  {appointment.patient_phone ? (
                    <Tag label={appointment.patient_phone} />
                  ) : null}
                </View>
              </Pressable>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No hay consultas para este filtro.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.heroStat}>
      <Text style={styles.heroStatValue}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

function Tag({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "brand";
}) {
  return (
    <View style={[styles.tag, tone === "brand" && styles.tagBrand]}>
      <Text style={[styles.tagText, tone === "brand" && styles.tagBrandText]}>{label}</Text>
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

function getScopeSummary(
  scope: api.DoctorAppointmentScope,
  appointments: api.DoctorAppointmentItem[],
) {
  if (scope === "today") {
    const priorityCount = appointments.filter((appointment) =>
      ["pending", "pending_doctor", "pending_patient", "confirmed", "in_consultation"].includes(
        appointment.status,
      ),
    ).length;

    return {
      icon: "calendar" as const,
      color: MC.primaryDark,
      title: "Vista de hoy",
      text: "Empieza por confirmar pendientes, luego valida el inicio o entra a la nota SOAP.",
      priorityCount,
    };
  }

  if (scope === "upcoming") {
    const priorityCount = appointments.filter((appointment) =>
      ["pending", "pending_doctor", "pending_patient", "pending_payment"].includes(
        appointment.status,
      ),
    ).length;

    return {
      icon: "clock" as const,
      color: "#7C3AED",
      title: "Próximas por preparar",
      text: "Deja listas las consultas futuras: confirma, valida el pago y revisa el motivo antes del día de atención.",
      priorityCount,
    };
  }

  if (scope === "in_consultation") {
    return {
      icon: "pulse" as const,
      color: MC.primary,
      title: "Consultas en curso",
      text: "Desde aquí lo importante es abrir la nota clínica, revisar alertas del paciente y cerrar bien la consulta.",
      priorityCount: appointments.length,
    };
  }

  return {
    icon: "check-circle" as const,
    color: MC.success,
    title: "Consultas cerradas",
    text: "Usa esta vista para seguimiento clínico, repasar notas emitidas y abrir rápido la ficha del paciente.",
    priorityCount: appointments.length,
  };
}

function getAppointmentActionHint(appointment: api.DoctorAppointmentItem) {
  if (
    ["pending", "pending_doctor", "pending_patient"].includes(appointment.status)
  ) {
    return {
      icon: "check-circle" as const,
      color: MC.success,
      title: "Siguiente paso: confirmar cita",
      text: "Confirma la consulta para dejarla lista en la agenda operativa del doctor.",
      tone: "success" as const,
    };
  }

  if (appointment.status === "pending_payment") {
    return {
      icon: "credit-card" as const,
      color: MC.star,
      title: "Siguiente paso: revisar cobro",
      text: "Espera el pago, condona si aplica o confirma cuando el servidor la deje lista para atención.",
      tone: "warning" as const,
    };
  }

  if (
    appointment.status === "confirmed" &&
    isPresentialAppointmentType(appointment.type) &&
    !appointment.checked_in_at
  ) {
    return {
      icon: "shield-check" as const,
      color: "#2563EB",
      title: "Siguiente paso: registrar la llegada del paciente",
      text: "Pide el código de llegada y cambia la cita a en consulta desde tablet o teléfono.",
      tone: "info" as const,
    };
  }

  if (appointment.status === "confirmed") {
    return {
      icon: "pulse" as const,
      color: MC.primaryDark,
      title: "Siguiente paso: iniciar consulta",
      text: "Abre el detalle y entra al flujo clínico cuando toque atender al paciente.",
      tone: "brand" as const,
    };
  }

  if (appointment.status === "in_consultation") {
    return {
      icon: "clipboard-text" as const,
      color: MC.primary,
      title: "Siguiente paso: capturar SOAP",
      text: "La consulta ya está activa. Abre la nota clínica, receta y cierre de visita.",
      tone: "info" as const,
    };
  }

  if (appointment.status === "completed") {
    return {
      icon: "check" as const,
      color: MC.success,
      title: "Consulta finalizada",
      text: "Puedes revisar la nota, la receta y volver a la ficha del paciente para seguimiento.",
      tone: "success" as const,
    };
  }

  return {
    icon: "warning" as const,
    color: MC.textSecondary,
    title: "Seguimiento requerido",
    text: "Abre el detalle para revisar contexto, registrar incidencia o continuar con el siguiente paciente.",
    tone: "neutral" as const,
  };
}

const appointmentHintToneStyles = {
  brand: { backgroundColor: MC.primaryLight, borderColor: MC.infoBorder },
  success: { backgroundColor: MC.successSoft, borderColor: MC.successBorder },
  warning: { backgroundColor: MC.orangeSoft, borderColor: MC.orangeBorder },
  info: { backgroundColor: MC.infoSoft, borderColor: MC.infoBorder },
  neutral: { backgroundColor: MC.surface, borderColor: MC.border },
} as const;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MC.background },
  loadingWrap: {
    flex: 1,
    backgroundColor: MC.background,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { padding: 16, paddingBottom: 36, gap: 14 },
  hero: {
    borderRadius: 24,
    backgroundColor: MC.primaryLight,
    borderWidth: 1,
    borderColor: MC.infoBorder,
    padding: 18,
    gap: 8,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroEyebrow: { fontSize: 12, fontWeight: "700", color: MC.primaryDark },
  heroTitle: { fontSize: 28, fontWeight: "700", color: MC.textPrimary },
  heroSubtitle: { fontSize: 13, lineHeight: 19, color: MC.textSecondary },
  heroStats: { flexDirection: "row", gap: 10, marginTop: 4 },
  createButton: {
    marginTop: 8,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    backgroundColor: MC.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  createButtonText: { fontSize: 13, fontWeight: "700", color: MC.white },
  heroStat: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: MC.card,
    padding: 12,
    gap: 2,
  },
  heroStatValue: { fontSize: 18, fontWeight: "700", color: MC.textPrimary },
  heroStatLabel: { fontSize: 11, color: MC.textSecondary },
  filters: { gap: 8, paddingVertical: 4 },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.card,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  filterChipActive: {
    borderColor: MC.primary,
    backgroundColor: MC.primaryLight,
  },
  filterText: { fontSize: 13, fontWeight: "700", color: MC.textSecondary },
  filterTextActive: { color: MC.primaryDark },
  scopeCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.card,
    padding: 14,
    gap: 12,
  },
  scopeHeader: { flexDirection: "row", gap: 12, alignItems: "center" },
  scopeIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: MC.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  scopeBody: { flex: 1, gap: 3 },
  scopeTitle: { fontSize: 15, fontWeight: "700", color: MC.textPrimary },
  scopeText: { fontSize: 12, lineHeight: 18, color: MC.textSecondary },
  scopeStats: { flexDirection: "row", gap: 10 },
  liveCard: {
    borderRadius: 20,
    backgroundColor: MC.infoSoft,
    borderWidth: 1,
    borderColor: MC.infoBorder,
    padding: 14,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  liveIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: MC.card,
    alignItems: "center",
    justifyContent: "center",
  },
  liveBody: { flex: 1, gap: 2 },
  liveEyebrow: { fontSize: 12, fontWeight: "700", color: MC.primary },
  liveTitle: { fontSize: 15, fontWeight: "700", color: MC.textPrimary },
  liveText: { fontSize: 12, color: MC.textSecondary },
  errorBox: {
    borderRadius: 14,
    backgroundColor: MC.errorSoft,
    padding: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  errorText: { flex: 1, color: MC.error, fontSize: 13 },
  list: { gap: 12 },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.card,
    padding: 14,
    gap: 10,
  },
  cardHead: { flexDirection: "row", gap: 12 },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: MC.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1, gap: 4 },
  patientName: { fontSize: 15, fontWeight: "700", color: MC.textPrimary },
  meta: { fontSize: 12, color: MC.textSecondary },
  reason: { fontSize: 13, color: MC.textPrimary },
  hintCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  hintBody: { flex: 1, gap: 3 },
  hintTitle: { fontSize: 12, fontWeight: "700" },
  hintText: { fontSize: 12, lineHeight: 18, color: MC.textSecondary },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    borderRadius: 999,
    backgroundColor: MC.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagBrand: { backgroundColor: MC.primaryLight },
  tagText: { fontSize: 11, fontWeight: "700", color: MC.textSecondary },
  tagBrandText: { color: MC.primaryDark },
  emptyState: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.surface,
    padding: 16,
  },
  emptyText: { fontSize: 13, color: MC.textSecondary },
});
