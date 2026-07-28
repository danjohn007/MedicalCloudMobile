export function isPresentialAppointmentType(type?: string | null): boolean {
  const normalized = String(type ?? "").trim().toLowerCase();
  return normalized === "presential" || normalized === "presencial" || normalized === "in_person";
}
