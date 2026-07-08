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
import { useAuthStore } from "@/stores/authStore";

type TicketFilter = "all" | "active" | "closed";

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

function statusMeta(status: api.SupportTicketStatus) {
  switch (status) {
    case "resolved":
      return { label: "Resuelto", bg: "#ECFDF5", fg: "#047857" };
    case "closed":
      return { label: "Cerrado", bg: "#F3F4F6", fg: "#4B5563" };
    case "in_progress":
      return { label: "En revision", bg: "#EFF6FF", fg: "#1D4ED8" };
    default:
      return { label: "Abierto", bg: "#FFF7ED", fg: "#B45309" };
  }
}

function priorityMeta(priority: api.SupportTicketPriority) {
  switch (priority) {
    case "urgent":
      return { label: "Urgente", fg: "#B91C1C" };
    case "high":
      return { label: "Alta", fg: "#C2410C" };
    case "low":
      return { label: "Baja", fg: MC.textMuted };
    default:
      return { label: "Normal", fg: MC.textSecondary };
  }
}

export default function SupportIndexScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<TicketFilter>("all");
  const [tickets, setTickets] = useState<api.SupportTicket[]>([]);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      setError("");
      const response = await api.getSupportTickets();
      setTickets(response.data || []);
    } catch (e: any) {
      setError(e?.message || "No se pudieron cargar los tickets.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(
    () => ({
      total: tickets.length,
      active: tickets.filter((ticket) => !ticket.is_closed).length,
      closed: tickets.filter((ticket) => ticket.is_closed).length,
    }),
    [tickets],
  );

  const filteredTickets = useMemo(() => {
    switch (filter) {
      case "active":
        return tickets.filter((ticket) => !ticket.is_closed);
      case "closed":
        return tickets.filter((ticket) => ticket.is_closed);
      default:
        return tickets;
    }
  }, [filter, tickets]);

  const roleLabel = user?.role === "doctor" ? "doctor" : "paciente";

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
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Icon name="arrow-left" size={22} color={MC.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Soporte</Text>
          <Pressable onPress={() => load(true)} hitSlop={10}>
            <Icon name="arrow-clockwise" size={20} color={MC.primary} />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>Soporte real</Text>
          <Text style={styles.heroTitle}>Tus tickets en un solo lugar</Text>
          <Text style={styles.heroText}>
            Abre incidencias, sigue respuestas del equipo y cierra tickets cuando
            ya quedo resuelto desde tu cuenta de {roleLabel}.
          </Text>

          <View style={styles.heroStats}>
            <MetricCard label="Activos" value={counts.active} tone="#FFF7ED" />
            <MetricCard label="Cerrados" value={counts.closed} tone="#EEF2FF" />
            <MetricCard label="Total" value={counts.total} tone="#ECFDF5" />
          </View>

          <Pressable
            style={styles.primaryButton}
            onPress={() => router.push("/soporte/nuevo" as any)}
          >
            <Icon name="plus" size={16} color={MC.white} />
            <Text style={styles.primaryButtonText}>Nuevo ticket</Text>
          </Pressable>
        </View>

        <View style={styles.filterRow}>
          <FilterChip
            label="Todo"
            active={filter === "all"}
            onPress={() => setFilter("all")}
          />
          <FilterChip
            label="Activos"
            active={filter === "active"}
            onPress={() => setFilter("active")}
          />
          <FilterChip
            label="Cerrados"
            active={filter === "closed"}
            onPress={() => setFilter("closed")}
          />
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Icon name="warning" size={16} color={MC.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {filteredTickets.length ? (
          <View style={styles.list}>
            {filteredTickets.map((ticket) => {
              const status = statusMeta(ticket.status);
              const priority = priorityMeta(ticket.priority);

              return (
                <Pressable
                  key={ticket.id}
                  style={styles.card}
                  onPress={() => router.push(`/soporte/${ticket.id}` as any)}
                >
                  <View style={styles.cardTop}>
                    <View style={[styles.badge, { backgroundColor: status.bg }]}>
                      <Text style={[styles.badgeText, { color: status.fg }]}>
                        {status.label}
                      </Text>
                    </View>
                    <Text style={[styles.priorityText, { color: priority.fg }]}>
                      {priority.label}
                    </Text>
                  </View>

                  <Text style={styles.cardTitle}>{ticket.subject}</Text>
                  <Text style={styles.cardPreview} numberOfLines={2}>
                    {ticket.last_message_preview || "Sin mensajes recientes"}
                  </Text>

                  <View style={styles.cardFooter}>
                    <Text style={styles.cardMeta}>
                      {ticket.message_count} mensaje
                      {ticket.message_count === 1 ? "" : "s"}
                    </Text>
                    <Text style={styles.cardMeta}>
                      {formatDate(ticket.last_message_at || ticket.updated_at)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Icon name="chat-circle-dots" size={44} color={MC.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>Todavía no tienes tickets</Text>
            <Text style={styles.emptyText}>
              Si algo falla con una cita, pago, expediente o perfil, abre tu primer
              ticket y el equipo podra responderte aqui mismo.
            </Text>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => router.push("/soporte/nuevo" as any)}
            >
              <Text style={styles.secondaryButtonText}>Crear ticket</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <View style={[styles.metricCard, { backgroundColor: tone }]}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.filterChip, active && styles.filterChipActive]}
      onPress={onPress}
    >
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MC.background },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MC.background,
  },
  content: { padding: 16, paddingBottom: 36, gap: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: MC.textPrimary },
  hero: {
    borderRadius: 28,
    backgroundColor: "#E0F2FE",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    padding: 20,
    gap: 12,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0369A1",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroTitle: { fontSize: 28, fontWeight: "800", color: MC.textPrimary },
  heroText: { fontSize: 13, lineHeight: 20, color: MC.textSecondary },
  heroStats: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  metricCard: {
    flex: 1,
    minWidth: 96,
    borderRadius: 18,
    padding: 14,
    gap: 4,
  },
  metricValue: { fontSize: 26, fontWeight: "800", color: MC.textPrimary },
  metricLabel: { fontSize: 12, color: MC.textSecondary },
  primaryButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: MC.primary,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryButtonText: { color: MC.white, fontSize: 14, fontWeight: "700" },
  filterRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  filterChipActive: {
    borderColor: MC.primary,
    backgroundColor: MC.primaryLight,
  },
  filterChipText: { fontSize: 13, color: MC.textSecondary, fontWeight: "600" },
  filterChipTextActive: { color: MC.primaryDark },
  errorBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
    padding: 14,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  errorText: { flex: 1, color: MC.error, fontSize: 13, lineHeight: 19 },
  list: { gap: 12 },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.white,
    padding: 16,
    gap: 10,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: { fontSize: 11, fontWeight: "700" },
  priorityText: { fontSize: 12, fontWeight: "600" },
  cardTitle: { fontSize: 16, fontWeight: "700", color: MC.textPrimary },
  cardPreview: { fontSize: 13, lineHeight: 20, color: MC.textSecondary },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  cardMeta: { fontSize: 12, color: MC.textMuted },
  empty: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.white,
    padding: 22,
    alignItems: "center",
    gap: 10,
  },
  emptyIcon: {
    width: 78,
    height: 78,
    borderRadius: 26,
    backgroundColor: MC.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: MC.textPrimary },
  emptyText: {
    fontSize: 13,
    lineHeight: 20,
    color: MC.textSecondary,
    textAlign: "center",
  },
  secondaryButton: {
    marginTop: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MC.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  secondaryButtonText: { color: MC.primaryDark, fontSize: 14, fontWeight: "700" },
});
