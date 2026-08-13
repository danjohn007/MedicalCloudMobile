import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon } from "@/components/Icon";
import { MC } from "@/constants/theme";
import * as api from "@/services/api";

type PaymentCallbackStatus = "success" | "cancelled" | "error";
type VerifiedPaymentStatus = "checking" | "confirmed" | "cancelled" | "unconfirmed";

function callbackStatus(value: string | string[] | undefined): PaymentCallbackStatus {
  const normalized = Array.isArray(value) ? value[0] : value;
  if (normalized === "success" || normalized === "cancelled") {
    return normalized;
  }
  return "error";
}

export default function PaymentResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    status?: string | string[];
    appointment_id?: string | string[];
  }>();
  const status = callbackStatus(params.status);
  const rawAppointmentId = Array.isArray(params.appointment_id)
    ? params.appointment_id[0]
    : params.appointment_id;
  const appointmentId = Number.parseInt(rawAppointmentId ?? "", 10);
  const hasAppointment = Number.isFinite(appointmentId) && appointmentId > 0;
  const [verifiedStatus, setVerifiedStatus] = useState<VerifiedPaymentStatus>(
    status === "success" && hasAppointment
      ? "checking"
      : status === "cancelled"
        ? "cancelled"
        : "unconfirmed",
  );

  useEffect(() => {
    if (status === "cancelled") {
      setVerifiedStatus("cancelled");
      return;
    }
    if (status !== "success" || !hasAppointment) {
      setVerifiedStatus("unconfirmed");
      return;
    }

    let active = true;
    setVerifiedStatus("checking");
    void api
      .getAppointmentDetail(appointmentId)
      .then(({ data }) => {
        if (!active) return;
        setVerifiedStatus(
          data.payment_status === "paid" || data.status === "confirmed"
            ? "confirmed"
            : "unconfirmed",
        );
      })
      .catch(() => {
        if (active) {
          setVerifiedStatus("unconfirmed");
        }
      });

    return () => {
      active = false;
    };
  }, [appointmentId, hasAppointment, status]);

  const content =
    verifiedStatus === "checking"
      ? {
          icon: null,
          color: MC.primary,
          title: "Verificando el pago",
          message: "Estamos consultando el estado real de la cita.",
        }
      : verifiedStatus === "confirmed"
        ? {
            icon: "check" as const,
            color: MC.success,
            title: "Pago confirmado",
            message:
              "PayPal confirmó el pago. Puedes consultar el estado actualizado en tus citas.",
          }
        : verifiedStatus === "cancelled"
        ? {
            icon: "warning" as const,
            color: "#F59E0B",
            title: "Pago cancelado",
            message:
              "No se confirmó ningún pago. La cita continuará pendiente mientras siga dentro del plazo.",
          }
        : {
            icon: "warning" as const,
            color: MC.error,
            title: "No pudimos confirmar el pago",
            message:
              "La cita no fue marcada como pagada. Revisa su estado antes de intentar nuevamente o contacta a soporte.",
          };

  const appointmentsRoute = hasAppointment
    ? `/(tabs)/citas?appointmentId=${appointmentId}`
    : "/(tabs)/citas";

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.content}>
        <View style={[styles.statusCircle, { backgroundColor: content.color }]}>
          {content.icon ? (
            <Icon name={content.icon} size={42} color={MC.white} />
          ) : (
            <ActivityIndicator size="large" color={MC.white} />
          )}
        </View>
        <Text style={styles.title}>{content.title}</Text>
        <Text style={styles.message}>{content.message}</Text>
        {hasAppointment ? (
          <Text style={styles.reference}>Referencia de cita: #{appointmentId}</Text>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Pressable
          style={styles.primaryButton}
          onPress={() => router.replace(appointmentsRoute as any)}
        >
          <Icon name="calendar" size={18} color={MC.white} />
          <Text style={styles.primaryButtonText}>Ver mis citas</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => router.replace("/")}>
          <Text style={styles.secondaryButtonText}>Volver al inicio</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MC.background,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  statusCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    color: MC.textPrimary,
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
  },
  message: {
    color: MC.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginTop: 10,
  },
  reference: {
    color: MC.textSecondary,
    fontSize: 13,
    marginTop: 18,
  },
  actions: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 12,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: MC.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryButtonText: {
    color: MC.white,
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: MC.border,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: MC.primary,
    fontSize: 15,
    fontWeight: "600",
  },
});
