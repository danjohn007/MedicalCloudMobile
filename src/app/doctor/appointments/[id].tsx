import { useEffect, useState } from "react";
import * as WebBrowser from "expo-web-browser";
import { useLocalSearchParams, useRouter } from "expo-router";
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

import { Icon } from "@/components/Icon";
import { MC } from "@/constants/theme";
import { ensureAiClinicalDataConsent } from "@/services/ai-data-consent";
import * as api from "@/services/api";
import { useAuthStore } from "@/stores/authStore";
import { isPresentialAppointmentType } from "@/utils/appointmentTypes";

const dateFmt = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const MANUAL_METHODS: { label: string; value: "cash" | "transfer" | "card" | "other" }[] = [
  { label: "Efectivo", value: "cash" },
  { label: "Transferencia", value: "transfer" },
  { label: "Tarjeta externa", value: "card" },
  { label: "Otro", value: "other" },
];

function fetchAppointmentDetail(appointmentId: number) {
  return api.getDoctorAppointmentDetail(appointmentId);
}

export default function DoctorAppointmentDetailScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const appointmentId = Number(Array.isArray(params.id) ? params.id[0] : params.id);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");
  const [aiBriefing, setAiBriefing] = useState("");
  const [aiBriefingLoading, setAiBriefingLoading] = useState(false);
  const [detail, setDetail] = useState<api.DoctorAppointmentDetailData | null>(null);
  const [manualAmount, setManualAmount] = useState("");
  const [manualMethod, setManualMethod] = useState<"cash" | "transfer" | "card" | "other">("cash");
  const [manualNote, setManualNote] = useState("");

  useEffect(() => {
    if (!Number.isFinite(appointmentId) || appointmentId <= 0) {
      setError("Consulta invalida.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await fetchAppointmentDetail(appointmentId);
        if (cancelled) return;
        setDetail(response);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || "No se pudo cargar la consulta.");
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
  }, [appointmentId]);

  async function loadData(isRefresh = false) {
    if (!Number.isFinite(appointmentId) || appointmentId <= 0) {
      setError("Consulta invalida.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      setError("");
      const response = await fetchAppointmentDetail(appointmentId);
      setDetail(response);
    } catch (e: any) {
      setError(e?.message || "No se pudo cargar la consulta.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleStatus(action: api.DoctorAppointmentStatusAction) {
    try {
      setBusyAction(action);
      setError("");
      const result = await api.updateDoctorAppointmentStatus(appointmentId, action);
      await loadData();
      if (action === "in_consultation") {
        router.push(`/doctor/appointments/${appointmentId}/soap` as any);
        return;
      }
      Alert.alert("Estado actualizado", result.message || "La cita fue actualizada.");
    } catch (e: any) {
      setError(e?.message || "No se pudo actualizar el estado.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleVideoJoin(roomId?: string | null) {
    if (!roomId) return;

    try {
      setBusyAction("video");
      await WebBrowser.openBrowserAsync(`https://meet.jit.si/${roomId}`);
    } catch (e: any) {
      Alert.alert("No se pudo abrir la videollamada", e?.message || "Intenta de nuevo.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleGenerateAiBriefing() {
    if (!Number.isFinite(appointmentId) || appointmentId <= 0 || aiBriefingLoading) {
      return;
    }

    setAiBriefingLoading(true);
    setError("");
    try {
      const accepted = await ensureAiClinicalDataConsent({
        userId: user?.id ?? 0,
        role: user?.role ?? "doctor",
      });
      if (!accepted) return;

      const response = await api.getAiBriefing(appointmentId);
      setAiBriefing(response.briefing || "La IA no devolvió contenido para esta cita.");
    } catch (e: any) {
      setError(e?.message || "No se pudo generar el briefing con IA.");
    } finally {
      setAiBriefingLoading(false);
    }
  }

  async function handleManualPayment() {
    const amount = Number(manualAmount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert("Monto requerido", "Ingresa el monto que recibiste para esta cita.");
      return;
    }

    try {
      setBusyAction("manual-payment");
      setError("");
      const result = await api.recordDoctorAppointmentManualPayment(appointmentId, {
        amount,
        method: manualMethod,
        note: manualNote.trim(),
      });
      setManualAmount("");
      setManualNote("");
      await loadData();
      Alert.alert("Pago registrado", result.message || "El pago manual quedó guardado.");
    } catch (e: any) {
      setError(e?.message || "No se pudo registrar el pago manual.");
    } finally {
      setBusyAction("");
    }
  }

  function handlePrimaryFlowPress(action: PrimaryFlowAction) {
    if (action.kind === "status") {
      void handleStatus(action.action);
      return;
    }

    if (action.kind === "route") {
      router.push(action.href as any);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingWrap} edges={["top"]}>
        <ActivityIndicator size="large" color={MC.primary} />
      </SafeAreaView>
    );
  }

  const appointment = detail?.data ?? null;
  const actions = appointment ? getAvailableActions(appointment) : [];
  const primaryFlow = appointment ? getPrimaryFlowAction(appointment) : null;
  const flowSteps = appointment ? buildFlowSteps(appointment) : [];

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
          <Text style={styles.headerTitle}>Consulta</Text>
          <View style={styles.headerSpacer} />
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Icon name="warning" size={18} color={MC.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {appointment ? (
          <>
            <View style={styles.hero}>
              <Text style={styles.heroEyebrow}>{normalizeStatus(appointment.status)}</Text>
              <Text style={styles.heroTitle}>{appointment.patient_name}</Text>
              <Text style={styles.heroSubtitle}>
                {formatDate(appointment.scheduled_at)} | {normalizeType(appointment.type)}
              </Text>
              <View style={styles.heroChips}>
                <HeroChip icon="wallet" label={money.format(appointment.fee || 0)} />
                <HeroChip
                  icon="credit-card"
                  label={
                    appointment.payment_status
                      ? `Pago ${normalizePaymentStatus(appointment.payment_status)}`
                      : "Pago s/d"
                  }
                />
              </View>
            </View>

            <Section title="Flujo recomendado">
              <View style={styles.flowCard}>
                <View style={styles.flowHeader}>
                  <View style={styles.flowIcon}>
                    <Icon
                      name={primaryFlow?.icon || "calendar"}
                      size={18}
                      color={primaryFlow?.color || MC.primaryDark}
                    />
                  </View>
                  <View style={styles.flowHeaderBody}>
                    <Text style={styles.flowTitle}>
                      {primaryFlow?.title || "Consulta sin acción urgente"}
                    </Text>
                    <Text style={styles.flowText}>
                      {primaryFlow?.text ||
                        "La cita ya terminó. Puedes revisar la nota clínica o volver a la ficha del paciente."}
                    </Text>
                  </View>
                </View>

                <View style={styles.flowStepRow}>
                  {flowSteps.map((step) => (
                    <FlowStep key={step.label} label={step.label} tone={step.tone} />
                  ))}
                </View>

                {primaryFlow ? (
                  <Pressable
                    onPress={() => handlePrimaryFlowPress(primaryFlow)}
                    style={[
                      styles.primaryFlowButton,
                      { backgroundColor: primaryFlow.backgroundColor },
                    ]}
                  >
                    <Icon name={primaryFlow.icon} size={18} color={primaryFlow.color} />
                    <Text
                      style={[styles.primaryFlowButtonText, { color: primaryFlow.color }]}
                    >
                      {primaryFlow.buttonLabel}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </Section>

            <Section title="Acciones de la consulta">
              <View style={styles.actionGrid}>
                {isPresentialAppointmentType(appointment.type) &&
                appointment.status === "confirmed" &&
                !appointment.checked_in_at ? (
                  <ActionButton
                    icon="shield-check"
                    label="Iniciar con QR"
                    tone="primary"
                    busy={false}
                    onPress={() =>
                      router.push(`/doctor/appointments/${appointment.id}/checkin` as any)
                    }
                  />
                ) : null}
                {actions.map((action) => (
                  <ActionButton
                    key={action.action}
                    icon={action.icon}
                    label={action.label}
                    tone={action.tone}
                    busy={busyAction === action.action}
                    onPress={() => handleStatus(action.action)}
                  />
                ))}
                {appointment.status === "in_consultation" ? (
                  <ActionButton
                    icon="check"
                    label="Cerrar consulta"
                    tone="success"
                    busy={false}
                    onPress={() =>
                      router.push(`/doctor/appointments/${appointment.id}/complete` as any)
                    }
                  />
                ) : null}
                <ActionButton
                  icon="clipboard-text"
                  label={appointment.note ? "Editar nota" : "Crear nota"}
                  tone="primary"
                  busy={false}
                  onPress={() => router.push(`/doctor/appointments/${appointment.id}/soap` as any)}
                />
                {appointment.type === "virtual" && appointment.video_room_id ? (
                  <ActionButton
                    icon="video-camera"
                    label="Videollamada"
                    tone="neutral"
                    busy={busyAction === "video"}
                    onPress={() => handleVideoJoin(appointment.video_room_id)}
                  />
                ) : null}
              </View>
            </Section>

            <Section title="Datos de la consulta">
              <InfoRow label="Motivo" value={appointment.reason || "Sin motivo registrado"} />
              <InfoRow label="Ubicación" value={appointment.location || "Sin ubicación"} />
              <InfoRow label="Teléfono paciente" value={appointment.patient_phone || "Sin teléfono"} />
              <InfoRow label="Correo paciente" value={appointment.patient_email || "Sin correo"} />
              <InfoRow
                label="Inicio validado"
                value={appointment.checked_in_at ? formatDate(appointment.checked_in_at) : "Pendiente"}
              />
            </Section>

            <Section title="Cobro y pagos">
              <View style={styles.paymentSummaryCard}>
                <InfoRow label="Tarifa base" value={money.format(appointment.base_fee ?? appointment.fee ?? 0)} />
                <InfoRow label="Cargo actual" value={money.format(appointment.fee || 0)} />
                <InfoRow
                  label="Registrado manualmente"
                  value={money.format(appointment.manual_paid_total || 0)}
                />
                <InfoRow
                  label="Restante"
                  value={money.format(Math.max(0, (appointment.fee || 0) - (appointment.manual_paid_total || 0)))}
                />
                {appointment.price_adjustment_type && appointment.price_adjustment_type !== "none" ? (
                  <Text style={styles.paymentHelp}>
                    Ajuste aplicado: {normalizePriceAdjustment(appointment.price_adjustment_type)}
                    {appointment.price_adjustment_note ? ` · ${appointment.price_adjustment_note}` : ""}
                  </Text>
                ) : null}
              </View>

              <View style={styles.manualForm}>
                <Text style={styles.manualFormTitle}>Registrar pago recibido fuera de la plataforma</Text>
                <TextInput
                  value={manualAmount}
                  onChangeText={setManualAmount}
                  keyboardType="decimal-pad"
                  placeholder="Monto recibido"
                  placeholderTextColor={MC.textMuted}
                  style={styles.manualInput}
                />
                <View style={styles.methodGrid}>
                  {MANUAL_METHODS.map((method) => {
                    const active = method.value === manualMethod;
                    return (
                      <Pressable
                        key={method.value}
                        onPress={() => setManualMethod(method.value)}
                        style={[styles.methodChip, active && styles.methodChipActive]}
                      >
                        <Text style={[styles.methodChipText, active && styles.methodChipTextActive]}>
                          {method.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <TextInput
                  value={manualNote}
                  onChangeText={setManualNote}
                  placeholder="Nota opcional"
                  placeholderTextColor={MC.textMuted}
                  style={styles.manualInput}
                />
                <Pressable
                  onPress={handleManualPayment}
                  disabled={busyAction === "manual-payment"}
                  style={[styles.manualSubmit, busyAction === "manual-payment" && styles.manualSubmitDisabled]}
                >
                  {busyAction === "manual-payment" ? (
                    <ActivityIndicator color={MC.white} />
                  ) : (
                    <>
                      <Icon name="check-circle" size={18} color={MC.white} />
                      <Text style={styles.manualSubmitText}>Guardar pago manual</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </Section>

            <Section title="Contexto clínico">
              <InfoRow
                label="Alergias"
                value={appointment.patient_allergies || "Sin alergias registradas"}
              />
              <InfoRow
                label="Medicación actual"
                value={appointment.patient_current_medications || "Sin medicación registrada"}
              />
              <InfoRow label="Perfil" value={buildProfileLine(appointment)} />
              <InfoRow
                label="Consultas previas"
                value={String(appointment.prior_consultations ?? 0)}
              />
            </Section>

            <Section title="Briefing rápido">
              <Pressable
                style={[styles.aiBriefingButton, aiBriefingLoading && styles.aiBriefingButtonDisabled]}
                onPress={handleGenerateAiBriefing}
                disabled={aiBriefingLoading}
              >
                <View style={styles.aiBriefingIcon}>
                  {aiBriefingLoading ? (
                    <ActivityIndicator size="small" color={MC.primary} />
                  ) : (
                    <Icon name="brain" size={18} color={MC.primary} />
                  )}
                </View>
                <View style={styles.aiBriefingButtonBody}>
                  <Text style={styles.aiBriefingButtonTitle}>
                    {aiBriefing ? "Actualizar briefing IA" : "Generar briefing IA"}
                  </Text>
                  <Text style={styles.aiBriefingButtonText}>
                    Resume datos clave, alertas, última visita y sugerencias para la consulta.
                  </Text>
                </View>
              </Pressable>

              {aiBriefing ? (
                <View style={styles.aiBriefingResult}>
                  <View style={styles.aiBriefingResultHeader}>
                    <Icon name="brain" size={16} color={MC.primaryDark} />
                    <Text style={styles.aiBriefingResultTitle}>Resumen generado por IA</Text>
                  </View>
                  <Text style={styles.aiBriefingResultText}>{aiBriefing}</Text>
                </View>
              ) : null}

              <BriefingCard
                icon="warning"
                title="Alertas clínicas"
                text={
                  appointment.patient_allergies
                    ? appointment.patient_allergies
                    : "Sin alergias o alertas marcadas en este momento."
                }
              />
              <BriefingCard
                icon="pill"
                title="Medicación actual"
                text={
                  appointment.patient_current_medications ||
                  "No hay medicación activa registrada para este paciente."
                }
              />
            </Section>

            <Section title="Estado de trabajo clínico">
              <StatusCard
                icon="clipboard-text"
                title="Nota clínica"
                status={appointment.note ? "Creada" : "Pendiente"}
                description={
                  appointment.note
                    ? truncate(
                        appointment.note.assessment ||
                          appointment.note.plan_text ||
                          appointment.note.subjective ||
                          "",
                        140,
                      ) || "La nota ya tiene contenido guardado."
                    : "Esta consulta aún no tiene nota asociada en móvil."
                }
              />
              <StatusCard
                icon="pill"
                title="Receta"
                status={appointment.prescription ? "Emitida" : "Pendiente"}
                description={
                  appointment.prescription
                    ? truncate(
                        appointment.prescription.medications ||
                          appointment.prescription.instructions ||
                          appointment.prescription.diagnosis ||
                          "",
                        140,
                      ) || "La receta ya existe para esta cita."
                    : "Todavía no hay receta vinculada a esta consulta."
                }
              />
            </Section>

            <Pressable
              onPress={() => router.push(`/doctor/patients/${appointment.patient_id}` as any)}
              style={styles.patientButton}
            >
              <View style={styles.patientButtonIcon}>
                <Icon name="user-circle" size={20} color={MC.primary} />
              </View>
              <View style={styles.patientButtonBody}>
                <Text style={styles.patientButtonTitle}>Abrir ficha del paciente</Text>
                <Text style={styles.patientButtonText}>
                  Ver snapshot, historial, notas y recetas del paciente.
                </Text>
              </View>
              <Icon name="arrow-right" size={18} color={MC.textMuted} />
            </Pressable>
          </>
        ) : (
          <EmptyState text="No se encontró información de la consulta." />
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

function HeroChip({
  icon,
  label,
}: {
  icon: "wallet" | "credit-card";
  label: string;
}) {
  return (
    <View style={styles.heroChip}>
      <Icon name={icon} size={14} color={MC.primaryDark} />
      <Text style={styles.heroChipText}>{label}</Text>
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

function StatusCard({
  icon,
  title,
  status,
  description,
}: {
  icon: "clipboard-text" | "pill";
  title: string;
  status: string;
  description: string;
}) {
  return (
    <View style={styles.statusCard}>
      <View style={styles.statusIcon}>
        <Icon name={icon} size={16} color={MC.primary} />
      </View>
      <View style={styles.statusBody}>
        <Text style={styles.statusTitle}>{title}</Text>
        <Text style={styles.statusSubtitle}>{status}</Text>
        <Text style={styles.statusText}>{description}</Text>
      </View>
    </View>
  );
}

function BriefingCard({
  icon,
  title,
  text,
}: {
  icon: "warning" | "pill";
  title: string;
  text: string;
}) {
  return (
    <View style={styles.briefingCard}>
      <View style={styles.briefingIcon}>
        <Icon name={icon} size={16} color={MC.primary} />
      </View>
      <View style={styles.briefingBody}>
        <Text style={styles.briefingTitle}>{title}</Text>
        <Text style={styles.briefingText}>{text}</Text>
      </View>
    </View>
  );
}

function FlowStep({
  label,
  tone,
}: {
  label: string;
  tone: "done" | "current" | "upcoming";
}) {
  const toneStyles = {
    done: { bg: MC.successSoft, fg: MC.success },
    current: { bg: MC.primaryLight, fg: MC.primaryDark },
    upcoming: { bg: MC.surface, fg: MC.textMuted },
  }[tone];

  return (
    <View style={[styles.flowStep, { backgroundColor: toneStyles.bg }]}>
      <Text style={[styles.flowStepText, { color: toneStyles.fg }]}>{label}</Text>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  tone,
  busy,
  onPress,
}: {
  icon:
    | "check-circle"
    | "pulse"
    | "brain"
    | "check"
    | "x"
    | "warning"
    | "clipboard-text"
    | "video-camera"
    | "shield-check";
  label: string;
  tone: "primary" | "success" | "danger" | "neutral";
  busy: boolean;
  onPress: () => void;
}) {
  const toneStyles = {
    primary: { bg: MC.primaryLight, fg: MC.primaryDark },
    success: { bg: MC.successSoft, fg: MC.success },
    danger: { bg: MC.errorSoft, fg: MC.error },
    neutral: { bg: MC.surface, fg: MC.textPrimary },
  }[tone];

  return (
    <Pressable
      onPress={onPress}
      style={[styles.actionButton, { backgroundColor: toneStyles.bg }]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={toneStyles.fg} />
      ) : (
        <>
          <Icon name={icon} size={18} color={toneStyles.fg} />
          <Text style={[styles.actionButtonText, { color: toneStyles.fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Sin fecha";

  return dateFmt.format(parsed);
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

function normalizePriceAdjustment(type: string) {
  const map: Record<string, string> = {
    fixed: "monto exacto",
    percent_discount: "descuento porcentual",
    percent_increase: "aumento porcentual",
    waived: "sin cobro",
  };

  return map[type] || type;
}

function buildProfileLine(appointment: api.DoctorAppointmentDetailData["data"]) {
  const parts = [
    appointment.patient_age != null ? `${appointment.patient_age} años` : "",
    appointment.patient_gender || "",
    appointment.patient_blood_type || "",
  ].filter(Boolean);

  return parts.length ? parts.join(" | ") : "Sin datos de perfil";
}

function getAvailableActions(appointment: api.DoctorAppointmentDetailData["data"]) {
  const status = appointment.status;
  const actions: {
    action: api.DoctorAppointmentStatusAction;
    label: string;
    icon: "check-circle" | "pulse" | "check" | "x" | "warning";
    tone: "success" | "primary" | "neutral" | "danger";
  }[] = [];

  if (
    ["pending", "pending_doctor", "pending_patient"].includes(status) ||
    (status === "pending_payment" && ["paid", "waived", "not_required"].includes(appointment.payment_status || ""))
  ) {
    actions.push({ action: "confirmed", label: "Confirmar", icon: "check-circle", tone: "success" });
  }

  if (
    ["confirmed", "pending_doctor", "pending_patient"].includes(status) &&
    !(isPresentialAppointmentType(appointment.type) && status === "confirmed" && !appointment.checked_in_at)
  ) {
    actions.push({ action: "in_consultation", label: "Iniciar", icon: "pulse", tone: "primary" });
  }

  if (["pending", "pending_doctor", "pending_patient", "pending_payment", "confirmed"].includes(status)) {
    actions.push({ action: "cancelled", label: "Cancelar", icon: "x", tone: "danger" });
  }

  if (status === "confirmed") {
    actions.push({ action: "no_show", label: "No asistió", icon: "warning", tone: "neutral" });
  }

  return actions;
}

type PrimaryFlowAction =
  | {
      kind: "status";
      action: api.DoctorAppointmentStatusAction;
      icon: "check-circle" | "pulse";
      color: string;
      backgroundColor: string;
      title: string;
      text: string;
      buttonLabel: string;
    }
  | {
      kind: "route";
      href: string;
      icon: "shield-check" | "clipboard-text";
      color: string;
      backgroundColor: string;
      title: string;
      text: string;
      buttonLabel: string;
    };

function getPrimaryFlowAction(
  appointment: api.DoctorAppointmentDetailData["data"],
): PrimaryFlowAction | null {
  if (
    ["pending", "pending_doctor", "pending_patient"].includes(appointment.status) ||
    (appointment.status === "pending_payment" &&
      ["paid", "waived", "not_required"].includes(appointment.payment_status || ""))
  ) {
    return {
      kind: "status",
      action: "confirmed",
      icon: "check-circle",
      color: MC.success,
      backgroundColor: MC.successSoft,
      title: "Primero confirma la cita",
      text: "Deja resuelta la aprobación antes de validar el inicio o abrir la nota clínica.",
      buttonLabel: "Confirmar consulta",
    };
  }

  if (
    isPresentialAppointmentType(appointment.type) &&
    appointment.status === "confirmed" &&
    !appointment.checked_in_at
  ) {
    return {
      kind: "route",
      href: `/doctor/appointments/${appointment.id}/checkin`,
      icon: "shield-check",
      color: "#2563EB",
      backgroundColor: MC.infoSoft,
      title: "Valida el QR de inicio",
      text: "El paciente muestra su QR o código; al validarlo, la cita pasa a consulta.",
      buttonLabel: "Abrir QR de inicio",
    };
  }

  if (appointment.status === "confirmed") {
    return {
      kind: "status",
      action: "in_consultation",
      icon: "pulse",
      color: MC.primaryDark,
      backgroundColor: MC.primaryLight,
      title: "Consulta lista para iniciar",
      text: "Entra al estado en consulta y abre la nota SOAP cuando ya estés con el paciente.",
      buttonLabel: "Iniciar consulta",
    };
  }

  if (appointment.status === "in_consultation") {
    return {
      kind: "route",
      href: `/doctor/appointments/${appointment.id}/soap`,
      icon: "clipboard-text",
      color: MC.primary,
      backgroundColor: MC.infoSoft,
      title: "Captura la nota clínica",
      text: "Usa la nota SOAP, la receta y el cierre de consulta desde este mismo flujo.",
      buttonLabel: "Abrir SOAP",
    };
  }

  return null;
}

function buildFlowSteps(appointment: api.DoctorAppointmentDetailData["data"]) {
  const confirmationDone = ["confirmed", "in_consultation", "completed"].includes(
    appointment.status,
  );
  const checkinDone =
    isPresentialAppointmentType(appointment.type)
      ? !!appointment.checked_in_at || ["in_consultation", "completed"].includes(appointment.status)
      : ["in_consultation", "completed"].includes(appointment.status);
  const soapDone = !!appointment.note || appointment.status === "completed";
  const closeDone = appointment.status === "completed";

  return [
    {
      label: "Confirmación",
      tone: confirmationDone
        ? "done"
        : ["pending", "pending_doctor", "pending_patient", "pending_payment"].includes(
              appointment.status,
            )
          ? "current"
          : "upcoming",
    },
    {
      label: isPresentialAppointmentType(appointment.type) ? "Inicio" : "Ingreso",
      tone: checkinDone ? "done" : appointment.status === "confirmed" ? "current" : "upcoming",
    },
    {
      label: "SOAP",
      tone: soapDone
        ? "done"
        : appointment.status === "in_consultation"
          ? "current"
          : "upcoming",
    },
    {
      label: "Cierre",
      tone: closeDone
        ? "done"
        : appointment.status === "in_consultation" && !!appointment.note
          ? "current"
          : "upcoming",
    },
  ] as { label: string; tone: "done" | "current" | "upcoming" }[];
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
    backgroundColor: MC.errorSoft,
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
    gap: 8,
  },
  heroEyebrow: { fontSize: 12, fontWeight: "700", color: MC.primaryDark },
  heroTitle: { fontSize: 24, fontWeight: "700", color: MC.textPrimary },
  heroSubtitle: { fontSize: 13, color: MC.textSecondary },
  heroChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  heroChip: {
    borderRadius: 999,
    backgroundColor: MC.card,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroChipText: { fontSize: 11, fontWeight: "700", color: MC.primaryDark },
  section: { gap: 8 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: MC.textPrimary },
  sectionBody: { gap: 10 },
  flowCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.card,
    padding: 14,
    gap: 12,
  },
  flowHeader: { flexDirection: "row", gap: 12, alignItems: "center" },
  flowIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: MC.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  flowHeaderBody: { flex: 1, gap: 3 },
  flowTitle: { fontSize: 15, fontWeight: "700", color: MC.textPrimary },
  flowText: { fontSize: 12, lineHeight: 18, color: MC.textSecondary },
  flowStepRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  flowStep: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  flowStepText: { fontSize: 11, fontWeight: "700" },
  primaryFlowButton: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryFlowButtonText: { fontSize: 14, fontWeight: "700" },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  actionButton: {
    minWidth: "47%",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionButtonText: { fontSize: 13, fontWeight: "700" },
  infoRow: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.card,
    padding: 12,
    gap: 4,
  },
  infoLabel: { fontSize: 11, fontWeight: "700", color: MC.textMuted },
  infoValue: { fontSize: 14, lineHeight: 20, color: MC.textPrimary },
  paymentSummaryCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: MC.infoBorder,
    backgroundColor: MC.primaryLight,
    padding: 10,
    gap: 8,
  },
  paymentHelp: { fontSize: 12, lineHeight: 18, color: MC.textSecondary, paddingHorizontal: 4 },
  manualForm: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.card,
    padding: 14,
    gap: 10,
  },
  manualFormTitle: { fontSize: 14, fontWeight: "800", color: MC.textPrimary },
  manualInput: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.surface,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: MC.textPrimary,
  },
  methodGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  methodChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  methodChipActive: {
    borderColor: MC.primary,
    backgroundColor: MC.primaryLight,
  },
  methodChipText: { fontSize: 12, fontWeight: "800", color: MC.textSecondary },
  methodChipTextActive: { color: MC.primaryDark },
  manualSubmit: {
    borderRadius: 16,
    backgroundColor: MC.primary,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  manualSubmitDisabled: { opacity: 0.7 },
  manualSubmitText: { fontSize: 14, fontWeight: "800", color: MC.white },
  statusCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.card,
    padding: 12,
    flexDirection: "row",
    gap: 10,
  },
  statusIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: MC.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBody: { flex: 1, gap: 4 },
  statusTitle: { fontSize: 13, fontWeight: "700", color: MC.textPrimary },
  statusSubtitle: { fontSize: 12, fontWeight: "700", color: MC.primaryDark },
  statusText: { fontSize: 12, lineHeight: 18, color: MC.textSecondary },
  aiBriefingButton: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: MC.infoBorder,
    backgroundColor: MC.primaryLight,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  aiBriefingButtonDisabled: { opacity: 0.7 },
  aiBriefingIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: MC.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: MC.infoBorder,
  },
  aiBriefingButtonBody: { flex: 1, gap: 3 },
  aiBriefingButtonTitle: { fontSize: 14, fontWeight: "800", color: MC.primaryDark },
  aiBriefingButtonText: { fontSize: 12, lineHeight: 17, color: MC.textSecondary },
  aiBriefingResult: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: MC.infoBorder,
    backgroundColor: MC.card,
    padding: 14,
    gap: 10,
  },
  aiBriefingResultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  aiBriefingResultTitle: { fontSize: 13, fontWeight: "800", color: MC.primaryDark },
  aiBriefingResultText: { fontSize: 13, lineHeight: 20, color: MC.textPrimary },
  briefingCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.card,
    padding: 12,
    flexDirection: "row",
    gap: 10,
  },
  briefingIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: MC.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  briefingBody: { flex: 1, gap: 4 },
  briefingTitle: { fontSize: 13, fontWeight: "700", color: MC.textPrimary },
  briefingText: { fontSize: 12, lineHeight: 18, color: MC.textSecondary },
  patientButton: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.card,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  patientButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: MC.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  patientButtonBody: { flex: 1, gap: 3 },
  patientButtonTitle: { fontSize: 14, fontWeight: "700", color: MC.textPrimary },
  patientButtonText: { fontSize: 12, lineHeight: 18, color: MC.textSecondary },
  emptyState: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.surface,
    padding: 16,
  },
  emptyText: { fontSize: 13, color: MC.textSecondary },
});
