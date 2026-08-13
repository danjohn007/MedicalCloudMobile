import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
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
      return { label: "Resuelto", bg: MC.successSoft, fg: MC.success };
    case "closed":
      return { label: "Cerrado", bg: MC.surface, fg: MC.textSecondary };
    case "in_progress":
      return { label: "En revisión", bg: MC.infoSoft, fg: MC.primary };
    default:
      return { label: "Abierto", bg: MC.orangeSoft, fg: MC.star };
  }
}

function priorityLabel(priority: api.SupportTicketPriority) {
  switch (priority) {
    case "urgent":
      return "Urgente";
    case "high":
      return "Alta";
    case "low":
      return "Baja";
    default:
      return "Normal";
  }
}

export default function SupportDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const ticketId = Number(Array.isArray(params.id) ? params.id[0] : params.id);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<api.SupportTicketDetail | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [replyAttachment, setReplyAttachment] = useState<api.SupportAttachmentInput | null>(
    null,
  );
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!Number.isFinite(ticketId) || ticketId < 1) {
      setError("Ticket inválido.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      setError("");
      const response = await api.getSupportTicket(ticketId);
      setDetail(response);
    } catch (e: any) {
      setError(e?.message || "No se pudo cargar el ticket.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [ticketId]);

  useEffect(() => {
    void load();
  }, [load]);

  const canReply = useMemo(
    () => !!detail && !detail.ticket.is_closed,
    [detail],
  );

  async function pickAttachment() {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "image/*",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (picked.canceled || !picked.assets?.length) {
        return;
      }

      const file = picked.assets[0];
      setReplyAttachment({
        uri: file.uri,
        name: file.name || `adjunto_${Date.now()}`,
        type: file.mimeType || "application/pdf",
      });
    } catch (e: any) {
      Alert.alert("Adjunto", e?.message || "No se pudo seleccionar el archivo.");
    }
  }

  async function openAttachment(url?: string | null) {
    if (!url) return;
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert("Adjunto", "No se pudo abrir este archivo en el dispositivo.");
      return;
    }
    await Linking.openURL(url);
  }

  async function submitReply() {
    if (!detail || sending || (!replyBody.trim() && !replyAttachment)) {
      return;
    }

    try {
      setSending(true);
      await api.replySupportTicket(detail.ticket.id, {
        body: replyBody.trim(),
        attachment: replyAttachment,
      });
      setReplyBody("");
      setReplyAttachment(null);
      await load();
    } catch (e: any) {
      Alert.alert("Soporte", e?.message || "No se pudo enviar la respuesta.");
    } finally {
      setSending(false);
    }
  }

  function confirmClose() {
    if (!detail || detail.ticket.is_closed || closing) {
      return;
    }

    Alert.alert(
      "Cerrar ticket",
      "Podrás seguir leyendo el historial, pero ya no responder desde la app.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Cerrar",
          style: "destructive",
          onPress: async () => {
            try {
              setClosing(true);
              await api.closeSupportTicket(detail.ticket.id);
              await load();
            } catch (e: any) {
              Alert.alert("Soporte", e?.message || "No se pudo cerrar el ticket.");
            } finally {
              setClosing(false);
            }
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingWrap} edges={["top"]}>
        <ActivityIndicator size="large" color={MC.primary} />
      </SafeAreaView>
    );
  }

  if (!detail) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Icon name="arrow-left" size={22} color={MC.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Ticket</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.errorState}>
          <Icon name="warning" size={22} color={MC.error} />
          <Text style={styles.errorText}>{error || "No se pudo cargar el ticket."}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const status = statusMeta(detail.ticket.status);

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
          <Text style={styles.headerTitle}>Ticket #{detail.ticket.id}</Text>
          <Pressable onPress={() => load(true)} hitSlop={10}>
            <Icon name="arrow-clockwise" size={20} color={MC.primary} />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <Text style={[styles.statusText, { color: status.fg }]}>{status.label}</Text>
            </View>
            <Text style={styles.priorityText}>
              Prioridad {priorityLabel(detail.ticket.priority)}
            </Text>
          </View>

          <Text style={styles.heroTitle}>{detail.ticket.subject}</Text>
          <Text style={styles.heroMeta}>
            Actualizado {formatDate(detail.ticket.last_message_at || detail.ticket.updated_at)}
          </Text>

          {!detail.ticket.is_closed ? (
            <Pressable style={styles.closeButton} onPress={confirmClose} disabled={closing}>
              {closing ? (
                <ActivityIndicator color={MC.error} />
              ) : (
                <>
                  <Icon name="x" size={14} color={MC.error} />
                  <Text style={styles.closeButtonText}>Cerrar ticket</Text>
                </>
              )}
            </Pressable>
          ) : null}
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Icon name="warning" size={16} color={MC.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.thread}>
          {detail.messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageRow,
                message.is_me ? styles.messageRowMine : styles.messageRowTheirs,
              ]}
            >
              <View
                style={[
                  styles.messageBubble,
                  message.is_me ? styles.messageBubbleMine : styles.messageBubbleTheirs,
                ]}
              >
                <Text style={styles.messageAuthor}>
                  {message.is_me ? "Tú" : message.sender_name}
                </Text>
                {message.body ? (
                  <Text style={styles.messageBody}>{message.body}</Text>
                ) : null}
                {message.attachment_url ? (
                  <Pressable
                    style={styles.attachmentChip}
                    onPress={() => void openAttachment(message.attachment_url)}
                  >
                    <Icon name="file" size={14} color={MC.primaryDark} />
                    <Text style={styles.attachmentChipText}>
                      {message.attachment_name || "Abrir adjunto"}
                    </Text>
                  </Pressable>
                ) : null}
                <Text style={styles.messageTime}>{formatDate(message.created_at)}</Text>
              </View>
            </View>
          ))}
        </View>

        {canReply ? (
          <View style={styles.replyCard}>
            <Text style={styles.replyTitle}>Responder ticket</Text>
            <TextInput
              value={replyBody}
              onChangeText={setReplyBody}
              placeholder="Escribe aquí la actualización o respuesta."
              placeholderTextColor={MC.textMuted}
              multiline
              textAlignVertical="top"
              style={styles.replyInput}
            />

            {replyAttachment ? (
              <View style={styles.replyAttachmentCard}>
                <View style={styles.replyAttachmentBody}>
                  <Text style={styles.replyAttachmentName}>{replyAttachment.name}</Text>
                  <Text style={styles.replyAttachmentMeta}>{replyAttachment.type}</Text>
                </View>
                <Pressable onPress={() => setReplyAttachment(null)}>
                  <Text style={styles.removeText}>Quitar</Text>
                </Pressable>
              </View>
            ) : null}

            <View style={styles.replyActions}>
              <Pressable style={styles.attachButton} onPress={() => void pickAttachment()}>
                <Icon name="file" size={14} color={MC.primaryDark} />
                <Text style={styles.attachButtonText}>
                  {replyAttachment ? "Cambiar adjunto" : "Adjuntar"}
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.sendButton,
                  !replyBody.trim() && !replyAttachment && styles.sendButtonDisabled,
                ]}
                onPress={() => void submitReply()}
                disabled={sending || (!replyBody.trim() && !replyAttachment)}
              >
                {sending ? (
                  <ActivityIndicator color={MC.white} />
                ) : (
                  <Text style={styles.sendButtonText}>Enviar respuesta</Text>
                )}
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.closedCard}>
            <Icon name="check-circle" size={18} color={MC.textSecondary} />
            <Text style={styles.closedText}>
              Este ticket ya está cerrado. Puedes consultar el historial, pero no
              enviar más respuestas desde aquí.
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
  headerSpacer: { width: 22 },
  hero: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.card,
    padding: 18,
    gap: 10,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: { fontSize: 11, fontWeight: "700" },
  priorityText: { fontSize: 12, color: MC.textSecondary, fontWeight: "600" },
  heroTitle: { fontSize: 21, fontWeight: "800", color: MC.textPrimary },
  heroMeta: { fontSize: 12, color: MC.textMuted },
  closeButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: MC.errorBorder,
    backgroundColor: MC.errorSoft,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  closeButtonText: { color: MC.error, fontSize: 13, fontWeight: "700" },
  errorBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MC.errorBorder,
    backgroundColor: MC.errorSoft,
    padding: 14,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  errorState: {
    margin: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: MC.errorBorder,
    backgroundColor: MC.errorSoft,
    padding: 18,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  errorText: { flex: 1, color: MC.error, fontSize: 13, lineHeight: 19 },
  thread: { gap: 10 },
  messageRow: { flexDirection: "row" },
  messageRowMine: { justifyContent: "flex-end" },
  messageRowTheirs: { justifyContent: "flex-start" },
  messageBubble: {
    maxWidth: "88%",
    borderRadius: 20,
    padding: 14,
    gap: 8,
  },
  messageBubbleMine: {
    backgroundColor: MC.primaryLight,
    borderWidth: 1,
    borderColor: MC.infoBorder,
  },
  messageBubbleTheirs: {
    backgroundColor: MC.card,
    borderWidth: 1,
    borderColor: MC.border,
  },
  messageAuthor: { fontSize: 12, fontWeight: "700", color: MC.textPrimary },
  messageBody: { fontSize: 14, lineHeight: 21, color: MC.textPrimary },
  attachmentChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    backgroundColor: MC.infoSoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  attachmentChipText: { fontSize: 12, color: MC.primaryDark, fontWeight: "700" },
  messageTime: { fontSize: 11, color: MC.textMuted },
  replyCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.card,
    padding: 18,
    gap: 12,
  },
  replyTitle: { fontSize: 16, fontWeight: "700", color: MC.textPrimary },
  replyInput: {
    minHeight: 120,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.surface,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 14,
    color: MC.textPrimary,
  },
  replyAttachmentCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.surface,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  replyAttachmentBody: { flex: 1, gap: 4 },
  replyAttachmentName: { fontSize: 13, fontWeight: "700", color: MC.textPrimary },
  replyAttachmentMeta: { fontSize: 12, color: MC.textMuted },
  removeText: { fontSize: 13, fontWeight: "700", color: MC.error },
  replyActions: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
  },
  attachButton: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MC.infoBorder,
    backgroundColor: MC.infoSoft,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  attachButtonText: { color: MC.primaryDark, fontSize: 13, fontWeight: "700" },
  sendButton: {
    flex: 1,
    minWidth: 180,
    borderRadius: 16,
    backgroundColor: MC.primary,
    paddingHorizontal: 16,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: MC.textMuted,
  },
  sendButtonText: { color: MC.white, fontSize: 14, fontWeight: "800" },
  closedCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.input,
    padding: 16,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  closedText: { flex: 1, fontSize: 13, lineHeight: 20, color: MC.textSecondary },
});
