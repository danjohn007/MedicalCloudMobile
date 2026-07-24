import { Icon } from "@/components/Icon";
import { DoctorFeatureAccessGate } from "@/components/DoctorFeatureAccessGate";
import { MC } from "@/constants/theme";
import * as api from "@/services/api";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type AiMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  createdAt: Date;
};

const PATIENT_PROMPTS = [
  "Ayúdame a preparar preguntas para mi próxima consulta.",
  "¿Cómo puedo explicar mis síntomas de forma clara?",
  "¿Qué señales de alarma debería vigilar?",
];

const DOCTOR_PROMPTS = [
  "Resume mis últimas consultas y pendientes importantes.",
  "Ayúdame a redactar una nota SOAP clara.",
  "¿Qué pacientes debo priorizar hoy?",
];

function nowLabel(date: Date): string {
  return date.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function AiBubble({ item }: { item: AiMessage }) {
  const isUser = item.role === "user";

  return (
    <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
      {!isUser ? (
        <View style={styles.aiAvatar}>
          <Icon name="brain" size={16} color={MC.primary} />
        </View>
      ) : null}
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        <Text style={[styles.messageText, isUser && styles.userMessageText]}>
          {item.content}
        </Text>
        <Text style={[styles.messageTime, isUser && styles.userMessageTime]}>
          {nowLabel(item.createdAt)}
        </Text>
      </View>
    </View>
  );
}

export default function AiChatScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const sessionIdRef = useRef<string>("");
  const listRef = useRef<FlatList<AiMessage>>(null);

  const isDoctor = user?.role === "doctor";
  const firstName = (user?.name || (isDoctor ? "Doctor" : "Paciente")).split(" ")[0];
  const suggestions = isDoctor ? DOCTOR_PROMPTS : PATIENT_PROMPTS;

  const [messages, setMessages] = useState<AiMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: isDoctor
        ? `Hola, ${firstName}. Puedo ayudarte a revisar contexto clínico, preparar consultas, resumir notas o redactar documentos.`
        : `Hola, ${firstName}. Puedo ayudarte a preparar tus consultas, ordenar síntomas y entender indicaciones médicas generales.`,
      createdAt: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 120);
  }, []);

  async function sendMessage(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text || sending) return;

    setInput("");
    setError("");
    setSending(true);

    const userMessage: AiMessage = {
      id: makeId("user"),
      role: "user",
      content: text,
      createdAt: new Date(),
    };

    setMessages((current) => [...current, userMessage]);

    try {
      const response = await api.sendAiChatMessage({
        message: text,
        session_id: sessionIdRef.current || undefined,
      });
      sessionIdRef.current = response.session_id;

      setMessages((current) => [
        ...current,
        {
          id: makeId("assistant"),
          role: "assistant",
          content: response.reply,
          createdAt: new Date(),
        },
      ]);
    } catch (e: any) {
      setError(e?.message || "No se pudo contactar al asistente de IA.");
    } finally {
      setSending(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }

  return (
    <DoctorFeatureAccessGate feature="ai_assistant">
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => (router.canGoBack() ? router.back() : router.replace(isDoctor ? "/(doctor-tabs)" : "/(tabs)"))}
            hitSlop={10}
          >
            <Icon name="arrow-left" size={22} color={MC.textPrimary} />
          </Pressable>
          <View style={styles.headerIcon}>
            <Icon name="brain" size={20} color={MC.primary} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>Asistente IA</Text>
            <Text style={styles.headerSubtitle}>
              {isDoctor ? "Soporte clínico con tu contexto" : "Orientación general para tu salud"}
            </Text>
          </View>
        </View>

        <View style={styles.disclaimer}>
          <Icon name="info" size={16} color={MC.primary} />
          <Text style={styles.disclaimerText}>
            {isDoctor
              ? "La IA puede apoyar tu criterio clínico, pero no reemplaza tu evaluación profesional."
              : "La IA no da diagnósticos ni sustituye una consulta. En urgencias, busca atención inmediata."}
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBar}>
            <Icon name="warning" size={16} color={MC.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <AiBubble item={item} />}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={
            sending ? (
              <View style={styles.typingRow}>
                <ActivityIndicator size="small" color={MC.primary} />
                <Text style={styles.typingText}>La IA está pensando...</Text>
              </View>
            ) : null
          }
        />

        {messages.length <= 1 ? (
          <View style={styles.suggestions}>
            {suggestions.map((suggestion) => (
              <Pressable
                key={suggestion}
                style={styles.suggestionChip}
                onPress={() => sendMessage(suggestion)}
                disabled={sending}
              >
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={styles.inputBar}>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder={isDoctor ? "Pregunta sobre tus pacientes, notas o consultas..." : "Pregunta algo para preparar tu consulta..."}
              placeholderTextColor={MC.textMuted}
              multiline
              maxLength={2000}
            />
          </View>
          <Pressable
            style={[styles.sendButton, (!input.trim() || sending) && styles.sendButtonDisabled]}
            onPress={() => sendMessage()}
            disabled={!input.trim() || sending}
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
    </DoctorFeatureAccessGate>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: MC.background },
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: MC.card,
    borderBottomWidth: 1,
    borderBottomColor: MC.infoBorder,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: MC.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: { flex: 1 },
  headerTitle: { fontSize: 19, fontWeight: "800", color: MC.textPrimary },
  headerSubtitle: { marginTop: 2, fontSize: 12, fontWeight: "600", color: MC.textSecondary },
  disclaimer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 18,
    backgroundColor: MC.infoSoft,
    borderWidth: 1,
    borderColor: MC.infoBorder,
  },
  disclaimerText: { flex: 1, fontSize: 12.5, lineHeight: 18, color: MC.primaryDark, fontWeight: "600" },
  errorBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: MC.errorSoft,
    borderWidth: 1,
    borderColor: MC.errorBorder,
  },
  errorText: { flex: 1, color: MC.error, fontSize: 12.5, fontWeight: "700" },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    gap: 12,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  messageRowUser: { justifyContent: "flex-end" },
  aiAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: MC.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: MC.infoBorder,
  },
  bubble: {
    maxWidth: "82%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  assistantBubble: {
    backgroundColor: MC.card,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: MC.infoBorder,
  },
  userBubble: {
    backgroundColor: MC.primary,
    borderBottomRightRadius: 6,
  },
  messageText: { fontSize: 14.5, lineHeight: 21, color: MC.textPrimary, fontWeight: "500" },
  userMessageText: { color: MC.white },
  messageTime: { marginTop: 6, fontSize: 10.5, color: MC.textMuted, fontWeight: "700" },
  userMessageTime: { color: "rgba(255,255,255,0.75)" },
  typingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 42,
    paddingTop: 4,
  },
  typingText: { fontSize: 12.5, color: MC.textSecondary, fontWeight: "700" },
  suggestions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: MC.card,
    borderWidth: 1,
    borderColor: MC.infoBorder,
  },
  suggestionText: { color: MC.primaryDark, fontSize: 12.5, fontWeight: "800" },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 12 : 10,
    backgroundColor: MC.card,
    borderTopWidth: 1,
    borderTopColor: MC.infoBorder,
  },
  inputWrap: {
    flex: 1,
    minHeight: 48,
    maxHeight: 118,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: MC.input,
    borderWidth: 1,
    borderColor: MC.border,
  },
  input: {
    minHeight: 34,
    maxHeight: 100,
    fontSize: 14,
    color: MC.textPrimary,
    fontWeight: "600",
    paddingTop: Platform.OS === "ios" ? 8 : 4,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: MC.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: { opacity: 0.45 },
});
