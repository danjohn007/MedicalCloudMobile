import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon } from "@/components/Icon";
import { MC } from "@/constants/theme";
import * as api from "@/services/api";

export default function DocumentosScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [docs, setDocs] = useState<api.PatientDocument[]>([]);

  const grouped = useMemo(() => {
    const map: Record<string, api.PatientDocument[]> = {};
    for (const doc of docs) {
      const key = doc.document_type || "other";
      if (!map[key]) map[key] = [];
      map[key].push(doc);
    }
    return map;
  }, [docs]);

  const load = useCallback(async () => {
    try {
      setError("");
      const res = await api.getDocuments();
      setDocs(res.data || []);
    } catch (e: any) {
      setError(e?.message || "No se pudieron cargar los documentos.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function onRefresh() {
    setRefreshing(true);
    void load();
  }

  function onDelete(doc: api.PatientDocument) {
    Alert.alert("Eliminar documento", `Deseas eliminar "${doc.title}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await api.deleteDocument(doc.id);
            setDocs((current) => current.filter((item) => item.id !== doc.id));
          } catch (e: any) {
            Alert.alert(
              "Error",
              e?.message || "No se pudo eliminar el documento.",
            );
          }
        },
      },
    ]);
  }

  async function onOpen(doc: api.PatientDocument) {
    if (!doc.file_url) {
      Alert.alert("Documento", "Este documento no tiene URL disponible.");
      return;
    }

    const canOpen = await Linking.canOpenURL(doc.file_url);
    if (!canOpen) {
      Alert.alert(
        "Documento",
        "No se pudo abrir el archivo en este dispositivo.",
      );
      return;
    }

    await Linking.openURL(doc.file_url);
  }

  async function onUpload() {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (picked.canceled || !picked.assets?.length) {
        return;
      }

      const file = picked.assets[0];
      const name = file.name || `documento_${Date.now()}`;
      const mime =
        file.mimeType ||
        (name.toLowerCase().endsWith(".pdf")
          ? "application/pdf"
          : "image/jpeg");

      const response = await api.uploadDocument({
        uri: file.uri,
        name,
        type: mime,
        title: name,
        document_type: mime.includes("pdf") ? "study" : "imaging",
      });

      setDocs((current) => [response.document, ...current]);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "No se pudo subir el documento.");
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Icon name="arrow-left" size={22} color={MC.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Mis documentos</Text>
        <Pressable onPress={onRefresh} hitSlop={10}>
          <Icon name="arrow-clockwise" size={20} color={MC.primary} />
        </Pressable>
      </View>

      <View style={styles.topActions}>
        <Pressable style={styles.uploadButton} onPress={() => void onUpload()}>
          <Icon name="plus" size={16} color={MC.white} />
          <Text style={styles.uploadText}>Subir documento</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={MC.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={MC.primary}
            />
          }
        >
          {error ? (
            <View style={styles.errorBox}>
              <Icon name="warning" size={16} color={MC.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {docs.length === 0 ? (
            <View style={styles.empty}>
              <Icon name="file" size={34} color={MC.textMuted} />
              <Text style={styles.emptyTitle}>Sin documentos por ahora</Text>
              <Text style={styles.emptyText}>
                Puedes subir estudios, recetas y archivos clínicos desde esta
                misma pantalla.
              </Text>
            </View>
          ) : (
            Object.entries(grouped).map(([type, items]) => (
              <View key={type} style={styles.section}>
                <Text style={styles.sectionTitle}>{formatDocumentType(type)}</Text>
                {items.map((doc) => (
                  <View key={doc.id} style={styles.card}>
                    <Pressable style={styles.cardBody} onPress={() => void onOpen(doc)}>
                      <Text style={styles.title}>{doc.title}</Text>
                      <Text style={styles.meta}>
                        {(doc.file_mime || "archivo").toUpperCase()} |{" "}
                        {doc.file_size_kb} KB
                      </Text>
                      {doc.created_at ? (
                        <Text style={styles.meta}>
                          Subido: {String(doc.created_at).slice(0, 10)}
                        </Text>
                      ) : null}
                    </Pressable>

                    <Pressable
                      onPress={() => onDelete(doc)}
                      style={styles.deleteButton}
                    >
                      <Icon name="trash" size={16} color={MC.error} />
                    </Pressable>
                  </View>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function formatDocumentType(type: string) {
  switch ((type || "").toLowerCase()) {
    case "lab_result":
      return "Laboratorio";
    case "imaging":
      return "Imagenologia";
    case "study":
      return "Estudios";
    case "prescription":
      return "Recetas";
    case "referral":
      return "Referencias";
    case "consent":
      return "Consentimientos";
    default:
      return "Otros documentos";
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MC.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: MC.border,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: MC.textPrimary },
  topActions: { paddingHorizontal: 16, paddingTop: 10 },
  uploadButton: {
    backgroundColor: MC.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  uploadText: { color: MC.white, fontSize: 13, fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, paddingBottom: 36, gap: 14 },
  errorBox: {
    backgroundColor: MC.errorSoft,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  errorText: { color: MC.error, fontSize: 13, flex: 1 },
  empty: {
    borderWidth: 1,
    borderColor: MC.border,
    borderRadius: 18,
    padding: 22,
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    backgroundColor: MC.card,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: MC.textPrimary,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 20,
    color: MC.textSecondary,
    textAlign: "center",
  },
  section: { gap: 10 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: MC.textPrimary,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: MC.border,
    borderRadius: 16,
    backgroundColor: MC.card,
    padding: 14,
  },
  cardBody: { flex: 1, gap: 4 },
  title: { fontSize: 14, fontWeight: "700", color: MC.textPrimary },
  meta: { fontSize: 12, color: MC.textSecondary },
  deleteButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: MC.errorSoft,
    alignItems: "center",
    justifyContent: "center",
  },
});
