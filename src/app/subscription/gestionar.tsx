import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon } from "@/components/Icon";
import { MC } from "@/constants/theme";
import * as api from "@/services/api";
import * as iap from "@/services/iap";

const STATUS_LABEL: Record<string, string> = {
  active: "Activa",
  trial: "Periodo de prueba",
  pending: "Pendiente de pago",
  cancelled: "Cancelada",
  expired: "Vencida",
  suspended: "Suspendida",
};

const CYCLE_LABEL: Record<string, string> = {
  with_app_monthly: "Mensual",
  with_app_annual: "Anual",
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value.replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function ManageSubscriptionScreen() {
  const router = useRouter();
  const [state, setState] = useState<api.StoreSubscriptionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [restoring, setRestoring] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.getStoreSubscriptionStatus();
      setState(data.subscription);
    } catch (e: any) {
      setError(e?.message ?? "No pudimos consultar tu suscripción.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const restored = await iap.restorePurchases();
      Alert.alert(
        restored > 0 ? "Compras restauradas" : "Sin compras que restaurar",
        restored > 0
          ? "Tu suscripción quedó activa de nuevo."
          : "No encontramos suscripciones activas en esta cuenta de la tienda.",
      );
      await load();
    } catch (e: any) {
      Alert.alert("No se pudo restaurar", e?.message ?? "Intenta de nuevo.");
    } finally {
      setRestoring(false);
    }
  };

  const managedByStore = state?.managed_by === "apple" || state?.managed_by === "google";

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => router.back()} hitSlop={10}>
          <Icon name="arrow-left" size={22} color={MC.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Mi suscripción</Text>
        <View style={styles.back} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={MC.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {state ? (
            <View style={styles.card}>
              <Text style={styles.planName}>{state.plan_name}</Text>
              <Row label="Estado" value={STATUS_LABEL[state.status] ?? state.status} />
              <Row
                label="Periodo"
                value={CYCLE_LABEL[state.billing_cycle] ?? state.billing_cycle}
              />
              <Row
                label={state.auto_renew ? "Se renueva el" : "Acceso hasta"}
                value={formatDate(state.expires_at ?? state.end_date)}
              />
              <Row
                label="Cobrada por"
                value={
                  state.managed_by === "apple"
                    ? "App Store"
                    : state.managed_by === "google"
                      ? "Google Play"
                      : "Sitio web"
                }
              />
              {!state.auto_renew ? (
                <Text style={styles.warning}>
                  La renovación automática está desactivada. Conservas el acceso hasta la
                  fecha indicada.
                </Text>
              ) : null}
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.planName}>Sin suscripción activa</Text>
              <Text style={styles.muted}>
                Contrata un plan con acceso a la app para usar el workspace del doctor.
              </Text>
            </View>
          )}

          <Pressable
            style={styles.primary}
            onPress={() => router.push("/subscription/planes" as any)}
          >
            <Text style={styles.primaryText}>
              {state ? "Cambiar de plan" : "Ver planes"}
            </Text>
            <Icon name="arrow-right" size={18} color={MC.white} />
          </Pressable>

          {managedByStore ? (
            <Pressable
              style={styles.secondary}
              onPress={() => void Linking.openURL(iap.manageSubscriptionsUrl())}
            >
              <Text style={styles.secondaryText}>
                Cancelar o cambiar el cobro en{" "}
                {state?.managed_by === "apple" ? "App Store" : "Google Play"}
              </Text>
            </Pressable>
          ) : null}

          <Pressable style={styles.tertiary} onPress={handleRestore} disabled={restoring}>
            <Text style={styles.tertiaryText}>
              {restoring ? "Restaurando…" : "Restaurar compras"}
            </Text>
          </Pressable>

          <Text style={styles.legal}>
            Las suscripciones contratadas dentro de la app se administran desde tu cuenta
            de la tienda. Doctor Cloud no puede cancelarlas por ti.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MC.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: MC.border,
  },
  back: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: MC.textPrimary },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  error: { color: MC.error, fontSize: 14 },
  card: {
    backgroundColor: MC.surface,
    borderWidth: 1,
    borderColor: MC.border,
    borderRadius: 16,
    padding: 18,
    gap: 10,
  },
  planName: { color: MC.textPrimary, fontSize: 20, fontWeight: "800" },
  muted: { color: MC.textSecondary, fontSize: 14, lineHeight: 20 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  rowLabel: { color: MC.textSecondary, fontSize: 14 },
  rowValue: { color: MC.textPrimary, fontSize: 14, fontWeight: "700", flexShrink: 1, textAlign: "right" },
  warning: { color: MC.error, fontSize: 13, lineHeight: 19, marginTop: 4 },
  primary: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: MC.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryText: { color: MC.white, fontSize: 15, fontWeight: "800" },
  secondary: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: MC.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  secondaryText: { color: MC.textPrimary, fontSize: 14, fontWeight: "700", textAlign: "center" },
  tertiary: { alignSelf: "center", paddingVertical: 10 },
  tertiaryText: { color: MC.primary, fontSize: 15, fontWeight: "700" },
  legal: { color: MC.textMuted, fontSize: 12, lineHeight: 18, textAlign: "center" },
});
