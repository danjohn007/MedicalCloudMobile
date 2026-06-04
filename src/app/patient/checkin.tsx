import { useEffect, useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/components/Icon";
import { MC } from "@/constants/theme";
import * as api from "@/services/api";

export default function CheckinScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [qrData, setQrData] = useState<api.ExpedienteData | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkoutCode, setCheckoutCode] = useState<string | null>(null);

  useEffect(() => {
    if (id) loadQr();
  }, [id]);

  const loadQr = async () => {
    try {
      setLoading(true);
      setError("");
      const result = await api.getAppointmentQr(Number(id));
      setQrData(result as any);
      setCheckedIn(result.data.checked_in);
      setCheckoutCode(result.data.checkout_code);
    } catch (e: any) {
      setError(e.message ?? "Error al cargar QR");
    } finally { setLoading(false); }
  };

  const handleManualCheckin = async () => {
    const code = manualCode.trim().toUpperCase();
    if (!code || code.length < 4) {
      Alert.alert("Error", "Ingresa el código de check-in de 6 caracteres.");
      return;
    }
    try {
      setCheckingIn(true);
      const result = await api.checkinAppointment(Number(id), code);
      setCheckedIn(true);
      Alert.alert("¡Check-in exitoso!", result.message);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Error al hacer check-in");
    } finally { setCheckingIn(false); }
  };

  const handleRequestCheckout = async () => {
    try {
      const result = await api.checkoutAppointment(Number(id));
      setCheckoutCode(result.data.checkout_code);
      Alert.alert("Código generado", `Comparte este código con tu doctor: ${result.data.checkout_code}`);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Error al generar código de cierre");
    }
  };

  if (loading) return (
    <SafeAreaView style={s.ct} edges={["top"]}>
      <View style={s.center}><ActivityIndicator size="large" color={MC.primary} /></View>
    </SafeAreaView>
  );

  const code = (qrData as any)?.data?.checkin_code;

  return (
    <SafeAreaView style={s.ct} edges={["top"]}>
      <View style={s.hdr}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Icon name="arrow-left" size={22} color={MC.textPrimary} />
        </Pressable>
        <Text style={s.hdrTitle}>Check-in</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollCt}>
        {error ? (
          <View style={s.errBox}><Icon name="warning" size={16} color={MC.error} /><Text style={s.errTxt}>{error}</Text></View>
        ) : null}

        {checkedIn ? (
          <>
            <View style={s.checkinDone}>
              <Icon name="check-circle" size={60} color={MC.success} />
              <Text style={s.checkinDoneTitle}>¡Check-in completado!</Text>
              <Text style={s.checkinDoneText}>Ya estás registrado en consulta.</Text>
            </View>

            {checkoutCode ? (
              <View style={s.codeCard}>
                <Text style={s.codeTitle}>Código de cierre</Text>
                <Text style={s.codeBig}>{checkoutCode}</Text>
                <Text style={s.codeHint}>Comparte este código con tu doctor para finalizar la consulta.</Text>
              </View>
            ) : (
              <Pressable style={s.checkoutBtn} onPress={handleRequestCheckout}>
                <Icon name="check" size={20} color={MC.white} />
                <Text style={s.checkoutBtnText}>Solicitar cierre de consulta</Text>
              </Pressable>
            )}
          </>
        ) : (
          <>
            {/* QR-style code display */}
            <View style={s.qrCard}>
              <Icon name="share-network" size={64} color={MC.primary} />
              <Text style={s.qrTitle}>Tu código de check-in</Text>
              {code ? (
                <>
                  <Text style={s.qrCode}>{code}</Text>
                  <Text style={s.qrHint}>Muestra este código al doctor para registrarte.</Text>
                </>
              ) : (
                <Text style={s.qrHint}>El código estará disponible 2 horas antes de tu cita.</Text>
              )}
            </View>

            {/* Manual entry */}
            <View style={s.manualCard}>
              <Text style={s.manualTitle}>¿No puedes mostrar el código?</Text>
              <Text style={s.manualHint}>Ingresa manualmente el código que te proporcionó el doctor.</Text>
              <TextInput
                style={s.manualInput}
                value={manualCode}
                onChangeText={setManualCode}
                placeholder="Ej: ABC123"
                autoCapitalize="characters"
                maxLength={6}
              />
              <Pressable style={[s.manualBtn, checkingIn && { opacity: 0.6 }]} onPress={handleManualCheckin} disabled={checkingIn}>
                {checkingIn ? (
                  <ActivityIndicator color={MC.white} size="small" />
                ) : (
                  <Text style={s.manualBtnText}>Check-in manual</Text>
                )}
              </Pressable>
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  ct: { flex: 1, backgroundColor: MC.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  hdr: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: MC.border },
  hdrTitle: { fontSize: 18, fontWeight: "700", color: MC.textPrimary },
  scroll: { flex: 1 }, scrollCt: { padding: 16 },
  errBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FEE2E2", padding: 12, borderRadius: 10, marginBottom: 12 },
  errTxt: { color: MC.error, fontSize: 13, flex: 1 },

  // QR Card
  qrCard: { alignItems: "center", padding: 32, backgroundColor: MC.background, borderRadius: 20, borderWidth: 1, borderColor: MC.border, marginBottom: 16 },
  qrTitle: { fontSize: 16, fontWeight: "700", color: MC.textPrimary, marginTop: 16, marginBottom: 8 },
  qrCode: { fontSize: 36, fontWeight: "800", color: MC.primary, letterSpacing: 8, marginBottom: 8 },
  qrHint: { fontSize: 13, color: MC.textSecondary, textAlign: "center" },

  // Manual entry
  manualCard: { backgroundColor: MC.background, borderRadius: 16, borderWidth: 1, borderColor: MC.border, padding: 20, marginBottom: 16 },
  manualTitle: { fontSize: 15, fontWeight: "700", color: MC.textPrimary, marginBottom: 4 },
  manualHint: { fontSize: 12, color: MC.textSecondary, marginBottom: 12 },
  manualInput: { borderWidth: 1, borderColor: MC.border, borderRadius: 12, padding: 14, fontSize: 20, textAlign: "center", letterSpacing: 4, fontWeight: "700", textTransform: "uppercase", marginBottom: 12 },
  manualBtn: { backgroundColor: MC.primary, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  manualBtnText: { fontSize: 15, fontWeight: "700", color: MC.white },

  // Checked in
  checkinDone: { alignItems: "center", padding: 32, marginBottom: 16 },
  checkinDoneTitle: { fontSize: 20, fontWeight: "700", color: MC.textPrimary, marginTop: 12 },
  checkinDoneText: { fontSize: 14, color: MC.textSecondary, marginTop: 4 },

  // Checkout
  checkoutBtn: { flexDirection: "row", backgroundColor: MC.success, paddingVertical: 16, borderRadius: 12, alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16 },
  checkoutBtnText: { fontSize: 16, fontWeight: "700", color: MC.white },
  codeCard: { backgroundColor: MC.primaryLight, borderRadius: 16, padding: 20, alignItems: "center", marginBottom: 16 },
  codeTitle: { fontSize: 14, fontWeight: "700", color: MC.textSecondary, marginBottom: 8 },
  codeBig: { fontSize: 32, fontWeight: "800", color: MC.primary, letterSpacing: 6, marginBottom: 8 },
  codeHint: { fontSize: 12, color: MC.textSecondary, textAlign: "center" },
});