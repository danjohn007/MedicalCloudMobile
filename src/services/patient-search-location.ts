import * as Location from "expo-location";

import * as api from "@/services/api";

export interface PatientSearchLocation {
  lat?: number;
  lng?: number;
  source: "device" | "profile" | "none";
  label?: string;
}

export interface ResolvePatientSearchLocationOptions {
  /** Ask for permission only from a deliberate location-related action. */
  requestPermission?: boolean;
  /** Use the saved profile as a fallback when a location is needed for a search. */
  includeProfileFallback?: boolean;
}

const LOCATION_TIMEOUT_MS = 6_000;

function withinLocationTimeout<T>(operation: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error("No se pudo obtener la ubicación a tiempo."));
    }, LOCATION_TIMEOUT_MS);

    operation.then(
      (value) => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

export async function resolvePatientSearchLocation(
  options: ResolvePatientSearchLocationOptions = {},
): Promise<PatientSearchLocation> {
  const { requestPermission = false, includeProfileFallback = false } = options;

  try {
    const permission = await (requestPermission
      ? Location.requestForegroundPermissionsAsync()
      : Location.getForegroundPermissionsAsync());

    if (permission.granted) {
      const lastKnown = await withinLocationTimeout(
        Location.getLastKnownPositionAsync({
          maxAge: 15 * 60 * 1000,
          requiredAccuracy: 5_000,
        }),
      );

      if (lastKnown) {
        return {
          lat: lastKnown.coords.latitude,
          lng: lastKnown.coords.longitude,
          source: "device",
          label: "Ubicación actual",
        };
      }

      // A fresh GPS fix is appropriate only after the person explicitly chose
      // a location-based action. The dashboard must never wait for the GPS.
      if (requestPermission) {
        const position = await withinLocationTimeout(
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        );

        return {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          source: "device",
          label: "Ubicación actual",
        };
      }
    }
  } catch {
  }

  if (!includeProfileFallback) {
    return { source: "none" };
  }

  try {
    const profile = await api.getProfile();
    if (typeof profile.lat === "number" && typeof profile.lng === "number") {
      return {
        lat: profile.lat,
        lng: profile.lng,
        source: "profile",
        label: [profile.city, profile.state].filter(Boolean).join(", ") || "Ubicación guardada",
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
