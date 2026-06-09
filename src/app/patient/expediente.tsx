import { Icon } from "@/components/Icon";
import { MC } from "@/constants/theme";
import * as api from "@/services/api";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ExpedienteScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [record, setRecord] = useState<Record<string, any>>({});
  const [consultations, setConsultations] = useState<any[]>([]);
  const [historyEntries, setHistoryEntries] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const result = await api.getExpediente();
      setRecord(result.record ?? {});
      setConsultations(result.consultations ?? []);
      setHistoryEntries(result.history ?? []);
      setPrescriptions(result.prescriptions ?? []);
    } catch (e: any) {
      setError(e.message ?? "Error al cargar expediente");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      await api.updateExpediente(record);
      setSuccess("Expediente guardado correctamente.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(e.message ?? "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const toggle = (key: string) =>
    setRecord((prev: any) => ({ ...prev, [key]: prev[key] ? 0 : 1 }));

  const set = (key: string, val: any) =>
    setRecord((prev: any) => ({ ...prev, [key]: val }));

  if (loading)
    return (
      <SafeAreaView style={s.ct} edges={["top"]}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={MC.primary} />
        </View>
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={s.ct} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={s.hdr}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Icon name="arrow-left" size={22} color={MC.textPrimary} />
          </Pressable>
          <Text style={s.hdrTitle}>Mi Expediente</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView style={s.scroll} contentContainerStyle={s.scrollCt}>
          {error ? (
            <View style={s.errBox}>
              <Icon name="warning" size={16} color={MC.error} />
              <Text style={s.errTxt}>{error}</Text>
            </View>
          ) : null}
          {success ? (
            <View style={s.okBox}>
              <Icon name="check-circle" size={16} color={MC.success} />
              <Text style={s.okTxt}>{success}</Text>
            </View>
          ) : null}

          {/* Antecedentes Familiares */}
          <Card
            icon="users"
            title="Antecedentes Familiares"
            subtitle="Enfermedades en familiares directos (padres, hermanos, abuelos)"
          >
            <Text style={s.hint}>
              Estos datos ayudan a identificar predisposición genética a ciertas
              enfermedades.
            </Text>
            <ChipGrid>
              {[
                "Diabetes",
                "Hipertensión",
                "Cáncer",
                "Enf. cardíaca",
                "ACV/Embolia",
                "Salud mental",
                "Enf. renal",
              ].map((l, i) => {
                const keys = [
                  "fam_diabetes",
                  "fam_hypertension",
                  "fam_cancer",
                  "fam_heart_disease",
                  "fam_stroke",
                  "fam_mental_health",
                  "fam_kidney_disease",
                ];
                return (
                  <Chip
                    key={keys[i]}
                    label={l}
                    active={record[keys[i]]}
                    onPress={() => toggle(keys[i])}
                    color={MC.error}
                  />
                );
              })}
            </ChipGrid>
            <Lbl t="OTROS (ESPECIFICAR)" />
            <Input
              v={record.fam_other ?? ""}
              onChangeText={(t) => set("fam_other", t)}
              ph="Ej: Parkinson, Alzheimer"
            />
          </Card>

          {/* Antecedentes Personales */}
          <Card
            icon="user"
            title="Antecedentes Personales"
            subtitle="Tus condiciones médicas actuales o pasadas"
          >
            <Text style={s.hint}>
              Marca todas las condiciones que hayas sido diagnosticado(a). Tus
              doctores podrán ver esta información automáticamente.
            </Text>
            <ChipGrid>
              {[
                "Diabetes",
                "Hipertensión",
                "Enf. cardíaca",
                "Cáncer",
                "Asma",
                "Epilepsia",
                "Tiroides",
                "Artritis",
                "Depresión",
                "Ansiedad",
                "Enf. renal",
              ].map((l, i) => {
                const keys = [
                  "personal_diabetes",
                  "personal_hypertension",
                  "personal_heart_disease",
                  "personal_cancer",
                  "personal_asthma",
                  "personal_epilepsy",
                  "personal_thyroid",
                  "personal_arthritis",
                  "personal_depression",
                  "personal_anxiety",
                  "personal_kidney_disease",
                ];
                return (
                  <Chip
                    key={keys[i]}
                    label={l}
                    active={record[keys[i]]}
                    onPress={() => toggle(keys[i])}
                    color="#F59E0B"
                  />
                );
              })}
            </ChipGrid>
            <Lbl t="OTROS" />
            <Input
              v={record.personal_other ?? ""}
              onChangeText={(t) => set("personal_other", t)}
              ph="Otras condiciones"
            />
          </Card>

          {/* Alergias */}
          <Card
            icon="warning"
            title="Alergias"
            subtitle="Medicamentos, alimentos, látex u otros"
          >
            <Text style={s.hint}>
              Indica qué sustancias te causan alergia y qué reacción presentas.
              Esto es crítico para evitar reacciones adversas a medicamentos.
            </Text>
            <Lbl t="ALERGIAS CONOCIDAS" />
            <Input
              v={record.allergies ?? ""}
              onChangeText={(t) => set("allergies", t)}
              ph="Ej: Penicilina, mariscos, polen"
              multiline
            />
            <Lbl t="REACCIONES" />
            <Input
              v={record.allergy_reactions ?? ""}
              onChangeText={(t) => set("allergy_reactions", t)}
              ph="Ej: Urticaria, dificultad para respirar"
              multiline
            />
          </Card>

          {/* Medicamentos */}
          <Card
            icon="pill"
            title="Medicamentos Actuales"
            subtitle="Todos los medicamentos que tomas regularmente"
          >
            <Text style={s.hint}>
              Incluye dosis y frecuencia si es posible. Actualiza esta lista
              cuando tu médico cambie tu tratamiento.
            </Text>
            <Input
              v={record.current_medications ?? ""}
              onChangeText={(t) => set("current_medications", t)}
              ph="Ej: Losartán 50mg cada 24h, Metformina 850mg c/12h"
              multiline
            />
          </Card>

          {/* Cirugías y Hospitalizaciones */}
          <Card
            icon="first-aid"
            title="Cirugías y Hospitalizaciones"
            subtitle="Cirugías previas, hospitalizaciones y transfusiones"
          >
            <Text style={s.hint}>
              Información relevante para planificar anestesia, evaluar riesgos
              quirúrgicos y conocer tu historial clínico completo.
            </Text>
            <Lbl t="CIRUGÍAS PREVIAS" />
            <Input
              v={record.previous_surgeries ?? ""}
              onChangeText={(t) => set("previous_surgeries", t)}
              ph="Ej: Apendicectomía 2018, Cesárea 2020"
              multiline
            />
            <Lbl t="HOSPITALIZACIONES" />
            <Input
              v={record.hospitalizations ?? ""}
              onChangeText={(t) => set("hospitalizations", t)}
              ph="Hospitalizaciones importantes"
              multiline
            />
            <Lbl t="TRANSFUSIONES SANGUÍNEAS" />
            <Input
              v={record.blood_transfusions ?? ""}
              onChangeText={(t) => set("blood_transfusions", t)}
              ph="Ej: 2 unidades en 2019"
            />
          </Card>

          {/* Vacunas */}
          <Card icon="syringe" title="Vacunas" subtitle="Esquema de vacunación">
            <Text style={s.hint}>
              Marca las vacunas que has recibido. Ayuda a identificar si
              necesitas refuerzos o vacunas faltantes.
            </Text>
            <ChipGrid>
              {[
                "COVID-19",
                "Influenza",
                "Hepatitis B",
                "Tétanos",
                "Sarampión",
                "Varicela",
                "Neumococo",
                "HPV",
              ].map((l, i) => {
                const keys = [
                  "vax_covid",
                  "vax_influenza",
                  "vax_hepatitis_b",
                  "vax_tetanus",
                  "vax_measles",
                  "vax_varicella",
                  "vax_pneumococcal",
                  "vax_hpv",
                ];
                return (
                  <Chip
                    key={keys[i]}
                    label={l}
                    active={record[keys[i]]}
                    onPress={() => toggle(keys[i])}
                    color={MC.success}
                  />
                );
              })}
            </ChipGrid>
            <Lbl t="NOTAS SOBRE VACUNAS" />
            <Input
              v={record.vax_notes ?? ""}
              onChangeText={(t) => set("vax_notes", t)}
              ph="Ej: Pendiente refuerzo tétanos 2025"
              multiline
            />
          </Card>

          {/* Estilo de vida */}
          <Card
            icon="heart"
            title="Estilo de Vida"
            subtitle="Tabaquismo, alcohol, ejercicio, alimentación y sueño"
          >
            <Text style={s.hint}>
              Estos factores impactan directamente tu salud. Sé honesto(a) — tus
              respuestas son confidenciales y ayudan a tu médico a darte el
              mejor tratamiento.
            </Text>

            <Lbl t="TABAQUISMO" />
            <Row>
              {["Nunca", "Ex-fumador", "Ocasional", "Diario"].map((o, i) => {
                const vals = ["never", "ex", "occasional", "daily"];
                return (
                  <Chip
                    key={vals[i]}
                    label={o}
                    active={record.smoking === vals[i]}
                    onPress={() => set("smoking", vals[i])}
                    color={MC.error}
                  />
                );
              })}
            </Row>
            {record.smoking === "daily" || record.smoking === "occasional" ? (
              <>
                <Row>
                  <Col>
                    <Lbl t="CANTIDAD (DÍA)" />
                    <Input
                      v={record.smoking_qty ?? ""}
                      onChangeText={(t) => set("smoking_qty", t)}
                      ph="Ej: 5 cigarros"
                      kb="numeric"
                    />
                  </Col>
                  <Col>
                    <Lbl t="AÑOS FUMANDO" />
                    <Input
                      v={record.smoking_years ?? ""}
                      onChangeText={(t) => set("smoking_years", t)}
                      ph="Ej: 10"
                      kb="numeric"
                    />
                  </Col>
                </Row>
              </>
            ) : null}

            <Lbl t="ALCOHOL" />
            <Row>
              {["Nunca", "Ocasional", "Frecuente"].map((o, i) => {
                const vals = ["never", "occasional", "frequent"];
                return (
                  <Chip
                    key={vals[i]}
                    label={o}
                    active={record.alcohol === vals[i]}
                    onPress={() => set("alcohol", vals[i])}
                    color="#F59E0B"
                  />
                );
              })}
            </Row>
            {record.alcohol === "occasional" ||
            record.alcohol === "frequent" ? (
              <>
                <Lbl t="FRECUENCIA/CANTIDAD" />
                <Input
                  v={record.alcohol_qty ?? ""}
                  onChangeText={(t) => set("alcohol_qty", t)}
                  ph="Ej: 2-3 copas los fines de semana"
                />
              </>
            ) : null}

            <Lbl t="CONSUMO DE DROGAS" />
            <Row>
              <Chip
                label="Sí"
                active={record.drugs == 1}
                onPress={() => set("drugs", record.drugs ? 0 : 1)}
                color={MC.error}
              />
              <Chip
                label="No"
                active={record.drugs == 0 || !record.drugs}
                onPress={() => set("drugs", 0)}
                color={MC.success}
              />
            </Row>
            {record.drugs == 1 ? (
              <>
                <Lbl t="DETALLE" />
                <Input
                  v={record.drugs_detail ?? ""}
                  onChangeText={(t) => set("drugs_detail", t)}
                  ph="Sustancia, frecuencia"
                />
              </>
            ) : null}

            <Lbl t="EJERCICIO" />
            <Row>
              {["Ninguno", "Ligero", "Moderado", "Intenso"].map((o, i) => {
                const vals = ["none", "light", "moderate", "intense"];
                return (
                  <Chip
                    key={vals[i]}
                    label={o}
                    active={record.exercise === vals[i]}
                    onPress={() => set("exercise", vals[i])}
                    color={MC.primary}
                  />
                );
              })}
            </Row>
            {record.exercise !== "none" ? (
              <>
                <Lbl t="HORAS/SEMANA" />
                <Input
                  v={record.exercise_hours_week ?? ""}
                  onChangeText={(t) => set("exercise_hours_week", t)}
                  ph="Ej: 3"
                  kb="numeric"
                />
              </>
            ) : null}

            <Lbl t="TIPO DE DIETA" />
            <Input
              v={record.diet_type ?? ""}
              onChangeText={(t) => set("diet_type", t)}
              ph="Ej: Omnívora, Vegetariana, Vegana"
            />
            <Lbl t="DETALLE DE ALIMENTACIÓN" />
            <Input
              v={record.diet_detail ?? ""}
              onChangeText={(t) => set("diet_detail", t)}
              ph="Observaciones sobre tu alimentación"
              multiline
            />

            <Lbl t="HORAS DE SUEÑO (PROMEDIO)" />
            <Input
              v={record.sleep_hours ?? ""}
              onChangeText={(t) => set("sleep_hours", t)}
              ph="Ej: 7"
              kb="numeric"
            />
            <Lbl t="NIVEL DE ESTRÉS" />
            <Row>
              {["Bajo", "Moderado", "Alto", "Severo"].map((o, i) => {
                const vals = ["low", "moderate", "high", "severe"];
                return (
                  <Chip
                    key={vals[i]}
                    label={o}
                    active={record.stress_level === vals[i]}
                    onPress={() => set("stress_level", vals[i])}
                    color={MC.error}
                  />
                );
              })}
            </Row>
          </Card>

          {/* Salud Mental */}
          <Card
            icon="brain"
            title="Salud Mental"
            subtitle="Diagnósticos y tratamientos de salud mental"
          >
            <Text style={s.hint}>
              La salud mental es parte fundamental de tu bienestar. Compartir
              esta información permite a tu médico darte una atención integral.
            </Text>
            <Row>
              <Chip
                label="Diagnóstico de salud mental"
                active={record.mental_health_diagnosis == 1}
                onPress={() => toggle("mental_health_diagnosis")}
                color={MC.error}
              />
            </Row>
            {record.mental_health_diagnosis == 1 ? (
              <>
                <Lbl t="DETALLE" />
                <Input
                  v={record.mental_health_detail ?? ""}
                  onChangeText={(t) => set("mental_health_detail", t)}
                  ph="Ej: Trastorno de ansiedad generalizada"
                  multiline
                />
                <Row>
                  <Chip
                    label="En tratamiento"
                    active={record.mental_health_treatment == 1}
                    onPress={() => toggle("mental_health_treatment")}
                    color={MC.success}
                  />
                </Row>
                {record.mental_health_treatment == 1 ? (
                  <>
                    <Lbl t="MEDICACIÓN" />
                    <Input
                      v={record.mental_health_medication ?? ""}
                      onChangeText={(t) => set("mental_health_medication", t)}
                      ph="Medicamentos recetados"
                    />
                  </>
                ) : null}
              </>
            ) : null}
          </Card>

          {/* Discapacidades */}
          <Card
            icon="eye"
            title="Discapacidades"
            subtitle="Discapacidades visuales, auditivas, físicas y uso de ayudas técnicas"
          >
            <Text style={s.hint}>
              Información importante para adecuar la atención médica a tus
              necesidades específicas.
            </Text>
            <Row>
              <Chip
                label="Usa lentes/contactos"
                active={record.uses_glasses == 1}
                onPress={() => toggle("uses_glasses")}
                color={MC.primary}
              />
              <Chip
                label="Auxiliar auditivo"
                active={record.uses_hearing_aid == 1}
                onPress={() => toggle("uses_hearing_aid")}
                color={MC.primary}
              />
            </Row>
            <Row>
              <Chip
                label="Usa silla de ruedas"
                active={record.uses_wheelchair == 1}
                onPress={() => toggle("uses_wheelchair")}
                color={MC.primary}
              />
            </Row>
            <Lbl t="DISCAPACIDAD FÍSICA" />
            <Input
              v={record.physical_disability ?? ""}
              onChangeText={(t) => set("physical_disability", t)}
              ph="Ej: Parálisis parcial pierna izquierda"
              multiline
            />
            <Lbl t="PRÓTESIS" />
            <Input
              v={record.uses_prosthesis ?? ""}
              onChangeText={(t) => set("uses_prosthesis", t)}
              ph="Ej: Prótesis dental, extremidad"
            />
          </Card>

          {/* Historial de Consultas */}
          <Card
            icon="clipboard-text"
            title="Historial de Consultas"
            subtitle="Tus consultas previas registradas por los doctores"
          >
            {consultations.length > 0 ? (
              consultations.map((c: any, i: number) => (
                <View key={c.id ?? i} style={s.consultCard}>
                  <View style={s.consultHdr}>
                    <Text style={s.consultDate}>
                      {c.created_at?.slice(0, 10)}
                    </Text>
                    <Text style={s.consultStatus}>
                      {c.signed_at ? "Firmada" : "Borrador"}
                    </Text>
                  </View>
                  {c.diagnosis_text ? (
                    <Text style={s.consultDiag}>{c.diagnosis_text}</Text>
                  ) : null}
                  {c.assessment ? (
                    <Text style={s.consultText} numberOfLines={3}>
                      {c.assessment}
                    </Text>
                  ) : null}
                  <Text style={s.consultDoc}>Dr(a). {c.doctor_name}</Text>
                </View>
              ))
            ) : (
              <Text style={s.emptyText}>
                Aún no tienes consultas registradas.
              </Text>
            )}
          </Card>

          {/* Entradas de historial clinico */}
          <Card
            icon="list"
            title="Historial Clínico"
            subtitle="Eventos y diagnósticos históricos"
          >
            {historyEntries.length > 0 ? (
              historyEntries.map((h: any, i: number) => (
                <View key={h.id ?? i} style={s.consultCard}>
                  <View style={s.consultHdr}>
                    <Text style={s.consultDate}>
                      {(h.entry_date ?? h.date_recorded ?? "").slice(0, 10)}
                    </Text>
                    <Text style={s.consultStatus}>
                      {h.category ?? "registro"}
                    </Text>
                  </View>
                  {h.description ? (
                    <Text style={s.consultText}>{h.description}</Text>
                  ) : null}
                  <Text style={s.consultDoc}>
                    Dr(a). {h.doctor_name ?? "—"}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={s.emptyText}>
                No hay entradas de historial clínico.
              </Text>
            )}
          </Card>

          {/* Recetas */}
          <Card
            icon="pill"
            title="Recetas"
            subtitle="Recetas médicas emitidas por tus doctores"
          >
            {prescriptions.length > 0 ? (
              prescriptions.map((p: any, i: number) => (
                <View key={p.id ?? i} style={s.consultCard}>
                  <View style={s.consultHdr}>
                    <Text style={s.consultDate}>
                      {(p.issued_date ?? p.created_at ?? "").slice(0, 10)}
                    </Text>
                    <Text style={s.consultStatus}>{p.status ?? "active"}</Text>
                  </View>
                  {p.diagnosis ? (
                    <Text style={s.consultDiag}>{p.diagnosis}</Text>
                  ) : null}
                  {p.medications ? (
                    <Text style={s.consultText}>{p.medications}</Text>
                  ) : null}
                  <Text style={s.consultDoc}>
                    Dr(a). {p.doctor_name ?? "—"}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={s.emptyText}>No hay recetas registradas.</Text>
            )}
          </Card>

          {/* Save */}
          <View style={s.actions}>
            <Pressable style={s.cancelBtn} onPress={() => router.back()}>
              <Text style={s.cancelTxt}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[s.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={MC.white} size="small" />
              ) : (
                <Text style={s.saveTxt}>Guardar expediente</Text>
              )}
            </Pressable>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Card({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: any;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <View style={s.sec}>
      <View style={s.secHdr}>
        <View style={s.secIcon}>
          <Icon name={icon} size={20} color={MC.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.secTitle}>{title}</Text>
          <Text style={s.secSub}>{subtitle}</Text>
        </View>
      </View>
      {children}
    </View>
  );
}

function Lbl({ t }: { t: string }) {
  return <Text style={s.lbl}>{t}</Text>;
}
function Row({ children }: { children: React.ReactNode }) {
  return <View style={s.row}>{children}</View>;
}
function Col({ children }: { children: React.ReactNode }) {
  return <View style={s.col}>{children}</View>;
}
function ChipGrid({ children }: { children: React.ReactNode }) {
  return <View style={s.chipGrid}>{children}</View>;
}

function Chip({
  label,
  active,
  onPress,
  color,
}: {
  label: string;
  active?: any;
  onPress: () => void;
  color: string;
}) {
  return (
    <Pressable
      style={[
        s.chip,
        active ? { backgroundColor: color, borderColor: color } : {},
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          s.chipTxt,
          { color: active ? MC.white : color },
          active && { fontWeight: "700" },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Input({
  v,
  onChangeText,
  ph,
  kb,
  multiline,
}: {
  v: string;
  onChangeText: (t: string) => void;
  ph: string;
  kb?: any;
  multiline?: boolean;
}) {
  return (
    <TextInput
      style={[s.input, multiline && { minHeight: 70 }]}
      value={v}
      onChangeText={onChangeText}
      placeholder={ph}
      keyboardType={kb}
      multiline={multiline}
      textAlignVertical={multiline ? "top" : undefined}
    />
  );
}

const s = StyleSheet.create({
  ct: { flex: 1, backgroundColor: MC.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  hdr: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: MC.border,
  },
  hdrTitle: { fontSize: 18, fontWeight: "700", color: MC.textPrimary },
  scroll: { flex: 1 },
  scrollCt: { padding: 16 },
  errBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEE2E2",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  errTxt: { color: MC.error, fontSize: 13, flex: 1 },
  okBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#D1FAE5",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  okTxt: { color: MC.success, fontSize: 13, flex: 1 },
  sec: {
    backgroundColor: MC.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MC.border,
    padding: 16,
    marginBottom: 16,
  },
  secHdr: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  secIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: MC.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  secTitle: { fontSize: 16, fontWeight: "700", color: MC.textPrimary },
  secSub: { fontSize: 12, color: MC.textSecondary, marginTop: 2 },
  hint: {
    fontSize: 11,
    color: MC.textMuted,
    marginBottom: 10,
    lineHeight: 16,
    fontStyle: "italic",
  },
  lbl: {
    fontSize: 11,
    fontWeight: "700",
    color: MC.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: MC.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: MC.textPrimary,
    backgroundColor: MC.background,
    marginBottom: 4,
  },
  row: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 4 },
  col: { flex: 1 },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.background,
  },
  chipTxt: { fontSize: 13, fontWeight: "500" },
  emptyText: { fontSize: 13, color: MC.textMuted, fontStyle: "italic" },
  consultCard: {
    borderWidth: 1,
    borderColor: MC.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  consultHdr: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  consultDate: { fontSize: 13, fontWeight: "700", color: MC.textPrimary },
  consultStatus: { fontSize: 11, fontWeight: "600", color: MC.textMuted },
  consultDiag: {
    fontSize: 14,
    fontWeight: "600",
    color: MC.primary,
    marginBottom: 4,
  },
  consultText: { fontSize: 12, color: MC.textSecondary, lineHeight: 18 },
  consultDoc: {
    fontSize: 11,
    color: MC.textMuted,
    marginTop: 6,
    fontStyle: "italic",
  },
  actions: { flexDirection: "row", gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: MC.border,
    alignItems: "center",
  },
  cancelTxt: { fontSize: 15, fontWeight: "600", color: MC.textSecondary },
  saveBtn: {
    flex: 1.5,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: MC.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  saveTxt: { fontSize: 15, fontWeight: "700", color: MC.white },
});
