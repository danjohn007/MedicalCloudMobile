import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Icon } from "@/components/Icon";
import { MC } from "@/constants/theme";
import type { DoctorPatientSummary } from "@/services/api";

interface DoctorPatientPickerProps {
  patients: DoctorPatientSummary[];
  selectedPatientId: number | null;
  onSelectPatient: (patientId: number) => void;
  search: string;
  onChangeSearch: (value: string) => void;
  title?: string;
  subtitle?: string;
  limit?: number;
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function filterDoctorPatients(
  patients: DoctorPatientSummary[],
  search: string,
) {
  const needle = normalize(search.trim());

  const sorted = [...patients].sort((left, right) => {
    const byAppointments =
      (right.total_appointments || 0) - (left.total_appointments || 0);
    if (byAppointments !== 0) return byAppointments;

    const leftLast = left.last_appointment
      ? new Date(left.last_appointment).getTime()
      : 0;
    const rightLast = right.last_appointment
      ? new Date(right.last_appointment).getTime()
      : 0;

    return rightLast - leftLast;
  });

  if (!needle) return sorted;

  return sorted.filter((patient) =>
    [patient.name, patient.email, patient.phone, patient.city]
      .map((value) => normalize(String(value || "")))
      .some((value) => value.includes(needle)),
  );
}

export function DoctorPatientPicker({
  patients,
  selectedPatientId,
  onSelectPatient,
  search,
  onChangeSearch,
  title = "Selecciona paciente",
  subtitle = "Solo aparecen pacientes vinculados contigo.",
  limit = 6,
}: DoctorPatientPickerProps) {
  const filtered = filterDoctorPatients(patients, search);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <View style={styles.searchBox}>
        <Icon name="magnifying-glass" size={18} color={MC.textMuted} />
        <TextInput
          value={search}
          onChangeText={onChangeSearch}
          placeholder="Buscar paciente"
          placeholderTextColor={MC.textMuted}
          style={styles.searchInput}
        />
      </View>

      <View style={styles.list}>
        {filtered.slice(0, limit).map((patient) => {
          const active = patient.id === selectedPatientId;

          return (
            <Pressable
              key={patient.id}
              onPress={() => onSelectPatient(patient.id)}
              style={[styles.card, active && styles.cardActive]}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {patient.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.body}>
                <Text style={styles.name}>{patient.name}</Text>
                <Text style={styles.meta}>
                  {patient.city || "Ciudad pendiente"}
                  {patient.total_appointments
                    ? ` | ${patient.total_appointments} citas`
                    : ""}
                </Text>
              </View>
              {active ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Activo</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}

        {!filtered.length ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              No encontramos pacientes con esa búsqueda.
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  header: { gap: 4 },
  title: { fontSize: 16, fontWeight: "700", color: MC.textPrimary },
  subtitle: { fontSize: 13, color: MC.textSecondary, lineHeight: 20 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: MC.border,
    borderRadius: 18,
    backgroundColor: MC.white,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  searchInput: {
    flex: 1,
    minHeight: 46,
    fontSize: 15,
    color: MC.textPrimary,
  },
  list: { gap: 10 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: MC.border,
    borderRadius: 20,
    backgroundColor: MC.white,
    padding: 14,
  },
  cardActive: {
    borderColor: MC.primary,
    backgroundColor: MC.primaryLight,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#DFF7F4",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: MC.primaryDark,
  },
  body: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: "700", color: MC.textPrimary },
  meta: { fontSize: 12, color: MC.textSecondary },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: MC.white,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: MC.primaryDark,
  },
  empty: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: MC.border,
    borderStyle: "dashed",
    padding: 14,
  },
  emptyText: { fontSize: 13, color: MC.textSecondary, textAlign: "center" },
});
