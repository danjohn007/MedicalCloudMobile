import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
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

const PRIORITIES: { value: api.SupportTicketPriority; label: string; hint: string }[] = [
  { value: "normal", label: "Normal", hint: "Consulta o incidencia común." },
  { value: "high", label: "Alta", hint: "Bloquea una tarea importante." },
  { value: "urgent", label: "Urgente", hint: "Impide operar correctamente hoy." },
  { value: "low", label: "Baja", hint: "Seguimiento o duda menor." },
];

export default function SupportCreateScreen() {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<api.SupportTicketPriority>("normal");
  const [attachment, setAttachment] = useState<api.SupportAttachmentInput | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(
    () => subject.trim().length > 0 && (body.trim().length > 0 || !!attachment),
    [attachment, body, subject],
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
      setAttachment({
        uri: file.uri,
        name: file.name || `adjunto_${Date.now()}`,
        type: file.mimeType || "application/pdf",
      });
    } catch (e: any) {
      Alert.alert("Adjunto", e?.message || "No se pudo seleccionar el archivo.");
    }
  }

  async function submit() {
    if (!canSubmit || submitting) {
      return;
    }

    try {
      setSubmitting(true);
      const response = await api.createSupportTicket({
        subject: subject.trim(),
        body: body.trim(),
        priority,
        attachment,
      });

      router.replace(`/soporte/${response.ticket_id}` as any);
    } catch (e: any) {
      Alert.alert("Soporte", e?.message || "No se pudo crear el ticket.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Icon name="arrow-left" size={22} color={MC.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Nuevo ticket</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>Soporte</Text>
          <Text style={styles.heroTitle}>Cuéntanos qué pasó</Text>
          <Text style={styles.heroText}>
            Entre más claro sea el contexto, más rápido podrán ayudarte con citas,
            pagos, expedientes, recetas o acceso a la cuenta.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Asunto</Text>
          <TextInput
            value={subject}
            onChangeText={setSubject}
            placeholder="Ej. No puedo confirmar una cita pagada"
            placeholderTextColor={MC.textMuted}
            style={styles.input}
            maxLength={200}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Prioridad</Text>
          <View style={styles.priorityList}>
            {PRIORITIES.map((item) => (
              <Pressable
                key={item.value}
                style={[
                  styles.priorityCard,
                  priority === item.value && styles.priorityCardActive,
                ]}
                onPress={() => setPriority(item.value)}
              >
                <Text
                  style={[
                    styles.priorityTitle,
                    priority === item.value && styles.priorityTitleActive,
                  ]}
                >
                  {item.label}
                </Text>
                <Text style={styles.priorityHint}>{item.hint}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Detalle</Text>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Explica lo que ves, a quién le pasa y desde cuándo ocurre."
            placeholderTextColor={MC.textMuted}
            multiline
            textAlignVertical="top"
            style={[styles.input, styles.textarea]}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionTop}>
            <Text style={styles.label}>Adjunto opcional</Text>
            {attachment ? (
              <Pressable onPress={() => setAttachment(null)}>
                <Text style={styles.removeText}>Quitar</Text>
              </Pressable>
            ) : null}
          </View>

          <Pressable style={styles.attachmentButton} onPress={() => void pickAttachment()}>
            <Icon name="file" size={16} color={MC.primaryDark} />
            <Text style={styles.attachmentButtonText}>
              {attachment ? "Cambiar archivo" : "Adjuntar archivo"}
            </Text>
          </Pressable>

          {attachment ? (
            <View style={styles.attachmentCard}>
              <Text style={styles.attachmentName}>{attachment.name}</Text>
              <Text style={styles.attachmentMeta}>{attachment.type}</Text>
            </View>
          ) : (
            <Text style={styles.helperText}>
              Puedes subir PDF, imágenes o documentos Word de hasta 10 MB.
            </Text>
          )}
        </View>

        <Pressable
          style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
          onPress={() => void submit()}
          disabled={!canSubmit || submitting}
        >
          {submitting ? (
            <ActivityIndicator color={MC.white} />
          ) : (
            <Text style={styles.submitButtonText}>Crear ticket</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MC.background },
  content: { padding: 16, paddingBottom: 36, gap: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: MC.textPrimary },
  headerSpacer: { width: 22 },
  hero: {
    borderRadius: 26,
    backgroundColor: MC.successSoft,
    borderWidth: 1,
    borderColor: MC.successBorder,
    padding: 20,
    gap: 8,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: MC.success,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroTitle: { fontSize: 28, fontWeight: "800", color: MC.textPrimary },
  heroText: { fontSize: 13, lineHeight: 20, color: MC.textSecondary },
  section: { gap: 10 },
  sectionTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: { fontSize: 14, fontWeight: "700", color: MC.textPrimary },
  input: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: MC.textPrimary,
  },
  textarea: { minHeight: 150 },
  priorityList: { gap: 10 },
  priorityCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.card,
    padding: 14,
    gap: 4,
  },
  priorityCardActive: {
    borderColor: MC.primary,
    backgroundColor: MC.primaryLight,
  },
  priorityTitle: { fontSize: 14, fontWeight: "700", color: MC.textPrimary },
  priorityTitleActive: { color: MC.primaryDark },
  priorityHint: { fontSize: 12, lineHeight: 18, color: MC.textSecondary },
  removeText: { fontSize: 13, fontWeight: "700", color: MC.error },
  attachmentButton: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: MC.infoBorder,
    backgroundColor: MC.infoSoft,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  attachmentButtonText: { fontSize: 14, fontWeight: "700", color: MC.primaryDark },
  attachmentCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.card,
    padding: 14,
    gap: 4,
  },
  attachmentName: { fontSize: 14, fontWeight: "700", color: MC.textPrimary },
  attachmentMeta: { fontSize: 12, color: MC.textMuted },
  helperText: { fontSize: 12, lineHeight: 18, color: MC.textSecondary },
  submitButton: {
    marginTop: 8,
    borderRadius: 18,
    backgroundColor: MC.primary,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
  },
  submitButtonDisabled: {
    backgroundColor: MC.textMuted,
  },
  submitButtonText: { color: MC.white, fontSize: 15, fontWeight: "800" },
});
