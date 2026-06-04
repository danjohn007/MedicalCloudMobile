import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/components/Icon";
import { MC } from "@/constants/theme";
import * as api from "@/services/api";

export default function ExpedienteScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<api.ExpedienteData | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const result = await api.getExpediente();
      setData(result);
    } catch (e: any) {
      setError(e.message ?? "Error al cargar expediente");
    } finally { setLoading(false); }
  };

  const record = data?.record;
  const consultations = data?.consultations ?? [];

  const activeFamilyConditions = record ? [
    { key: "fam_diabetes", label: "Diabetes" },
    { key: "fam_hypertension", label: "Hipertensión" },
    { key: "fam_cancer", label: "Cáncer" },
    { key: "fam_heart_disease", label: "Enfermedad cardíaca" },
    { key: "fam_stroke", label: "ACV / Embolia" },
    { key: "fam_mental_health", label: "Salud mental" },
    { key: "fam_kidney_disease", label: "Enfermedad renal" },
  ].filter(c => record[c.key] == 1) : [];

  const activePersonalConditions = record ? [
    { key: "personal_diabetes", label: "Diabetes" },
    { key: "personal_hypertension", label: "Hipertensión" },
    { key: "personal_heart_disease", label: "Enfermedad cardíaca" },
    { key: "personal_asthma", label: "Asma" },
    { key: "personal_depression", label: "Depresión" },
    { key: "personal_anxiety", label: "Ansiedad" },
    { key: "personal_thyroid", label: "Tiroides" },
    { key: "personal_kidney_disease", label: "Enfermedad renal" },
  ].filter(c => record[c.key] == 1) : [];

  const activeVaccines = record ? [
    { key: "vax_covid", label: "COVID-19" },
    { key: "vax_influenza", label: "Influenza" },
    { key: "vax_hepatitis_b", label: "Hepatitis B" },
    { key: "vax_tetanus", label: "Tétanos" },
    { key: "vax_measles", label: "Sarampión" },
    { key: "vax_varicella", label: "Varicela" },
    { key: "vax_pneumococcal", label: "Neumococo" },
    { key: "vax_hpv", label: "HPV" },
  ].filter(c => record[c.key] == 1) : [];

  if (loading) return (
    <SafeAreaView style={s.ct} edges={["top"]}>
      <View style={s.center}><ActivityIndicator size="large" color={MC.primary} /></View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={s.ct} edges={["top"]}>
      <View style={s.hdr}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Icon name="arrow-left" size={22} color={MC.textPrimary} />
        </Pressable>
        <Text style={s.hdrTitle}>Mi Expediente</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollCt}>
        {error ? (
          <View style={s.errBox}><Icon name="warning" size={16} color={MC.error} /><Text style={s.errTxt}>{error}</Text></View>
        ) : null}

        {/* Antecedentes Familiares */}
        <Section title="Antecedentes Familiares" icon="users">
          {activeFamilyConditions.length > 0 ? (
            activeFamilyConditions.map(c => (
              <Tag key={c.key} label={c.label} color={MC.error} />
            ))
          ) : <Text style={s.emptyText}>No registrados</Text>}
          {record?.fam_other ? <Text style={s.otherText}>Otro: {record.fam_other}</Text> : null}
        </Section>

        {/* Antecedentes Personales */}
        <Section title="Antecedentes Personales" icon="user">
          {activePersonalConditions.length > 0 ? (
            activePersonalConditions.map(c => (
              <Tag key={c.key} label={c.label} color="#F59E0B" />
            ))
          ) : <Text style={s.emptyText}>No registrados</Text>}
          {record?.personal_other ? <Text style={s.otherText}>Otro: {record.personal_other}</Text> : null}
        </Section>

        {/* Alergias */}
        <Section title="Alergias" icon="warning">
          {record?.allergies ? (
            <Text style={s.valueText}>{record.allergies}</Text>
          ) : <Text style={s.emptyText}>No registradas</Text>}
          {record?.allergy_reactions ? <Text style={s.otherText}>Reacciones: {record.allergy_reactions}</Text> : null}
        </Section>

        {/* Medicamentos Actuales */}
        <Section title="Medicamentos Actuales" icon="pill">
          {record?.current_medications ? (
            <Text style={s.valueText}>{record.current_medications}</Text>
          ) : <Text style={s.emptyText}>Ninguno registrado</Text>}
        </Section>

        {/* Cirugías y Hospitalizaciones */}
        <Section title="Cirugías y Hospitalizaciones" icon="first-aid">
          {record?.previous_surgeries ? (
            <Text style={s.valueText}>Cirugías: {record.previous_surgeries}</Text>
          ) : null}
          {record?.hospitalizations ? (
            <Text style={s.valueText}>Hospitalizaciones: {record.hospitalizations}</Text>
          ) : null}
          {!record?.previous_surgeries && !record?.hospitalizations ? (
            <Text style={s.emptyText}>No registradas</Text>
          ) : null}
        </Section>

        {/* Vacunas */}
        <Section title="Vacunas" icon="syringe">
          {activeVaccines.length > 0 ? (
            activeVaccines.map(c => (
              <Tag key={c.key} label={c.label} color={MC.success} />
            ))
          ) : <Text style={s.emptyText}>No registradas</Text>}
          {record?.vax_notes ? <Text style={s.otherText}>Notas: {record.vax_notes}</Text> : null}
        </Section>

        {/* Historial de Consultas */}
        <Section title="Historial de Consultas" icon="clipboard-text">
          {consultations.length > 0 ? consultations.map((c, i) => (
            <View key={c.id ?? i} style={s.consultCard}>
              <View style={s.consultHdr}>
                <Text style={s.consultDate}>{c.created_at?.slice(0, 10)}</Text>
                {c.signed_at ? <Tag label="Firmada" color={MC.success} small /> : <Tag label="Borrador" color="#F59E0B" small />}
              </View>
              {c.diagnosis_text ? <Text style={s.consultDiag}>{c.diagnosis_text}</Text> : null}
              {c.assessment ? <Text style={s.consultText} numberOfLines={3}>{c.assessment}</Text> : null}
              <Text style={s.consultDoc}>Dr(a). {c.doctor_name}</Text>
            </View>
          )) : <Text style={s.emptyText}>Aún no tienes consultas registradas.</Text>}
        </Section>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <View style={s.sec}>
      <View style={s.secHdr}>
        <View style={s.secIcon}><Icon name={icon} size={20} color={MC.primary} /></View>
        <Text style={s.secTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Tag({ label, color, small }: { label: string; color: string; small?: boolean }) {
  return (
    <View style={[s.tag, { backgroundColor: color + "18" }, small && s.tagSmall]}>
      <Text style={[s.tagTxt, { color }, small && s.tagTxtSmall]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  ct: { flex: 1, backgroundColor: MC.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  hdr: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: MC.border },
  hdrTitle: { fontSize: 18, fontWeight: "700", color: MC.textPrimary },
  scroll: { flex: 1 }, scrollCt: { padding: 16 },
  errBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FEE2E2", padding: 12, borderRadius: 10, marginBottom: 12 },
  errTxt: { color: MC.error, fontSize: 13, flex: 1 },
  sec: { backgroundColor: MC.background, borderRadius: 16, borderWidth: 1, borderColor: MC.border, padding: 16, marginBottom: 16 },
  secHdr: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 10 },
  secIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: MC.primaryLight, justifyContent: "center", alignItems: "center" },
  secTitle: { fontSize: 16, fontWeight: "700", color: MC.textPrimary },
  tag: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginBottom: 6, marginRight: 6 },
  tagSmall: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  tagTxt: { fontSize: 13, fontWeight: "600" },
  tagTxtSmall: { fontSize: 11 },
  emptyText: { fontSize: 13, color: MC.textMuted, fontStyle: "italic" },
  valueText: { fontSize: 14, color: MC.textPrimary, lineHeight: 20, marginBottom: 4 },
  otherText: { fontSize: 12, color: MC.textSecondary, marginTop: 4 },
  consultCard: { borderWidth: 1, borderColor: MC.border, borderRadius: 12, padding: 12, marginBottom: 10 },
  consultHdr: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  consultDate: { fontSize: 13, fontWeight: "700", color: MC.textPrimary },
  consultDiag: { fontSize: 14, fontWeight: "600", color: MC.primary, marginBottom: 4 },
  consultText: { fontSize: 12, color: MC.textSecondary, lineHeight: 18 },
  consultDoc: { fontSize: 11, color: MC.textMuted, marginTop: 6, fontStyle: "italic" },
});