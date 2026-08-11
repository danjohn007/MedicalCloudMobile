import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
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

const WEEKDAYS = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const TYPE_OPTIONS: { label: string; value: "presential" | "virtual" }[] = [
  { label: "Presencial", value: "presential" },
  { label: "Videoconsulta", value: "virtual" },
];

type PriceAdjustmentType = "none" | "fixed" | "percent_discount" | "percent_increase";

const PRICE_ADJUSTMENT_OPTIONS: { label: string; value: PriceAdjustmentType }[] = [
  { label: "Normal", value: "none" },
  { label: "Monto exacto", value: "fixed" },
  { label: "Descuento %", value: "percent_discount" },
  { label: "Aumento %", value: "percent_increase" },
];

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

export default function DoctorCreateAppointmentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ patientId?: string | string[] }>();
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [error, setError] = useState("");
  const [doctorId, setDoctorId] = useState(0);
  const [doctorProfile, setDoctorProfile] = useState<api.Doctor | null>(null);
  const [patients, setPatients] = useState<api.DoctorPatientSummary[]>([]);
  const [search, setSearch] = useState("");
  const [expandedPatients, setExpandedPatients] = useState(false);
  const [patientId, setPatientId] = useState(0);
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState(toDateValue(today));
  const [selectedTime, setSelectedTime] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [type, setType] = useState<"presential" | "virtual">("presential");
  const [waivePayment, setWaivePayment] = useState(false);
  const [priceAdjustmentType, setPriceAdjustmentType] = useState<PriceAdjustmentType>("none");
  const [priceAdjustmentValue, setPriceAdjustmentValue] = useState("");
  const [priceAdjustmentNote, setPriceAdjustmentNote] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        setLoading(true);
        setError("");
        const [dashboard, patientResponse] = await Promise.all([
          api.getDoctorDashboard(),
          api.getDoctorPatients(),
        ]);

        if (cancelled) return;

        const nextDoctorId = Number(dashboard.doctor.id || 0);
        const nextPatients = patientResponse.data || [];
        const requestedPatientId = Number(
          Array.isArray(params.patientId) ? params.patientId[0] : params.patientId,
        );

        setDoctorId(nextDoctorId);
        setPatients(nextPatients);

        const sorted = sortPatients(nextPatients);
        setPatientId((current) => {
          if (current) return current;
          if (requestedPatientId > 0 && sorted.some((patient) => patient.id === requestedPatientId)) {
            return requestedPatientId;
          }
          return Number(sorted[0]?.id || 0);
        });

        if (nextDoctorId > 0) {
          const profileResponse = await api.getDoctorProfile(nextDoctorId);
          if (cancelled) return;
          setDoctorProfile(profileResponse.data);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "No se pudo preparar la nueva cita.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [params.patientId]);

  useEffect(() => {
    if (!doctorId || !selectedDate) return;

    let cancelled = false;

    const loadSlots = async () => {
      try {
        setSlotsLoading(true);
        setError("");
        const response = await api.getDoctorAvailability(doctorId, selectedDate);
        if (cancelled) return;
        const nextSlots = response.slots || [];
        setSlots(nextSlots);
        setSelectedTime((current) =>
          nextSlots.includes(current) ? current : String(nextSlots[0] || ""),
        );
      } catch (e: any) {
        if (cancelled) return;
        setSlots([]);
        setSelectedTime("");
        setError(e?.message || "No se pudieron cargar los horarios.");
      } finally {
        if (!cancelled) {
          setSlotsLoading(false);
        }
      }
    };

    void loadSlots();

    return () => {
      cancelled = true;
    };
  }, [doctorId, selectedDate]);

  const sortedPatients = useMemo(() => sortPatients(patients), [patients]);
  const featuredPatients = useMemo(() => sortedPatients.slice(0, 6), [sortedPatients]);

  const filteredPatients = useMemo(() => {
    const query = normalizeText(search);
    if (!query) return sortedPatients;

    return sortedPatients.filter((patient) => {
      const haystack = normalizeText(
        `${patient.name} ${patient.phone || ""} ${patient.email || ""}`,
      );
      return haystack.includes(query);
    });
  }, [search, sortedPatients]);

  const visiblePatients = useMemo(() => {
    if (search.trim()) return filteredPatients;
    return expandedPatients ? sortedPatients : featuredPatients;
  }, [search, filteredPatients, expandedPatients, sortedPatients, featuredPatients]);

  const selectedPatient =
    sortedPatients.find((patient) => patient.id === patientId) || null;

  const feePreview = useMemo(() => {
    return resolveDoctorFee(
      doctorProfile,
      type,
      waivePayment,
      priceAdjustmentType,
      Number(priceAdjustmentValue || 0),
    );
  }, [doctorProfile, type, waivePayment, priceAdjustmentType, priceAdjustmentValue]);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  async function handleSelectDate(day: number) {
    const nextDate = formatDate(currentYear, currentMonth, day);
    setSelectedDate(nextDate);
  }

  function prevMonth() {
    setSelectedDate("");
    setSelectedTime("");
    setSlots([]);
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((year) => year - 1);
      return;
    }
    setCurrentMonth((month) => month - 1);
  }

  function nextMonth() {
    setSelectedDate("");
    setSelectedTime("");
    setSlots([]);
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((year) => year + 1);
      return;
    }
    setCurrentMonth((month) => month + 1);
  }

  async function handleCreate() {
    if (!patientId || !selectedDate || !selectedTime || !reason.trim()) {
      Alert.alert("Faltan datos", "Selecciona paciente, fecha, horario y motivo.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      const response = await api.createDoctorAppointment({
        patient_id: patientId,
        date: selectedDate,
        time: selectedTime,
        type,
        reason: reason.trim(),
        notes: notes.trim(),
        waive_payment: waivePayment,
        price_adjustment_type: priceAdjustmentType,
        price_adjustment_value: Number(priceAdjustmentValue || 0),
        price_adjustment_note: priceAdjustmentNote.trim(),
      });

      Alert.alert(
        "Cita creada",
        response.message ||
          (response.payment_status === "pending"
            ? "La cita quedó pendiente de pago para el paciente."
            : "La cita quedó confirmada sin cobro."),
      );

      router.replace(`/doctor/appointments/${response.id}` as any);
    } catch (e: any) {
      setError(e?.message || "No se pudo crear la cita.");
    } finally {
      setSaving(false);
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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Icon name="arrow-left" size={22} color={MC.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Nueva cita</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>Agenda desde doctor</Text>
          <Text style={styles.heroTitle}>Crear cita para paciente</Text>
          <Text style={styles.heroSubtitle}>
            Primero elige un paciente ya vinculado, luego fecha, horario y forma de cobro.
          </Text>
        </View>

        <Pressable
          onPress={() => router.push("/doctor/patients/link" as any)}
          style={styles.linkButton}
        >
          <Icon name="shield-check" size={16} color={MC.white} />
          <Text style={styles.linkButtonText}>Vincular o registrar paciente</Text>
        </Pressable>

        {error ? (
          <View style={styles.errorBox}>
            <Icon name="warning" size={18} color={MC.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <StepCard
          step="01"
          title="Paciente"
          subtitle="Muestra primero tus pacientes más frecuentes y recientes. Puedes expandir o buscar por nombre o teléfono."
        >
          {selectedPatient ? (
            <View style={styles.selectedPatientCard}>
              <View style={styles.selectedPatientIcon}>
                <Icon name="user-circle" size={20} color={MC.primaryDark} />
              </View>
              <View style={styles.selectedPatientBody}>
                <Text style={styles.selectedPatientLabel}>Paciente seleccionado</Text>
                <Text style={styles.selectedPatientName}>{selectedPatient.name}</Text>
                <Text style={styles.selectedPatientMeta}>
                  {selectedPatient.phone || selectedPatient.email || "Paciente"} |{" "}
                  {selectedPatient.total_appointments} citas
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.searchWrap}>
            <Icon name="magnifying-glass" size={18} color={MC.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar por nombre o teléfono"
              placeholderTextColor={MC.textMuted}
              style={styles.searchInput}
            />
          </View>

          {visiblePatients.length ? (
            <View style={styles.patientGrid}>
              {visiblePatients.map((patient) => {
                const active = patient.id === patientId;
                return (
                  <Pressable
                    key={patient.id}
                    onPress={() => setPatientId(patient.id)}
                    style={[styles.patientCard, active && styles.patientCardActive]}
                  >
                    <View style={styles.patientCardTop}>
                      <Text style={[styles.patientName, active && styles.patientNameActive]} numberOfLines={1}>
                        {patient.name}
                      </Text>
                      <View style={styles.patientCountBadge}>
                        <Text style={styles.patientCountText}>{patient.total_appointments}</Text>
                      </View>
                    </View>
                    <Text style={styles.patientMeta} numberOfLines={1}>
                      {patient.phone || patient.email || "Paciente"}
                    </Text>
                    <Text style={styles.patientHint}>
                      {patient.last_appointment
                        ? `Última ${formatShortDate(patient.last_appointment)}`
                        : "Sin citas recientes"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <EmptyCard text="No hay pacientes vinculados. Agrega uno con su código personal o regístralo desde esta misma sección." />
          )}

          {!search.trim() && sortedPatients.length > 6 ? (
            <Pressable
              onPress={() => setExpandedPatients((current) => !current)}
              style={styles.expandButton}
            >
              <Text style={styles.expandButtonText}>
                {expandedPatients
                  ? "Ver menos pacientes"
                  : `Mostrar ${sortedPatients.length - 6} pacientes más`}
              </Text>
              <Icon
                name={expandedPatients ? "caret-left" : "caret-right"}
                size={16}
                color={MC.primaryDark}
                style={expandedPatients ? styles.rotateIcon : undefined}
              />
            </Pressable>
          ) : null}
        </StepCard>

        <StepCard
          step="02"
          title="Fecha y horario"
          subtitle="Usa el calendario mensual y después selecciona uno de los horarios disponibles."
        >
          <View style={styles.calendarShell}>
            <View style={styles.monthNav}>
              <Pressable onPress={prevMonth} hitSlop={10} style={styles.monthBtn}>
                <Icon name="caret-left" size={20} color={MC.primary} />
              </Pressable>
              <Text style={styles.monthTitle}>
                {MONTHS[currentMonth]} {currentYear}
              </Text>
              <Pressable onPress={nextMonth} hitSlop={10} style={styles.monthBtn}>
                <Icon name="caret-right" size={20} color={MC.primary} />
              </Pressable>
            </View>

            <View style={styles.weekdayRow}>
              {WEEKDAYS.map((day) => (
                <View key={day} style={styles.weekdayCell}>
                  <Text style={styles.weekdayText}>{day}</Text>
                </View>
              ))}
            </View>

            <View style={styles.daysGrid}>
              {Array.from({ length: firstDayOfWeek }, (_, index) => (
                <View key={`empty-${index}`} style={styles.dayCell} />
              ))}
              {Array.from({ length: daysInMonth }, (_, index) => {
                const day = index + 1;
                const dateValue = formatDate(currentYear, currentMonth, day);
                const selected = selectedDate === dateValue;
                const disabled = isPastDay(currentYear, currentMonth, day, today);

                return (
                  <Pressable
                    key={dateValue}
                    onPress={() => !disabled && handleSelectDate(day)}
                    disabled={disabled}
                    style={[styles.dayCell, selected && styles.daySelected]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        selected && styles.dayTextSelected,
                        disabled && styles.dayTextDisabled,
                      ]}
                    >
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.slotHeader}>
            <Text style={styles.slotHeaderTitle}>Horarios disponibles</Text>
            {selectedDate ? <Text style={styles.slotHeaderDate}>{selectedDate}</Text> : null}
          </View>

          {slotsLoading ? (
            <View style={styles.loadingSlots}>
              <ActivityIndicator color={MC.primary} />
            </View>
          ) : slots.length ? (
            <View style={styles.slotGrid}>
              {slots.map((slot) => {
                const active = slot === selectedTime;
                return (
                  <Pressable
                    key={slot}
                    onPress={() => setSelectedTime(slot)}
                    style={[styles.slotChip, active && styles.slotChipActive]}
                  >
                    <Text style={[styles.slotText, active && styles.slotTextActive]}>{slot}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <EmptyCard text="No hay horarios disponibles para la fecha seleccionada." />
          )}
        </StepCard>

        <StepCard
          step="03"
          title="Modalidad y motivo"
          subtitle="Define cómo será la consulta y agrega el contexto necesario."
        >
          <View style={styles.segmentRow}>
            {TYPE_OPTIONS.map((option) => {
              const active = option.value === type;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setType(option.value)}
                  style={[styles.segment, active && styles.segmentActive]}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Field
            label="Motivo"
            value={reason}
            onChangeText={setReason}
            placeholder="Describe brevemente el motivo de la consulta (Mínimo 5 caracteres)"
            multiline
          />

          <Field
            label="Notas adicionales"
            value={notes}
            onChangeText={setNotes}
            placeholder="Indicaciones previas, contexto o recordatorios"
            multiline
          />
        </StepCard>

        <StepCard
          step="04"
          title="Cobro"
          subtitle="Si no marcas la consulta como gratuita, debe quedar pendiente de pago para el paciente."
        >
          <Pressable
            onPress={() => setWaivePayment((current) => !current)}
            style={[styles.paymentCard, waivePayment && styles.paymentCardFree]}
          >
            <View style={styles.paymentIcon}>
              <Icon
                name={waivePayment ? "check-circle" : "wallet"}
                size={18}
                color={waivePayment ? MC.success : MC.primaryDark}
              />
            </View>
            <View style={styles.paymentBody}>
              <Text style={styles.paymentTitle}>
                {waivePayment ? "No cobrar esta consulta" : "Cobrar después al paciente"}
              </Text>
              <Text style={styles.paymentText}>
                {waivePayment
                  ? "Se confirmará sin pago requerido."
                  : "Se creará como pendiente para que el paciente la pague después."}
              </Text>
            </View>
          </Pressable>

          {!waivePayment ? (
            <>
              <View style={styles.adjustmentGrid}>
                {PRICE_ADJUSTMENT_OPTIONS.map((option) => {
                  const active = option.value === priceAdjustmentType;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => setPriceAdjustmentType(option.value)}
                      style={[styles.adjustmentChip, active && styles.adjustmentChipActive]}
                    >
                      <Text style={[styles.adjustmentChipText, active && styles.adjustmentChipTextActive]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {priceAdjustmentType !== "none" ? (
                <>
                  <TextInput
                    value={priceAdjustmentValue}
                    onChangeText={setPriceAdjustmentValue}
                    keyboardType="decimal-pad"
                    placeholder={priceAdjustmentType === "fixed" ? "Monto a cobrar, ej. 300" : "Porcentaje, ej. 55"}
                    placeholderTextColor={MC.textMuted}
                    style={styles.fieldInput}
                  />
                  <TextInput
                    value={priceAdjustmentNote}
                    onChangeText={setPriceAdjustmentNote}
                    placeholder="Nota del ajuste (opcional)"
                    placeholderTextColor={MC.textMuted}
                    style={styles.fieldInput}
                  />
                </>
              ) : null}
            </>
          ) : null}

          <View style={styles.summaryCard}>
            <SummaryRow label="Paciente" value={selectedPatient?.name || "Sin seleccionar"} />
            <SummaryRow label="Fecha" value={selectedDate || "Sin fecha"} />
            <SummaryRow label="Hora" value={selectedTime || "Sin horario"} />
            <SummaryRow label="Modalidad" value={type === "virtual" ? "Videoconsulta" : "Presencial"} />
            <SummaryRow
              label="Estado esperado"
              value={waivePayment ? "Confirmada sin cobro" : `Pendiente ${money.format(feePreview)}`}
              highlight
            />
          </View>
        </StepCard>

        <Pressable
          onPress={handleCreate}
          disabled={saving || !patients.length}
          style={[styles.saveButton, (saving || !patients.length) && styles.saveButtonDisabled]}
        >
          {saving ? (
            <ActivityIndicator color={MC.white} />
          ) : (
            <>
              <Icon name="calendar" size={18} color={MC.white} />
              <Text style={styles.saveButtonText}>Crear cita</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function StepCard({
  step,
  title,
  subtitle,
  children,
}: {
  step: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.stepCard}>
      <View style={styles.stepHeader}>
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>{step}</Text>
        </View>
        <View style={styles.stepHeaderBody}>
          <Text style={styles.stepTitle}>{title}</Text>
          <Text style={styles.stepSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <View style={styles.stepBody}>{children}</View>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={MC.textMuted}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        style={[styles.fieldInput, multiline && styles.fieldInputMultiline]}
      />
    </View>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function SummaryRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, highlight && styles.summaryValueHighlight]}>{value}</Text>
    </View>
  );
}

function sortPatients(patients: api.DoctorPatientSummary[]) {
  return [...patients].sort((a, b) => {
    const byAppointments = (b.total_appointments || 0) - (a.total_appointments || 0);
    if (byAppointments !== 0) return byAppointments;

    const aLast = a.last_appointment ? new Date(a.last_appointment).getTime() : 0;
    const bLast = b.last_appointment ? new Date(b.last_appointment).getTime() : 0;
    if (bLast !== aLast) return bLast - aLast;

    return a.name.localeCompare(b.name, "es");
  });
}

function resolveDoctorFee(
  profile: api.Doctor | null,
  type: "presential" | "virtual",
  waivePayment: boolean,
  adjustmentType: PriceAdjustmentType = "none",
  adjustmentValue = 0,
) {
  if (!profile || waivePayment) return 0;

  const consultationFee = Number(profile.consultation_fee || 0);
  const telemedicineFee = Number(profile.telemedicine_fee || 0);

  const baseFee = type === "virtual" && telemedicineFee > 0 ? telemedicineFee : consultationFee;
  const value = Number.isFinite(adjustmentValue) && adjustmentValue > 0 ? adjustmentValue : 0;

  if (adjustmentType === "fixed") return value;
  if (adjustmentType === "percent_discount") return Math.max(0, baseFee - (baseFee * Math.min(value, 100)) / 100);
  if (adjustmentType === "percent_increase") return baseFee + (baseFee * value) / 100;

  return baseFee;
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function toDateValue(date: Date) {
  return formatDate(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDate(year: number, month: number, day: number) {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function isPastDay(year: number, month: number, day: number, today: Date) {
  const date = new Date(year, month, day);
  date.setHours(0, 0, 0, 0);
  return date < today;
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "sin fecha";
  return date.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
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
  headerSpacer: { width: 22 },
  hero: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: MC.primaryLight,
    borderWidth: 1,
    borderColor: MC.infoBorder,
    gap: 6,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: MC.primaryDark,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroTitle: { fontSize: 24, fontWeight: "700", color: MC.textPrimary },
  heroSubtitle: { fontSize: 13, lineHeight: 20, color: MC.textSecondary },
  errorBox: {
    borderRadius: 14,
    backgroundColor: MC.errorSoft,
    padding: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  errorText: { flex: 1, color: MC.error, fontSize: 13 },
  linkButton: {
    borderRadius: 18,
    backgroundColor: MC.primary,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  linkButtonText: { fontSize: 14, fontWeight: "800", color: MC.white },
  stepCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.card,
    padding: 16,
    gap: 14,
  },
  stepHeader: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  stepBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: MC.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBadgeText: { fontSize: 12, fontWeight: "800", color: MC.primaryDark },
  stepHeaderBody: { flex: 1, gap: 3 },
  stepTitle: { fontSize: 18, fontWeight: "700", color: MC.textPrimary },
  stepSubtitle: { fontSize: 12, lineHeight: 18, color: MC.textSecondary },
  stepBody: { gap: 12 },
  selectedPatientCard: {
    borderRadius: 18,
    backgroundColor: MC.primaryLight,
    padding: 14,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  selectedPatientIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: MC.card,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedPatientBody: { flex: 1, gap: 2 },
  selectedPatientLabel: { fontSize: 11, color: MC.primaryDark, fontWeight: "700" },
  selectedPatientName: { fontSize: 16, fontWeight: "700", color: MC.textPrimary },
  selectedPatientMeta: { fontSize: 12, color: MC.textSecondary },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.input,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: MC.textPrimary,
    paddingVertical: 0,
  },
  patientGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  patientCard: {
    width: "48%",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.card,
    padding: 12,
    gap: 6,
  },
  patientCardActive: {
    borderColor: MC.primary,
    backgroundColor: MC.primaryLight,
  },
  patientCardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  patientName: { flex: 1, fontSize: 14, fontWeight: "700", color: MC.textPrimary },
  patientNameActive: { color: MC.primaryDark },
  patientMeta: { fontSize: 12, color: MC.textSecondary },
  patientHint: { fontSize: 11, color: MC.textMuted },
  patientCountBadge: {
    minWidth: 26,
    borderRadius: 999,
    backgroundColor: MC.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "center",
  },
  patientCountText: { fontSize: 11, fontWeight: "800", color: MC.primaryDark },
  expandButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
  },
  expandButtonText: { fontSize: 13, fontWeight: "700", color: MC.primaryDark },
  rotateIcon: { transform: [{ rotate: "90deg" }] },
  calendarShell: {
    borderRadius: 20,
    backgroundColor: MC.input,
    padding: 14,
    gap: 12,
  },
  monthNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  monthBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  monthTitle: { fontSize: 16, fontWeight: "700", color: MC.textPrimary },
  weekdayRow: { flexDirection: "row" },
  weekdayCell: { flex: 1, alignItems: "center", paddingVertical: 6 },
  weekdayText: { fontSize: 11, fontWeight: "600", color: MC.textMuted },
  daysGrid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: {
    width: "14.2857%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 4,
    borderRadius: 18,
  },
  daySelected: { backgroundColor: MC.primary },
  dayText: { fontSize: 14, color: MC.textPrimary, fontWeight: "600" },
  dayTextSelected: { color: MC.white },
  dayTextDisabled: { color: MC.border },
  slotHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  slotHeaderTitle: { fontSize: 15, fontWeight: "700", color: MC.textPrimary },
  slotHeaderDate: { fontSize: 12, color: MC.textSecondary },
  loadingSlots: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.card,
    padding: 20,
    alignItems: "center",
  },
  slotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  slotChip: {
    minWidth: 88,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  slotChipActive: {
    borderColor: MC.primary,
    backgroundColor: MC.primary,
  },
  slotText: { fontSize: 13, fontWeight: "700", color: MC.textPrimary },
  slotTextActive: { color: MC.white },
  segmentRow: { flexDirection: "row", gap: 10 },
  segment: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.card,
    paddingVertical: 14,
    alignItems: "center",
  },
  segmentActive: {
    borderColor: MC.primary,
    backgroundColor: MC.primaryLight,
  },
  segmentText: { fontSize: 14, fontWeight: "700", color: MC.textPrimary },
  segmentTextActive: { color: MC.primaryDark },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: MC.textPrimary },
  fieldInput: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.card,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 14,
    color: MC.textPrimary,
  },
  fieldInputMultiline: { minHeight: 96 },
  paymentCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.card,
    padding: 14,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  paymentCardFree: {
    backgroundColor: MC.successSoft,
    borderColor: MC.successBorder,
  },
  paymentIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: MC.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentBody: { flex: 1, gap: 3 },
  paymentTitle: { fontSize: 15, fontWeight: "700", color: MC.textPrimary },
  paymentText: { fontSize: 12, lineHeight: 18, color: MC.textSecondary },
  adjustmentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  adjustmentChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.card,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  adjustmentChipActive: {
    borderColor: MC.primary,
    backgroundColor: MC.primaryLight,
  },
  adjustmentChipText: { fontSize: 12, fontWeight: "800", color: MC.textSecondary },
  adjustmentChipTextActive: { color: MC.primaryDark },
  summaryCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.input,
    padding: 14,
    gap: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryLabel: { fontSize: 12, color: MC.textSecondary },
  summaryValue: { flex: 1, textAlign: "right", fontSize: 13, color: MC.textPrimary },
  summaryValueHighlight: { fontWeight: "800", color: MC.primaryDark },
  emptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: MC.input,
    padding: 18,
    alignItems: "center",
  },
  emptyText: { fontSize: 13, color: MC.textSecondary, textAlign: "center" },
  saveButton: {
    borderRadius: 18,
    backgroundColor: MC.primary,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { fontSize: 15, fontWeight: "700", color: MC.white },
});
