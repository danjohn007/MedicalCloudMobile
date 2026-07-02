import * as Location from "expo-location";

import * as api from "@/services/api";

export interface PatientSearchLocation {
  lat?: number;
  lng?: number;
  source: "device" | "profile" | "none";
  label?: string;
}

export async function resolvePatientSearchLocation(): Promise<PatientSearchLocation> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.granted) {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        source: "device",
        label: "Ubicacion actual",
      };
    }
  } catch {
  }

  try {
    const profile = await api.getProfile();
    if (typeof profile.lat === "number" && typeof profile.lng === "number") {
      return {
        lat: profile.lat,
        lng: profile.lng,
        source: "profile",
        label: [profile.city, profile.state].filter(Boolean).join(", ") || "Ubicacion guardada",
      };
    }

    const addressQuery = [profile.address, profile.city, profile.state]
      .filter(Boolean)
      .join(", ")
      .trim();

    if (addressQuery.length >= 6) {
      const geocoded = await Location.geocodeAsync(addressQuery);
      const first = geocoded[0];
      if (first) {
        return {
          lat: first.latitude,
          lng: first.longitude,
          source: "profile",
          label: addressQuery,
        };
      }
    }
  } catch {
  }

  return { source: "none" };
}
