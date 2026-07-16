import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { MC } from "@/constants/theme";
import { Icon } from "@/components/Icon";

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

const DEFAULT_REGION = {
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
  const [query, setQuery] = useState(formatQuery(value));
  const [loadingCurrent, setLoadingCurrent] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationDraft | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const lastSearchRef = useRef(0);
  const webViewRef = useRef<WebView>(null);
  const selectedAddress = value.address;
  const selectedCity = value.city;
  const selectedState = value.state;

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

  async function useCurrentLocation() {
    try {
      setLoadingCurrent(true);
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permiso requerido",
          "Necesitamos acceso a tu ubicación para sugerir la dirección más cercana.",
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const reverse = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      const next = toDraft({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        reverse,
      });

      setCurrentLocation(next);
      onChange(next);
      setQuery(formatQuery(next));
    } catch {
      Alert.alert(
        "Ubicacion no disponible",
        "No se pudo obtener tu ubicacion actual. Puedes buscar la direccion manualmente.",
      );
    } finally {
      setLoadingCurrent(false);
    }
  }

  const selectedPoint = {
    latitude: value.lat ?? currentLocation?.lat ?? DEFAULT_REGION.latitude,
    longitude: value.lng ?? currentLocation?.lng ?? DEFAULT_REGION.longitude,
  };

  useEffect(() => {
    if (!mapReady || mapError) return;
    webViewRef.current?.postMessage(
      JSON.stringify({
        type: "center",
        lat: selectedPoint.latitude,
        lng: selectedPoint.longitude,
      }),
    );
  }, [mapReady, mapError, selectedPoint.latitude, selectedPoint.longitude]);

  async function selectCoordinates(latitude: number, longitude: number, fallbackLabel?: string) {
    try {
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
    }
  }

  function handleMapMessage(event: WebViewMessageEvent) {
    try {
      const payload = JSON.parse(event.nativeEvent.data) as {
        type?: string;
        lat?: number;
        lng?: number;
      };
      if (payload.type !== "select") return;
      const latitude = Number(payload.lat);
      const longitude = Number(payload.lng);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
      void selectCoordinates(latitude, longitude, "Punto seleccionado en mapa");
    } catch {}
  }

  function centerMapOnCurrentSelection() {
    if (mapError) return;
    webViewRef.current?.postMessage(
      JSON.stringify({
        type: "center",
        lat: selectedPoint.latitude,
        lng: selectedPoint.longitude,
      }),
    );
  }

  function pickMapCenter() {
    if (mapError) return;
    webViewRef.current?.injectJavaScript(`
      if (window.__doctorCloudSelectCenter) {
        window.__doctorCloudSelectCenter();
      }
      true;
    `);
  }

  function resetMapError() {
    if (mapError) {
      setMapError(false);
    }
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
          placeholder="Busca una direccion o usa tu ubicacion"
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
          <Pressable style={styles.mapToolButton} onPress={centerMapOnCurrentSelection}>
            <Icon name="map-trifold" size={14} color={MC.primaryDark} />
            <Text style={styles.mapToolText}>Centrar</Text>
          </Pressable>
          <Pressable style={styles.mapToolButton} onPress={pickMapCenter}>
            <Icon name="map-pin" size={14} color={MC.primaryDark} />
            <Text style={styles.mapToolText}>Usar centro</Text>
          </Pressable>
        </View>
        {mapError ? (
          <View style={styles.mapFallback}>
            <View style={styles.mapFallbackIcon}>
              <Icon name="map-pin" size={24} color={MC.primaryDark} />
            </View>
            <Text style={styles.mapFallbackTitle}>Mapa no disponible</Text>
            <Text style={styles.mapFallbackText}>
              Revisa tu conexion o usa la busqueda/ubicacion actual para guardar el punto.
            </Text>
            <Pressable style={styles.openMapsButton} onPress={resetMapError}>
              <Icon name="arrow-clockwise" size={16} color={MC.white} />
              <Text style={styles.openMapsText}>Reintentar mapa</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.webMapWrap}>
            {!mapReady ? (
              <View style={styles.mapLoading}>
                <ActivityIndicator size="small" color={MC.primary} />
                <Text style={styles.mapLoadingText}>Cargando mapa...</Text>
              </View>
            ) : null}
            <WebView
              ref={webViewRef}
              originWhitelist={["*"]}
              source={{ html: mapHtml(selectedPoint.latitude, selectedPoint.longitude) }}
              style={styles.webMap}
              javaScriptEnabled
              domStorageEnabled
              onLoadEnd={() => setMapReady(true)}
              onError={() => setMapError(true)}
              onMessage={handleMapMessage}
              scrollEnabled={false}
            />
          </View>
        )}
        <Text style={styles.mapHint}>
          Toca el mapa o arrastra el marcador para fijar el punto. Coordenadas:{" "}
          {selectedPoint.latitude.toFixed(5)}, {selectedPoint.longitude.toFixed(5)}
        </Text>
      </View>

      {distanceFromCurrent != null &&
      distanceFromCurrent > distanceWarningThresholdMeters ? (
        <View style={styles.warningBox}>
          <Icon name="warning" size={16} color="#B45309" />
          <Text style={styles.warningText}>
            La dirección seleccionada está a {Math.round(distanceFromCurrent)} m de tu
            ubicacion actual. Puedes continuar si tu consultorio esta en otro punto.
          </Text>
        </View>
      ) : null}

      <View style={styles.summary}>
        <SummaryRow label="Dirección" value={value.address || "Sin dirección"} />
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
  const toRad = (value: number) => (value * Math.PI) / 180;
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

function mapHtml(latitude: number, longitude: number) {
  const lat = Number.isFinite(latitude) ? latitude : DEFAULT_REGION.latitude;
  const lng = Number.isFinite(longitude) ? longitude : DEFAULT_REGION.longitude;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: #f8fafc; }
    .leaflet-control-attribution { font-size: 10px; }
    .leaflet-marker-icon { filter: hue-rotate(140deg) saturate(1.25); }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    (function () {
      var start = [${lat}, ${lng}];
      var map = L.map('map', { zoomControl: true, attributionControl: true }).setView(start, 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);

      var marker = L.marker(start, { draggable: true }).addTo(map);

      function send(lat, lng) {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'select',
          lat: lat,
          lng: lng
        }));
      }

      function moveMarker(lat, lng, zoom) {
        marker.setLatLng([lat, lng]);
        map.setView([lat, lng], zoom || map.getZoom() || 15);
      }

      map.on('click', function (event) {
        moveMarker(event.latlng.lat, event.latlng.lng);
        send(event.latlng.lat, event.latlng.lng);
      });

      marker.on('dragend', function () {
        var pos = marker.getLatLng();
        map.panTo(pos);
        send(pos.lat, pos.lng);
      });

      window.__doctorCloudSelectCenter = function () {
        var pos = map.getCenter();
        moveMarker(pos.lat, pos.lng);
        send(pos.lat, pos.lng);
      };

      function handleMessage(event) {
        try {
          var payload = JSON.parse(event.data || '{}');
          if (payload.type === 'center' && isFinite(payload.lat) && isFinite(payload.lng)) {
            moveMarker(Number(payload.lat), Number(payload.lng), 15);
          }
        } catch (e) {}
      }

      document.addEventListener('message', handleMessage);
      window.addEventListener('message', handleMessage);
      setTimeout(function () { map.invalidateSize(); }, 250);
    }());
  </script>
</body>
</html>`;
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
  },
  mapToolButton: {
    flex: 1,
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
  webMapWrap: {
    height: 260,
    backgroundColor: "#F8FAFC",
  },
  webMap: {
    flex: 1,
    backgroundColor: "transparent",
  },
  mapLoading: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    gap: 8,
  },
  mapLoadingText: { fontSize: 12, fontWeight: "700", color: MC.textSecondary },
  mapFallback: {
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 10,
  },
  mapFallbackIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: MC.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  mapFallbackTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: MC.textPrimary,
    textAlign: "center",
  },
  mapFallbackText: {
    fontSize: 12,
    lineHeight: 18,
    color: MC.textSecondary,
    textAlign: "center",
  },
  openMapsButton: {
    marginTop: 4,
    borderRadius: 14,
    backgroundColor: MC.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  openMapsText: { fontSize: 13, fontWeight: "800", color: MC.white },
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
