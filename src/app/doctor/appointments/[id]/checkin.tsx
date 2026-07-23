import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
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

export default function DoctorAppointmentCheckinScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const appointmentId = Number(Array.isArray(params.id) ? params.id[0] : params.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<api.DoctorAppointmentDetailData | null>(null);
  const [code, setCode] = useState("");

  useEffect(() => {
    if (!Number.isFinite(appointmentId) || appointmentId <= 0) {
      setError("Cita invalida.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await api.getDoctorAppointmentDetail(appointmentId);
        if (!cancelled) {
          setDetail(response);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "No se pudo cargar la cita.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [appointmentId]);

  async function handleCheckin() {
    const normalized = code.trim().toUpperCase();
    if (normalized.length < 4) {
      Alert.alert("Código requerido", "Ingresa el código de check-in del paciente.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      const response = await api.doctorCheckinAppointment(appointmentId, normalized);
      Alert.alert("Check-in listo", response.message || "La consulta fue iniciada.");
      router.replace(`/doctor/appointments/${appointmentId}/soap` as any);
    } catch (e: any) {
      setError(e?.message || "No se pudo registrar el check-in.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingWrap} edges={["top"]}>
        <ActivityIndicator size="large" color={MC.primary} />
      </SafeAreaView>
    );
  }

  const appointment = detail?.data ?? null;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Icon name="arrow-left" size={22} color={MC.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Check-in</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>Consulta presencial</Text>
          <Text style={styles.heroTitle}>{appointment?.patient_name || "Paciente"}</Text>
          <Text style={styles.heroSubtitle}>
            Pide al paciente el código que ve en su app para registrar su llegada e iniciar la consulta.
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Icon name="warning" size={18} color={MC.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Cómo funciona</Text>
          <Text style={styles.infoText}>
            1. El paciente abre su módulo de check-in.
          </Text>
          <Text style={styles.infoText}>
            2. Te comparte el código de 6 caracteres.
          </Text>
          <Text style={styles.infoText}>
            3. Tú lo capturas aquí y la cita pasa a en consulta.
          </Text>
        </View>

        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>Código de check-in</Text>
          <TextInput
            value={code}
            onChangeText={(value) => setCode(value.toUpperCase())}
            placeholder="Ej: ABC123"
            autoCapitalize="characters"
            maxLength={8}
            style={styles.fieldInput}
          />
        </View>

        <Pressable
          onPress={handleCheckin}
          disabled={saving}
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        >
          {saving ? (
            <ActivityIndicator color={MC.white} />
          ) : (
            <>
              <Icon name="check-circle" size={18} color={MC.white} />
              <Text style={styles.saveButtonText}>Registrar check-in e iniciar</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
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
  content: { padding: 16, paddingBottom: 36, gap: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: MC.textPrimary },
  headerSpacer: { width: 22 },
  hero: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: MC.infoSoft,
    borderWidth: 1,
    borderColor: MC.infoBorder,
    gap: 6,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: MC.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroTitle: { fontSize: 24, fontWeight: "700", color: MC.textPrimary },
  heroSubtitle: { fontSize: 13, lineHeight: 20, color: MC.textSecondary },
  errorBox: {
    borderRadius: 14,
    backgroundColor: MC.errorSoft,
    padding: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  errorText: { flex: 1, color: MC.error, fontSize: 13 },
  infoCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.card,
    padding: 16,
    gap: 8,
  },
  infoTitle: { fontSize: 16, fontWeight: "700", color: MC.textPrimary },
  infoText: { fontSize: 13, lineHeight: 20, color: MC.textSecondary },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: MC.textPrimary },
  fieldInput: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.card,
    paddingHorizontal: 14,
    paddingVertical: 16,
    fontSize: 22,
    letterSpacing: 4,
    color: MC.textPrimary,
    textAlign: "center",
    fontWeight: "800",
  },
  saveButton: {
    borderRadius: 18,
    backgroundColor: MC.primary,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { fontSize: 15, fontWeight: "700", color: MC.white },
});
