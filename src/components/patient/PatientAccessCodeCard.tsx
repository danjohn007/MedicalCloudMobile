import { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

import { Icon } from "@/components/Icon";
import { MC } from "@/constants/theme";

interface PatientAccessCodeCardProps {
  code?: string | null;
  hint?: string;
  onOpenProfile?: () => void;
  style?: ViewStyle;
  title?: string;
}

export function PatientAccessCodeCard({
  code,
  hint,
  onOpenProfile,
  style,
  title = "Codigo personal",
}: PatientAccessCodeCardProps) {
  const [visible, setVisible] = useState(false);
  const safeCode = (code || "").trim();
  const maskedCode = useMemo(() => {
    const length = Math.max(safeCode.length, 8);
    return "•".repeat(length);
  }, [safeCode]);

  const displayCode = safeCode ? (visible ? safeCode : maskedCode) : "Pendiente";

  async function handleShare() {
    if (!safeCode) {
      Alert.alert("Codigo pendiente", "Tu codigo todavia no esta disponible.");
      return;
    }

    try {
      await Share.share({
        message: `Mi codigo personal de Doctor Cloud es: ${safeCode}`,
      });
    } catch {
      Alert.alert("No se pudo compartir", "Intenta de nuevo en unos momentos.");
    }
  }

  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Icon name="shield-check" size={18} color={MC.primaryDark} />
        </View>
        <View style={styles.headerBody}>
          <Text style={styles.eyebrow}>{title}</Text>
          <Text style={styles.subtitle}>
            Compartelo solo con doctores que deban enlazarte o revisar tu expediente.
          </Text>
        </View>
      </View>

      <View style={styles.codeBox}>
        <Text style={styles.codeLabel}>CODIGO DE ACCESO</Text>
        <Text style={styles.codeValue}>{displayCode}</Text>
        <Text style={styles.hint}>
          {hint ||
            "Los doctores independientes necesitan este codigo o una cita contigo para ver tu expediente completo."}
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={[styles.secondaryButton, !safeCode && styles.disabledButton]}
          onPress={() => setVisible((current) => !current)}
          disabled={!safeCode}
        >
          <Icon name="eye" size={15} color={safeCode ? MC.primaryDark : MC.textMuted} />
          <Text style={[styles.secondaryButtonText, !safeCode && styles.disabledText]}>
            {visible ? "Ocultar" : "Mostrar"}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.secondaryButton, !safeCode && styles.disabledButton]}
          onPress={handleShare}
          disabled={!safeCode}
        >
          <Icon
            name="share-network"
            size={15}
            color={safeCode ? MC.primaryDark : MC.textMuted}
          />
          <Text style={[styles.secondaryButtonText, !safeCode && styles.disabledText]}>
            Compartir
          </Text>
        </Pressable>

        {onOpenProfile ? (
          <Pressable style={styles.primaryButton} onPress={onOpenProfile}>
            <Text style={styles.primaryButtonText}>Ver perfil</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    padding: 16,
    gap: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  headerBody: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    color: MC.primaryDark,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  subtitle: {
    color: MC.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  codeBox: {
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.78)",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    padding: 14,
    gap: 8,
  },
  codeLabel: {
    color: MC.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.3,
  },
  codeValue: {
    color: MC.textPrimary,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 4,
  },
  hint: {
    color: MC.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  secondaryButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: MC.white,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  secondaryButtonText: {
    color: MC.primaryDark,
    fontSize: 13,
    fontWeight: "700",
  },
  primaryButton: {
    borderRadius: 14,
    backgroundColor: MC.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginLeft: "auto",
  },
  primaryButtonText: {
    color: MC.white,
    fontSize: 13,
    fontWeight: "800",
  },
  disabledButton: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
  },
  disabledText: {
    color: MC.textMuted,
  },
});
