import { useRouter } from "expo-router";
import { useState, type ComponentProps } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GoogleLogo } from "@/components/GoogleLogo";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import { MC } from "@/constants/theme";
import { useAuthStore } from "@/stores/authStore";

export default function RegisterScreen() {
  const router = useRouter();
  const { loginWithGoogle } = useAuthStore();

  const [role, setRole] = useState<"doctor" | "patient" | null>(null);
  const [loadingMode, setLoadingMode] = useState<"email" | "google" | null>(null);
  const [error, setError] = useState("");

  const handleContinueWithEmail = () => {
    if (!role) {
      setError("Selecciona si deseas registrarte como doctor o paciente.");
      return;
    }

    setError("");
    router.push({
      pathname: "/(auth)/register-details",
      params: { role },
    });
  };

  const handleGoogleRegister = async () => {
    setLoadingMode("google");
    setError("");
    try {
      const result = await loginWithGoogle();
      if (result === "pending_profile") {
        router.replace("/(auth)/google-register");
        return;
      }
    } catch (e: any) {
      setError(e.message ?? "Error al registrarte con Google.");
    } finally {
      setLoadingMode(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={10}>
            <Icon name="arrow-left" size={24} color={MC.textPrimary} />
          </Pressable>

          <View style={styles.brandRow}>
            <Logo variant="icon-color" width={48} />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.appName}>
                <Text style={styles.appNameBold}>Doctor</Text> Cloud
              </Text>
              <Text style={styles.brandSub}>Elige como quieres usar tu cuenta</Text>
            </View>
          </View>

          <Text style={styles.title}>Crear cuenta</Text>
          <Text style={styles.subtitle}>
            Primero elige tu perfil y despues te llevamos al formulario correcto.
          </Text>

          {!!error ? (
            <View style={styles.errorBox}>
              <Icon name="warning" size={18} color="#B91C1C" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.roleGrid}>
            <RoleCard
              title="Soy Paciente"
              description="Agenda citas, comparte tu codigo y guarda tu historial clinico."
              icon="heart"
              active={role === "patient"}
              onPress={() => setRole("patient")}
            />
            <RoleCard
              title="Soy Doctor"
              description="Administra pacientes, consultas, notas SOAP y tu agenda."
              icon="stethoscope"
              active={role === "doctor"}
              onPress={() => setRole("doctor")}
            />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.btnPrimary,
              pressed && { opacity: 0.88 },
              (!role || loadingMode !== null) && { opacity: 0.7 },
            ]}
            onPress={handleContinueWithEmail}
            disabled={!role || loadingMode !== null}
          >
            {loadingMode === "email" ? (
              <ActivityIndicator color={MC.white} />
            ) : (
              <Text style={styles.btnText}>Continuar con correo</Text>
            )}
          </Pressable>

          <View style={styles.separatorRow}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>o</Text>
            <View style={styles.separatorLine} />
          </View>

          <Pressable
            style={({ pressed }) => [styles.btnGoogle, pressed && { opacity: 0.88 }]}
            onPress={handleGoogleRegister}
            disabled={loadingMode !== null}
          >
            {loadingMode === "google" ? (
              <ActivityIndicator color={MC.textPrimary} />
            ) : (
              <>
                <View style={styles.googleBadge}>
                  <GoogleLogo size={21} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.btnGoogleText}>Continuar con Google</Text>
                  <Text style={styles.btnGoogleHint}>
                    Primero verificamos tu cuenta y despues eliges el perfil final.
                  </Text>
                </View>
              </>
            )}
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Ya tienes cuenta? </Text>
            <Pressable onPress={() => router.replace("/(auth)/login")}>
              <Text style={styles.footerLink}>Inicia sesion</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function RoleCard({
  title,
  description,
  icon,
  active,
  onPress,
}: {
  title: string;
  description: string;
  icon: ComponentProps<typeof Icon>["name"];
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.roleCard, active && styles.roleCardActive]}
    >
      <View style={[styles.roleIcon, active && styles.roleIconActive]}>
        <Icon name={icon} size={20} color={active ? MC.primaryDark : MC.textMuted} />
      </View>
      <Text style={[styles.roleTitle, active && styles.roleTitleActive]}>{title}</Text>
      <Text style={styles.roleDescription}>{description}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MC.background },
  scroll: { flexGrow: 1, padding: 24 },
  backBtn: { marginBottom: 18, alignSelf: "flex-start" },
  brandRow: { flexDirection: "row", alignItems: "center", marginBottom: 26 },
  appName: { fontSize: 20, color: MC.textPrimary },
  appNameBold: { fontWeight: "700", color: MC.primary },
  brandSub: { fontSize: 12, color: MC.textSecondary },
  title: { fontSize: 28, fontWeight: "700", color: MC.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: 15, color: MC.textSecondary, marginBottom: 24, lineHeight: 22 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
  },
  errorText: { color: "#B91C1C", fontSize: 14, flex: 1 },
  roleGrid: { gap: 14, marginBottom: 22 },
  roleCard: {
    backgroundColor: MC.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: MC.border,
    padding: 18,
    gap: 10,
  },
  roleCardActive: {
    borderColor: MC.primary,
    backgroundColor: "#EAF8FB",
  },
  roleIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  roleIconActive: { backgroundColor: "#DDF6F4" },
  roleTitle: { fontSize: 18, fontWeight: "700", color: MC.textPrimary },
  roleTitleActive: { color: MC.primaryDark },
  roleDescription: { fontSize: 14, color: MC.textSecondary, lineHeight: 21 },
  btnPrimary: {
    backgroundColor: MC.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  btnText: { color: MC.white, fontSize: 16, fontWeight: "700" },
  separatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  separatorLine: { flex: 1, height: 1, backgroundColor: MC.border },
  separatorText: { color: MC.textMuted, fontSize: 14 },
  btnGoogle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: MC.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MC.border,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  googleBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  btnGoogleText: { color: MC.textPrimary, fontSize: 16, fontWeight: "700" },
  btnGoogleHint: { color: MC.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 2 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 22 },
  footerText: { color: MC.textSecondary, fontSize: 15 },
  footerLink: { color: MC.primary, fontSize: 15, fontWeight: "700" },
});
