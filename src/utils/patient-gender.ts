export type PatientGender =
  | "male"
  | "female"
  | "other"
  | "prefer_not_to_say";

export const PATIENT_GENDER_OPTIONS: readonly {
  value: PatientGender;
  label: string;
}[] = [
  { value: "male", label: "Masculino" },
  { value: "female", label: "Femenino" },
  { value: "other", label: "Otro" },
  { value: "prefer_not_to_say", label: "Prefiero no decirlo" },
];

export function normalizePatientGender(value: unknown): PatientGender | "" {
  const normalized = String(value ?? "")
    .trim()
    .toLocaleLowerCase("es-MX")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "_");

  const aliases: Record<string, PatientGender> = {
    m: "male",
    male: "male",
    masculino: "male",
    hombre: "male",
    f: "female",
    female: "female",
    femenino: "female",
    mujer: "female",
    o: "other",
    other: "other",
    otro: "other",
    otra: "other",
    no_binario: "other",
    no_binaria: "other",
    prefer_not_to_say: "prefer_not_to_say",
    prefiero_no_decirlo: "prefer_not_to_say",
    prefiero_no_especificar: "prefer_not_to_say",
  };

  return aliases[normalized] ?? "";
}

export function formatPatientGender(
  value: unknown,
  fallback = "Género s/d",
): string {
  const normalized = normalizePatientGender(value);
  return (
    PATIENT_GENDER_OPTIONS.find((option) => option.value === normalized)?.label ??
    fallback
  );
}
