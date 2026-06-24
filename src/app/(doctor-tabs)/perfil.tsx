import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon, type IconName } from "@/components/Icon";
import { MC } from "@/constants/theme";
import {
  DOCTOR_APPOINTMENT_MODULES,
  DOCTOR_PROFILE_MODULES,
} from "@/constants/doctor-workspace";
import * as api from "@/services/api";

export default function DoctorProfileScreen() {
  const router = useRouter();
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
          <View style={styles.heroAvatar}>
            {doctor?.avatar_url ? (
              <Image source={{ uri: doctor.avatar_url }} style={styles.heroAvatarImage} />
            ) : (
              <Text style={styles.heroAvatarText}>{name.charAt(0).toUpperCase()}</Text>
            )}
          </View>
          <Text style={styles.heroTitle}>{name}</Text>
          <Text style={styles.heroSubtitle}>{doctor?.specialty || "Especialidad pendiente"}</Text>
          {doctor?.email ? <Text style={styles.heroMeta}>{doctor.email}</Text> : null}
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Icon name="warning" size={18} color={MC.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.metricsRow}>
          <MetricCard icon="star" label="Rating" value={`${(stats?.avg_rating ?? 0).toFixed(1)}`} />
          <MetricCard icon="wallet" label="Mes" value={formatMoney(stats?.month_revenue ?? 0)} />
          <MetricCard icon="calendar" label="Semana" value={String(stats?.week_appts ?? 0)} />
        </View>

        <Section title="Accesos directos">
          <View style={styles.shortcutsGrid}>
            <ShortcutCard
              icon="calendar"
              title="Agenda"
              summary="Abrir citas, estados y consulta activa."
              onPress={() => router.push("/(doctor-tabs)/citas" as any)}
            />
            <ShortcutCard
              icon="user-circle"
              title="Pacientes"
              summary="Entrar a snapshot, historial y recetas."
              onPress={() => router.push("/(doctor-tabs)/pacientes" as any)}
            />
            <ShortcutCard
              icon="pill"
              title="Recetas"
              summary="Ver el historial de recetas emitidas."
              onPress={() => router.push("/doctor/prescriptions" as any)}
            />
            <ShortcutCard
              icon="wallet"
              title="Finanzas"
              summary="Revisar cobros y movimientos del doctor."
              onPress={() => router.push("/doctor/finanzas" as any)}
            />
          </View>
        </Section>

        <Section title="Operacion disponible">
          {DOCTOR_APPOINTMENT_MODULES.map((module) => (
            <ModuleCard key={module.id} icon={module.icon} title={module.title} summary={module.summary} tone="brand" />
          ))}
        </Section>

        <Section title="Siguiente bloque">
          {DOCTOR_PROFILE_MODULES.map((module) => (
            <ModuleCard
              key={module.id}
              icon={module.icon}
              title={module.title}
              summary={module.summary}
              tone={module.status === "mobile-shell" ? "success" : "neutral"}
            />
          ))}
        </Section>

        <View style={styles.roadmapCard}>
          <Text style={styles.roadmapTitle}>Paridad que sigue pendiente</Text>
          <Text style={styles.roadmapText}>
            Ya quedo abierta la base para recetas y finanzas. El siguiente bloque grande contra web es disponibilidad con overrides, expediente completo con documentos, asistentes y firma o autosave de notas.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
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

function ModuleCard({
  icon,
  title,
  summary,
  tone,
}: {
  icon: IconName;
  title: string;
  summary: string;
  tone: "brand" | "success" | "neutral";
}) {
  const tones = {
    brand: { bg: MC.primaryLight, iconBg: MC.white, iconFg: MC.primaryDark, badge: "Disponible" },
    success: { bg: "#ECFDF5", iconBg: "#FFFFFFCC", iconFg: "#047857", badge: "Base lista" },
    neutral: { bg: MC.surface, iconBg: MC.white, iconFg: MC.textPrimary, badge: "En progreso" },
  }[tone];

  return (
    <View style={[styles.moduleCard, { backgroundColor: tones.bg }]}>
      <View style={[styles.moduleIcon, { backgroundColor: tones.iconBg }]}>
        <Icon name={icon} size={18} color={tones.iconFg} />
      </View>
      <View style={styles.moduleBody}>
        <View style={styles.moduleTitleRow}>
          <Text style={styles.moduleTitle}>{title}</Text>
          <View style={styles.moduleBadge}>
            <Text style={styles.moduleBadgeText}>{tones.badge}</Text>
          </View>
        </View>
        <Text style={styles.moduleSummary}>{summary}</Text>
      </View>
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
    borderColor: "#C9ECE8",
    padding: 20,
    alignItems: "center",
    gap: 6,
  },
  heroAvatar: {
    width: 82,
    height: 82,
    borderRadius: 28,
    backgroundColor: MC.white,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 6,
  },
  heroAvatarImage: { width: "100%", height: "100%" },
  heroAvatarText: { fontSize: 30, fontWeight: "700", color: MC.primaryDark },
  heroTitle: { fontSize: 24, fontWeight: "700", color: MC.textPrimary },
  heroSubtitle: { fontSize: 14, color: MC.textSecondary },
  heroMeta: { fontSize: 12, color: MC.textMuted },
  errorBox: {
    borderRadius: 14,
    backgroundColor: "#FEE2E2",
    padding: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  errorText: { flex: 1, color: MC.error, fontSize: 13 },
  metricsRow: { flexDirection: "row", gap: 10 },
  shortcutsGrid: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  shortcutCard: {
    width: "48%",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.white,
    padding: 14,
    gap: 8,
  },
  shortcutIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: MC.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  shortcutTitle: { fontSize: 15, fontWeight: "700", color: MC.textPrimary },
  shortcutSummary: { fontSize: 12, lineHeight: 18, color: MC.textSecondary },
  metricCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.white,
    padding: 14,
    gap: 4,
  },
  metricIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: MC.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  metricValue: { fontSize: 18, fontWeight: "700", color: MC.textPrimary },
  metricLabel: { fontSize: 12, color: MC.textSecondary },
  section: { gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: MC.textPrimary },
  sectionBody: { gap: 10 },
  moduleCard: {
    borderRadius: 20,
    padding: 14,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  moduleIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  moduleBody: { flex: 1, gap: 6 },
  moduleTitleRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  moduleTitle: { flex: 1, fontSize: 15, fontWeight: "700", color: MC.textPrimary },
  moduleBadge: {
    borderRadius: 999,
    backgroundColor: "#FFFFFFCC",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  moduleBadgeText: { fontSize: 11, fontWeight: "700", color: MC.textSecondary },
  moduleSummary: { fontSize: 13, lineHeight: 19, color: MC.textSecondary },
  roadmapCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.white,
    padding: 16,
    gap: 8,
  },
  roadmapTitle: { fontSize: 16, fontWeight: "700", color: MC.textPrimary },
  roadmapText: { fontSize: 13, lineHeight: 19, color: MC.textSecondary },
});
