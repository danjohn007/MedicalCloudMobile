import { useState } from "react";
import { BarcodeScanningResult, CameraView, useCameraPermissions } from "expo-camera";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon } from "@/components/Icon";
import { MC } from "@/constants/theme";
import { normalizeAppointmentCode } from "@/utils/appointmentCodes";

type AppointmentQrScannerProps = {
  visible: boolean;
  title: string;
  hint: string;
  onClose: () => void;
  onCodeScanned: (code: string) => void;
};

export function AppointmentQrScanner({
  visible,
  title,
  hint,
  onClose,
  onCodeScanned,
}: AppointmentQrScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [requestingPermission, setRequestingPermission] = useState(false);
  const [scanLocked, setScanLocked] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [feedback, setFeedback] = useState("");

  if (!visible) {
    return null;
  }

  const close = () => {
    setScanLocked(false);
    setTorchEnabled(false);
    setFeedback("");
    onClose();
  };

  const askForPermission = async () => {
    try {
      setRequestingPermission(true);
      setFeedback("");
      const response = await requestPermission();
      if (!response.granted) {
        setFeedback("No se concedió acceso a la cámara. Aún puedes ingresar el código manualmente.");
      }
    } finally {
      setRequestingPermission(false);
    }
  };

  const handleBarcodeScanned = ({ data }: BarcodeScanningResult) => {
    if (scanLocked) {
      return;
    }

    setScanLocked(true);
    const code = normalizeAppointmentCode(data);
    if (!code) {
      setFeedback("Ese QR no contiene un código válido de Doctor Cloud de 6 caracteres.");
      return;
    }

    setFeedback(`Código ${code} detectado.`);
    onCodeScanned(code);
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={close}
      presentationStyle="fullScreen"
      visible={visible}
    >
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Pressable onPress={close} hitSlop={10} accessibilityLabel="Cerrar escáner">
            <Icon name="x" size={24} color={MC.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.content}>
          <Text style={styles.hint}>{hint}</Text>

          {!permission ? (
            <View style={styles.permissionCard}>
              <ActivityIndicator color={MC.primary} />
              <Text style={styles.permissionText}>Comprobando permiso de cámara…</Text>
            </View>
          ) : permission.granted ? (
            <>
              <View style={styles.cameraFrame}>
                <CameraView
                  barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                  enableTorch={torchEnabled}
                  facing="back"
                  onBarcodeScanned={scanLocked ? undefined : handleBarcodeScanned}
                  style={StyleSheet.absoluteFill}
                />
                <View pointerEvents="none" style={styles.target}>
                  <View style={styles.targetInner} />
                </View>
              </View>

              <View style={styles.cameraActions}>
                <Pressable
                  onPress={() => setTorchEnabled((current) => !current)}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>
                    {torchEnabled ? "Apagar luz" : "Encender luz"}
                  </Text>
                </Pressable>

                {scanLocked ? (
                  <Pressable
                    onPress={() => {
                      setScanLocked(false);
                      setFeedback("");
                    }}
                    style={styles.secondaryButton}
                  >
                    <Icon name="arrow-clockwise" size={18} color={MC.primary} />
                    <Text style={styles.secondaryButtonText}>Escanear de nuevo</Text>
                  </Pressable>
                ) : null}
              </View>
            </>
          ) : (
            <View style={styles.permissionCard}>
              <Icon name="video-camera" size={42} color={MC.primary} />
              <Text style={styles.permissionTitle}>Permiso de cámara</Text>
              <Text style={styles.permissionText}>
                La cámara se usa únicamente cuando decides escanear el QR de esta cita. No se
                graba ni se guarda video.
              </Text>

              {permission.canAskAgain ? (
                <Pressable
                  disabled={requestingPermission}
                  onPress={askForPermission}
                  style={[styles.primaryButton, requestingPermission && styles.buttonDisabled]}
                >
                  {requestingPermission ? (
                    <ActivityIndicator color={MC.white} />
                  ) : (
                    <Text style={styles.primaryButtonText}>Permitir cámara</Text>
                  )}
                </Pressable>
              ) : (
                <Pressable onPress={() => Linking.openSettings()} style={styles.primaryButton}>
                  <Text style={styles.primaryButtonText}>Abrir configuración</Text>
                </Pressable>
              )}
            </View>
          )}

          {feedback ? (
            <View style={styles.feedback}>
              <Icon
                name={feedback.startsWith("Código ") ? "check-circle" : "warning"}
                size={18}
                color={feedback.startsWith("Código ") ? MC.success : MC.error}
              />
              <Text style={styles.feedbackText}>{feedback}</Text>
            </View>
          ) : null}

          <Text style={styles.manualHint}>
            Si la cámara no puede leerlo, cierra el escáner e ingresa los 6 caracteres que aparecen
            debajo del QR.
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MC.background },
  header: {
    alignItems: "center",
    borderBottomColor: MC.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  headerTitle: { color: MC.textPrimary, fontSize: 18, fontWeight: "700" },
  headerSpacer: { width: 24 },
  content: { flex: 1, gap: 16, padding: 18 },
  hint: { color: MC.textSecondary, fontSize: 14, lineHeight: 21, textAlign: "center" },
  cameraFrame: {
    aspectRatio: 1,
    backgroundColor: MC.textPrimary,
    borderRadius: 24,
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  target: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  targetInner: {
    aspectRatio: 1,
    borderColor: MC.white,
    borderRadius: 20,
    borderWidth: 3,
    width: "68%",
  },
  cameraActions: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" },
  permissionCard: {
    alignItems: "center",
    backgroundColor: MC.card,
    borderColor: MC.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    padding: 24,
  },
  permissionTitle: { color: MC.textPrimary, fontSize: 18, fontWeight: "700" },
  permissionText: { color: MC.textSecondary, fontSize: 13, lineHeight: 20, textAlign: "center" },
  primaryButton: {
    alignItems: "center",
    backgroundColor: MC.primary,
    borderRadius: 14,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 22,
    width: "100%",
  },
  primaryButtonText: { color: MC.white, fontSize: 15, fontWeight: "700" },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: MC.primaryLight,
    borderColor: MC.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 16,
  },
  secondaryButtonText: { color: MC.primary, fontSize: 14, fontWeight: "700" },
  buttonDisabled: { opacity: 0.6 },
  feedback: {
    alignItems: "center",
    backgroundColor: MC.card,
    borderColor: MC.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    padding: 12,
  },
  feedbackText: { color: MC.textPrimary, flex: 1, fontSize: 13 },
  manualHint: { color: MC.textMuted, fontSize: 12, lineHeight: 18, textAlign: "center" },
});
