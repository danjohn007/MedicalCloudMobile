import { useEffect, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
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
import { getSecure, removeSecure, setSecure } from "@/services/storage";

type SoapFormState = Required<api.DoctorSoapPayload>;
type SoapDraftPayload = {
  form: SoapFormState;
  updated_at: string;
};
type SoapCorePayload = Pick<
  api.DoctorSoapPayload,
  "subjective" | "objective" | "assessment" | "plan_text"
>;

const SOAP_DRAFT_PREFIX = "doctor-soap-draft:";
const dateTimeFmt = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const FALLBACK_SOAP_TEMPLATES: api.DoctorConsultationTemplate[] = [
  {
    id: -1,
    label: "Respiratoria",
    tone: "#2563EB",
    subjective:
      "Paciente refiere cuadro respiratorio de inicio reciente con sintomas de via aerea superior y malestar general.",
    objective:
      "Signos vitales clinicamente estables, exploracion dirigida sin datos de alarma inmediata.",
    assessment: "Infeccion respiratoria alta no complicada.",
    plan:
      "Manejo sintomatico, hidratacion oral, vigilancia de signos de alarma y reevaluacion por evolucion.",
    diagnosis: "Infeccion respiratoria alta no complicada",
    usage_notes:
      "Base breve para cuadros respiratorios no complicados, con ajuste clinico final segun exploracion.",
    source: "default",
    is_active: true,
  },
  {
    id: -2,
    label: "Gastro",
    tone: "#0F766E",
    subjective:
      "Paciente refiere molestias gastrointestinales recientes sin datos iniciales de compromiso grave.",
    objective:
      "Exploracion clinica registrada sin datos de irritacion peritoneal y con estabilidad general.",
    assessment: "Cuadro gastrointestinal no complicado.",
    plan:
      "Reposicion de liquidos, dieta progresiva, vigilancia de deshidratacion y seguimiento clinico.",
    diagnosis: "Cuadro gastrointestinal no complicado",
    usage_notes:
      "Sirve como borrador rapido para evolucion digestiva sin datos de alarma.",
    source: "default",
    is_active: true,
  },
];

function emptyForm(): SoapFormState {
  return {
    subjective: "",
    objective: "",
    assessment: "",
    plan_text: "",
    rx_diagnosis: "",
    rx_medications: "",
    rx_instructions: "",
    rx_valid_days: 30,
  };
}

function soapDraftKey(appointmentId: number): string {
  return `${SOAP_DRAFT_PREFIX}${appointmentId}`;
}

function parseSoapDraft(raw: string | null): SoapDraftPayload | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<SoapDraftPayload> | null;
    const form = parsed?.form;
    if (!form || typeof form !== "object") {
      return null;
    }

    return {
      updated_at:
        typeof parsed.updated_at === "string" ? parsed.updated_at : new Date().toISOString(),
      form: {
        subjective: typeof form.subjective === "string" ? form.subjective : "",
        objective: typeof form.objective === "string" ? form.objective : "",
        assessment: typeof form.assessment === "string" ? form.assessment : "",
        plan_text: typeof form.plan_text === "string" ? form.plan_text : "",
        rx_diagnosis: typeof form.rx_diagnosis === "string" ? form.rx_diagnosis : "",
        rx_medications: typeof form.rx_medications === "string" ? form.rx_medications : "",
        rx_instructions: typeof form.rx_instructions === "string" ? form.rx_instructions : "",
        rx_valid_days:
          typeof form.rx_valid_days === "number" && Number.isFinite(form.rx_valid_days)
            ? Math.max(1, form.rx_valid_days)
            : 30,
      },
    };
  } catch {
    return null;
  }
}

function mergeServerSoapWithDraft(
  serverForm: SoapFormState,
  draftForm: SoapFormState,
): SoapFormState {
  return {
    subjective: draftForm.subjective || serverForm.subjective,
    objective: draftForm.objective || serverForm.objective,
    assessment: draftForm.assessment || serverForm.assessment,
    plan_text: draftForm.plan_text || serverForm.plan_text,
    rx_diagnosis: draftForm.rx_diagnosis || serverForm.rx_diagnosis,
    rx_medications: draftForm.rx_medications || serverForm.rx_medications,
    rx_instructions: draftForm.rx_instructions || serverForm.rx_instructions,
    rx_valid_days: Math.max(1, draftForm.rx_valid_days || serverForm.rx_valid_days || 30),
  };
}

function buildSoapCorePayload(form: SoapFormState): SoapCorePayload {
  return {
    subjective: form.subjective,
    objective: form.objective,
    assessment: form.assessment,
    plan_text: form.plan_text,
  };
}

function buildSoapCoreFromNote(note?: api.DoctorSoapEntry | null): SoapCorePayload {
  return {
    subjective: note?.subjective || "",
    objective: note?.objective || "",
    assessment: note?.assessment || "",
    plan_text: note?.plan_text || "",
  };
}

function formatDateTime(value?: string | null) {
  if (!value) return "Sin fecha";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Sin fecha";
  return dateTimeFmt.format(parsed);
}

function soapCoreEqual(left: SoapCorePayload, right: SoapCorePayload) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export default function DoctorSoapScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const appointmentId = Number(Array.isArray(params.id) ? params.id[0] : params.id);
  const restoredDraftRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [autosaveState, setAutosaveState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [autosaveMessage, setAutosaveMessage] = useState("");
  const [data, setData] = useState<api.DoctorAppointmentSoapData | null>(null);
  const [templateLibrary, setTemplateLibrary] = useState<api.DoctorConsultationTemplate[]>([]);
  const [form, setForm] = useState<SoapFormState>(emptyForm());
  const formKey = JSON.stringify(form);
  const serverForm = data ? buildFormFromResponse(data) : emptyForm();
  const serverFormKey = JSON.stringify(serverForm);
  const appointment = data?.appointment ?? null;
  const note = data?.note ?? null;
  const soapCoreServer = buildSoapCoreFromNote(note);
  const soapCoreServerKey = JSON.stringify(soapCoreServer);
  const hasAppointment = Boolean(appointment);
  const noteId = Number(note?.id ?? 0);
  const noteSigned = Boolean(note?.is_signed);
  const consultationCompleted = appointment?.status === "completed";
  const isReadOnly = noteSigned || consultationCompleted;
  const isDirty = !formsEqual(form, serverForm);
  const soapCoreDirty = !soapCoreEqual(buildSoapCorePayload(form), soapCoreServer);

  useEffect(() => {
    if (!Number.isFinite(appointmentId) || appointmentId <= 0) {
      setError("Consulta invalida.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        setError("");
        setAutosaveState("idle");
        setAutosaveMessage("");
        restoredDraftRef.current = false;
        const response = await api.getDoctorAppointmentSoap(appointmentId);
        if (cancelled) return;
        setData(response);
        const nextServerForm = buildFormFromResponse(response);
        let nextForm = nextServerForm;
        const lockedNote = Boolean(response.note?.is_signed) || response.appointment?.status === "completed";

        try {
          const savedDraft = parseSoapDraft(await getSecure(soapDraftKey(appointmentId)));
          if (lockedNote && savedDraft) {
            await removeSecure(soapDraftKey(appointmentId));
          } else if (savedDraft && !formsEqual(savedDraft.form, nextServerForm)) {
            nextForm = mergeServerSoapWithDraft(nextServerForm, savedDraft.form);
            restoredDraftRef.current = true;
          }
        } catch {
        }

        setForm(nextForm);
        if (restoredDraftRef.current) {
          setSuccess("Recuperamos un borrador local para que sigas donde te quedaste.");
        }

        try {
          const templatesResponse = await api.getDoctorConsultationTemplates();
          if (!cancelled) {
            setTemplateLibrary(
              templatesResponse.library?.length
                ? templatesResponse.library
                : FALLBACK_SOAP_TEMPLATES,
            );
          }
        } catch {
          if (!cancelled) {
            setTemplateLibrary(FALLBACK_SOAP_TEMPLATES);
          }
        }
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || "No se pudo cargar la nota clinica.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [appointmentId]);

  useEffect(() => {
    if (loading || !hasAppointment || !Number.isFinite(appointmentId) || appointmentId <= 0) {
      return;
    }

    const key = soapDraftKey(appointmentId);
    if (isReadOnly) {
      void removeSecure(key);
      return;
    }

    const timer = setTimeout(() => {
      void (async () => {
        try {
          if (formKey === serverFormKey) {
            await removeSecure(key);
            return;
          }

          await setSecure(
            key,
            JSON.stringify({
              form,
              updated_at: new Date().toISOString(),
            } satisfies SoapDraftPayload),
          );
        } catch {
        }
      })();
    }, 900);

    return () => clearTimeout(timer);
  }, [appointmentId, form, formKey, hasAppointment, isReadOnly, loading, serverFormKey]);

  useEffect(() => {
    if (
      loading ||
      !hasAppointment ||
      !Number.isFinite(appointmentId) ||
      appointmentId <= 0 ||
      isReadOnly ||
      !soapCoreDirty
    ) {
      return;
    }

    const timer = setTimeout(() => {
      void (async () => {
        try {
          setAutosaveState("saving");
          setAutosaveMessage("Sincronizando el SOAP con el servidor...");
          const result = await api.autosaveDoctorAppointmentSoap(
            appointmentId,
            buildSoapCorePayload(form),
          );
          setData((current) =>
            current
              ? {
                  ...current,
                  note: result.note ?? current.note,
                }
              : current,
          );
          setAutosaveState("saved");
          setAutosaveMessage(result.message || "SOAP sincronizado.");
        } catch (e: any) {
          setAutosaveState("error");
          setAutosaveMessage(e?.message || "No se pudo sincronizar el SOAP en segundo plano.");
        }
      })();
    }, 1200);

    return () => clearTimeout(timer);
  }, [appointmentId, form, hasAppointment, isReadOnly, loading, soapCoreDirty, soapCoreServerKey]);

  async function handleSave() {
    if (isReadOnly) {
      setError(
        noteSigned
          ? "La nota ya esta firmada y no admite cambios."
          : "La consulta ya esta cerrada y la nota es de solo lectura.",
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const result = await api.saveDoctorAppointmentSoap(appointmentId, form);
      const refreshed = await api.getDoctorAppointmentSoap(appointmentId);
      setData(refreshed);
      setForm(buildFormFromResponse(refreshed));
      await removeSecure(soapDraftKey(appointmentId));
      setAutosaveState("saved");
      setAutosaveMessage("SOAP y receta sincronizados correctamente.");
      setSuccess(result.message || "Nota clinica guardada correctamente.");
    } catch (e: any) {
      setError(e?.message || "No se pudo guardar la nota clinica.");
    } finally {
      setSaving(false);
    }
  }

  function setField<K extends keyof SoapFormState>(key: K, value: SoapFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const availableTemplates = templateLibrary.length
    ? templateLibrary
    : FALLBACK_SOAP_TEMPLATES;

  async function handleSignNote() {
    if (!noteId) {
      setError("Guarda primero la nota para poder firmarla.");
      return;
    }

    if (isDirty) {
      Alert.alert(
        "Guarda antes de firmar",
        "La firma bloquea la nota. Guarda cualquier cambio pendiente y luego firma.",
      );
      return;
    }

    try {
      setSigning(true);
      setError("");
      setSuccess("");
      const result = await api.signDoctorNote(noteId);
      await removeSecure(soapDraftKey(appointmentId));
      const refreshed = await api.getDoctorAppointmentSoap(appointmentId);
      setData(refreshed);
      setForm(buildFormFromResponse(refreshed));
      setAutosaveState("saved");
      setAutosaveMessage("La nota quedo firmada y el SOAP ya no se puede editar desde movil.");
      setSuccess(result.message || "Nota firmada correctamente.");
    } catch (e: any) {
      setError(e?.message || "No se pudo firmar la nota clinica.");
    } finally {
      setSigning(false);
    }
  }

  async function handleCompleteConsultation() {
    if (consultationCompleted) {
      setError("La consulta ya esta completada.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");
      if (!noteSigned) {
        await api.saveDoctorAppointmentSoap(appointmentId, form);
      }
      await removeSecure(soapDraftKey(appointmentId));
      if (appointment?.type === "presential") {
        router.push(`/doctor/appointments/${appointmentId}/complete` as any);
      } else {
        await api.completeDoctorAppointment(appointmentId);
        router.replace(`/doctor/appointments/${appointmentId}` as any);
      }
    } catch (e: any) {
      setError(e?.message || "No se pudo completar la consulta.");
    } finally {
      setSaving(false);
    }
  }

  function applyTemplate(templateId: number) {
    if (isReadOnly) return;

    const template = availableTemplates.find((item) => item.id === templateId);
    if (!template) return;

    setForm((current) => ({
      ...current,
      subjective: current.subjective || template.subjective,
      objective: current.objective || template.objective,
      assessment: current.assessment || template.assessment,
      plan_text: current.plan_text || template.plan,
      rx_diagnosis: current.rx_diagnosis || template.diagnosis,
    }));
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingWrap} edges={["top"]}>
        <ActivityIndicator size="large" color={MC.primary} />
      </SafeAreaView>
    );
  }

  const progress = buildProgress(form);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={10}>
              <Icon name="arrow-left" size={22} color={MC.textPrimary} />
            </Pressable>
            <Text style={styles.headerTitle}>Nota clinica</Text>
            <View style={styles.headerSpacer} />
          </View>

          {appointment ? (
            <View style={styles.hero}>
              <Text style={styles.heroEyebrow}>
                {appointment.status === "in_consultation" ? "En consulta" : "Consulta clinica"}
              </Text>
              <Text style={styles.heroTitle}>{appointment.patient_name}</Text>
              <Text style={styles.heroSubtitle}>
                {appointment.reason || "Sin motivo capturado"}
              </Text>
              <View style={styles.contextRow}>
                <ContextChip icon="drop" label={appointment.patient_blood_type || "Sangre s/d"} />
                <ContextChip
                  icon="warning"
                  label={
                    appointment.patient_allergies ? "Alergias cargadas" : "Sin alergias"
                  }
                />
                <ContextChip
                  icon="clock"
                  label={`${progress.completed}/${progress.total} bloques listos`}
                />
              </View>
            </View>
          ) : null}

          {appointment ? (
            <View style={styles.actionStrip}>
              <InlineAction
                icon="user-circle"
                label="Ficha paciente"
                onPress={() => router.push(`/doctor/patients/${appointment.patient_id}` as any)}
              />
              <InlineAction icon="calendar" label="Ver cita" onPress={() => router.back()} />
            </View>
          ) : null}

          <View style={styles.progressCard}>
            <Text style={styles.progressTitle}>Flujo sugerido</Text>
            <Text style={styles.progressText}>
              Resume al paciente, completa SOAP, deja receta lista y cierra consulta sin perder
              contexto.
            </Text>
            <View style={styles.progressList}>
              {progress.items.map((item) => (
                <ProgressItem
                  key={item.label}
                  label={item.label}
                  done={item.done}
                  detail={item.detail}
                />
              ))}
            </View>
            <View style={styles.draftBadge}>
              <Icon
                name={
                  noteSigned
                    ? "check-circle"
                    : autosaveState === "saving"
                      ? "clock"
                      : autosaveState === "error" || isDirty
                        ? "warning"
                        : "check-circle"
                }
                size={14}
                color={
                  noteSigned
                    ? "#047857"
                    : autosaveState === "error" || isDirty
                      ? "#B45309"
                      : "#047857"
                }
              />
              <Text
                style={[
                  styles.draftBadgeText,
                  {
                    color:
                      noteSigned
                        ? "#047857"
                        : autosaveState === "error" || isDirty
                          ? "#B45309"
                          : "#047857",
                  },
                ]}
              >
                {noteSigned
                  ? "Nota firmada"
                  : autosaveState === "saving"
                    ? "Sincronizando SOAP"
                    : autosaveState === "error"
                      ? "Autosave con pendiente"
                      : isDirty
                        ? "Hay cambios sin guardar"
                        : "Todo lo visible ya esta guardado"}
              </Text>
            </View>
            <Text style={styles.draftHint}>
              {noteSigned
                ? `Firmada ${formatDateTime(note?.signed_at)}. Solo puedes revisar la informacion desde aqui.`
                : consultationCompleted
                  ? "La consulta ya esta cerrada; este resumen queda disponible solo para lectura."
                  : autosaveMessage ||
                    "Mientras escribes se guarda un borrador local y el SOAP se sincroniza en segundo plano."}
            </Text>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Icon name="warning" size={18} color={MC.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {success ? (
            <View style={styles.successBox}>
              <Icon name="check-circle" size={18} color={MC.success} />
              <Text style={styles.successText}>{success}</Text>
            </View>
          ) : null}

          <Section
            title="Plantillas de consulta"
            subtitle="Usa tu biblioteca activa para empezar rapido y luego ajusta los datos clinicos reales."
          >
            <View style={styles.inlineActionRow}>
              <InlineAction
                icon="list"
                label="Gestionar plantillas"
                onPress={() => router.push("/doctor/consultation-templates" as any)}
              />
            </View>
            <View style={styles.templateRow}>
              {availableTemplates.map((template, index) => (
                <Pressable
                  key={`${template.id}-${template.label}-${index}`}
                  onPress={() => applyTemplate(template.id)}
                  disabled={isReadOnly}
                  style={[
                    styles.templateChip,
                    isReadOnly && styles.templateChipDisabled,
                    { borderColor: template.tone || "#7C3AED" },
                  ]}
                >
                  <Icon name="list" size={14} color={template.tone || "#7C3AED"} />
                  <View style={styles.templateChipBody}>
                    <Text style={styles.templateChipText}>{template.label}</Text>
                    {template.usage_notes ? (
                      <Text style={styles.templateChipNote}>{template.usage_notes}</Text>
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </View>
          </Section>

          <Section
            title="SOAP"
            subtitle="Captura lo que el paciente refiere, lo que observaste y el plan clinico."
          >
            <Field
              label="Subjetivo"
              value={form.subjective}
              onChangeText={(value) => setField("subjective", value)}
              placeholder="Sintomas, motivo y percepcion del paciente"
              multiline
              editable={!isReadOnly}
            />
            <Field
              label="Objetivo"
              value={form.objective}
              onChangeText={(value) => setField("objective", value)}
              placeholder="Exploracion, signos y datos observables"
              multiline
              editable={!isReadOnly}
            />
            <Field
              label="Analisis"
              value={form.assessment}
              onChangeText={(value) => setField("assessment", value)}
              placeholder="Diagnostico presuntivo o impresion clinica"
              multiline
              editable={!isReadOnly}
            />
            <Field
              label="Plan"
              value={form.plan_text}
              onChangeText={(value) => setField("plan_text", value)}
              placeholder="Tratamiento, estudios y seguimiento"
              multiline
              editable={!isReadOnly}
            />
          </Section>

          <Section
            title="Receta"
            subtitle="Deja clara la indicacion medica para que el paciente la entienda y la pueda seguir."
          >
            <Field
              label="Diagnostico"
              value={form.rx_diagnosis}
              onChangeText={(value) => setField("rx_diagnosis", value)}
              placeholder="Motivo medico de la receta"
              multiline
              editable={!isReadOnly}
            />
            <Field
              label="Medicamentos"
              value={form.rx_medications}
              onChangeText={(value) => setField("rx_medications", value)}
              placeholder="Medicamento, dosis y frecuencia"
              multiline
              editable={!isReadOnly}
            />
            <Field
              label="Indicaciones"
              value={form.rx_instructions}
              onChangeText={(value) => setField("rx_instructions", value)}
              placeholder="Indicaciones adicionales para el paciente"
              multiline
              editable={!isReadOnly}
            />
            <Field
              label="Vigencia en dias"
              value={String(form.rx_valid_days)}
              onChangeText={(value) =>
                setField(
                  "rx_valid_days",
                  Math.max(1, parseInt(value.replace(/\D/g, "") || "30", 10)),
                )
              }
              placeholder="30"
              keyboardType="number-pad"
              editable={!isReadOnly}
            />
          </Section>

          <Section
            title="Contexto del paciente"
            subtitle="Consulta rapido los datos de seguridad antes de firmar o cerrar la visita."
          >
            <ContextCard
              title="Medicacion actual"
              text={
                appointment?.patient_current_medications ||
                data?.medical_record?.current_medications ||
                "Sin medicacion registrada"
              }
            />
            <ContextCard
              title="Alergias"
              text={
                appointment?.patient_allergies ||
                data?.medical_record?.allergies ||
                "Sin alergias registradas"
              }
            />
          </Section>

          <Pressable
            onPress={handleSave}
            disabled={saving || signing || isReadOnly}
            style={[
              styles.saveButton,
              (saving || signing || isReadOnly) && styles.saveButtonDisabled,
            ]}
          >
            {saving ? (
              <ActivityIndicator color={MC.white} />
            ) : (
              <>
                <Icon name="check-circle" size={18} color={MC.white} />
                <Text style={styles.saveButtonText}>
                  {noteSigned
                    ? "Nota firmada"
                    : consultationCompleted
                      ? "Consulta cerrada"
                      : "Guardar nota y receta"}
                </Text>
              </>
            )}
          </Pressable>

          {noteId > 0 && !noteSigned && !consultationCompleted ? (
            <>
              <Pressable
                onPress={handleSignNote}
                disabled={saving || signing || isDirty}
                style={[
                  styles.signButton,
                  (saving || signing || isDirty) && styles.saveButtonDisabled,
                ]}
              >
                {signing ? (
                  <ActivityIndicator color={MC.primaryDark} />
                ) : (
                  <>
                    <Icon name="check-circle" size={18} color={MC.primaryDark} />
                    <Text style={styles.signButtonText}>Firmar nota</Text>
                  </>
                )}
              </Pressable>
              {isDirty ? (
                <Text style={styles.signHint}>
                  Guarda los cambios pendientes antes de firmar para bloquear la version final.
                </Text>
              ) : null}
            </>
          ) : null}

          {!consultationCompleted ? (
            <Pressable
              onPress={handleCompleteConsultation}
              disabled={saving || signing}
              style={[
                styles.finishButton,
                (saving || signing) && styles.saveButtonDisabled,
              ]}
            >
              <Icon name="check-circle" size={18} color={MC.primaryDark} />
              <Text style={styles.finishButtonText}>
                {appointment?.type === "presential"
                  ? "Guardar y pasar a cierre"
                  : "Guardar y completar consulta"}
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
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
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType,
  editable = true,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  keyboardType?: "default" | "number-pad";
  editable?: boolean;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={MC.textMuted}
        keyboardType={keyboardType}
        multiline={multiline}
        editable={editable}
        textAlignVertical={multiline ? "top" : "center"}
        style={[
          styles.fieldInput,
          multiline && styles.fieldInputMultiline,
          !editable && styles.fieldInputDisabled,
        ]}
      />
    </View>
  );
}

function ContextChip({
  icon,
  label,
}: {
  icon: "drop" | "warning" | "clock";
  label: string;
}) {
  return (
    <View style={styles.contextChip}>
      <Icon name={icon} size={14} color={MC.primaryDark} />
      <Text style={styles.contextChipText}>{label}</Text>
    </View>
  );
}

function ContextCard({ title, text }: { title: string; text: string }) {
  return (
    <View style={styles.contextCard}>
      <Text style={styles.contextCardTitle}>{title}</Text>
      <Text style={styles.contextCardText}>{text}</Text>
    </View>
  );
}

function InlineAction({
  icon,
  label,
  onPress,
}: {
  icon: "user-circle" | "calendar" | "list";
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.inlineAction}>
      <Icon name={icon} size={16} color={MC.primaryDark} />
      <Text style={styles.inlineActionText}>{label}</Text>
    </Pressable>
  );
}

function ProgressItem({
  label,
  done,
  detail,
}: {
  label: string;
  done: boolean;
  detail: string;
}) {
  return (
    <View style={styles.progressItem}>
      <View
        style={[
          styles.progressItemIcon,
          done ? styles.progressItemIconDone : styles.progressItemIconTodo,
        ]}
      >
        <Icon name={done ? "check-circle" : "warning"} size={14} color={done ? "#047857" : "#B45309"} />
      </View>
      <View style={styles.progressItemBody}>
        <Text style={styles.progressItemTitle}>{label}</Text>
        <Text style={styles.progressItemText}>{detail}</Text>
      </View>
    </View>
  );
}

function buildFormFromResponse(response: api.DoctorAppointmentSoapData): SoapFormState {
  return {
    subjective: response.note?.subjective || "",
    objective: response.note?.objective || "",
    assessment: response.note?.assessment || "",
    plan_text: response.note?.plan_text || "",
    rx_diagnosis: response.prescription?.diagnosis || "",
    rx_medications: response.prescription?.medications || "",
    rx_instructions: response.prescription?.instructions || "",
    rx_valid_days: Number(response.prescription?.valid_days ?? 30) || 30,
  };
}

function formsEqual(left: SoapFormState, right: SoapFormState) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function buildProgress(form: SoapFormState) {
  const items = [
    {
      label: "Resumen del paciente",
      done: Boolean(form.subjective.trim()),
      detail: form.subjective.trim()
        ? "Ya hay motivo y narrativa clinica."
        : "Falta capturar lo que el paciente refiere.",
    },
    {
      label: "Exploracion y analisis",
      done: Boolean(form.objective.trim() && form.assessment.trim()),
      detail:
        form.objective.trim() && form.assessment.trim()
          ? "Objetivo y analisis ya estan documentados."
          : "Completa observaciones y la impresion clinica.",
    },
    {
      label: "Plan de manejo",
      done: Boolean(form.plan_text.trim()),
      detail: form.plan_text.trim()
        ? "El plan de tratamiento o seguimiento ya esta listo."
        : "Falta dejar claro el plan para el paciente.",
    },
    {
      label: "Receta",
      done: Boolean(form.rx_diagnosis.trim() && form.rx_medications.trim()),
      detail:
        form.rx_diagnosis.trim() && form.rx_medications.trim()
          ? "La receta ya tiene base suficiente."
          : "Agrega diagnostico y medicamentos antes del cierre.",
    },
  ];

  return {
    items,
    completed: items.filter((item) => item.done).length,
    total: items.length,
  };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MC.background },
  loadingWrap: {
    flex: 1,
    backgroundColor: MC.background,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { padding: 16, paddingBottom: 36, gap: 14 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: MC.textPrimary },
  headerSpacer: { width: 22 },
  hero: {
    borderRadius: 20,
    backgroundColor: MC.primaryLight,
    padding: 16,
    gap: 8,
  },
  heroEyebrow: { fontSize: 12, fontWeight: "700", color: MC.primaryDark },
  heroTitle: { fontSize: 22, fontWeight: "700", color: MC.textPrimary },
  heroSubtitle: { fontSize: 13, color: MC.textSecondary },
  contextRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actionStrip: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  inlineActionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  inlineAction: {
    borderRadius: 999,
    backgroundColor: MC.surface,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  inlineActionText: { fontSize: 12, fontWeight: "700", color: MC.primaryDark },
  contextChip: {
    borderRadius: 999,
    backgroundColor: MC.white,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  contextChipText: { fontSize: 11, fontWeight: "700", color: MC.primaryDark },
  progressCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.white,
    padding: 14,
    gap: 10,
  },
  progressTitle: { fontSize: 16, fontWeight: "700", color: MC.textPrimary },
  progressText: { fontSize: 12, lineHeight: 18, color: MC.textSecondary },
  progressList: { gap: 10 },
  progressItem: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  progressItemIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  progressItemIconDone: { backgroundColor: "#DCFCE7" },
  progressItemIconTodo: { backgroundColor: "#FFF7ED" },
  progressItemBody: { flex: 1, gap: 2 },
  progressItemTitle: { fontSize: 13, fontWeight: "700", color: MC.textPrimary },
  progressItemText: { fontSize: 12, lineHeight: 18, color: MC.textSecondary },
  draftBadge: {
    borderRadius: 999,
    alignSelf: "flex-start",
    backgroundColor: MC.surface,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  draftBadgeText: { fontSize: 11, fontWeight: "700" },
  draftHint: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 18,
    color: MC.textSecondary,
  },
  errorBox: {
    borderRadius: 14,
    backgroundColor: "#FEE2E2",
    padding: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  errorText: { flex: 1, color: MC.error, fontSize: 13 },
  successBox: {
    borderRadius: 14,
    backgroundColor: "#ECFDF5",
    padding: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  successText: { flex: 1, color: MC.success, fontSize: 13 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: MC.textPrimary },
  sectionSubtitle: { fontSize: 12, lineHeight: 18, color: MC.textSecondary },
  sectionBody: { gap: 10 },
  templateRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  templateChip: {
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    maxWidth: "100%",
  },
  templateChipBody: { flexShrink: 1, gap: 4 },
  templateChipText: { fontSize: 12, fontWeight: "700", color: MC.textPrimary },
  templateChipDisabled: { opacity: 0.55 },
  templateChipNote: {
    fontSize: 11,
    lineHeight: 16,
    color: MC.textSecondary,
    maxWidth: 220,
  },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: MC.textPrimary },
  fieldInput: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.white,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: MC.textPrimary,
  },
  fieldInputMultiline: { minHeight: 116 },
  fieldInputDisabled: { backgroundColor: "#F8FAFC", color: MC.textMuted },
  contextCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.white,
    padding: 12,
    gap: 6,
  },
  contextCardTitle: { fontSize: 12, fontWeight: "700", color: MC.textPrimary },
  contextCardText: { fontSize: 13, lineHeight: 19, color: MC.textSecondary },
  saveButton: {
    borderRadius: 16,
    backgroundColor: MC.primary,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { fontSize: 15, fontWeight: "700", color: MC.white },
  signButton: {
    borderRadius: 16,
    backgroundColor: "#FEF3C7",
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
    borderColor: "#F59E0B",
  },
  signButtonText: { fontSize: 15, fontWeight: "700", color: MC.primaryDark },
  signHint: {
    marginTop: -2,
    fontSize: 12,
    lineHeight: 18,
    color: MC.textSecondary,
  },
  finishButton: {
    borderRadius: 16,
    backgroundColor: "#DDF6F4",
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
    borderColor: "#BDEAE7",
  },
  finishButtonText: { fontSize: 15, fontWeight: "700", color: MC.primaryDark },
});
