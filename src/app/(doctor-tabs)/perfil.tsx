import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon, type IconName } from "@/components/Icon";
import { NotificationBellButton } from "@/components/NotificationBellButton";
import { MC, themed } from "@/constants/theme";
import * as api from "@/services/api";
import { useAuthStore } from "@/stores/authStore";

export default function DoctorProfileScreen() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<api.DoctorDashboardData | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await api.getDoctorDashboard();
        if (!cancelled) {
          setData(response);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "No se pudo cargar el perfil del doctor.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogout() {
    await logout();
    router.replace("/(auth)/login");
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingWrap} edges={["top"]}>
        <ActivityIndicator size="large" color={MC.primary} />
      </SafeAreaView>
    );
  }

  const doctor = data?.doctor;
  const stats = data?.stats;
  const name = doctor?.name || "Doctor";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <NotificationBellButton />
          </View>
          <View style={styles.heroAvatar}>
            {doctor?.avatar_url ? (
              <Image source={{ uri: doctor.avatar_url }} style={styles.heroAvatarImage} />
            ) : (
              <Text style={styles.heroAvatarText}>{name.charAt(0).toUpperCase()}</Text>
            )}
          </View>
          <Text style={styles.heroTitle}>{name}</Text>
          <Text style={styles.heroSubtitle}>
            {doctor?.specialty || "Especialidad pendiente"}
          </Text>
          {doctor?.email ? <Text style={styles.heroMeta}>{doctor.email}</Text> : null}
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Icon name="warning" size={18} color={MC.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.metricsRow}>
          <MetricCard
            icon="star"
            label="Calificación"
            value={`${(stats?.avg_rating ?? 0).toFixed(1)}`}
          />
          <MetricCard
            icon="wallet"
            label="Mes"
            value={formatMoney(stats?.month_revenue ?? 0)}
          />
          <MetricCard
            icon="calendar"
            label="Semana"
            value={String(stats?.week_appts ?? 0)}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tu espacio de trabajo</Text>
          <View style={styles.shortcutsGrid}>
            <ShortcutCard
              icon="clipboard-text"
              title="Notas"
              summary="Crear y revisar notas clínicas."
              onPress={() => router.push("/doctor/notes" as any)}
            />
            <ShortcutCard
              icon="brain"
              title="Asistente IA"
              summary="Apoyo clínico con contexto de tus consultas."
              onPress={() => router.push("/ai/chat" as any)}
            />
            <ShortcutCard
              icon="list"
              title="Plantillas"
              summary="Biblioteca reusable para SOAP y planes."
              onPress={() => router.push("/doctor/consultation-templates" as any)}
            />
            <ShortcutCard
              icon="pill"
              title="Recetas"
              summary="Emitir y revisar recetas."
              onPress={() => router.push("/doctor/prescriptions" as any)}
            />
            <ShortcutCard
              icon="file"
              title="Documentos"
              summary="Abrir archivos por paciente."
              onPress={() => router.push("/doctor/documents" as any)}
            />
            <ShortcutCard
              icon="clock"
              title="Horarios"
              summary="Configurar disponibilidad."
              onPress={() => router.push("/doctor/availability" as any)}
            />
            <ShortcutCard
              icon="wallet"
              title="Finanzas"
              summary="Cobros e historial."
              onPress={() => router.push("/doctor/finanzas" as any)}
            />
            <ShortcutCard
              icon="gear"
              title="Apariencia"
              summary="Automático, claro u oscuro."
              onPress={() => router.push("/settings/appearance" as any)}
            />
            <ShortcutCard
              icon="gear"
              title="Perfil"
              summary="Tarifas, dirección y datos base."
              onPress={() => router.push("/doctor/settings" as any)}
            />
            <ShortcutCard
              icon="chat-circle-dots"
              title="Soporte"
              summary="Tickets y seguimiento con el equipo."
              onPress={() => router.push("/soporte" as any)}
            />
            <ShortcutCard
              icon="shield-check"
              title="Privacidad"
              summary="Consulta cómo tratamos y protegemos tus datos."
              onPress={() => void Linking.openURL("https://doctorcloud.digital/app/privacidad")}
            />
            <ShortcutCard
              icon="file"
              title="Términos"
              summary="Revisa las condiciones de uso de Doctor Cloud."
              onPress={() => void Linking.openURL("https://doctorcloud.digital/app/terminos")}
            />
            <ShortcutCard
              icon="trash"
              title="Eliminar cuenta"
              summary="Solicitar la eliminación de tu cuenta."
              onPress={() => router.push("/account/delete" as any)}
            />
          </View>
        </View>

        <Pressable style={styles.logoutButton} onPress={() => void handleLogout()}>
          <Icon name="sign-out" size={18} color={MC.error} />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricIcon}>
        <Icon name={icon} size={18} color={MC.primary} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function ShortcutCard({
  icon,
  title,
  summary,
  onPress,
}: {
  icon: IconName;
  title: string;
  summary: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.shortcutCard}>
      <View style={styles.shortcutIcon}>
        <Icon name={icon} size={18} color={MC.primaryDark} />
      </View>
      <Text style={styles.shortcutTitle}>{title}</Text>
      <Text style={styles.shortcutSummary}>{summary}</Text>
    </Pressable>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MC.background },
  loadingWrap: {
    flex: 1,
    backgroundColor: MC.background,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { padding: 16, paddingBottom: 36, gap: 16 },
  hero: {
    borderRadius: 24,
    backgroundColor: MC.primaryLight,
    borderWidth: 1,
    borderColor: themed("#C9ECE8", "#1F4C4A"),
    padding: 20,
    alignItems: "center",
    gap: 6,
  },
  heroTop: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  heroAvatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: MC.card,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  heroAvatarImage: { width: "100%", height: "100%" },
  heroAvatarText: {
    fontSize: 34,
    fontWeight: "700",
    color: MC.primaryDark,
  },
  heroTitle: { fontSize: 24, fontWeight: "700", color: MC.textPrimary },
  heroSubtitle: { fontSize: 15, color: MC.textSecondary },
  heroMeta: { fontSize: 13, color: MC.textMuted },
  errorBox: {
    borderRadius: 14,
    backgroundColor: MC.errorSoft,
    padding: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  errorText: { flex: 1, fontSize: 13, color: MC.error },
  metricsRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  metricCard: {
    flex: 1,
    minWidth: 100,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.card,
    padding: 14,
    gap: 6,
  },
  metricIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: MC.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  metricValue: { fontSize: 20, fontWeight: "700", color: MC.textPrimary },
  metricLabel: { fontSize: 12, color: MC.textSecondary },
  section: { gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: MC.textPrimary },
  shortcutsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  shortcutCard: {
    flexBasis: "47%",
    flexGrow: 1,
    minWidth: 150,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.card,
    padding: 16,
    gap: 10,
  },
  shortcutIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: MC.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  shortcutTitle: { fontSize: 15, fontWeight: "700", color: MC.textPrimary },
  shortcutSummary: { fontSize: 13, lineHeight: 19, color: MC.textSecondary },
  logoutButton: {
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: MC.errorBorder,
    backgroundColor: MC.errorSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  logoutText: { fontSize: 15, fontWeight: "700", color: MC.error },
});
