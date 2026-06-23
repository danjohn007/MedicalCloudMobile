export function resolveAppHome(role?: string | null): "/(tabs)" | "/(doctor-tabs)" {
  return role === "doctor" ? "/(doctor-tabs)" : "/(tabs)";
}
