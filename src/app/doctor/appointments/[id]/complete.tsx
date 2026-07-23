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

export default function DoctorAppointmentCompleteScreen() {
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

  async function handleComplete(force = false) {
    try {
      setSaving(true);
      setError("");
      const response = await api.completeDoctorAppointment(appointmentId, {
        checkout_code: code.trim().toUpperCase(),
        force,
      });
      Alert.alert("Consulta completada", response.message || "La cita ya quedó cerrada.");
      router.replace(`/doctor/appointments/${appointmentId}` as any);
    } catch (e: any) {
      setError(e?.message || "No se pudo cerrar la consulta.");
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
  const isPresential = appointment?.type === "presential";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Icon name="arrow-left" size={22} color={MC.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Cerrar consulta</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>Fin de consulta</Text>
          <Text style={styles.heroTitle}>{appointment?.patient_name || "Paciente"}</Text>
          <Text style={styles.heroSubtitle}>
            {isPresential
              ? "Para citas presenciales, válida el código de cierre del paciente antes de marcarla completada."
              : "En consultas virtuales puedes cerrarla directamente desde la app."}
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Icon name="warning" size={18} color={MC.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {isPresential ? (
          <>
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Código de cierre</Text>
              <Text style={styles.infoText}>
                El paciente lo genera desde su app cuando la consulta ya está en curso.
              </Text>
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Código del paciente</Text>
              <TextInput
                value={code}
                onChangeText={(value) => setCode(value.toUpperCase())}
                placeholder="Ej: QWE789"
                autoCapitalize="characters"
                maxLength={8}
                style={styles.fieldInput}
              />
            </View>

            <Pressable
              onPress={() => handleComplete(false)}
              disabled={saving}
              style={[styles.primaryButton, saving && styles.buttonDisabled]}
            >
              {saving ? (
                <ActivityIndicator color={MC.white} />
              ) : (
                <>
                  <Icon name="check-circle" size={18} color={MC.white} />
                  <Text style={styles.primaryButtonText}>Validar código y cerrar</Text>
                </>
              )}
            </Pressable>

            <Pressable
              onPress={() => handleComplete(true)}
              disabled={saving}
              style={[styles.secondaryButton, saving && styles.buttonDisabled]}
            >
              <Icon name="warning" size={18} color={MC.star} />
              <Text style={styles.secondaryButtonText}>Forzar cierre sin código</Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            onPress={() => handleComplete(false)}
            disabled={saving}
            style={[styles.primaryButton, saving && styles.buttonDisabled]}
          >
            {saving ? (
              <ActivityIndicator color={MC.white} />
            ) : (
              <>
                <Icon name="check-circle" size={18} color={MC.white} />
                <Text style={styles.primaryButtonText}>Completar consulta</Text>
              </>
            )}
          </Pressable>
        )}
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
    backgroundColor: MC.orangeSoft,
    borderWidth: 1,
    borderColor: MC.orangeBorder,
    gap: 6,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: MC.star,
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
  primaryButton: {
    borderRadius: 18,
    backgroundColor: MC.primary,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryButtonText: { fontSize: 15, fontWeight: "700", color: MC.white },
  secondaryButton: {
    borderRadius: 18,
    backgroundColor: MC.orangeSoft,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
    borderColor: MC.warningBorder,
  },
  secondaryButtonText: { fontSize: 15, fontWeight: "700", color: MC.star },
  buttonDisabled: { opacity: 0.6 },
});
