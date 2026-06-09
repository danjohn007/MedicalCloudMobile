import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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

export default function FinanzasScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<api.FinancialHistory | null>(null);

  const load = useCallback(async () => {
    try {
      setError("");
      const res = await api.getFinancialHistory();
      setData(res);
    } catch (e: any) {
      setError(e?.message || "No se pudo cargar el historial financiero");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const total = useMemo(
    () => data?.payments?.reduce((acc, p) => acc + (p.amount || 0), 0) || 0,
    [data],
  );

  return (
    <SafeAreaView style={s.ct} edges={["top"]}>
      <View style={s.hdr}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Icon name="arrow-left" size={22} color={MC.textPrimary} />
        </Pressable>
        <Text style={s.hdrTitle}>Historial Financiero</Text>
        <Pressable onPress={onRefresh} hitSlop={10}>
          <Icon name="arrow-clockwise" size={20} color={MC.primary} />
        </Pressable>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={MC.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.scrollCt}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={MC.primary}
            />
          }
        >
          {error ? <Text style={s.err}>{error}</Text> : null}

          <View style={s.summaryWrap}>
            <View style={s.statCard}>
              <Text style={s.statLabel}>Este mes</Text>
              <Text style={s.statValue}>
                ${(data?.summary?.this_month || 0).toFixed(2)}
              </Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statLabel}>Este año</Text>
              <Text style={s.statValue}>
                ${(data?.summary?.this_year || 0).toFixed(2)}
              </Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statLabel}>Acumulado</Text>
              <Text style={s.statValue}>${total.toFixed(2)}</Text>
            </View>
          </View>

          <View style={{ marginTop: 14, gap: 10 }}>
            {(data?.payments || []).map((p) => (
              <View key={p.id} style={s.row}>
                <View style={{ flex: 1 }}>
                  <Text style={s.doctor}>{p.doctor_name || "Doctor"}</Text>
                  <Text style={s.meta}>
                    {(p.method || "metodo").toUpperCase()} ·{" "}
                    {String(p.status || "desconocido").toUpperCase()}
                  </Text>
                  {p.created_at ? (
                    <Text style={s.meta}>
                      {String(p.created_at).slice(0, 16).replace("T", " ")}
                    </Text>
                  ) : null}
                </View>
                <Text style={s.amount}>
                  ${(p.amount || 0).toFixed(2)} {p.currency || "MXN"}
                </Text>
              </View>
            ))}
          </View>

          {(data?.payments || []).length === 0 ? (
            <View style={s.empty}>
              <Icon name="wallet" size={32} color={MC.textMuted} />
              <Text style={s.emptyTxt}>Aún no tienes pagos registrados.</Text>
            </View>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  ct: { flex: 1, backgroundColor: MC.background },
  hdr: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: MC.border,
  },
  hdrTitle: { fontSize: 18, fontWeight: "700", color: MC.textPrimary },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scrollCt: { padding: 16, paddingBottom: 36 },
  err: { color: MC.error, marginBottom: 10 },
  summaryWrap: { flexDirection: "row", gap: 8 },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: MC.border,
    borderRadius: 12,
    padding: 10,
    backgroundColor: MC.background,
  },
  statLabel: { fontSize: 11, color: MC.textMuted, marginBottom: 4 },
  statValue: { fontSize: 15, fontWeight: "700", color: MC.textPrimary },
  row: {
    borderWidth: 1,
    borderColor: MC.border,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  doctor: { fontSize: 14, fontWeight: "700", color: MC.textPrimary },
  meta: { marginTop: 2, fontSize: 12, color: MC.textMuted },
  amount: { fontSize: 13, fontWeight: "700", color: MC.primary },
  empty: { marginTop: 24, alignItems: "center", gap: 8 },
  emptyTxt: { color: MC.textMuted, fontSize: 13 },
});
