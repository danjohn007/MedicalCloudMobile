import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Image,
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
import { NotificationBellButton } from "@/components/NotificationBellButton";
import { MC } from "@/constants/theme";
import * as api from "@/services/api";

const dateFmt = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default function DoctorPatientsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<api.DoctorPatientSummary[]>([]);

  useEffect(() => {
    void loadPatients();
  }, []);

  async function loadPatients(isRefresh = false) {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      setError("");
      const response = await api.getDoctorPatients();
      setPatients(response.data || []);
    } catch (e: any) {
      setError(e?.message || "No se pudieron cargar los pacientes.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const filteredPatients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return patients;

    return patients.filter((patient) =>
      [
        patient.name,
        patient.email,
        patient.phone,
        patient.city,
        patient.blood_type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [patients, query]);

  const allergyCount = patients.filter((patient) => !!patient.allergies).length;

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingWrap} edges={["top"]}>
        <ActivityIndicator size="large" color={MC.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadPatients(true)}
            tintColor={MC.primary}
          />
        }
      >
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <Text style={styles.heroEyebrow}>Mis pacientes</Text>
            <NotificationBellButton />
          </View>
          <Text style={styles.heroTitle}>Base clínica</Text>
          <Text style={styles.heroSubtitle}>
            Solo aparecen pacientes vinculados contigo por código, alta directa o una cita registrada contigo.
          </Text>
          <View style={styles.heroStats}>
            <HeroStat label="Pacientes" value={String(filteredPatients.length)} />
            <HeroStat label="Alertas" value={String(allergyCount)} />
          </View>
        </View>

        <Pressable
          style={styles.linkButton}
          onPress={() => router.push("/doctor/patients/link" as any)}
        >
          <Icon name="shield-check" size={16} color={MC.white} />
          <Text style={styles.linkButtonText}>Vincular o registrar paciente</Text>
        </Pressable>

        <View style={styles.searchBox}>
          <Icon name="magnifying-glass" size={18} color={MC.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar paciente, ciudad o sangre"
            placeholderTextColor={MC.textMuted}
            style={styles.searchInput}
          />
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Icon name="warning" size={18} color={MC.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.list}>
          {filteredPatients.length ? (
            filteredPatients.map((patient) => (
              <Pressable
                key={patient.id}
                onPress={() => router.push(`/doctor/patients/${patient.id}` as any)}
                style={styles.card}
              >
                <View style={styles.cardTop}>
                  <View style={styles.avatar}>
                    {patient.avatar_url ? (
                      <Image source={{ uri: patient.avatar_url }} style={styles.avatarImage} />
                    ) : (
                      <Text style={styles.avatarText}>
                        {patient.name.charAt(0).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={styles.name}>{patient.name}</Text>
                    <Text style={styles.meta}>{patient.email}</Text>
                    <Text style={styles.meta}>
                      {patient.city || "Sin ciudad"} | {patient.total_appointments} citas
                    </Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <InfoChip icon="phone" value={patient.phone || "Sin teléfono"} />
                  <InfoChip icon="drop" value={patient.blood_type || "Sangre s/d"} />
                  <InfoChip
                    icon="calendar"
                    value={
                      patient.last_appointment
                        ? `Última ${dateFmt.format(new Date(patient.last_appointment))}`
                        : "Sin citas"
                    }
                  />
                  <InfoChip
                    icon="clock"
                    value={patient.age != null ? `${patient.age} años` : "Edad s/d"}
                  />
                </View>

                {patient.allergies ? (
                  <View style={styles.warningCard}>
                    <Icon name="warning" size={14} color={MC.error} />
                    <Text style={styles.warningText}>{patient.allergies}</Text>
                  </View>
                ) : null}
              </Pressable>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No hay pacientes vinculados con esa búsqueda. Puedes agregarlos con su código personal o registrarlos directamente.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.heroStat}>
      <Text style={styles.heroStatValue}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

function InfoChip({
  icon,
  value,
}: {
  icon: "phone" | "drop" | "calendar" | "clock";
  value: string;
}) {
  return (
    <View style={styles.infoChip}>
      <Icon name={icon} size={13} color={MC.primaryDark} />
      <Text style={styles.infoChipText}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MC.background },
  loadingWrap: {
    flex: 1,
    backgroundColor: MC.background,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { padding: 16, paddingBottom: 36, gap: 14 },
  hero: {
    borderRadius: 24,
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
    padding: 18,
    gap: 8,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroEyebrow: { fontSize: 12, fontWeight: "700", color: "#6D28D9" },
  heroTitle: { fontSize: 28, fontWeight: "700", color: MC.textPrimary },
  heroSubtitle: { fontSize: 13, lineHeight: 19, color: MC.textSecondary },
  heroStats: { flexDirection: "row", gap: 10, marginTop: 4 },
  heroStat: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: "#FFFFFFD9",
    padding: 12,
  },
  heroStatValue: { fontSize: 18, fontWeight: "700", color: MC.textPrimary },
  heroStatLabel: { fontSize: 11, color: MC.textSecondary },
  searchBox: {
    borderWidth: 1,
    borderColor: MC.border,
    borderRadius: 16,
    backgroundColor: MC.surface,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 14,
    color: MC.textPrimary,
  },
  linkButton: {
    borderRadius: 18,
    backgroundColor: MC.primary,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  linkButtonText: { fontSize: 14, fontWeight: "800", color: MC.white },
  errorBox: {
    borderRadius: 14,
    backgroundColor: "#FEE2E2",
    padding: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  errorText: { flex: 1, color: MC.error, fontSize: 13 },
  list: { gap: 12 },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.white,
    padding: 14,
    gap: 12,
  },
  cardTop: { flexDirection: "row", gap: 12, alignItems: "center" },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: MC.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%" },
  avatarText: { fontSize: 20, fontWeight: "700", color: MC.primaryDark },
  cardBody: { flex: 1, gap: 3 },
  name: { fontSize: 15, fontWeight: "700", color: MC.textPrimary },
  meta: { fontSize: 12, color: MC.textSecondary },
  infoRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  infoChip: {
    borderRadius: 999,
    backgroundColor: MC.surface,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoChipText: { fontSize: 11, fontWeight: "700", color: MC.textSecondary },
  warningCard: {
    borderRadius: 14,
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  warningText: { flex: 1, fontSize: 12, color: MC.error },
  emptyState: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.surface,
    padding: 16,
  },
  emptyText: { fontSize: 13, color: MC.textSecondary },
});
