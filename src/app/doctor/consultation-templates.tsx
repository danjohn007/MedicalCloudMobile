import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
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
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon } from "@/components/Icon";
import { MC } from "@/constants/theme";
import * as api from "@/services/api";

type TemplateFormState = {
  name: string;
  color_hex: string;
  usage_notes: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  diagnosis: string;
  sort_order: string;
  is_active: boolean;
};

function emptyForm(): TemplateFormState {
  return {
    name: "",
    color_hex: "#2563EB",
    usage_notes: "",
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
    diagnosis: "",
    sort_order: "0",
    is_active: true,
  };
}

export default function DoctorConsultationTemplatesScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [storageReady, setStorageReady] = useState(true);
  const [templates, setTemplates] = useState<api.DoctorConsultationTemplate[]>([]);
  const [defaults, setDefaults] = useState<api.DoctorConsultationTemplate[]>([]);
  const [library, setLibrary] = useState<api.DoctorConsultationTemplate[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<TemplateFormState>(emptyForm());

  useEffect(() => {
    void loadScreen();
  }, []);

  async function loadScreen() {
    try {
      setLoading(true);
      setError("");
      const response = await api.getDoctorConsultationTemplates();
      setTemplates(response.data || []);
      setDefaults(response.defaults || []);
      setLibrary(response.library || []);
      setStorageReady(response.storage_ready !== false);
    } catch (e: any) {
      setError(e?.message || "No se pudieron cargar las plantillas.");
      setStorageReady(false);
    } finally {
      setLoading(false);
    }
  }

  const activeCount = useMemo(
    () => templates.filter((template) => template.is_active).length,
    [templates],
  );

  function resetEditor() {
    setEditingId(null);
    setForm(emptyForm());
  }

  function startEdit(template: api.DoctorConsultationTemplate) {
    setEditingId(template.id);
    setForm({
      name: template.label || "",
      color_hex: template.tone || "#2563EB",
      usage_notes: template.usage_notes || "",
      subjective: template.subjective || "",
      objective: template.objective || "",
      assessment: template.assessment || "",
      plan: template.plan || "",
      diagnosis: template.diagnosis || "",
      sort_order: String(template.sort_order ?? 0),
      is_active: template.is_active !== false,
    });
    setSuccess("");
    setError("");
  }

  function setField<K extends keyof TemplateFormState>(
    key: K,
    value: TemplateFormState[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    if (!form.name.trim()) {
      Alert.alert("Nombre requerido", "Asigna un nombre a la plantilla.");
      return;
    }

    if (
      !form.subjective.trim() &&
      !form.objective.trim() &&
      !form.assessment.trim() &&
      !form.plan.trim() &&
      !form.diagnosis.trim()
    ) {
      Alert.alert(
        "Plantilla incompleta",
        "Agrega al menos un bloque clinico o un diagnostico base.",
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const result = await api.saveDoctorConsultationTemplate({
        template_id: editingId ?? undefined,
        name: form.name.trim(),
        color_hex: normalizeColorHex(form.color_hex),
        usage_notes: form.usage_notes.trim() || undefined,
        subjective: form.subjective.trim() || undefined,
        objective: form.objective.trim() || undefined,
        assessment: form.assessment.trim() || undefined,
        plan: form.plan.trim() || undefined,
        diagnosis: form.diagnosis.trim() || undefined,
        is_active: form.is_active,
        sort_order: Math.max(
          0,
          Math.min(999, parseInt(form.sort_order.replace(/\D/g, "") || "0", 10)),
        ),
      });

      setSuccess(result.message || "Plantilla guardada.");
      resetEditor();
      await loadScreen();
    } catch (e: any) {
      setError(e?.message || "No se pudo guardar la plantilla.");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(template: api.DoctorConsultationTemplate) {
    Alert.alert(
      "Eliminar plantilla",
      `Deseas eliminar "${template.label}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingId(template.id);
              setError("");
              setSuccess("");
              await api.deleteDoctorConsultationTemplate(template.id);
              if (editingId === template.id) {
                resetEditor();
              }
              setSuccess("Plantilla eliminada.");
              await loadScreen();
            } catch (e: any) {
              setError(e?.message || "No se pudo eliminar la plantilla.");
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
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
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Icon name="arrow-left" size={22} color={MC.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Plantillas de consulta</Text>
          <Pressable onPress={resetEditor} hitSlop={10}>
            <Icon name="plus" size={20} color={MC.primary} />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>Biblioteca clinica</Text>
          <Text style={styles.heroTitle}>Deja listas tus notas frecuentes</Text>
          <Text style={styles.heroText}>
            Crea bases reutilizables para SOAP, plan terapeutico y receta. Las
            activas apareceran dentro de la consulta.
          </Text>
          <View style={styles.heroStats}>
            <StatPill icon="list" label={`${templates.length} propias`} />
            <StatPill icon="check-circle" label={`${activeCount} activas`} />
            <StatPill icon="clipboard-text" label={`${library.length} en uso`} />
          </View>
        </View>

        {!storageReady ? (
          <Banner
            tone="warning"
            text="La tabla de plantillas no parece disponible en este entorno. Puedes revisar defaults, pero el guardado requiere la migracion del backend web."
          />
        ) : null}

        {error ? <Banner tone="error" text={error} /> : null}
        {success ? <Banner tone="success" text={success} /> : null}

        <Section
          title="Biblioteca activa"
          subtitle="Esto es lo que el SOAP puede ofrecer hoy al doctor durante la consulta."
        >
          {library.length ? (
            library.map((template) => (
              <TemplatePreviewCard key={`${template.source}-${template.id}-${template.label}`} template={template} />
            ))
          ) : (
            <EmptyCard text="Todavia no hay plantillas activas." />
          )}
        </Section>

        <Section
          title="Tus plantillas"
          subtitle="Edita, ordena o desactiva las que ya tienes guardadas."
        >
          {templates.length ? (
            templates.map((template) => (
              <View key={template.id} style={styles.templateCard}>
                <View style={styles.templateTop}>
                  <View style={[styles.colorSwatch, { backgroundColor: template.tone || "#2563EB" }]} />
                  <View style={styles.templateBody}>
                    <Text style={styles.templateTitle}>{template.label}</Text>
                    <Text style={styles.templateMeta}>
                      {template.is_active ? "Activa" : "Inactiva"} | Orden {template.sort_order ?? 0}
                    </Text>
                  </View>
                </View>

                {template.usage_notes ? (
                  <Text style={styles.templateNotes}>{template.usage_notes}</Text>
                ) : null}

                <View style={styles.cardActions}>
                  <Pressable onPress={() => startEdit(template)} style={styles.secondaryAction}>
                    <Icon name="list" size={14} color={MC.primaryDark} />
                    <Text style={styles.secondaryActionText}>Editar</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleDelete(template)}
                    disabled={deletingId === template.id}
                    style={styles.dangerAction}
                  >
                    {deletingId === template.id ? (
                      <ActivityIndicator size="small" color={MC.error} />
                    ) : (
                      <>
                        <Icon name="trash" size={14} color={MC.error} />
                        <Text style={styles.dangerActionText}>Eliminar</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            ))
          ) : (
            <EmptyCard text="Aun no has creado plantillas propias. Puedes empezar desde el editor de abajo." />
          )}
        </Section>

        <Section
          title={editingId ? "Editar plantilla" : "Nueva plantilla"}
          subtitle="Las plantillas activas se muestran dentro de la consulta para rellenar SOAP y receta."
        >
          <Field label="Nombre">
            <Input
              value={form.name}
              onChangeText={(value) => setField("name", value)}
              placeholder="Control respiratorio"
            />
          </Field>

          <View style={styles.row}>
            <View style={styles.col}>
              <Field label="Color">
                <Input
                  value={form.color_hex}
                  onChangeText={(value) => setField("color_hex", value.toUpperCase())}
                  placeholder="#2563EB"
                  autoCapitalize="characters"
                />
              </Field>
            </View>
            <View style={styles.col}>
              <Field label="Orden">
                <Input
                  value={form.sort_order}
                  onChangeText={(value) =>
                    setField("sort_order", value.replace(/[^\d]/g, ""))
                  }
                  placeholder="0"
                  keyboardType="number-pad"
                />
              </Field>
            </View>
          </View>

          <Pressable
            onPress={() => setField("is_active", !form.is_active)}
            style={[
              styles.toggleCard,
              form.is_active ? styles.toggleCardActive : styles.toggleCardInactive,
            ]}
          >
            <Icon
              name={form.is_active ? "check-circle" : "warning"}
              size={16}
              color={form.is_active ? "#047857" : "#B45309"}
            />
            <View style={styles.toggleBody}>
              <Text style={styles.toggleTitle}>
                {form.is_active ? "Plantilla activa" : "Plantilla inactiva"}
              </Text>
              <Text style={styles.toggleText}>
                {form.is_active
                  ? "Aparecera dentro del SOAP del doctor."
                  : "Se guardara, pero no saldra como atajo en consulta."}
              </Text>
            </View>
          </Pressable>

          <Field label="Notas de uso">
            <Input
              value={form.usage_notes}
              onChangeText={(value) => setField("usage_notes", value)}
              placeholder="Cuándo conviene usarla y qué revisar antes."
              multiline
            />
          </Field>

          <Field label="Subjetivo">
            <Input
              value={form.subjective}
              onChangeText={(value) => setField("subjective", value)}
              placeholder="Narrativa base del paciente."
              multiline
            />
          </Field>

          <Field label="Objetivo">
            <Input
              value={form.objective}
              onChangeText={(value) => setField("objective", value)}
              placeholder="Hallazgos o exploracion base."
              multiline
            />
          </Field>

          <Field label="Analisis">
            <Input
              value={form.assessment}
              onChangeText={(value) => setField("assessment", value)}
              placeholder="Impresion clinica base."
              multiline
            />
          </Field>

          <Field label="Plan">
            <Input
              value={form.plan}
              onChangeText={(value) => setField("plan", value)}
              placeholder="Tratamiento, estudios y seguimiento."
              multiline
            />
          </Field>

          <Field label="Diagnostico para receta">
            <Input
              value={form.diagnosis}
              onChangeText={(value) => setField("diagnosis", value)}
              placeholder="Texto base para la receta."
              multiline
            />
          </Field>

          <Pressable
            onPress={handleSave}
            disabled={saving || !storageReady}
            style={[styles.primaryButton, (saving || !storageReady) && styles.primaryButtonDisabled]}
          >
            {saving ? (
              <ActivityIndicator color={MC.white} />
            ) : (
              <>
                <Icon name="check-circle" size={16} color={MC.white} />
                <Text style={styles.primaryButtonText}>
                  {editingId ? "Guardar cambios" : "Guardar plantilla"}
                </Text>
              </>
            )}
          </Pressable>

          {editingId ? (
            <Pressable onPress={resetEditor} style={styles.cancelButton}>
              <Icon name="x" size={16} color={MC.textSecondary} />
              <Text style={styles.cancelButtonText}>Cancelar edicion</Text>
            </Pressable>
          ) : null}
        </Section>

        <Section
          title="Defaults del sistema web"
          subtitle="Referencia base que se usa cuando el doctor aun no tiene plantillas activas."
        >
          {defaults.map((template) => (
            <TemplatePreviewCard key={`default-${template.label}`} template={template} />
          ))}
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Input({
  multiline = false,
  ...props
}: React.ComponentProps<typeof TextInput> & { multiline?: boolean }) {
  return (
    <TextInput
      placeholderTextColor={MC.textMuted}
      textAlignVertical={multiline ? "top" : "center"}
      multiline={multiline}
      style={[styles.input, multiline && styles.inputMultiline]}
      {...props}
    />
  );
}

function Banner({
  tone,
  text,
}: {
  tone: "error" | "success" | "warning";
  text: string;
}) {
  const config = {
    error: { bg: "#FEE2E2", fg: MC.error, icon: "warning" as const },
    success: { bg: "#DCFCE7", fg: MC.success, icon: "check-circle" as const },
    warning: { bg: "#FEF3C7", fg: "#B45309", icon: "warning" as const },
  }[tone];

  return (
    <View style={[styles.banner, { backgroundColor: config.bg }]}>
      <Icon name={config.icon} size={18} color={config.fg} />
      <Text style={[styles.bannerText, { color: config.fg }]}>{text}</Text>
    </View>
  );
}

function StatPill({
  icon,
  label,
}: {
  icon: "list" | "check-circle" | "clipboard-text";
  label: string;
}) {
  return (
    <View style={styles.statPill}>
      <Icon name={icon} size={14} color={MC.primaryDark} />
      <Text style={styles.statPillText}>{label}</Text>
    </View>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <View style={styles.emptyCard}>
      <Icon name="list" size={20} color={MC.textMuted} />
      <Text style={styles.emptyCardText}>{text}</Text>
    </View>
  );
}

function TemplatePreviewCard({
  template,
}: {
  template: api.DoctorConsultationTemplate;
}) {
  return (
    <View style={styles.previewCard}>
      <View style={styles.previewTop}>
        <View style={[styles.colorSwatch, { backgroundColor: template.tone || "#2563EB" }]} />
        <View style={styles.previewBody}>
          <Text style={styles.previewTitle}>{template.label}</Text>
          <Text style={styles.previewMeta}>
            {template.source === "custom" ? "Personalizada" : "Default"} |{" "}
            {template.is_active === false ? "Inactiva" : "Lista para uso"}
          </Text>
        </View>
      </View>
      {template.usage_notes ? (
        <Text style={styles.previewNotes}>{template.usage_notes}</Text>
      ) : null}
      <Text style={styles.previewSnippet}>
        {template.assessment || template.diagnosis || template.plan || template.subjective || "Sin contenido."}
      </Text>
    </View>
  );
}

function normalizeColorHex(value: string) {
  const trimmed = value.trim().toUpperCase();
  return /^#[0-9A-F]{6}$/.test(trimmed) ? trimmed : "#2563EB";
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
    backgroundColor: "#EEF6FF",
    borderWidth: 1,
    borderColor: "#D6E7FF",
    padding: 18,
    gap: 10,
  },
  heroEyebrow: { fontSize: 12, fontWeight: "700", color: MC.primaryDark },
  heroTitle: { fontSize: 24, fontWeight: "700", color: MC.textPrimary },
  heroText: { fontSize: 14, lineHeight: 21, color: MC.textSecondary },
  heroStats: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statPill: {
    borderRadius: 999,
    backgroundColor: MC.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statPillText: { fontSize: 12, fontWeight: "700", color: MC.primaryDark },
  banner: {
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bannerText: { flex: 1, fontSize: 13, lineHeight: 19 },
  section: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.white,
    padding: 16,
    gap: 10,
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: MC.textPrimary },
  sectionSubtitle: { fontSize: 13, lineHeight: 19, color: MC.textSecondary },
  sectionBody: { gap: 12 },
  emptyCard: {
    borderRadius: 18,
    backgroundColor: MC.surface,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  emptyCardText: {
    fontSize: 13,
    lineHeight: 20,
    color: MC.textSecondary,
    textAlign: "center",
  },
  templateCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.white,
    padding: 14,
    gap: 10,
  },
  templateTop: { flexDirection: "row", gap: 10, alignItems: "center" },
  colorSwatch: { width: 14, height: 44, borderRadius: 999 },
  templateBody: { flex: 1, gap: 2 },
  templateTitle: { fontSize: 15, fontWeight: "700", color: MC.textPrimary },
  templateMeta: { fontSize: 12, color: MC.textMuted },
  templateNotes: { fontSize: 13, lineHeight: 19, color: MC.textSecondary },
  cardActions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  secondaryAction: {
    borderRadius: 999,
    backgroundColor: MC.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  secondaryActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: MC.primaryDark,
  },
  dangerAction: {
    borderRadius: 999,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dangerActionText: { fontSize: 12, fontWeight: "700", color: MC.error },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: MC.textPrimary },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: MC.textPrimary,
  },
  inputMultiline: { minHeight: 104 },
  row: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  toggleCard: {
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  toggleCardActive: { backgroundColor: "#ECFDF5" },
  toggleCardInactive: { backgroundColor: "#FEF3C7" },
  toggleBody: { flex: 1, gap: 2 },
  toggleTitle: { fontSize: 14, fontWeight: "700", color: MC.textPrimary },
  toggleText: { fontSize: 12, lineHeight: 18, color: MC.textSecondary },
  primaryButton: {
    borderRadius: 16,
    backgroundColor: MC.primary,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryButtonDisabled: { opacity: 0.65 },
  primaryButtonText: { fontSize: 14, fontWeight: "700", color: MC.white },
  cancelButton: {
    borderRadius: 16,
    backgroundColor: MC.surface,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  cancelButtonText: { fontSize: 14, fontWeight: "700", color: MC.textSecondary },
  previewCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.white,
    padding: 14,
    gap: 8,
  },
  previewTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  previewBody: { flex: 1, gap: 2 },
  previewTitle: { fontSize: 15, fontWeight: "700", color: MC.textPrimary },
  previewMeta: { fontSize: 12, color: MC.textMuted },
  previewNotes: { fontSize: 12, lineHeight: 18, color: MC.textSecondary },
  previewSnippet: { fontSize: 13, lineHeight: 20, color: MC.textSecondary },
});
