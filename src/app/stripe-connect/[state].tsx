import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon } from "@/components/Icon";
import { MC } from "@/constants/theme";
import * as api from "@/services/api";

export default function StripeConnectResultScreen() {
  const router = useRouter();
  const { state } = useLocalSearchParams<{ state?: string }>();
  const [loading, setLoading] = useState(state !== "refresh");
  const [status, setStatus] = useState("");
  const [chargesEnabled, setChargesEnabled] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (state === "refresh") {
      setLoading(false);
      return;
    }
    void api.syncDoctorStripe()
      .then((result) => {
        setStatus(result.status);
        setChargesEnabled(Boolean(result.charges_enabled));
        setAccountId(result.account_id);
      })
      .catch((reason: any) => setError(reason?.message ?? "No se pudo consultar el estado de Stripe Connect."))
      .finally(() => setLoading(false));
  }, [state]);

  const expired = state === "refresh";
  const ready = chargesEnabled && !expired;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.content}>
        <View style={[styles.icon, { backgroundColor: ready ? MC.primaryLight : expired ? "#FFF4E5" : "#EEF2FF" }]}>
          <Icon name={ready ? "check-circle" : expired ? "clock" : "info"} size={34} color={ready ? MC.primary : expired ? "#C66A00" : "#4F46E5"} />
        </View>
        <Text style={styles.title}>
          {ready ? "Stripe Connect listo" : expired ? "La liga de Stripe vencio" : "Stripe Connect actualizado"}
        </Text>
        <Text style={styles.description}>
          {ready
            ? "Tu cuenta puede recibir pagos de citas directamente en DoctorCloud."
            : expired
              ? "Vuelve a configuración y genera una liga nueva para continuar con la verificación."
              : "Stripe recibió tus datos. Algunas verificaciones pueden tardar unos minutos en completarse."}
        </Text>

        {loading ? <ActivityIndicator size="large" color={MC.primary} style={styles.loader} /> : null}
        {!loading && !expired && !error ? (
          <View style={styles.statusCard}>
            <StatusRow label="Estado" value={status || "Pendiente"} />
            <StatusRow label="Cobros" value={chargesEnabled ? "Habilitados" : "Pendientes de verificación"} />
            {accountId ? <StatusRow label="Cuenta" value={`...${accountId.slice(-8)}`} /> : null}
          </View>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.primaryButton} onPress={() => router.replace("/doctor/settings" as any)}>
          <Text style={styles.primaryText}>{expired ? "Volver a configurar" : "Ver configuración"}</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => router.replace("/(doctor-tabs)" as any)}>
          <Text style={styles.secondaryText}>Ir al inicio</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.statusRow}><Text style={styles.statusLabel}>{label}</Text><Text style={styles.statusValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MC.background },
  content: { flex: 1, padding: 28, justifyContent: "center" },
  icon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 24 },
  title: { color: MC.textPrimary, fontSize: 25, fontWeight: "800", textAlign: "center", marginBottom: 10 },
  description: { color: MC.textSecondary, fontSize: 16, lineHeight: 24, textAlign: "center", marginBottom: 24 },
  loader: { marginVertical: 24 },
  statusCard: { borderWidth: 1, borderColor: MC.border, backgroundColor: MC.surface, borderRadius: 12, padding: 16, gap: 13, marginBottom: 24 },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  statusLabel: { color: MC.textSecondary, fontSize: 14 },
  statusValue: { color: MC.textPrimary, fontSize: 14, fontWeight: "700", flexShrink: 1, textAlign: "right" },
  error: { color: MC.error, backgroundColor: MC.errorSoft, padding: 14, borderRadius: 10, marginBottom: 24, lineHeight: 20 },
  primaryButton: { backgroundColor: MC.primary, alignItems: "center", justifyContent: "center", minHeight: 52, borderRadius: 12 },
  primaryText: { color: MC.white, fontSize: 16, fontWeight: "800" },
  secondaryButton: { alignItems: "center", justifyContent: "center", minHeight: 48, marginTop: 8 },
  secondaryText: { color: MC.primary, fontSize: 15, fontWeight: "700" },
});
