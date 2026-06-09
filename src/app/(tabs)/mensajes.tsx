import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  RefreshControl,
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

function FadeSlideIn({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

export default function MensajesScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<api.Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [showHelp, setShowHelp] = useState(true);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = () => {
    setLoading(true);
    setError("");
    api
      .getMessages()
      .then((res) => {
        const data = res.data ?? [];
        setMessages(data);
        // Auto-hide help banner if there are messages
        if (data.length > 0) setShowHelp(false);
      })
      .catch((e) => setError(e.message ?? "Error al cargar mensajes"))
      .finally(() => setLoading(false));
  };

  const onRefresh = () => {
    setRefreshing(true);
    api
      .getMessages()
      .then((res) => setMessages(res.data ?? []))
      .catch((e) => setError(e.message ?? ""))
      .finally(() => setRefreshing(false));
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Mensajes</Text>
        <Pressable style={styles.newBtn} hitSlop={10}>
          <Icon name="plus" size={22} color={MC.primary} />
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <View style={styles.searchInputWrap}>
          <Icon
            name="magnifying-glass"
            size={18}
            color={MC.textMuted}
            style={{ marginLeft: 12 }}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar mensajes..."
            placeholderTextColor={MC.textMuted}
          />
        </View>
      </View>

      {/* ── Help Banner ─────────────────────────────── */}
      {showHelp && (
        <FadeSlideIn delay={0}>
          <View style={styles.helpBanner}>
            <View style={styles.helpIconWrap}>
              <Icon name="chat-circle-dots" size={28} color={MC.primary} />
            </View>
            <View style={styles.helpBody}>
              <Text style={styles.helpTitle}>¿Cómo funciona?</Text>
              <Text style={styles.helpText}>
                Los mensajes aparecen automáticamente cuando un doctor te
                escribe. Puedes responder y llevar un historial de tu
                comunicación médica.
              </Text>
            </View>
            <Pressable
              onPress={() => setShowHelp(false)}
              style={styles.helpClose}
              hitSlop={10}
            >
              <Icon name="x" size={16} color={MC.textMuted} />
            </Pressable>
          </View>
        </FadeSlideIn>
      )}

      {loading && messages.length === 0 ? (
        <ActivityIndicator color={MC.primary} style={{ marginTop: 40 }} />
      ) : error && messages.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconCircle}>
            <Icon name="warning" size={56} color={MC.error} />
          </View>
          <Text style={styles.emptyText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={loadMessages}>
            <Text style={styles.retryBtnText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconCircle}>
            <Icon name="chat-circle" size={56} color={MC.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No tienes mensajes aún</Text>
          <Text style={styles.emptySubtext}>
            Cuando un doctor te escriba, aparecerá aquí.
          </Text>
          <Pressable style={styles.reloadBtn} onPress={loadMessages}>
            <Icon name="share-network" size={16} color={MC.primary} />
            <Text style={styles.reloadBtnText}>Recargar</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[MC.primary]}
            />
          }
        >
          {messages.map((m, idx) => (
            <FadeSlideIn key={m.id} delay={idx * 50}>
              <Pressable
                style={styles.row}
                onPress={() =>
                  router.push(
                    `/chat/${m.id}?name=${encodeURIComponent(m.doctor_name)}&photo=${encodeURIComponent(m.doctor_photo ?? "")}` as any,
                  )
                }
              >
                <View style={styles.avatar}>
                  {m.doctor_photo?.trim() ? (
                    <Image
                      source={{ uri: m.doctor_photo }}
                      style={styles.avatarImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={styles.avatarText}>
                      {m.doctor_name?.charAt(0) || "D"}
                    </Text>
                  )}
                </View>
                <View style={styles.rowBody}>
                  <Text style={[styles.name, m.unread > 0 && styles.nameBold]}>
                    {m.doctor_name}
                  </Text>
                  <Text style={styles.lastMsg} numberOfLines={1}>
                    {m.last_message ?? "Sin mensajes aún"}
                  </Text>
                </View>
                <View style={styles.rowRight}>
                  <Text style={styles.time}>
                    {m.updated_at
                      ? new Date(m.updated_at).toLocaleDateString("es-MX", {
                          day: "numeric",
                          month: "short",
                        })
                      : ""}
                  </Text>
                  {m.unread > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{m.unread}</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            </FadeSlideIn>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MC.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  title: { fontSize: 22, fontWeight: "700", color: MC.textPrimary },
  newBtn: { padding: 4 },
  searchWrap: { paddingHorizontal: 20, marginBottom: 8 },
  searchInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: MC.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: MC.border,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 11,
    fontSize: 15,
    color: MC.textPrimary,
  },

  // ── Help Banner ──────────────────────────────────
  helpBanner: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: MC.primaryLight,
    borderWidth: 1,
    borderColor: "rgba(27,168,160,0.2)",
    gap: 12,
  },
  helpIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: MC.white,
    justifyContent: "center",
    alignItems: "center",
  },
  helpBody: { flex: 1 },
  helpTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: MC.primaryDark,
    marginBottom: 4,
  },
  helpText: {
    fontSize: 12,
    color: MC.textSecondary,
    lineHeight: 17,
  },
  helpClose: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Empty State ──────────────────────────────────
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: MC.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: { fontSize: 16, color: MC.textSecondary, textAlign: "center" },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: MC.textPrimary,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: MC.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: MC.primary,
  },
  retryBtnText: { color: MC.white, fontWeight: "700", fontSize: 14 },
  reloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: MC.primaryLight,
  },
  reloadBtnText: { color: MC.primary, fontWeight: "700", fontSize: 14 },

  // ── Row ──────────────────────────────────────────
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: MC.border,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: MC.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarImage: { width: "100%", height: "100%", borderRadius: 25 },
  avatarText: { fontSize: 18, fontWeight: "700", color: MC.primary },
  rowBody: { flex: 1 },
  name: { fontSize: 15, fontWeight: "500", color: MC.textPrimary },
  nameBold: { fontWeight: "700" },
  lastMsg: { fontSize: 13, color: MC.textSecondary, marginTop: 2 },
  rowRight: { alignItems: "flex-end", gap: 6 },
  time: { fontSize: 12, color: MC.textMuted },
  badge: {
    backgroundColor: MC.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  badgeText: { color: MC.white, fontSize: 11, fontWeight: "700" },
});
