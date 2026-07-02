import { useCallback, useEffect, useMemo, useState } from "react";
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
import { MC } from "@/constants/theme";
import * as api from "@/services/api";

const dateFmt = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Sin fecha";
  return dateFmt.format(parsed);
}

function notificationMeta(type: api.NotificationItem["type"]) {
  switch (type) {
    case "message":
      return {
        label: "Mensaje",
        icon: "chat-circle-dots" as const,
        bg: "#EEF2FF",
        fg: "#4338CA",
      };
    case "appointment":
      return {
        label: "Cita",
        icon: "calendar" as const,
        bg: "#ECFDF5",
        fg: "#047857",
      };
    default:
      return {
        label: "Sistema",
        icon: "bell" as const,
        bg: "#FFF7ED",
        fg: "#B45309",
      };
  }
}

export default function NotificacionesScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState<api.NotificationItem[]>([]);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      setError("");
      const response = await api.getNotifications();
      setItems(response.data || []);
    } catch (e: any) {
      setError(e?.message || "No se pudieron cargar las notificaciones.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const groupedCount = useMemo(
    () => ({
      messages: items.filter((item) => item.type === "message").length,
      appointments: items.filter((item) => item.type === "appointment").length,
      system: items.filter((item) => item.type === "system").length,
    }),
    [items],
  );

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
            onRefresh={() => load(true)}
            tintColor={MC.primary}
          />
        }
      >
        <View style={styles.header}>
          <Pressable
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={10}
          >
            <Icon name="arrow-left" size={22} color={MC.textPrimary} />
          </Pressable>
          <Text style={styles.title}>Notificaciones</Text>
          <Pressable onPress={() => load(true)} hitSlop={10}>
            <Icon name="arrow-clockwise" size={20} color={MC.primary} />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>Centro de actividad</Text>
          <Text style={styles.heroTitle}>{items.length} novedades</Text>
          <Text style={styles.heroText}>
            Mensajes, recordatorios de cita y avisos recientes del sistema.
          </Text>
          <View style={styles.heroRow}>
            <HeroPill label="Mensajes" value={groupedCount.messages} tone="#EEF2FF" />
            <HeroPill
              label="Citas"
              value={groupedCount.appointments}
              tone="#ECFDF5"
            />
            <HeroPill label="Sistema" value={groupedCount.system} tone="#FFF7ED" />
          </View>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Icon name="warning" size={16} color={MC.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {items.length ? (
          <View style={styles.list}>
            {items.map((item) => {
              const meta = notificationMeta(item.type);
              return (
                <View key={`${item.type}-${item.id}-${item.created_at}`} style={styles.card}>
                  <View style={[styles.cardIcon, { backgroundColor: meta.bg }]}>
                    <Icon name={meta.icon} size={18} color={meta.fg} />
                  </View>
                  <View style={styles.cardBody}>
                    <View style={styles.cardTop}>
                      <Text style={[styles.cardBadge, { color: meta.fg }]}>
                        {meta.label}
                      </Text>
                      <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>
                    </View>
                    <Text style={styles.cardMessage}>{item.message}</Text>
                    {item.related_name ? (
                      <Text style={styles.cardMeta}>{item.related_name}</Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Icon name="bell" size={56} color={MC.textMuted} />
            </View>
            <Text style={styles.emptyText}>No tienes notificaciones</Text>
            <Text style={styles.emptySubtext}>
              Cuando haya mensajes nuevos o recordatorios de cita apareceran aqui.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function HeroPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <View style={[styles.heroPill, { backgroundColor: tone }]}>
      <Text style={styles.heroPillValue}>{value}</Text>
      <Text style={styles.heroPillLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MC.background },
  loadingWrap: {
    flex: 1,
    backgroundColor: MC.background,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { padding: 16, paddingBottom: 36, gap: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: MC.textPrimary,
    flex: 1,
    textAlign: "center",
  },
  hero: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: MC.primaryLight,
    borderWidth: 1,
    borderColor: "#C9ECE8",
    gap: 8,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: MC.primaryDark,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroTitle: { fontSize: 28, fontWeight: "800", color: MC.textPrimary },
  heroText: { fontSize: 13, lineHeight: 20, color: MC.textSecondary },
  heroRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  heroPill: {
    flex: 1,
    minWidth: 90,
    borderRadius: 16,
    padding: 12,
  },
  heroPillValue: { fontSize: 18, fontWeight: "700", color: MC.textPrimary },
  heroPillLabel: { fontSize: 11, color: MC.textSecondary, marginTop: 2 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEE2E2",
    padding: 12,
    borderRadius: 10,
  },
  errorText: { color: MC.error, fontSize: 13, flex: 1 },
  list: { gap: 10 },
  card: {
    flexDirection: "row",
    gap: 12,
    borderWidth: 1,
    borderColor: MC.border,
    borderRadius: 18,
    padding: 14,
    backgroundColor: MC.white,
  },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  cardBody: { flex: 1, gap: 4 },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardBadge: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  cardDate: { fontSize: 11, color: MC.textMuted },
  cardMessage: { fontSize: 14, lineHeight: 20, color: MC.textPrimary },
  cardMeta: { fontSize: 12, color: MC.textSecondary },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, paddingTop: 60 },
  emptyIcon: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: MC.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: { fontSize: 16, fontWeight: "600", color: MC.textSecondary },
  emptySubtext: {
    fontSize: 13,
    color: MC.textMuted,
    textAlign: "center",
    maxWidth: 260,
  },
});
