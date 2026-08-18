import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon } from "@/components/Icon";
import { MC } from "@/constants/theme";
import * as iap from "@/services/iap";

const FEATURE_LABELS: { key: string; label: string }[] = [
  { key: "soap_notes", label: "Notas SOAP" },
  { key: "prescriptions", label: "Recetas digitales" },
  { key: "video_consult", label: "Videoconsulta" },
  { key: "ai_assistant", label: "Asistente IA" },
  { key: "analytics", label: "Analíticas avanzadas" },
];

const PERIOD_LABEL: Record<string, string> = {
  monthly: "Mensual",
  annual: "Anual",
};

export default function SubscriptionPlansScreen() {
  const router = useRouter();
  const [plans, setPlans] = useState<iap.StorePlanOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyProduct, setBusyProduct] = useState("");
  const [restoring, setRestoring] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setPlans(await iap.loadPlansWithPrices());
    } catch (e: any) {
      setError(e?.message ?? "No pudimos cargar los planes. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // La conexión con la tienda se cierra al salir para no dejarla abierta
    // mientras la app está en segundo plano.
    return () => {
      void iap.endIapConnection();
    };
  }, [load]);

  const handlePurchase = async (offer: iap.StoreOffer) => {
    if (busyProduct) return;
    setBusyProduct(offer.productId);
    try {
      await iap.purchaseSubscription(offer);
      Alert.alert(
        "Suscripción activa",
        "Tu plan quedó activo. Ya puedes usar el workspace del doctor.",
        [{ text: "Continuar", onPress: () => router.replace("/(doctor-tabs)" as any) }],
      );
    } catch (e: any) {
      const message = String(e?.message ?? "");
      // Cancelar la hoja de pago es una acción normal, no un error que reportar.
      if (/cancel/i.test(message)) return;
      Alert.alert("No se pudo completar la compra", message || "Intenta de nuevo.");
    } finally {
      setBusyProduct("");
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const restored = await iap.restorePurchases();
      if (restored > 0) {
        Alert.alert("Compras restauradas", "Tu suscripción quedó activa de nuevo.", [
          { text: "Continuar", onPress: () => router.replace("/(doctor-tabs)" as any) },
        ]);
      } else {
        Alert.alert(
          "Sin compras que restaurar",
          "No encontramos suscripciones activas en esta cuenta de la tienda.",
        );
      }
    } catch (e: any) {
      Alert.alert("No se pudo restaurar", e?.message ?? "Intenta de nuevo.");
    } finally {
      setRestoring(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => router.back()} hitSlop={10}>
          <Icon name="arrow-left" size={22} color={MC.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Planes</Text>
        <View style={styles.back} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={MC.primary} />
          <Text style={styles.centerText}>Consultando precios…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Icon name="warning" size={28} color={MC.error} />
          <Text style={styles.centerText}>{error}</Text>
          <Pressable style={styles.retry} onPress={load}>
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.intro}>
            Elige el plan con acceso a la app. El cobro se hace con tu cuenta de{" "}
            {iap.storePlatform() === "apple" ? "App Store" : "Google Play"} y puedes
            cancelarlo cuando quieras desde ahí.
          </Text>

          {plans.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No hay planes disponibles</Text>
              <Text style={styles.emptyText}>
                Aún no hay suscripciones publicadas para tu tienda. Escribe a soporte y
                te ayudamos a activarlas.
              </Text>
            </View>
          ) : null}

          {plans.map((plan) => (
            <View
              key={plan.id}
              style={[styles.card, plan.is_popular && styles.cardPopular]}
            >
              {plan.is_popular ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Más elegido</Text>
                </View>
              ) : null}

              <Text style={styles.planName}>{plan.name}</Text>
              {plan.description ? (
                <Text style={styles.planDescription}>{plan.description}</Text>
              ) : null}

              <View style={styles.features}>
                {FEATURE_LABELS.map(({ key, label }) => {
                  const included = plan.features[key] === true;
                  return (
                    <View key={key} style={styles.featureRow}>
                      <Icon
                        name={included ? "check" : "x"}
                        size={15}
                        color={included ? MC.primary : MC.textMuted}
                      />
                      <Text
                        style={[
                          styles.featureText,
                          !included && styles.featureTextOff,
                        ]}
                      >
                        {label}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {plan.offers.map((offer) => (
                <Pressable
                  key={offer.productId}
                  style={[
                    styles.buyButton,
                    busyProduct === offer.productId && styles.buyButtonBusy,
                  ]}
                  disabled={busyProduct !== ""}
                  onPress={() => handlePurchase(offer)}
                >
                  {busyProduct === offer.productId ? (
                    <ActivityIndicator color={MC.white} />
                  ) : (
                    <>
                      <Text style={styles.buyText}>
                        {PERIOD_LABEL[offer.period] ?? offer.period}
                      </Text>
                      <Text style={styles.buyPrice}>{offer.displayPrice}</Text>
                    </>
                  )}
                </Pressable>
              ))}
            </View>
          ))}

          {/* Apple exige que exista una forma explícita de restaurar compras. */}
          <Pressable
            style={styles.restore}
            onPress={handleRestore}
            disabled={restoring}
          >
            <Text style={styles.restoreText}>
              {restoring ? "Restaurando…" : "Restaurar compras"}
            </Text>
          </Pressable>

          <Text style={styles.legal}>
            La suscripción se renueva automáticamente hasta que la canceles al menos 24
            horas antes de que termine el periodo. La gestión y cancelación se hacen
            desde los ajustes de tu cuenta en la tienda.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
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
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  centerText: { color: MC.textSecondary, fontSize: 14, textAlign: "center" },
  retry: {
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: MC.border,
  },
  retryText: { color: MC.primary, fontWeight: "700", fontSize: 14 },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  intro: { color: MC.textSecondary, fontSize: 14, lineHeight: 21 },
  empty: {
    borderWidth: 1,
    borderColor: MC.border,
    borderRadius: 14,
    padding: 20,
    gap: 8,
    backgroundColor: MC.surface,
  },
  emptyTitle: { color: MC.textPrimary, fontSize: 16, fontWeight: "700" },
  emptyText: { color: MC.textSecondary, fontSize: 14, lineHeight: 20 },
  card: {
    backgroundColor: MC.surface,
    borderWidth: 1,
    borderColor: MC.border,
    borderRadius: 16,
    padding: 18,
    gap: 10,
  },
  cardPopular: { borderColor: MC.primary, borderWidth: 2 },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: MC.primaryLight,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { color: MC.primary, fontSize: 12, fontWeight: "800" },
  planName: { color: MC.textPrimary, fontSize: 20, fontWeight: "800" },
  planDescription: { color: MC.textSecondary, fontSize: 13, lineHeight: 19 },
  features: { gap: 7, marginTop: 4 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  featureText: { color: MC.textPrimary, fontSize: 14 },
  featureTextOff: { color: MC.textMuted, textDecorationLine: "line-through" },
  buyButton: {
    marginTop: 8,
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: MC.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
  },
  buyButtonBusy: { opacity: 0.7, justifyContent: "center" },
  buyText: { color: MC.white, fontSize: 15, fontWeight: "700" },
  buyPrice: { color: MC.white, fontSize: 16, fontWeight: "800" },
  restore: {
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  restoreText: { color: MC.primary, fontSize: 15, fontWeight: "700" },
  legal: {
    color: MC.textMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
});
