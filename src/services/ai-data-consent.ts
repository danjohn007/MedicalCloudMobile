import { Alert } from "react-native";

import { acceptAiClinicalDataConsent } from "@/services/api";
import { getSecure, setSecure } from "@/services/storage";

export const AI_DATA_DISCLOSURE_VERSION = "2026-07-27";

function consentStorageKey(userId: number): string {
  return `doctorcloud_ai_data_consent_${AI_DATA_DISCLOSURE_VERSION}_${userId}`;
}

export async function ensureAiClinicalDataConsent(input: {
  userId: number;
  role: string;
}): Promise<boolean> {
  if (input.userId < 1) {
    throw new Error("No fue posible identificar tu cuenta para guardar la autorización.");
  }

  const storageKey = consentStorageKey(input.userId);
  if ((await getSecure(storageKey)) === "accepted") {
    return true;
  }

  const isDoctor = input.role === "doctor";
  const disclosure = isDoctor
    ? "Al continuar, Doctor Cloud enviará al proveedor externo de IA el contenido necesario para responder: tu solicitud y, según la función, nombre del paciente, motivo de consulta, alergias, medicamentos, notas SOAP y recetas. Tu solicitud y la respuesta se guardan en Doctor Cloud. No se usan para publicidad. Evita incluir datos que no sean necesarios."
    : "Al continuar, Doctor Cloud enviará al proveedor externo de IA tu solicitud y el contexto de salud necesario para responder, como edad, alergias, medicamentos, antecedentes y citas. Tu solicitud y la respuesta se guardan en Doctor Cloud. No se usan para publicidad. La IA no sustituye una consulta médica.";

  const accepted = await new Promise<boolean>((resolve) => {
    Alert.alert(
      "Uso de datos clínicos con IA",
      disclosure,
      [
        { text: "Ahora no", style: "cancel", onPress: () => resolve(false) },
        { text: "Autorizar y continuar", onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });

  if (!accepted) {
    return false;
  }

  await acceptAiClinicalDataConsent(AI_DATA_DISCLOSURE_VERSION);
  await setSecure(storageKey, "accepted");
  return true;
}
