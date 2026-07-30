import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
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
import { getNativeAppleIdentity } from "@/services/native-social-auth";
import { useAuthStore } from "@/stores/authStore";

export default function DeleteAccountScreen() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const requestDeletion = () => {
    Alert.alert(
      "¿Solicitar eliminación?",
      "Se desactivará tu cuenta, se cerrará tu sesión y se retirarán las notificaciones de este dispositivo. La eliminación final de información puede conservar datos que la ley exija resguardar.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Solicitar eliminación",
          style: "destructive",
          onPress: async () => {
            setSubmitting(true);
            try {
              const status = await api.getAccountDeletionStatus();
              let appleAuthorizationCode: string | undefined;
              if (status.requires_apple_reauth) {
                if (Platform.OS !== "ios") {
                  throw new Error(
                    "Abre DoctorCloud en tu dispositivo Apple para volver a autenticarte y revocar el acceso antes de eliminar la cuenta.",
                  );
                }
                const appleIdentity = await getNativeAppleIdentity();
                appleAuthorizationCode = appleIdentity.authorizationCode;
                if (!appleAuthorizationCode) {
                  throw new Error(
                    "Apple no devolvió la autorización necesaria. Intenta de nuevo.",
                  );
                }
              }
              const response = await api.requestAccountDeletion(
                reason,
                appleAuthorizationCode,
              );
              await logout();
              Alert.alert("Solicitud recibida", response.message, [
                { text: "Entendido", onPress: () => router.replace("/(auth)/login") },
              ]);
            } catch (error: any) {
              Alert.alert("No se pudo enviar", error?.message ?? "Intenta de nuevo más tarde.");
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Pressable style={styles.back} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Volver">
            <Icon name="arrow-left" size={22} color={MC.textPrimary} />
          </Pressable>

          <View style={styles.iconWrap}>
            <Icon name="warning" size={28} color={MC.error} />
          </View>
          <Text style={styles.title}>Eliminar cuenta</Text>
          <Text style={styles.description}>
            Esta acción inicia una solicitud de eliminación y desactiva de inmediato tu acceso y notificaciones.
          </Text>

          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Antes de continuar</Text>
            <Text style={styles.noticeText}>• No podrás usar la cuenta mientras la solicitud esté pendiente.</Text>
            <Text style={styles.noticeText}>• Algunos expedientes, citas o comprobantes pueden conservarse únicamente durante el plazo legal aplicable.</Text>
            <Text style={styles.noticeText}>• Si necesitas ayuda, contacta a soporte antes de solicitarla.</Text>
          </View>

          <Text style={styles.label}>Motivo (opcional)</Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="Cuéntanos cómo podemos mejorar"
            placeholderTextColor={MC.textMuted}
            multiline
            maxLength={500}
            style={styles.input}
            textAlignVertical="top"
          />

          <Pressable
            style={[styles.deleteButton, submitting && styles.disabled]}
            disabled={submitting}
            onPress={requestDeletion}
          >
            {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.deleteText}>Solicitar eliminación de cuenta</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: MC.background },
  content: { padding: 24, gap: 14 },
  back: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  iconWrap: { width: 60, height: 60, borderRadius: 30, backgroundColor: MC.errorSoft, justifyContent: "center", alignItems: "center", marginTop: 16 },
  title: { color: MC.textPrimary, fontSize: 25, fontWeight: "800", marginTop: 8 },
  description: { color: MC.textSecondary, fontSize: 15, lineHeight: 22 },
  notice: { backgroundColor: MC.errorSoft, borderColor: MC.errorBorder, borderWidth: 1, borderRadius: 14, padding: 16, gap: 7, marginTop: 8 },
  noticeTitle: { color: MC.error, fontSize: 16, fontWeight: "800" },
  noticeText: { color: MC.textSecondary, fontSize: 14, lineHeight: 20 },
  label: { color: MC.textPrimary, fontSize: 14, fontWeight: "700", marginTop: 8 },
  input: { minHeight: 112, borderWidth: 1, borderColor: MC.border, borderRadius: 14, color: MC.textPrimary, backgroundColor: MC.surface, padding: 14, fontSize: 15 },
  deleteButton: { minHeight: 52, borderRadius: 14, backgroundColor: MC.error, justifyContent: "center", alignItems: "center", paddingHorizontal: 16, marginTop: 10 },
  deleteText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800", textAlign: "center" },
  disabled: { opacity: 0.6 },
});
