import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
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

import { Icon, type IconName } from "@/components/Icon";
import { MC } from "@/constants/theme";
import * as api from "@/services/api";
import {
  registerDeviceForPushNotifications,
  setAppNotificationBadgeCount,
} from "@/services/push-notifications";
import { useAuthStore } from "@/stores/authStore";

type FilterKey =
  | "all"
  | "unread"
  | "appointment"
  | "warning"
  | "doctor"
  | "message"
  | "system";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "unread", label: "Nuevas" },
  { key: "appointment", label: "Citas" },
  { key: "warning", label: "Alertas" },
  { key: "doctor", label: "Doctores" },
  { key: "message", label: "Mensajes" },
  { key: "system", label: "Sistema" },
];

function getTimeMs(value?: string | null) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatRelativeTime(value?: string | null) {
  const time = getTimeMs(value);
  if (!time) return "Sin fecha";

  const seconds = Math.max(1, Math.floor((Date.now() - time) / 1000));
  if (seconds < 60) return "hace un momento";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days} días`;

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
  }).format(new Date(time));
}

function getNotificationMeta(item: api.NotificationItem): {
  filter: Exclude<FilterKey, "all" | "unread">;
  label: string;
  icon: IconName;
  bg: string;
  fg: string;
} {
  if (item.type === "message" || item.source === "chat_message") {
    return {
      filter: "message",
      label: "Mensaje",
      icon: "chat-circle-dots",
      bg: "#EEF2FF",
      fg: "#4338CA",
    };
  }

  if (item.type === "appointment" || item.related_type === "appointment") {
    return {
      filter: "appointment",
      label: "Cita",
      icon: "calendar",
      bg: "#ECFDF5",
      fg: "#047857",
    };
  }

  if (item.type === "doctor" || item.related_type === "doctor") {
    return {
      filter: "doctor",
      label: "Doctor",
      icon: "user-circle",
      bg: "#E0F2FE",
      fg: "#0369A1",
    };
  }

  if (item.type === "warning" || item.type === "alert") {
    return {
      filter: "warning",
      label: "Alerta",
      icon: "warning",
      bg: "#FEF2F2",
      fg: "#B91C1C",
    };
  }

  return {
    filter: "system",
    label: "Sistema",
    icon: "bell",
    bg: "#FFF7ED",
    fg: "#B45309",
  };
}

function getNotificationText(item: api.NotificationItem) {
  const title =
    item.title?.trim() ||
    item.related_name?.trim() ||
    (item.type === "message" ? "Nuevo mensaje" : "Notificación");
  const body = item.body?.trim() || item.message?.trim() || "";

  return { title, body };
}

function isUnread(item: api.NotificationItem) {
  return item.is_read === false;
}

function notificationKey(item: api.NotificationItem) {
  return `${item.source ?? item.type}-${item.id}`;
}

function routeForNotification(item: api.NotificationItem, userRole?: string | null): string | null {
  const relatedType = (item.related_type ?? "").toLowerCase();
  const source = (item.source ?? "").toLowerCase();
  const type = (item.type ?? "").toLowerCase();

  if ((type === "message" || source.includes("chat")) && item.thread_id) {
    const name = item.related_name ?? "Contacto";
    return `/chat/${item.thread_id}?name=${encodeURIComponent(name)}`;
  }

  const appointmentId =
    relatedType === "appointment" && item.related_id
      ? item.related_id
      : type === "appointment" || source === "appointment"
        ? item.id
        : 0;

  if (appointmentId) {
    return userRole === "doctor"
      ? `/doctor/appointments/${appointmentId}`
      : `/(tabs)/citas?appointmentId=${appointmentId}`;
  }

  if (relatedType === "support_ticket" && item.related_id) {
    return `/soporte/${item.related_id}`;
  }

  return null;
}

export default function NotificacionesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ highlight?: string }>();
  const userRole = useAuthStore((state) => state.user?.role);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState<api.NotificationItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [markingAll, setMarkingAll] = useState(false);
  const [testingPush, setTestingPush] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      setError("");
      const response = await api.getNotifications();
      const next = [...(response.data || [])].sort(
        (a, b) => getTimeMs(b.created_at) - getTimeMs(a.created_at),
      );
      setItems(next);
      void setAppNotificationBadgeCount(next.filter(isUnread).length);
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

  const counts = useMemo(() => {
    const base: Record<FilterKey, number> = {
      all: items.length,
      unread: items.filter(isUnread).length,
      appointment: 0,
      warning: 0,
      doctor: 0,
      message: 0,
      system: 0,
    };

    items.forEach((item) => {
      base[getNotificationMeta(item).filter] += 1;
    });

    return base;
  }, [items]);

  const visibleFilters = useMemo(
    () =>
      userRole === "doctor"
        ? FILTERS.filter((filter) => filter.key !== "doctor")
        : FILTERS,
    [userRole],
  );

  useEffect(() => {
    if (userRole === "doctor" && activeFilter === "doctor") {
      setActiveFilter("all");
    }
  }, [activeFilter, userRole]);

  const filteredItems = useMemo(() => {
    if (activeFilter === "all") return items;
    if (activeFilter === "unread") return items.filter(isUnread);

    return items.filter((item) => getNotificationMeta(item).filter === activeFilter);
  }, [activeFilter, items]);

  const markItemRead = async (item: api.NotificationItem) => {
    if (!isUnread(item)) return;

    setItems((current) =>
      {
        const nextItems = current.map((next) =>
          next.source === item.source && next.id === item.id
            ? { ...next, is_read: true }
            : next,
        );
        void setAppNotificationBadgeCount(nextItems.filter(isUnread).length);
        return nextItems;
      },
    );

    try {
      await api.markNotificationRead({
        source: item.source ?? item.type,
        id: item.id,
      });
    } catch {
      void load(true);
    }
  };

  const markAllRead = async () => {
    if (!counts.unread || markingAll) return;

    setMarkingAll(true);
    setItems((current) => current.map((item) => ({ ...item, is_read: true })));
    void setAppNotificationBadgeCount(0);
    try {
      await api.markAllNotificationsRead();
    } catch (e: any) {
      setError(e?.message || "No se pudieron marcar las notificaciones.");
      void load(true);
    } finally {
      setMarkingAll(false);
    }
  };

  const testPush = async () => {
    if (testingPush) return;

    setTestingPush(true);
    setError("");
    try {
      const token = await registerDeviceForPushNotifications();
      const response = await api.testPushNotification();
      const tokenCount = Number(response.token_count ?? 0);
      if (!token && tokenCount <= 0) {
        setError("No se registro token push para este dispositivo. Revisa permisos, build instalada y credenciales FCM/EAS.");
      } else if (tokenCount <= 0) {
        setError("El servidor no encontro tokens activos aunque la app genero uno. Vuelve a iniciar sesion e intenta de nuevo.");
      } else {
        await load(true);
      }
    } catch (e: any) {
      setError(e?.message || "No se pudo enviar la prueba push.");
    } finally {
      setTestingPush(false);
    }
  };

  const openNotification = (item: api.NotificationItem) => {
    void markItemRead(item);
    const route = routeForNotification(item, userRole);
    if (route) {
      router.push(route as any);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingWrap} edges={["top"]}>
        <ActivityIndicator size="large" color={MC.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          style={styles.headerBtn}
          onPress={() => router.back()}
          hitSlop={10}
        >
          <Icon name="arrow-left" size={23} color={MC.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Notificaciones</Text>
        <Pressable style={styles.headerBtn} onPress={() => load(true)} hitSlop={10}>
          <Icon name="arrow-clockwise" size={20} color={MC.primary} />
        </Pressable>
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryIcon}>
          <Icon name="bell-ringing" size={24} color={MC.primary} />
        </View>
        <View style={styles.summaryText}>
          <Text style={styles.summaryTitle}>
            {counts.unread ? `${counts.unread} sin revisar` : "Todo al día"}
          </Text>
          <Text style={styles.summarySub}>
            Mensajes, citas y avisos recientes en orden cronológico.
          </Text>
        </View>
        {counts.unread ? (
          <Pressable
            style={[styles.readAllButton, markingAll && styles.disabledButton]}
            onPress={markAllRead}
            disabled={markingAll}
          >
            <Text style={styles.readAllText}>
              {markingAll ? "Marcando..." : "Marcar leídas"}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <Pressable
        style={[styles.testPushButton, testingPush && styles.disabledButton]}
        onPress={testPush}
        disabled={testingPush}
      >
        {testingPush ? (
          <ActivityIndicator size="small" color={MC.primaryDark} />
        ) : (
          <Icon name="bell-ringing" size={16} color={MC.primaryDark} />
        )}
        <Text style={styles.testPushText}>
          {testingPush ? "Probando push..." : "Probar notificacion push"}
        </Text>
      </Pressable>

      <View style={styles.filtersWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {visibleFilters.map((filter) => {
            const selected = activeFilter === filter.key;
            return (
              <Pressable
                key={filter.key}
                style={[styles.filterChip, selected && styles.filterChipActive]}
                onPress={() => setActiveFilter(filter.key)}
              >
                <Text
                  style={[
                    styles.filterText,
                    selected && styles.filterTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
                {counts[filter.key] > 0 ? (
                  <View
                    style={[
                      styles.filterCount,
                      selected && styles.filterCountActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterCountText,
                        selected && styles.filterCountTextActive,
                      ]}
                    >
                      {counts[filter.key]}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Icon name="warning" size={16} color={MC.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={MC.primary}
            colors={[MC.primary]}
          />
        }
      >
        {filteredItems.length ? (
          filteredItems.map((item) => {
            const meta = getNotificationMeta(item);
            const { title, body } = getNotificationText(item);
            const unread = isUnread(item);
            const targetRoute = routeForNotification(item, userRole);
            const highlighted =
              params.highlight === notificationKey(item) ||
              params.highlight === String(item.id);

            return (
              <Pressable
                key={`${item.source ?? item.type}-${item.id}-${item.created_at}`}
                style={({ pressed }) => [
                  styles.notificationRow,
                  highlighted && styles.notificationHighlighted,
                  pressed && targetRoute && styles.notificationPressed,
                ]}
                onPress={() => openNotification(item)}
              >
                <View style={styles.unreadSlot}>
                  {unread ? <View style={styles.unreadDot} /> : null}
                </View>
                <View style={[styles.itemIcon, { backgroundColor: meta.bg }]}>
                  <Icon name={meta.icon} size={21} color={meta.fg} />
                </View>
                <View style={styles.itemBody}>
                  <View style={styles.itemTop}>
                    <Text
                      style={[styles.itemTitle, unread && styles.itemTitleUnread]}
                      numberOfLines={1}
                    >
                      {title}
                    </Text>
                    <Text style={styles.itemTime}>
                      {formatRelativeTime(item.created_at)}
                    </Text>
                  </View>
                  <Text style={styles.itemMessage} numberOfLines={2}>
                    {body}
                  </Text>
                  <View style={styles.itemFooter}>
                    <Text style={[styles.itemLabel, { color: meta.fg }]}>
                      {meta.label}
                    </Text>
                    {targetRoute ? (
                      <Text style={styles.itemAction}>Abrir conversación</Text>
                    ) : null}
                    {unread ? (
                      <Pressable
                        onPress={(event) => {
                          event.stopPropagation();
                          void markItemRead(item);
                        }}
                        hitSlop={8}
                      >
                        <Text style={styles.itemAction}>Marcar leída</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
                <Icon
                  name="dots-three-vertical"
                  size={18}
                  color={MC.textMuted}
                />
              </Pressable>
            );
          })
        ) : (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Icon name="bell" size={54} color={MC.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No hay notificaciones</Text>
            <Text style={styles.emptySubtext}>
              Cuando existan avisos de este filtro aparecerán aquí.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    textAlign: "center",
    color: MC.textPrimary,
    fontSize: 22,
    fontWeight: "800",
  },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 20,
    backgroundColor: MC.primaryLight,
    borderWidth: 1,
    borderColor: "#C9ECE8",
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: MC.white,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryText: { flex: 1 },
  summaryTitle: { fontSize: 16, fontWeight: "800", color: MC.textPrimary },
  summarySub: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
    color: MC.textSecondary,
  },
  readAllButton: {
    borderRadius: 999,
    backgroundColor: MC.white,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#C9ECE8",
  },
  disabledButton: { opacity: 0.65 },
  readAllText: { fontSize: 11, fontWeight: "800", color: MC.primaryDark },
  testPushButton: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#C9ECE8",
    backgroundColor: MC.white,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  testPushText: { fontSize: 12, fontWeight: "800", color: MC.primaryDark },
  filtersWrap: { paddingBottom: 8 },
  filters: { paddingHorizontal: 16, gap: 8 },
  filterChip: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 19,
    backgroundColor: MC.surface,
    borderWidth: 1,
    borderColor: MC.border,
  },
  filterChipActive: {
    backgroundColor: MC.primary,
    borderColor: MC.primary,
  },
  filterText: { fontSize: 13, fontWeight: "700", color: MC.textSecondary },
  filterTextActive: { color: MC.white },
  filterCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MC.white,
  },
  filterCountActive: { backgroundColor: "rgba(255,255,255,0.22)" },
  filterCountText: { fontSize: 11, fontWeight: "800", color: MC.primary },
  filterCountTextActive: { color: MC.white },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: "#FEE2E2",
    padding: 12,
    borderRadius: 14,
  },
  errorText: { color: MC.error, fontSize: 13, flex: 1 },
  listContent: { paddingBottom: 28 },
  notificationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 13,
  },
  notificationHighlighted: {
    backgroundColor: "#ECFEFF",
    borderLeftWidth: 3,
    borderLeftColor: MC.primary,
  },
  notificationPressed: { backgroundColor: MC.surface },
  unreadSlot: {
    width: 8,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: MC.primary,
  },
  itemIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  itemBody: { flex: 1, minWidth: 0 },
  itemTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: MC.textPrimary,
  },
  itemTitleUnread: { fontWeight: "900" },
  itemTime: { fontSize: 11, color: MC.textMuted },
  itemMessage: {
    marginTop: 3,
    color: MC.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  itemFooter: {
    marginTop: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  itemLabel: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  itemAction: { fontSize: 11, fontWeight: "700", color: MC.primary },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 34,
    paddingTop: 80,
    gap: 12,
  },
  emptyIcon: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: MC.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: MC.textPrimary,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 13,
    lineHeight: 19,
    color: MC.textMuted,
    textAlign: "center",
  },
});
