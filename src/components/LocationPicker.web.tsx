import { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Icon } from "@/components/Icon";
import { MC } from "@/constants/theme";

export interface LocationDraft {
  address: string;
  city: string;
  state: string;
  lat: number | null;
  lng: number | null;
}

export function LocationPicker({
  value,
  onChange,
  title = "Ubicación",
  subtitle,
  allowCurrentLocation = true,
}: {
  value: LocationDraft;
  onChange: (next: LocationDraft) => void;
  title?: string;
  subtitle?: string;
  allowCurrentLocation?: boolean;
  distanceWarningThresholdMeters?: number;
}) {
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");

  function update(field: keyof LocationDraft, nextValue: string) {
    if (field === "lat" || field === "lng") {
      const parsed = Number(nextValue);
      onChange({ ...value, [field]: Number.isFinite(parsed) ? parsed : null });
      return;
    }
    onChange({ ...value, [field]: nextValue });
  }

  function useCurrentLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationError("Este navegador no permite obtener la ubicación.");
      return;
    }

    setLocating(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        onChange({ ...value, lat: coords.latitude, lng: coords.longitude });
        setLocating(false);
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? "El navegador bloqueó la ubicación. Actívala desde el icono de permisos junto a la dirección de esta página y vuelve a intentarlo."
            : error.code === error.TIMEOUT
              ? "Se agotó el tiempo para obtener la ubicación. Comprueba tu conexión y vuelve a intentarlo."
              : "No se pudo obtener la ubicación. Verifica que el dispositivo tenga ubicación activada.";
        setLocationError(message);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  const hasCoordinates = value.lat != null && value.lng != null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Icon name="map-pin" size={18} color={MC.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>

      <Field
        label="Dirección"
        value={value.address}
        placeholder="Calle, número y colonia"
        onChangeText={(text) => update("address", text)}
      />
      <View style={styles.row}>
        <View style={styles.rowField}>
          <Field
            label="Ciudad"
            value={value.city}
            placeholder="Ciudad"
            onChangeText={(text) => update("city", text)}
          />
        </View>
        <View style={styles.rowField}>
          <Field
            label="Estado"
            value={value.state}
            placeholder="Estado"
            onChangeText={(text) => update("state", text)}
          />
        </View>
      </View>

      {allowCurrentLocation ? (
        <Pressable style={styles.primaryButton} onPress={useCurrentLocation} disabled={locating}>
          <Icon name="map-trifold" size={16} color={MC.white} />
          <Text style={styles.primaryButtonText}>
            {locating ? "Obteniendo ubicación..." : "Usar ubicación actual"}
          </Text>
        </Pressable>
      ) : null}

      {locationError ? <Text style={styles.errorText}>{locationError}</Text> : null}

      <View style={styles.coordinates}>
        <Text style={styles.coordinateLabel}>Coordenadas</Text>
        <Text style={styles.coordinateValue}>
          {hasCoordinates
            ? `${value.lat?.toFixed(5)}, ${value.lng?.toFixed(5)}`
            : "Sin coordenadas"}
        </Text>
        {hasCoordinates ? (
          <Pressable
            style={styles.mapButton}
            onPress={() =>
              void Linking.openURL(
                `https://www.google.com/maps/search/?api=1&query=${value.lat},${value.lng}`,
              )
            }
          >
            <Icon name="map-trifold" size={15} color={MC.primary} />
            <Text style={styles.mapButtonText}>Abrir en Google Maps</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  placeholder,
  onChangeText,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={MC.textMuted}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.card,
    padding: 16,
    gap: 14,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MC.primaryLight,
  },
  headerText: { flex: 1 },
  title: { color: MC.textPrimary, fontSize: 16, fontWeight: "700" },
  subtitle: { color: MC.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 2 },
  field: { gap: 6 },
  label: { color: MC.textSecondary, fontSize: 11, fontWeight: "700" },
  input: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.input,
    color: MC.textPrimary,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  rowField: { flex: 1, minWidth: 180 },
  primaryButton: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    backgroundColor: MC.primary,
  },
  primaryButtonText: { color: MC.white, fontSize: 13, fontWeight: "700" },
  errorText: { color: MC.error, fontSize: 12, lineHeight: 18 },
  coordinates: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.surface,
    padding: 14,
    gap: 6,
  },
  coordinateLabel: { color: MC.textMuted, fontSize: 11, fontWeight: "700" },
  coordinateValue: { color: MC.textPrimary, fontSize: 14, fontWeight: "600" },
  mapButton: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  mapButtonText: { color: MC.primary, fontSize: 13, fontWeight: "700" },
});
