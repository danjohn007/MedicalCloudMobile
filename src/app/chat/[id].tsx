import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon } from "@/components/Icon";
import { MC } from "@/constants/theme";
import * as api from "@/services/api";
import { useAuthStore } from "@/stores/authStore";

interface ChatMessage {
  id: number;
  sender_id: number | null;
  sender_name?: string;
  message: string;
  message_type?: string;
  is_read: number;
  created_at: string;
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function MessageBubble({ item, isMine }: { item: ChatMessage; isMine: boolean }) {
  const isSystem = item.message_type === "system" || item.sender_id === null;

  if (isSystem) {
    return (
      <View style={styles.systemRow}>
        <View style={styles.systemBubble}>
          <Icon name="info" size={12} color={MC.textMuted} />
          <Text style={styles.systemText}>{item.message}</Text>
        </View>
        <Text style={styles.systemTime}>{formatTime(item.created_at)}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.msgRow, isMine && styles.msgRowMine]}>
      <View style={[styles.msgBubble, isMine ? styles.msgBubbleMine : styles.msgBubbleOther]}>
        {!isMine && item.sender_name && (
          <Text style={styles.senderName}>{item.sender_name}</Text>
        )}
        <Text style={[styles.msgText, isMine && styles.msgTextMine]}>
          {item.message}
        </Text>
        <Text style={[styles.msgTime, isMine && styles.msgTimeMine]}>
          {formatTime(item.created_at)}
        </Text>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const router = useRouter();
  const { id, name, photo } = useLocalSearchParams<{
    id: string;
    name?: string;
    photo?: string;
  }>();
  const conversationId = parseInt(id ?? "0", 10);
  const doctorName = decodeURIComponent(name || "Doctor/a");
  const doctorPhoto = decodeURIComponent(photo || "").trim();
  const { user } = useAuthStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const flatListRef = useRef<FlatList>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMessages = () => {
    if (!Number.isFinite(conversationId) || conversationId <= 0) {
      setLoading(false);
      return;
    }
    api
      .getConversation(conversationId)
      .then((res) => {
        const next = res.data ?? [];
        // Sort by id ascending to ensure correct order
        next.sort((a: ChatMessage, b: ChatMessage) => a.id - b.id);
        setMessages(next);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }, 150);
      })
      .catch((e) => setError(e.message ?? "Error al cargar mensajes"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMessages();
    intervalRef.current = setInterval(fetchMessages, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [conversationId]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || sending) return;
    if (!Number.isFinite(conversationId) || conversationId <= 0) return;

    setInputText("");
    setSending(true);
    setError("");
    try {
      await api.sendMessage(conversationId, text);
      // Immediate fetch to show the message
      fetchMessages();
    } catch (e: any) {
      setError(e.message ?? "Error al enviar mensaje");
      setInputText(text); // restore input on error
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={10}>
            <Icon name="arrow-left" size={22} color={MC.textPrimary} />
          </Pressable>
          <View style={styles.headerInfo}>
            <View style={styles.avatarSmall}>
              {doctorPhoto ? (
                <Image source={{ uri: doctorPhoto }} style={styles.avatarImage} resizeMode="cover" />
              ) : (
                <Text style={styles.avatarText}>{doctorName?.charAt(0) || "D"}</Text>
              )}
            </View>
            <View>
              <Text style={styles.headerTitle}>{doctorName}</Text>
              <Text style={styles.headerStatus}>En línea</Text>
            </View>
          </View>
        </View>

        {/* Error */}
        {error ? (
          <View style={styles.errorBar}>
            <Icon name="warning" size={16} color={MC.error} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => { setError(""); fetchMessages(); }}>
              <Text style={styles.retryText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Messages */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={MC.primary} size="large" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => {
              const isMine = item.sender_id === user?.id && item.message_type !== "system";
              return <MessageBubble item={item} isMine={isMine} />;
            }}
            contentContainerStyle={styles.msgList}
            onContentSizeChange={() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={styles.emptyIconCircle}>
                  <Icon name="chat-circle-dots" size={48} color={MC.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>Sin mensajes aún</Text>
                <Text style={styles.emptySubtext}>
                  Escribe un mensaje para comenzar la conversación
                </Text>
              </View>
            }
          />
        )}

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="Escribe un mensaje..."
              placeholderTextColor={MC.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={2000}
            />
          </View>
          <Pressable
            style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={MC.white} />
            ) : (
              <Icon name="paper-plane-right" size={18} color={MC.white} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MC.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: MC.border,
    backgroundColor: MC.white,
  },
  backBtn: { width: 36, height: 36, justifyContent: "center", alignItems: "center" },
  headerInfo: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, marginLeft: 4 },
  avatarSmall: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: MC.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImage: { width: 38, height: 38, borderRadius: 19 },
  avatarText: { fontSize: 15, fontWeight: "700", color: MC.primary },
  headerTitle: { fontSize: 16, fontWeight: "700", color: MC.textPrimary },
  headerStatus: { fontSize: 11, color: MC.primary, fontWeight: "600", marginTop: 1 },

  errorBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#FEF2F2",
    borderBottomWidth: 1,
    borderBottomColor: "#FECACA",
  },
  errorText: { flex: 1, fontSize: 12, color: MC.error },
  retryText: { fontSize: 12, fontWeight: "700", color: MC.primary },

  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center" },

  msgList: { padding: 14, paddingBottom: 8, flexGrow: 1 },
  msgRow: { flexDirection: "row", marginBottom: 8 },
  msgRowMine: { justifyContent: "flex-end" },
  msgBubble: {
    maxWidth: "78%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  msgBubbleMine: { backgroundColor: MC.primary, borderBottomRightRadius: 4 },
  msgBubbleOther: { backgroundColor: MC.white, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: MC.border },
  senderName: { fontSize: 11, fontWeight: "700", color: MC.primary, marginBottom: 4 },
  msgText: { fontSize: 15, color: MC.textPrimary, lineHeight: 21 },
  msgTextMine: { color: MC.white },
  msgTime: { fontSize: 10, color: MC.textMuted, marginTop: 4, textAlign: "right" },
  msgTimeMine: { color: "rgba(255,255,255,0.65)" },

  systemRow: { alignItems: "center", marginBottom: 12, paddingHorizontal: 20 },
  systemBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: MC.border,
  },
  systemText: { fontSize: 12, color: MC.textSecondary, textAlign: "center" },
  systemTime: { fontSize: 10, color: MC.textMuted, marginTop: 4 },

  empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 20, gap: 8 },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: MC.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: MC.border,
  },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: MC.textPrimary, marginTop: 4 },
  emptySubtext: { fontSize: 13, color: MC.textSecondary, textAlign: "center" },

  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: MC.border,
    backgroundColor: MC.white,
    gap: 8,
  },
  inputWrap: {
    flex: 1,
    backgroundColor: MC.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: MC.border,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: MC.textPrimary,
    maxHeight: 100,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: MC.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: MC.primary,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  sendBtnDisabled: { opacity: 0.35, shadowOpacity: 0 },
});