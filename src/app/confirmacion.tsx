import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon } from "@/components/Icon";
import { MC } from "@/constants/theme";

export default function ConfirmacionScreen() {
  const router = useRouter();
  const { date, time, fee, status } = useLocalSearchParams<{
    date: string;
    time: string;
    fee: string;
    status: string;
    appointmentId: string;
  }>();

  const isConfirmed = status === "confirmed";

  const formatDateDisplay = (dateStr: string) => {
    const parsed = new Date(`${dateStr}T12:00:00`);
    return parsed.toLocaleDateString("es-MX", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTimeDisplay = (timeValue: string) => {
    const [h, m] = timeValue.split(":");
    const hour = Number.parseInt(h ?? "0", 10);
    const suffix = hour >= 12 ? "PM" : "AM";
    const normalizedHour = hour % 12 || 12;
    return `${normalizedHour}:${m ?? "00"} ${suffix}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.content}>
        <View
          style={[
            styles.statusCircle,
            isConfirmed ? styles.statusCircleConfirmed : styles.statusCirclePending,
          ]}
        >
          <Icon name={isConfirmed ? "check" : "clock"} size={42} color={MC.white} />
        </View>

        <Text style={styles.title}>{isConfirmed ? "Cita confirmada" : "Cita registrada"}</Text>
        <Text style={styles.subtitle}>
          {isConfirmed
            ? "Hemos enviado los detalles de tu cita a tu correo y a tu teléfono."
            : "Tu cita esta pendiente de pago. Tienes 2 horas para completar el pago desde la seccion de Citas."}
        </Text>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryIconWrap}>
              <Icon name="calendar" size={18} color={MC.primary} />
            </View>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryLabel}>Fecha</Text>
              <Text style={styles.summaryValue}>{date ? formatDateDisplay(date) : "-"}</Text>
            </View>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <View style={styles.summaryIconWrap}>
              <Icon name="clock" size={18} color={MC.primary} />
            </View>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryLabel}>Hora</Text>
              <Text style={styles.summaryValue}>{time ? formatTimeDisplay(time) : "-"}</Text>
            </View>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <View style={styles.summaryIconWrap}>
              <Icon name="currency-dollar" size={18} color={MC.primary} />
            </View>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryLabel}>Total</Text>
              <Text style={styles.summaryValueBold}>${Number.parseFloat(fee ?? "0").toFixed(2)}</Text>
            </View>
          </View>

          {!isConfirmed ? (
            <>
              <View style={styles.summaryDivider} />

              <View style={styles.summaryRow}>
                <View style={styles.summaryIconWrap}>
                  <Icon name="warning" size={18} color="#F59E0B" />
                </View>
                <View style={styles.summaryContent}>
                  <Text style={styles.summaryLabel}>Estado de pago</Text>
                  <Text style={[styles.summaryValue, styles.pendingValue]}>
                    Pendiente - Plazo: 2 horas
                  </Text>
                </View>
              </View>
            </>
          ) : null}
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.primaryButton} onPress={() => router.replace("/(tabs)/citas")}>
          <Icon name="calendar" size={18} color={MC.white} style={styles.primaryButtonIcon} />
          <Text style={styles.primaryButtonText}>Ver mis citas</Text>
        </Pressable>

        {!isConfirmed ? (
          <Text style={styles.pendingNote}>
            Puedes pagar desde la seccion de Citas. Selecciona la cita y usa el boton Pagar ahora.
          </Text>
        ) : null}

        <Pressable style={styles.secondaryButton} onPress={() => router.replace("/")}>
          <Icon name="arrow-left" size={16} color={MC.primary} style={styles.secondaryButtonIcon} />
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
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  statusCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  statusCircleConfirmed: {
    backgroundColor: MC.success,
  },
  statusCirclePending: {
    backgroundColor: "#F59E0B",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: MC.textPrimary,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: MC.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
    paddingHorizontal: 16,
  },
  summaryCard: {
    width: "100%",
    backgroundColor: MC.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: MC.border,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  summaryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: MC.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: MC.textMuted,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 14,
    color: MC.textPrimary,
    fontWeight: "500",
  },
  summaryValueBold: {
    fontSize: 16,
    color: MC.primary,
    fontWeight: "700",
  },
  pendingValue: {
    color: "#F59E0B",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: MC.border,
    marginVertical: 4,
  },
  actions: {
    paddingHorizontal: 32,
    paddingVertical: 24,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: MC.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  primaryButtonIcon: {
    marginRight: 8,
  },
  primaryButtonText: {
    color: MC.white,
    fontSize: 17,
    fontWeight: "600",
  },
  pendingNote: {
    fontSize: 12,
    color: MC.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  secondaryButton: {
    alignItems: "center",
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "center",
  },
  secondaryButtonIcon: {
    marginRight: 6,
  },
  secondaryButtonText: {
    color: MC.primary,
    fontSize: 15,
    fontWeight: "500",
  },
});
