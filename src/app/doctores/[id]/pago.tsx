import { CardField, StripeProvider, useConfirmPayment } from "@stripe/stripe-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon } from "@/components/Icon";
import { MC } from "@/constants/theme";
import * as api from "@/services/api";
import PayPalIcon from "../../../../assets/images/PayPal_Icon.svg";
import StripeIcon from "../../../../assets/images/Stripe_Icon.svg";

type PaymentMethod = "stripe_card" | "paypal";
type ScreenStep =
  | "booting"
  | "idle"
  | "opening_paypal"
  | "processing_stripe"
  | "checking_payment";

const FALLBACK_METHODS = {
  stripe_card: true,
  paypal: true,
};

export default function PagoScreen() {
  const router = useRouter();
  const initializedRef = useRef(false);
  const {
    id,
    appointmentId: appointmentIdParam,
    date,
    time,
    type,
    fee: feeParam,
    reason = "",
    notes = "",
    doctorName = "",
    specialty = "",
    scheduledAt = "",
  } = useLocalSearchParams<{
    id: string;
    appointmentId?: string;
    date?: string;
    time?: string;
    type?: string;
    fee?: string;
    reason?: string;
    notes?: string;
    doctorName?: string;
    specialty?: string;
    scheduledAt?: string;
  }>();

  const doctorId = Number.parseInt(id ?? "0", 10);
  const initialAppointmentId = Number.parseInt(appointmentIdParam ?? "0", 10) || null;
  const fee = Number.parseFloat(feeParam ?? "0") || 0;
  const appointmentType = normalizeAppointmentType(type);
  const createdFromDraft = !initialAppointmentId;

  const [appointmentId, setAppointmentId] = useState<number | null>(initialAppointmentId);
  const [appointmentDetail, setAppointmentDetail] = useState<api.Appointment | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<api.AppointmentPaymentInfo | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("paypal");
  const [cardholderName, setCardholderName] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState<ScreenStep>("booting");
  const [countdown, setCountdown] = useState<string | null>(null);

  const effectiveMethods = paymentInfo?.methods ?? FALLBACK_METHODS;
  const stripePublishableKey = paymentInfo?.stripe_publishable_key?.trim() ?? "";
  const summary = useMemo(
    () =>
      buildSummary({
        paymentInfo,
        appointmentDetail,
        date: date ?? "",
        time: time ?? "",
        scheduledAt: scheduledAt ?? "",
        appointmentType,
        fee,
        doctorName: String(doctorName),
        specialty: String(specialty),
      }),
    [appointmentDetail, appointmentType, date, doctorName, fee, paymentInfo, scheduledAt, specialty, time],
  );

  const goToConfirmation = useCallback(
    (
      status: "confirmed" | "pending_payment",
      options: {
        appointmentId: number;
        fee: number;
        date?: string;
        time?: string;
        scheduledAt?: string;
      },
    ) => {
      const normalized = normalizeSummaryDateTime(
        options.date ?? "",
        options.time ?? "",
        options.scheduledAt ?? "",
      );

      router.replace({
        pathname: "/confirmacion",
        params: {
          appointmentId: String(options.appointmentId),
          status,
          fee: String(options.fee),
          date: normalized.date,
          time: normalized.time,
        },
      } as any);
    },
    [router],
  );

  const loadAppointmentContext = useCallback(
    async (idToLoad: number) => {
      const detail = await api.getAppointmentDetail(idToLoad);
      setAppointmentDetail(detail.data);

      if (detail.data.payment_status === "paid" || detail.data.status === "confirmed") {
        goToConfirmation("confirmed", {
          appointmentId: idToLoad,
          fee: detail.data.fee,
          scheduledAt: detail.data.scheduled_at,
        });
        return;
      }

      try {
        const info = await api.getAppointmentPaymentInfo(idToLoad);
        setPaymentInfo(info);
        if (info.methods.stripe_card && info.stripe_publishable_key?.trim()) {
          setSelectedMethod("stripe_card");
        } else if (info.methods.paypal) {
          setSelectedMethod("paypal");
        }
      } catch (err: any) {
        setPaymentInfo(null);
        if (isMissingMobilePaymentInfo(err)) {
          setError(
            "La app ya puede abrir el flujo nuevo de pago, pero MedicalUniverse aun no expone /api/mobile/appointments/:id/payment-info. PayPal seguira funcionando con el endpoint movil actual y Stripe requiere esa ampliacion del backend.",
          );
          return;
        }
        throw err;
      }
    },
    [goToConfirmation],
  );

  const bootstrap = useCallback(async () => {
    setStep("booting");
    setError("");

    try {
      if (initialAppointmentId) {
        await loadAppointmentContext(initialAppointmentId);
        setStep("idle");
        return;
      }

      const created = await api.createAppointment({
        doctor_id: doctorId,
        date: date ?? "",
        time: time ?? "",
        type: appointmentType,
        reason: String(reason).trim() || undefined,
        notes: String(notes).trim() || undefined,
      });

      if (created.status === "confirmed" || created.fee <= 0) {
        goToConfirmation("confirmed", {
          appointmentId: created.id,
          fee: created.fee || fee,
          date: date ?? "",
          time: time ?? "",
        });
        return;
      }

      setAppointmentId(created.id);
      await loadAppointmentContext(created.id);
      setStep("idle");
    } catch (err: any) {
      setError(err.message ?? "No se pudo preparar el pago de tu cita.");
      setStep("idle");
    }
  }, [
    appointmentType,
    date,
    doctorId,
    fee,
    goToConfirmation,
    initialAppointmentId,
    loadAppointmentContext,
    notes,
    reason,
    time,
  ]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (effectiveMethods.stripe_card && stripePublishableKey) {
      setSelectedMethod("stripe_card");
      return;
    }
    if (effectiveMethods.paypal) {
      setSelectedMethod("paypal");
      return;
    }
    setSelectedMethod("stripe_card");
  }, [effectiveMethods.paypal, effectiveMethods.stripe_card, stripePublishableKey]);

  useEffect(() => {
    const deadline =
      paymentInfo?.appointment?.pay_deadline ??
      extractPayDeadline(appointmentDetail);

    if (!deadline) {
      setCountdown(null);
      return;
    }

    const update = () => setCountdown(formatCountdown(deadline));
    update();
    const timer = setInterval(update, 1000);

    return () => clearInterval(timer);
  }, [appointmentDetail, paymentInfo]);

  async function handlePayLater() {
    if (!appointmentId) {
      setError("Aun estamos preparando tu cita. Intenta de nuevo en unos segundos.");
      return;
    }

    goToConfirmation("pending_payment", {
      appointmentId,
      fee: summary.fee,
      date: summary.date,
      time: summary.time,
      scheduledAt: summary.scheduledAt,
    });
  }

  async function handlePaypalPay() {
    if (!appointmentId) {
      setError("Aun no se ha creado la cita para iniciar el pago.");
      return;
    }

    setError("");
    setStep("opening_paypal");

    try {
      const { approve_url } = await api.createAppointmentPayment(appointmentId);
      await WebBrowser.openBrowserAsync(approve_url);
      await verifyPaymentOutcome(appointmentId);
    } catch (err: any) {
      setError(err.message ?? "No se pudo abrir PayPal.");
      setStep("idle");
    }
  }

  async function verifyPaymentOutcome(idToCheck: number) {
    setStep("checking_payment");

    for (let attempt = 0; attempt < 6; attempt += 1) {
      try {
        const detail = await api.getAppointmentDetail(idToCheck);
        setAppointmentDetail(detail.data);

        if (detail.data.payment_status === "paid" || detail.data.status === "confirmed") {
          goToConfirmation("confirmed", {
            appointmentId: idToCheck,
            fee: detail.data.fee,
            scheduledAt: detail.data.scheduled_at,
          });
          return;
        }
      } catch {
        // Ignore transient refresh failures while the backend captures the payment.
      }

      await wait(1500);
    }

    setStep("idle");
    Alert.alert(
      "Pago en revision",
      "Si ya completaste el pago, tu cita se confirmara en cuanto el backend termine de validarlo.",
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={10}>
          <Icon name="arrow-left" size={24} color={MC.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Pago de consulta</Text>
        <View style={styles.headerSpacer} />
      </View>

      {step === "booting" ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={MC.primary} />
          <Text style={styles.loadingTitle}>
            {createdFromDraft ? "Creando tu cita..." : "Cargando opciones de pago..."}
          </Text>
          <Text style={styles.loadingCaption}>
            Estamos preparando el checkout con los mismos datos de la version web.
          </Text>
        </View>
      ) : (
        <>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={styles.heroCard}>
              <Text style={styles.heroDoctor}>{summary.doctorName}</Text>
              {summary.specialty ? <Text style={styles.heroSpecialty}>{summary.specialty}</Text> : null}

              <View style={styles.detailList}>
                <SummaryRow label="Fecha" value={formatDateLine(summary)} />
                <SummaryRow
                  label="Modalidad"
                  value={formatTypeLabel(summary.type)}
                  pill
                />
                <SummaryRow
                  label="Total a pagar"
                  value={`$${summary.fee.toFixed(2)} MXN`}
                  accent
                />
              </View>
            </View>

            <View style={styles.deadlineCard}>
              <View style={styles.deadlineIcon}>
                <Icon name="clock" size={18} color={MC.primary} />
              </View>
              <View style={styles.deadlineTextWrap}>
                <Text style={styles.deadlineLabel}>Tiempo restante para pagar</Text>
                <Text style={styles.deadlineValue}>
                  {countdown ?? "El plazo comienza cuando la cita queda registrada"}
                </Text>
              </View>
            </View>

            <Text style={styles.sectionEyebrow}>Selecciona metodo de pago</Text>

            <PaymentMethodCard
              active={selectedMethod === "stripe_card"}
              disabled={!effectiveMethods.stripe_card}
              icon={<StripeIcon width={28} height={28} />}
              title="Tarjeta de credito / debito"
              subtitle="Formulario embebido dentro de la app con Stripe."
              onPress={() => setSelectedMethod("stripe_card")}
            >
              {selectedMethod === "stripe_card" ? (
                effectiveMethods.stripe_card ? (
                  stripePublishableKey ? (
                    <StripeProvider
                      publishableKey={stripePublishableKey}
                      setReturnUrlSchemeOnAndroid
                      urlScheme="doctorcloud"
                    >
                      <StripeCardSection
                        appointmentId={appointmentId}
                        cardholderName={cardholderName}
                        onPaymentSettled={verifyPaymentOutcome}
                        onPaymentError={setError}
                        onPaymentStart={() => {
                          setError("");
                          setStep("processing_stripe");
                        }}
                        onPaymentEnd={() => setStep("idle")}
                        value={cardholderName}
                        onChangeValue={setCardholderName}
                      />
                    </StripeProvider>
                  ) : (
                    <InfoNotice kind="warning">
                      La vista ya esta lista para Stripe, pero MedicalUniverse aun no expone la clave publishable ni el endpoint movil equivalente a la web para esta cita.
                    </InfoNotice>
                  )
                ) : (
                  <InfoNotice kind="muted">
                    Stripe no esta habilitado para este contexto segun la configuracion actual.
                  </InfoNotice>
                )
              ) : null}
            </PaymentMethodCard>

            <PaymentMethodCard
              active={selectedMethod === "paypal"}
              disabled={!effectiveMethods.paypal}
              icon={<PayPalIcon width={28} height={28} />}
              title="PayPal"
              subtitle="Checkout seguro en navegador, igual al flujo actual de la app."
              onPress={() => setSelectedMethod("paypal")}
            >
              {selectedMethod === "paypal" ? (
                effectiveMethods.paypal ? (
                  <View style={styles.paypalPanel}>
                    <Text style={styles.paypalBody}>
                      Abriremos PayPal en un navegador seguro para completar la autorizacion.
                      Con el backend actual esta es la opcion correcta frente a usar un WebView embebido.
                    </Text>
                    <Pressable
                      style={[styles.primaryPayButton, step !== "idle" && styles.buttonDisabled]}
                      onPress={() => void handlePaypalPay()}
                      disabled={step !== "idle"}
                    >
                      {step === "opening_paypal" ? (
                        <ActivityIndicator color={MC.white} />
                      ) : (
                        <>
                          <PayPalIcon width={20} height={20} />
                          <Text style={styles.primaryPayButtonText}>Continuar con PayPal</Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                ) : (
                  <InfoNotice kind="muted">
                    PayPal no esta habilitado para esta cita segun la configuracion actual.
                  </InfoNotice>
                )
              ) : null}
            </PaymentMethodCard>

            {error ? (
              <View style={styles.errorBox}>
                <Icon name="warning" size={18} color={MC.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {step === "checking_payment" ? (
              <View style={styles.statusBox}>
                <ActivityIndicator size="small" color={MC.primary} />
                <Text style={styles.statusText}>
                  Verificando el resultado del pago con el backend...
                </Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={styles.secondaryFooterButton}
              onPress={() => void handlePayLater()}
            >
              <Text style={styles.secondaryFooterButtonText}>
                {createdFromDraft ? "Pagar despues" : "Volver"}
              </Text>
            </Pressable>

            <View style={styles.footerSecureWrap}>
              <Icon name="lock" size={14} color={MC.textSecondary} />
              <Text style={styles.footerSecureText}>Pago encriptado - SSL seguro</Text>
            </View>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

function StripeCardSection(props: {
  appointmentId: number | null;
  cardholderName: string;
  value: string;
  onChangeValue: (value: string) => void;
  onPaymentStart: () => void;
  onPaymentEnd: () => void;
  onPaymentError: (message: string) => void;
  onPaymentSettled: (appointmentId: number) => Promise<void>;
}) {
  const {
    appointmentId,
    value,
    onChangeValue,
    cardholderName,
    onPaymentEnd,
    onPaymentError,
    onPaymentSettled,
    onPaymentStart,
  } = props;
  const { confirmPayment, loading } = useConfirmPayment();
  const [cardComplete, setCardComplete] = useState(false);

  const handleStripeSubmit = async () => {
    if (!appointmentId) {
      onPaymentError("La cita aun no esta lista para cobrarse con Stripe.");
      return;
    }

    if (!cardComplete) {
      onPaymentError("Completa los datos de la tarjeta para continuar.");
      return;
    }

    onPaymentStart();

    try {
      const intent = await api.createAppointmentStripeIntent(appointmentId);
      const { error } = await confirmPayment(intent.client_secret, {
        paymentMethodType: "Card",
        paymentMethodData: {
          billingDetails: {
            name: cardholderName.trim() || "Paciente",
          },
        },
      });

      if (error) {
        throw new Error(error.message ?? "Stripe no pudo confirmar el pago.");
      }

      await onPaymentSettled(appointmentId);
    } catch (err: any) {
      onPaymentError(buildStripeErrorMessage(err));
    } finally {
      onPaymentEnd();
    }
  };

  return (
    <View style={styles.stripePanel}>
      <Text style={styles.fieldLabel}>Nombre en la tarjeta</Text>
      <TextInput
        autoCapitalize="words"
        autoCorrect={false}
        onChangeText={onChangeValue}
        placeholder="Como aparece en la tarjeta"
        placeholderTextColor={MC.textMuted}
        style={styles.textField}
        value={value}
      />

      <Text style={styles.fieldLabel}>Datos de la tarjeta</Text>
      <View style={styles.cardFieldWrap}>
        <CardField
          autofocus
          cardStyle={{
            backgroundColor: MC.surface,
            borderColor: MC.border,
            borderWidth: 0,
            borderRadius: 12,
            cursorColor: MC.primary,
            placeholderColor: MC.textMuted,
            textColor: MC.textPrimary,
            textErrorColor: MC.error,
            fontSize: 15,
          }}
          countryCode="MX"
          onCardChange={(details) => setCardComplete(Boolean(details.complete))}
          postalCodeEnabled={false}
          placeholders={{
            number: "1234 1234 1234 1234",
          }}
          style={styles.cardField}
        />
      </View>

      <Pressable
        style={[styles.primaryPayButton, (loading || !cardComplete) && styles.buttonDisabled]}
        onPress={() => void handleStripeSubmit()}
        disabled={loading || !cardComplete}
      >
        {loading ? (
          <ActivityIndicator color={MC.white} />
        ) : (
          <>
            <StripeIcon width={20} height={20} />
            <Text style={styles.primaryPayButtonText}>Continuar con Stripe</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

function PaymentMethodCard(props: {
  active: boolean;
  disabled?: boolean;
  icon: ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
  children?: ReactNode;
}) {
  const { active, children, disabled, icon, onPress, subtitle, title } = props;

  return (
    <View style={[styles.methodCard, active && styles.methodCardActive, disabled && styles.methodCardDisabled]}>
      <Pressable disabled={disabled} onPress={onPress} style={styles.methodHeader}>
        <View style={styles.methodHeaderLeft}>
          <View style={styles.methodIconBox}>{icon}</View>
          <View style={styles.methodTextWrap}>
            <Text style={styles.methodTitle}>{title}</Text>
            <Text style={styles.methodSubtitle}>{subtitle}</Text>
          </View>
        </View>
        <Icon
          name={active ? "caret-left" : "caret-right"}
          size={18}
          color={disabled ? MC.textMuted : MC.textSecondary}
          style={active ? styles.caretExpanded : styles.caretCollapsed}
        />
      </Pressable>
      {active ? <View style={styles.methodBody}>{children}</View> : null}
    </View>
  );
}

function SummaryRow(props: {
  label: string;
  value: string;
  accent?: boolean;
  pill?: boolean;
}) {
  const { accent, label, pill, value } = props;

  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      {pill ? (
        <View style={styles.summaryPill}>
          <Text style={styles.summaryPillText}>{value}</Text>
        </View>
      ) : (
        <Text style={[styles.summaryValue, accent && styles.summaryValueAccent]}>{value}</Text>
      )}
    </View>
  );
}

function InfoNotice(props: { kind: "warning" | "muted"; children: ReactNode }) {
  const isWarning = props.kind === "warning";

  return (
    <View style={[styles.infoNotice, isWarning ? styles.infoNoticeWarning : styles.infoNoticeMuted]}>
      <Icon
        name={isWarning ? "warning" : "info"}
        size={16}
        color={isWarning ? "#92400E" : MC.textSecondary}
      />
      <Text style={[styles.infoNoticeText, isWarning && styles.infoNoticeTextWarning]}>
        {props.children}
      </Text>
    </View>
  );
}

function buildSummary(input: {
  paymentInfo: api.AppointmentPaymentInfo | null;
  appointmentDetail: api.Appointment | null;
  date: string;
  time: string;
  scheduledAt: string;
  appointmentType: string;
  fee: number;
  doctorName: string;
  specialty: string;
}) {
  if (input.paymentInfo?.appointment) {
    const normalized = normalizeSummaryDateTime("", "", input.paymentInfo.appointment.scheduled_at);
    return {
      doctorName: `Dr. ${input.paymentInfo.appointment.doctor_name}`,
      specialty: input.paymentInfo.appointment.specialty || input.specialty,
      date: normalized.date,
      time: normalized.time,
      type: normalizeAppointmentType(input.paymentInfo.appointment.type),
      fee: coerceMoney(input.paymentInfo.appointment.amount, input.fee),
      scheduledAt: input.paymentInfo.appointment.scheduled_at,
    };
  }

  if (input.appointmentDetail) {
    const normalized = normalizeSummaryDateTime("", "", input.appointmentDetail.scheduled_at);
    const rawDetail = input.appointmentDetail as api.Appointment & {
      consultation_fee?: number | string | null;
    };

    return {
      doctorName: `Dr. ${input.appointmentDetail.doctor_name}`,
      specialty: input.appointmentDetail.specialty || input.specialty,
      date: normalized.date,
      time: normalized.time,
      type: normalizeAppointmentType(input.appointmentDetail.type),
      fee: coerceMoney(rawDetail.fee, coerceMoney(rawDetail.consultation_fee, input.fee)),
      scheduledAt: input.appointmentDetail.scheduled_at,
    };
  }

  const normalized = normalizeSummaryDateTime(input.date, input.time, input.scheduledAt);
  return {
    doctorName: input.doctorName ? `Dr. ${input.doctorName}` : "Consulta medica",
    specialty: input.specialty,
    date: normalized.date,
    time: normalized.time,
    type: input.appointmentType,
    fee: coerceMoney(input.fee),
    scheduledAt: input.scheduledAt,
  };
}

function coerceMoney(value: unknown, fallback = 0) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : Number.NaN;

  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeSummaryDateTime(date: string, time: string, scheduledAt: string) {
  if (scheduledAt) {
    const parsed = new Date(scheduledAt);
    if (!Number.isNaN(parsed.getTime())) {
      const localIso = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);

      return {
        date: localIso.slice(0, 10),
        time: localIso.slice(11, 16),
      };
    }
  }

  return {
    date,
    time,
  };
}

function normalizeAppointmentType(type?: string | null) {
  const value = String(type ?? "").toLowerCase();
  if (value === "videoconsulta" || value === "virtual") return "videoconsulta";
  if (value === "domicilio" || value === "home_visit") return "domicilio";
  return "presencial";
}

function formatTypeLabel(type: string) {
  if (type === "videoconsulta") return "Videoconsulta";
  if (type === "domicilio") return "A domicilio";
  return "Presencial";
}

function formatDateLine(summary: {
  date: string;
  time: string;
}) {
  if (!summary.date) return "Pendiente";

  const dateText = new Date(`${summary.date}T12:00:00`).toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeText = summary.time ? formatTime12(summary.time) : "";

  return timeText ? `${dateText}, ${timeText}` : dateText;
}

function formatTime12(value: string) {
  const [h, m] = value.split(":");
  const hour = Number.parseInt(h ?? "0", 10);
  const suffix = hour >= 12 ? "p.m." : "a.m.";
  const normalizedHour = hour % 12 || 12;
  return `${normalizedHour}:${m ?? "00"} ${suffix}`;
}

function formatCountdown(deadline: string) {
  const remaining = new Date(deadline).getTime() - Date.now();
  if (remaining <= 0) return "Tiempo agotado";

  const hours = Math.floor(remaining / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function extractPayDeadline(appointment: api.Appointment | null) {
  if (!appointment) return null;
  const candidate = (appointment as any).pay_deadline;
  return typeof candidate === "string" && candidate.trim() ? candidate : null;
}

function isMissingMobilePaymentInfo(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (
    message.includes("/payment-info") ||
    message.includes("HTTP 404") ||
    message.includes("Status: 404")
  );
}

function buildStripeErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (message.includes("HTTP 404") || message.includes("Status: 404")) {
    return "Stripe aun no esta expuesto en la API movil. Falta habilitar en MedicalUniverse un endpoint JWT como /api/mobile/appointments/:id/stripe/create-intent para igualar el flujo web.";
  }
  return message || "No se pudo procesar el pago con Stripe.";
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MC.background,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    alignItems: "center",
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  title: {
    color: MC.textPrimary,
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  headerSpacer: {
    width: 36,
  },
  loadingState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  loadingTitle: {
    color: MC.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginTop: 16,
    textAlign: "center",
  },
  loadingCaption: {
    color: MC.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    textAlign: "center",
  },
  scrollContent: {
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  heroCard: {
    backgroundColor: MC.surface,
    borderColor: MC.border,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  heroDoctor: {
    color: MC.textPrimary,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  heroSpecialty: {
    color: MC.textSecondary,
    fontSize: 14,
    marginTop: 6,
    textAlign: "center",
  },
  detailList: {
    gap: 12,
    marginTop: 20,
  },
  summaryRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryLabel: {
    color: MC.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  summaryValue: {
    color: MC.textPrimary,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "right",
  },
  summaryValueAccent: {
    color: MC.primary,
    fontSize: 16,
  },
  summaryPill: {
    backgroundColor: MC.primaryLight,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  summaryPillText: {
    color: MC.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  deadlineCard: {
    alignItems: "center",
    backgroundColor: "#FFF7E8",
    borderColor: "#F59E0B",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
    padding: 16,
  },
  deadlineIcon: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  deadlineTextWrap: {
    flex: 1,
  },
  deadlineLabel: {
    color: "#92400E",
    fontSize: 13,
    fontWeight: "600",
  },
  deadlineValue: {
    color: "#B45309",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 4,
  },
  sectionEyebrow: {
    color: MC.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    marginBottom: 10,
    marginTop: 24,
    textTransform: "uppercase",
  },
  methodCard: {
    backgroundColor: MC.background,
    borderColor: MC.border,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 14,
    overflow: "hidden",
  },
  methodCardActive: {
    borderColor: MC.primary,
    shadowColor: MC.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
  },
  methodCardDisabled: {
    opacity: 0.7,
  },
  methodHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  methodHeaderLeft: {
    alignItems: "center",
    flexDirection: "row",
    flex: 1,
    gap: 12,
  },
  methodIconBox: {
    alignItems: "center",
    backgroundColor: MC.surface,
    borderRadius: 12,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  methodTextWrap: {
    flex: 1,
    gap: 4,
  },
  methodTitle: {
    color: MC.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  methodSubtitle: {
    color: MC.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  caretExpanded: {
    transform: [{ rotate: "-90deg" }],
  },
  caretCollapsed: {
    transform: [{ rotate: "90deg" }],
  },
  methodBody: {
    borderTopColor: MC.border,
    borderTopWidth: 1,
    padding: 16,
  },
  stripePanel: {
    gap: 12,
  },
  fieldLabel: {
    color: MC.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  textField: {
    backgroundColor: MC.surface,
    borderColor: MC.border,
    borderRadius: 12,
    borderWidth: 1,
    color: MC.textPrimary,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cardFieldWrap: {
    backgroundColor: MC.surface,
    borderColor: MC.border,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 58,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cardField: {
    height: 44,
    width: "100%",
  },
  primaryPayButton: {
    alignItems: "center",
    backgroundColor: MC.primary,
    borderRadius: 14,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 4,
    minHeight: 54,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  primaryPayButtonText: {
    color: MC.white,
    fontSize: 16,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  paypalPanel: {
    gap: 14,
  },
  paypalBody: {
    color: MC.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  infoNotice: {
    alignItems: "flex-start",
    borderRadius: 14,
    flexDirection: "row",
    gap: 10,
    padding: 14,
  },
  infoNoticeWarning: {
    backgroundColor: "#FEF3C7",
  },
  infoNoticeMuted: {
    backgroundColor: MC.surface,
  },
  infoNoticeText: {
    color: MC.textSecondary,
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  infoNoticeTextWarning: {
    color: "#92400E",
  },
  errorBox: {
    alignItems: "flex-start",
    backgroundColor: "#FEE2E2",
    borderRadius: 14,
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
    padding: 14,
  },
  errorText: {
    color: "#991B1B",
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  statusBox: {
    alignItems: "center",
    backgroundColor: MC.primaryLight,
    borderRadius: 14,
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
    padding: 14,
  },
  statusText: {
    color: MC.textPrimary,
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  footer: {
    alignItems: "center",
    borderTopColor: MC.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  secondaryFooterButton: {
    borderColor: MC.border,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  secondaryFooterButtonText: {
    color: MC.textPrimary,
    fontSize: 15,
    fontWeight: "600",
  },
  footerSecureWrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  footerSecureText: {
    color: MC.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
});
