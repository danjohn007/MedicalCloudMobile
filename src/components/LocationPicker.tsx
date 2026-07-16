import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MapView, {
  Marker,
  PROVIDER_GOOGLE,
  type MapPressEvent,
  type Region,
} from "react-native-maps";

import { Icon } from "@/components/Icon";
import { MC } from "@/constants/theme";

export interface LocationDraft {
  address: string;
  city: string;
  state: string;
  lat: number | null;
  lng: number | null;
}

interface Suggestion extends LocationDraft {
  id: string;
  label: string;
}

const DEFAULT_REGION: Region = {
  latitude: 20.5888,
  longitude: -100.3899,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export function LocationPicker({
  value,
  onChange,
  title = "Ubicacion",
  subtitle,
  allowCurrentLocation = true,
  distanceWarningThresholdMeters = 50,
}: {
  value: LocationDraft;
  onChange: (next: LocationDraft) => void;
  title?: string;
  subtitle?: string;
  allowCurrentLocation?: boolean;
  distanceWarningThresholdMeters?: number;
}) {
  const mapRef = useRef<MapView>(null);
  const [query, setQuery] = useState(formatQuery(value));
  const [loadingCurrent, setLoadingCurrent] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [loadingPoint, setLoadingPoint] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationDraft | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const lastSearchRef = useRef(0);
  const selectedAddress = value.address;
  const selectedCity = value.city;
  const selectedState = value.state;

  const selectedRegion: Region = {
    latitude: value.lat ?? currentLocation?.lat ?? DEFAULT_REGION.latitude,
    longitude: value.lng ?? currentLocation?.lng ?? DEFAULT_REGION.longitude,
    latitudeDelta: 0.012,
    longitudeDelta: 0.012,
  };

  useEffect(() => {
    setQuery(formatQuery({ address: selectedAddress, city: selectedCity, state: selectedState }));
  }, [selectedAddress, selectedCity, selectedState]);

  useEffect(() => {
    const search = query.trim();
    if (search.length < 6) {
      setSuggestions([]);
      setLoadingSuggestions(false);
      return;
    }

    const currentSearch = Date.now();
    lastSearchRef.current = currentSearch;
    setLoadingSuggestions(true);

    const timer = setTimeout(() => {
      void loadSuggestions(search, currentSearch);
    }, 450);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (value.lat == null || value.lng == null) return;
    mapRef.current?.animateToRegion(
      {
        latitude: value.lat,
        longitude: value.lng,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      },
      350,
    );
  }, [value.lat, value.lng]);

  async function loadSuggestions(search: string, searchId: number) {
    try {
      const geocoded = await Location.geocodeAsync(search);
      const limited = geocoded.slice(0, 4);
      const resolved = await Promise.all(
        limited.map(async (item, index) => {
          const reverse = await Location.reverseGeocodeAsync({
            latitude: item.latitude,
            longitude: item.longitude,
          });
          const draft = toDraft({
            latitude: item.latitude,
            longitude: item.longitude,
            reverse,
            fallbackLabel: search,
          });

          return {
            id: `${item.latitude}-${item.longitude}-${index}`,
            label: formatQuery(draft) || search,
            ...draft,
          } satisfies Suggestion;
        }),
      );

      if (lastSearchRef.current === searchId) {
        setSuggestions(resolved.filter((item) => item.label.trim() !== ""));
      }
    } catch {
      if (lastSearchRef.current === searchId) {
        setSuggestions([]);
      }
    } finally {
      if (lastSearchRef.current === searchId) {
        setLoadingSuggestions(false);
      }
    }
  }

  async function selectCoordinates(latitude: number, longitude: number, fallbackLabel?: string) {
    try {
      setLoadingPoint(true);
      const reverse = await Location.reverseGeocodeAsync({ latitude, longitude });
      const next = toDraft({ latitude, longitude, reverse, fallbackLabel });
      onChange(next);
      setQuery(formatQuery(next));
    } catch {
      const next = {
        ...value,
        address: fallbackLabel || value.address,
        lat: latitude,
        lng: longitude,
      };
      onChange(next);
      setQuery(formatQuery(next));
    } finally {
      setLoadingPoint(false);
    }
  }

  async function useCurrentLocation() {
    try {
      setLoadingCurrent(true);
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permiso requerido",
          "Necesitamos acceso a tu ubicacion para sugerir la direccion mas cercana.",
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const next = await draftFromCoordinates(
        position.coords.latitude,
        position.coords.longitude,
        "Ubicacion actual",
      );
      setCurrentLocation(next);
      onChange(next);
      setQuery(formatQuery(next));
    } catch {
      Alert.alert(
        "Ubicacion no disponible",
        "No se pudo obtener tu ubicacion actual. Puedes buscar la direccion manualmente o tocar el mapa.",
      );
    } finally {
      setLoadingCurrent(false);
    }
  }

  function handleMapPress(event: MapPressEvent) {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    void selectCoordinates(latitude, longitude, "Punto seleccionado en mapa");
  }

  function centerOnSelectedPoint() {
    mapRef.current?.animateToRegion(selectedRegion, 350);
  }

  const distanceFromCurrent =
    currentLocation?.lat != null &&
    currentLocation.lng != null &&
    value.lat != null &&
    value.lng != null
      ? haversineMeters(
          currentLocation.lat,
          currentLocation.lng,
          value.lat,
          value.lng,
        )
      : null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Icon name="map-pin" size={18} color={MC.primaryDark} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>

      <View style={styles.searchWrap}>
        <Icon name="magnifying-glass" size={18} color={MC.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Busca una direccion o toca el mapa"
          placeholderTextColor={MC.textMuted}
          style={styles.searchInput}
        />
        {loadingSuggestions ? <ActivityIndicator size="small" color={MC.primary} /> : null}
      </View>

      {allowCurrentLocation ? (
        <Pressable
          style={styles.locationButton}
          onPress={useCurrentLocation}
          disabled={loadingCurrent}
        >
          {loadingCurrent ? (
            <ActivityIndicator size="small" color={MC.primaryDark} />
          ) : (
            <Icon name="map-trifold" size={16} color={MC.primaryDark} />
          )}
          <Text style={styles.locationButtonText}>Usar ubicacion actual</Text>
        </Pressable>
      ) : null}

      {suggestions.length ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.suggestionRow}
        >
          {suggestions.map((suggestion) => (
            <Pressable
              key={suggestion.id}
              style={styles.suggestionChip}
              onPress={() => {
                onChange(suggestion);
                setQuery(suggestion.label);
              }}
            >
              <Icon name="map-pin" size={13} color={MC.primaryDark} />
              <Text style={styles.suggestionText} numberOfLines={2}>
                {suggestion.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.mapShell}>
        <View style={styles.mapToolbar}>
          <Pressable style={styles.mapToolButton} onPress={centerOnSelectedPoint}>
            <Icon name="map-trifold" size={14} color={MC.primaryDark} />
            <Text style={styles.mapToolText}>Centrar punto</Text>
          </Pressable>
          {loadingPoint ? (
            <View style={styles.mapToolStatus}>
              <ActivityIndicator size="small" color={MC.primary} />
              <Text style={styles.mapToolStatusText}>Leyendo direccion...</Text>
            </View>
          ) : null}
        </View>
        <MapView
          ref={mapRef}
          provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
          style={styles.map}
          initialRegion={selectedRegion}
          onPress={handleMapPress}
          showsUserLocation={allowCurrentLocation}
          showsMyLocationButton={false}
          toolbarEnabled={false}
        >
          {value.lat != null && value.lng != null ? (
            <Marker
              coordinate={{ latitude: value.lat, longitude: value.lng }}
              draggable
              onDragEnd={(event) => {
                const { latitude, longitude } = event.nativeEvent.coordinate;
                void selectCoordinates(latitude, longitude, "Marcador");
              }}
            />
          ) : null}
        </MapView>
        <Text style={styles.mapHint}>
          Toca el mapa o arrastra el marcador para fijar el punto. Coordenadas:{" "}
          {selectedRegion.latitude.toFixed(5)}, {selectedRegion.longitude.toFixed(5)}
        </Text>
      </View>

      {distanceFromCurrent != null &&
      distanceFromCurrent > distanceWarningThresholdMeters ? (
        <View style={styles.warningBox}>
          <Icon name="warning" size={16} color="#B45309" />
          <Text style={styles.warningText}>
            La direccion seleccionada esta a {Math.round(distanceFromCurrent)} m de tu
            ubicacion actual. Puedes continuar si tu consultorio esta en otro punto.
          </Text>
        </View>
      ) : null}

      <View style={styles.summary}>
        <SummaryRow label="Direccion" value={value.address || "Sin direccion"} />
        <SummaryRow label="Ciudad" value={value.city || "Sin ciudad"} />
        <SummaryRow label="Estado" value={value.state || "Sin estado"} />
        <SummaryRow
          label="Coordenadas"
          value={
            value.lat != null && value.lng != null
              ? `${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`
              : "Sin coordenadas"
          }
        />
      </View>
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function formatQuery(value: Pick<LocationDraft, "address" | "city" | "state">) {
  return [value.address, value.city, value.state].filter(Boolean).join(", ");
}

async function draftFromCoordinates(
  latitude: number,
  longitude: number,
  fallbackLabel?: string,
) {
  const reverse = await Location.reverseGeocodeAsync({ latitude, longitude });
  return toDraft({ latitude, longitude, reverse, fallbackLabel });
}

function toDraft({
  latitude,
  longitude,
  reverse,
  fallbackLabel,
}: {
  latitude: number;
  longitude: number;
  reverse: Location.LocationGeocodedAddress[];
  fallbackLabel?: string;
}): LocationDraft {
  const primary = reverse[0];
  const addressParts = [
    primary?.street,
    primary?.streetNumber,
    primary?.district,
  ].filter(Boolean);

  return {
    address: addressParts.join(" ").trim() || fallbackLabel || "",
    city: primary?.city || primary?.subregion || "",
    state: primary?.region || "",
    lat: latitude,
    lng: longitude,
  };
}

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const toRad = (input: number) => (input * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.white,
    padding: 16,
    gap: 12,
  },
  header: { flexDirection: "row", gap: 12, alignItems: "center" },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: MC.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 16, fontWeight: "700", color: MC.textPrimary },
  subtitle: { fontSize: 12, lineHeight: 18, color: MC.textSecondary },
  searchWrap: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    color: MC.textPrimary,
    fontSize: 14,
  },
  locationButton: {
    borderRadius: 14,
    backgroundColor: MC.primaryLight,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  locationButtonText: { fontSize: 13, fontWeight: "700", color: MC.primaryDark },
  suggestionRow: { gap: 8, paddingVertical: 2 },
  suggestionChip: {
    maxWidth: 220,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#BFE7E4",
    backgroundColor: "#F0FDFA",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  suggestionText: { flexShrink: 1, fontSize: 12, color: MC.primaryDark },
  mapShell: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.surface,
  },
  mapToolbar: {
    flexDirection: "row",
    gap: 8,
    padding: 10,
    backgroundColor: MC.white,
    borderBottomWidth: 1,
    borderBottomColor: MC.border,
    alignItems: "center",
  },
  mapToolButton: {
    borderRadius: 12,
    backgroundColor: MC.primaryLight,
    paddingVertical: 9,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  mapToolText: { fontSize: 12, fontWeight: "800", color: MC.primaryDark },
  mapToolStatus: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 7,
  },
  mapToolStatusText: { fontSize: 11, fontWeight: "700", color: MC.textSecondary },
  map: { width: "100%", height: 260 },
  mapHint: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    color: MC.textSecondary,
    backgroundColor: MC.white,
  },
  warningBox: {
    borderRadius: 16,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FCD34D",
    padding: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  warningText: { flex: 1, fontSize: 12, lineHeight: 18, color: "#92400E" },
  summary: {
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    padding: 12,
    gap: 8,
  },
  summaryRow: { gap: 4 },
  summaryLabel: { fontSize: 11, fontWeight: "700", color: MC.textMuted },
  summaryValue: { fontSize: 13, color: MC.textPrimary },
});
