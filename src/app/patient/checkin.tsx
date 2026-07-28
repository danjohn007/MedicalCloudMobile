import { useCallback, useEffect, useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import QRCode from "react-native-qrcode-svg";
import { Icon } from "@/components/Icon";
import { MC } from "@/constants/theme";
import * as api from "@/services/api";

export default function CheckinScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [qrData, setQrData] = useState<api.AppointmentQrData | null>(null);
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkoutCode, setCheckoutCode] = useState<string | null>(null);

  const loadQr = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
        setError("");
      }
      const result = await api.getAppointmentQr(Number(id));
      setQrData(result.data);
      setCheckedIn(result.data.checked_in);
      setCheckoutCode(result.data.checkout_code);
    } catch (e: any) {
      if (showLoader) {
        setError(e.message ?? "Error al cargar los códigos de la consulta");
      }
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) void loadQr();
  }, [id, loadQr]);

  useEffect(() => {
    if (!id || checkedIn) return;
    const timer = setInterval(() => {
      void loadQr(false);
    }, 5000);
    return () => clearInterval(timer);
  }, [checkedIn, id, loadQr]);

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

  const code = qrData?.checkin_code;

  return (
    <SafeAreaView style={s.ct} edges={["top"]}>
      <View style={s.hdr}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Icon name="arrow-left" size={22} color={MC.textPrimary} />
        </Pressable>
        <Text style={s.hdrTitle}>{checkedIn ? "Cierre de consulta" : "Inicio de consulta"}</Text>
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
              <Text style={s.checkinDoneTitle}>Consulta iniciada</Text>
              <Text style={s.checkinDoneText}>El doctor ya validó tu código de inicio.</Text>
            </View>

            {checkoutCode ? (
              <View style={s.codeCard}>
                <Text style={s.codeTitle}>Código de cierre</Text>
                <View style={s.checkoutQrWrap}>
                  <QRCode value={checkoutCode} size={220} color={MC.primary} />
                </View>
                <Text style={s.codeBig}>{checkoutCode}</Text>
                <Text style={s.codeHint}>
                  El doctor puede escanear este QR o ingresar los 6 caracteres para finalizar la
                  consulta.
                </Text>
              </View>
            ) : (
              <Pressable style={s.checkoutBtn} onPress={handleRequestCheckout}>
                <Icon name="check" size={20} color={MC.white} />
                <Text style={s.checkoutBtnText}>Generar código de cierre</Text>
              </Pressable>
            )}
          </>
        ) : (
          <>
            <View style={s.qrCard}>
              {code ? (
                <View style={s.qrCodeWrap}>
                  <QRCode value={code} size={220} color={MC.primary} />
                </View>
              ) : (
                <View style={s.qrBox}>
                  <Text style={s.qrCodeDisplay}>------</Text>
                </View>
              )}
              <Text style={s.qrTitle}>Tu QR de inicio</Text>
              {code ? (
                <>
                  <Text style={s.codeBig}>{code}</Text>
                  <Text style={s.qrSubtitle}>
                    Muestra este QR o los 6 caracteres al doctor. Solo él o su asistente pueden
                    validarlos para iniciar la consulta.
                  </Text>
                </>
              ) : (
                <Text style={s.qrSubtitle}>
                  {qrData?.checkin_window === "expired"
                    ? "La ventana para iniciar esta consulta ya terminó."
                    : "El QR de inicio estará disponible 2 horas antes de tu cita."}
                </Text>
              )}
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
  errBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: MC.errorSoft, padding: 12, borderRadius: 10, marginBottom: 12 },
  errTxt: { color: MC.error, fontSize: 13, flex: 1 },

  // QR Card
  qrCard: { alignItems: "center", padding: 32, backgroundColor: MC.background, borderRadius: 20, borderWidth: 1, borderColor: MC.border, marginBottom: 16 },
  qrBox: { backgroundColor: MC.primaryLight, borderRadius: 16, paddingHorizontal: 24, paddingVertical: 16, marginBottom: 12, borderWidth: 2, borderColor: MC.primary, borderStyle: 'dashed' },
  qrCodeWrap: { marginBottom: 12, padding: 12, backgroundColor: "#FFFFFF", borderRadius: 12, borderWidth: 1, borderColor: MC.border },
  qrCodeDisplay: { fontSize: 42, fontWeight: "900", color: MC.primary, letterSpacing: 12, textAlign: 'center' },
  qrTitle: { fontSize: 16, fontWeight: "700", color: MC.textPrimary, marginTop: 16, marginBottom: 8 },
  qrSubtitle: { fontSize: 13, color: MC.textSecondary, textAlign: "center", marginBottom: 8 },

  // Checked in
  checkinDone: { alignItems: "center", padding: 32, marginBottom: 16 },
  checkinDoneTitle: { fontSize: 20, fontWeight: "700", color: MC.textPrimary, marginTop: 12 },
  checkinDoneText: { fontSize: 14, color: MC.textSecondary, marginTop: 4 },

  // Checkout
  checkoutBtn: { flexDirection: "row", backgroundColor: MC.success, paddingVertical: 16, borderRadius: 12, alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16 },
  checkoutBtnText: { fontSize: 16, fontWeight: "700", color: MC.white },
  codeCard: { backgroundColor: MC.primaryLight, borderRadius: 16, padding: 20, alignItems: "center", marginBottom: 16 },
  codeTitle: { fontSize: 14, fontWeight: "700", color: MC.textSecondary, marginBottom: 8 },
  checkoutQrWrap: { backgroundColor: MC.white, borderRadius: 12, borderWidth: 1, borderColor: MC.border, marginBottom: 16, padding: 12 },
  codeBig: { fontSize: 32, fontWeight: "800", color: MC.primary, letterSpacing: 6, marginBottom: 8 },
  codeHint: { fontSize: 12, color: MC.textSecondary, textAlign: "center" },
});
