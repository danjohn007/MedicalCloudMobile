import { useRouter } from "expo-router";
import { useEffect, useState, type ComponentProps } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon } from "@/components/Icon";
import { MC } from "@/constants/theme";
import { useAuthStore } from "@/stores/authStore";

export default function GoogleRegisterScreen() {
  const router = useRouter();
  const { pendingGoogleSignup, clearPendingGoogleSignup } = useAuthStore();
  const [role, setRole] = useState<"doctor" | "patient" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!pendingGoogleSignup) {
      router.replace("/(auth)/login");
    }
  }, [pendingGoogleSignup, router]);

  if (!pendingGoogleSignup) {
    return null;
  }

  const handleContinue = () => {
    if (!role) {
      setError("Selecciona si deseas registrarte como doctor o paciente.");
      return;
    }

    setError("");
    router.push({
      pathname: "/(auth)/register-details",
      params: { role, google: "1" },
    });
  };

  const handleBack = () => {
    clearPendingGoogleSignup();
    router.replace("/(auth)/register");
  };

  const avatarLetter = pendingGoogleSignup.name.trim().charAt(0).toUpperCase() || "D";

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable style={styles.backBtn} onPress={handleBack} hitSlop={10}>
          <Icon name="arrow-left" size={24} color={MC.textPrimary} />
        </Pressable>

        <Text style={styles.title}>Cuenta de Google verificada</Text>
        <Text style={styles.subtitle}>
          Ahora elige como usaras DoctorCloud y te llevamos al formulario final.
        </Text>

        <View style={styles.accountCard}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarLetter}>{avatarLetter}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.accountName}>{pendingGoogleSignup.name}</Text>
            <Text style={styles.accountEmail}>{pendingGoogleSignup.email}</Text>
          </View>
        </View>

        {!!error ? (
          <View style={styles.errorBox}>
            <Icon name="warning" size={18} color="#B91C1C" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>Como quieres registrarte?</Text>
        <View style={styles.roleGrid}>
          <RoleCard
            title="Soy Paciente"
            description="Agendo citas, comparto mi código y reviso mi expediente."
            icon="heart"
            active={role === "patient"}
            onPress={() => setRole("patient")}
          />
          <RoleCard
            title="Soy Doctor"
            description="Gestiono pacientes, consultas y el flujo clinico desde la app."
            icon="stethoscope"
            active={role === "doctor"}
            onPress={() => setRole("doctor")}
          />
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.btnPrimary,
            pressed && { opacity: 0.88 },
            !role && { opacity: 0.7 },
          ]}
          onPress={handleContinue}
          disabled={!role}
        >
          <Text style={styles.btnText}>Continuar</Text>
        </Pressable>
      </ScrollView>
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
    <Pressable onPress={onPress} style={[styles.roleCard, active && styles.roleCardActive]}>
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
  scroll: { flexGrow: 1, padding: 24, gap: 18 },
  backBtn: { alignSelf: "flex-start" },
  title: { fontSize: 28, fontWeight: "700", color: MC.textPrimary },
  subtitle: { fontSize: 15, color: MC.textSecondary, lineHeight: 22 },
  accountCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: MC.white,
    borderWidth: 1,
    borderColor: MC.border,
    borderRadius: 18,
    padding: 16,
  },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: MC.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { color: MC.white, fontSize: 22, fontWeight: "700" },
  accountName: { color: MC.textPrimary, fontSize: 16, fontWeight: "700" },
  accountEmail: { color: MC.textSecondary, fontSize: 13, marginTop: 4 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    padding: 12,
  },
  errorText: { color: "#B91C1C", fontSize: 14, flex: 1 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: MC.primary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  roleGrid: { gap: 14 },
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
    marginTop: 4,
  },
  btnText: { color: MC.white, fontSize: 16, fontWeight: "700" },
});
