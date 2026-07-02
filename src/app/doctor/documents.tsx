import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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

import {
  DoctorPatientPicker,
  filterDoctorPatients,
} from "@/components/DoctorPatientPicker";
import { Icon } from "@/components/Icon";
import { MC } from "@/constants/theme";
import * as api from "@/services/api";

const dateFmt = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Sin fecha";
  return dateFmt.format(parsed);
}

function formatType(value?: string | null) {
  switch ((value || "").toLowerCase()) {
    case "lab_result":
      return "Laboratorio";
    case "imaging":
      return "Imagen";
    case "study":
      return "Estudio";
    case "prescription":
      return "Receta";
    case "referral":
      return "Referencia";
    case "consent":
      return "Consentimiento";
    default:
      return "Documento";
  }
}

export default function DoctorDocumentsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ patientId?: string | string[] }>();
  const requestedPatientId = Number(
    Array.isArray(params.patientId) ? params.patientId[0] : params.patientId,
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [patients, setPatients] = useState<api.DoctorPatientSummary[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(
    Number.isFinite(requestedPatientId) && requestedPatientId > 0
      ? requestedPatientId
      : null,
  );
  const [selectedPatientName, setSelectedPatientName] = useState("");
  const [documents, setDocuments] = useState<api.PatientDocument[]>([]);

  useEffect(() => {
    void loadPatients();
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      void loadDocuments(selectedPatientId);
    } else {
      setDocuments([]);
      setSelectedPatientName("");
    }
  }, [selectedPatientId]);

  async function loadPatients(isRefresh = false) {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      setError("");
      const response = await api.getDoctorPatients();
      setPatients(response.data || []);
    } catch (e: any) {
      setError(e?.message || "No se pudieron cargar los pacientes.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadDocuments(patientId: number) {
    try {
      setDocumentsLoading(true);
      setError("");

      const response = await api.getDoctorPatientDocuments(patientId);
      setSelectedPatientName(response.patient?.name || "");
      setDocuments(response.data || []);
    } catch (e: any) {
      setDocuments([]);
      setError(e?.message || "No se pudieron cargar los documentos.");
    } finally {
      setDocumentsLoading(false);
    }
  }

  const filteredPatients = useMemo(
    () => filterDoctorPatients(patients, patientSearch),
    [patients, patientSearch],
  );

  useEffect(() => {
    if (!selectedPatientId && filteredPatients.length) {
      setSelectedPatientId(filteredPatients[0].id);
    }
  }, [filteredPatients, selectedPatientId]);

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === selectedPatientId) ?? null,
    [patients, selectedPatientId],
  );

  async function openDocument(url?: string | null) {
    if (!url) return;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    }
  }

  async function onUpload() {
    if (!selectedPatientId) {
      Alert.alert("Documentos", "Selecciona primero un paciente.");
      return;
    }

    try {
      setUploading(true);

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

      const response = await api.uploadDoctorPatientDocument(selectedPatientId, {
        uri: file.uri,
        name,
        type: mime,
        title: name,
        document_type: mime.includes("pdf") ? "study" : "imaging",
      });

      setDocuments((current) => [response.document, ...current]);
      setSelectedPatientName(selectedPatient?.name || selectedPatientName);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "No se pudo subir el documento.");
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingWrap} edges={["top"]}>
        <ActivityIndicator size="large" color={MC.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadPatients(true)}
            tintColor={MC.primary}
          />
        }
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Icon name="arrow-left" size={22} color={MC.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Documentos</Text>
          <Pressable
            onPress={() => {
              if (selectedPatientId) void loadDocuments(selectedPatientId);
            }}
            hitSlop={10}
          >
            <Icon name="arrow-clockwise" size={20} color={MC.primary} />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Expediente por paciente</Text>
          <Text style={styles.heroText}>
            Selecciona a quien quieres revisar y abre sus archivos sin dar vueltas
            por otras pantallas.
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Icon name="warning" size={18} color={MC.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <DoctorPatientPicker
            patients={patients}
            selectedPatientId={selectedPatientId}
            onSelectPatient={setSelectedPatientId}
            search={patientSearch}
            onChangeSearch={setPatientSearch}
            subtitle="Pacientes vinculados con expediente disponible."
            limit={8}
          />

          {selectedPatient ? (
            <View style={styles.inlineActions}>
              <ActionButton
                icon="user-circle"
                label="Abrir paciente"
                onPress={() =>
                  router.push(`/doctor/patients/${selectedPatient.id}` as any)
                }
              />
              <ActionButton
                icon="calendar"
                label="Agendar cita"
                onPress={() =>
                  router.push(
                    `/doctor/appointments/create?patientId=${selectedPatient.id}` as any,
                  )
                }
              />
              <ActionButton
                icon="plus"
                label={uploading ? "Subiendo..." : "Subir archivo"}
                onPress={() => {
                  if (!uploading) {
                    void onUpload();
                  }
                }}
              />
            </View>
          ) : null}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {selectedPatientName || selectedPatient?.name || "Documentos del paciente"}
          </Text>
          <Text style={styles.sectionSubtitle}>
            {uploading
              ? "Subiendo archivo al expediente..."
              : documents.length
              ? `${documents.length} archivos registrados`
              : "Sin documentos registrados"}
          </Text>
        </View>

        {documentsLoading ? (
          <View style={styles.emptyCard}>
            <ActivityIndicator color={MC.primary} />
            <Text style={styles.emptyText}>Cargando documentos...</Text>
          </View>
        ) : documents.length ? (
          documents.map((doc) => (
            <View key={doc.id} style={styles.docCard}>
              <View style={styles.docTop}>
                <View style={styles.docBadge}>
                  <Text style={styles.docBadgeText}>{formatType(doc.document_type)}</Text>
                </View>
                <Text style={styles.docDate}>{formatDate(doc.created_at)}</Text>
              </View>

              <Text style={styles.docTitle}>{doc.title || "Documento"}</Text>
              <Text style={styles.docMeta}>
                {doc.file_size_kb ? `${doc.file_size_kb} KB` : "Tamano no disponible"}
                {doc.uploader_name ? ` | Subio: ${doc.uploader_name}` : ""}
              </Text>
              {doc.notes ? <Text style={styles.docNotes}>{doc.notes}</Text> : null}

              <View style={styles.inlineActions}>
                {doc.file_url ? (
                  <ActionButton
                    icon="file"
                    label="Abrir archivo"
                    onPress={() => void openDocument(doc.file_url)}
                  />
                ) : null}
                {selectedPatientId ? (
                  <ActionButton
                    icon="user-circle"
                    label="Ver ficha"
                    onPress={() =>
                      router.push(`/doctor/patients/${selectedPatientId}` as any)
                    }
                  />
                ) : null}
              </View>
            </View>
          ))
        ) : (
          <EmptyCard
            icon="file"
            title="Todavia no hay documentos"
            text="Cuando este paciente tenga archivos en su expediente apareceran aqui."
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Icon>["name"];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.actionButton}>
      <Icon name={icon} size={14} color={MC.primaryDark} />
      <Text style={styles.actionButtonText}>{label}</Text>
    </Pressable>
  );
}

function EmptyCard({
  icon,
  title,
  text,
}: {
  icon: React.ComponentProps<typeof Icon>["name"];
  title: string;
  text: string;
}) {
  return (
    <View style={styles.emptyCard}>
      <Icon name={icon} size={24} color={MC.textMuted} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MC.background },
  loadingWrap: {
    flex: 1,
    backgroundColor: MC.background,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { padding: 16, paddingBottom: 36, gap: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: MC.textPrimary },
  hero: {
    borderRadius: 24,
    backgroundColor: "#EEF7FF",
    borderWidth: 1,
    borderColor: "#D6E7FF",
    padding: 18,
    gap: 8,
  },
  heroTitle: { fontSize: 24, fontWeight: "700", color: MC.textPrimary },
  heroText: { fontSize: 14, lineHeight: 21, color: MC.textSecondary },
  errorBox: {
    borderRadius: 14,
    backgroundColor: "#FEE2E2",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  errorText: { flex: 1, fontSize: 13, color: MC.error },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.white,
    padding: 16,
    gap: 16,
  },
  inlineActions: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: MC.primaryLight,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: MC.primaryDark,
  },
  sectionHeader: { gap: 4 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: MC.textPrimary },
  sectionSubtitle: { fontSize: 13, color: MC.textSecondary },
  docCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.white,
    padding: 16,
    gap: 10,
  },
  docTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  docBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: MC.primaryLight,
  },
  docBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: MC.primaryDark,
  },
  docDate: { fontSize: 12, color: MC.textMuted },
  docTitle: { fontSize: 15, fontWeight: "700", color: MC.textPrimary },
  docMeta: { fontSize: 12, color: MC.textSecondary },
  docNotes: { fontSize: 13, lineHeight: 20, color: MC.textSecondary },
  emptyCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.white,
    padding: 20,
    alignItems: "center",
    gap: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: MC.textPrimary },
  emptyText: {
    fontSize: 13,
    lineHeight: 20,
    color: MC.textSecondary,
    textAlign: "center",
  },
});
