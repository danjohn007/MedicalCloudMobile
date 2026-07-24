import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon } from "@/components/Icon";
import { MC } from "@/constants/theme";
import * as api from "@/services/api";
import { useAuthStore } from "@/stores/authStore";

export default function SubscriptionRequiredScreen() {
  const router = useRouter();
  const { feature } = useLocalSearchParams<{ feature?: string }>();
  const logout = useAuthStore((state) => state.logout);
  const [access, setAccess] = useState<api.DoctorMobileAccess | null>(null);

  useEffect(() => {
    void api.getDoctorMobileAccess().then(({ data }) => setAccess(data)).catch(() => {});
  }, []);

  const featureLabel: Record<string, string> = {
    ai_assistant: "el asistente IA",
    soap_notes: "las notas SOAP",
    prescriptions: "las recetas digitales",
    video_consult: "la videoconsulta",
    analytics: "las analíticas",
  };
  const message = feature && featureLabel[feature]
    ? `Tu plan actual no incluye ${featureLabel[feature]}. Actualiza tu suscripción para continuar.`
    : access?.message || "Necesitas una suscripción activa con acceso a la app móvil para usar el workspace del doctor.";
  const plansUrl = access?.upgrade_url || "https://doctorcloud.digital/app/billing/plans";

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.content}>
        <View style={styles.iconWrap}><Icon name="lock" size={34} color={MC.primary} /></View>
        <Text style={styles.title}>{feature ? "Módulo no incluido" : "Acceso móvil no incluido"}</Text>
        <Text style={styles.description}>{message}</Text>
        <Text style={styles.detail}>Para entrar al workspace del doctor, elige o actualiza un plan con acceso a la app móvil.</Text>

        <Pressable style={styles.primary} onPress={() => void Linking.openURL(plansUrl)}>
          <Text style={styles.primaryText}>Ver planes y suscripciones</Text>
          <Icon name="arrow-right" size={18} color={MC.white} />
        </Pressable>
        <Pressable
          style={styles.secondary}
          onPress={() => void logout().then(() => router.replace("/(auth)/login"))}
        >
          <Text style={styles.secondaryText}>Cerrar sesión</Text>
        </Pressable>
        {!access ? <ActivityIndicator style={styles.loader} color={MC.primary} /> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MC.background },
  content: { flex: 1, padding: 28, justifyContent: "center", alignItems: "center" },
  iconWrap: { width: 76, height: 76, borderRadius: 38, alignItems: "center", justifyContent: "center", backgroundColor: MC.primaryLight, marginBottom: 22 },
  title: { color: MC.textPrimary, fontSize: 25, fontWeight: "800", textAlign: "center" },
  description: { color: MC.textSecondary, fontSize: 16, lineHeight: 24, textAlign: "center", marginTop: 14 },
  detail: { color: MC.textMuted, fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 14, marginBottom: 30 },
  primary: { minHeight: 54, width: "100%", maxWidth: 360, borderRadius: 14, backgroundColor: MC.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  primaryText: { color: MC.white, fontSize: 16, fontWeight: "800" },
  secondary: { marginTop: 20, padding: 12 },
  secondaryText: { color: MC.textSecondary, fontSize: 15, fontWeight: "700" },
  loader: { marginTop: 18 },
});
